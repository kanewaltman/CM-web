import React, { useState, useEffect, useCallback, useMemo, useRef, useId, CSSProperties, forwardRef, useImperativeHandle } from 'react';
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from './ui/table';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { getApiUrl } from '@/lib/api-config';
import { useTheme } from 'next-themes';
import { useDataSource } from '@/lib/DataSourceContext';
import { 
  ChevronDown as ChevronDownIcon, 
  X,
  AlertTriangle as AlertTriangleIcon,
  RefreshCw as RefreshCwIcon,
  ChevronUp,
  SlidersHorizontal,
  GripVertical as GripVerticalIcon
} from 'lucide-react';
import coinGeckoService from '@/services/coinGeckoService';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem 
} from './ui/dropdown-menu';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';

// TanStack Table imports
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Header,
  Cell,
  VisibilityState
} from '@tanstack/react-table';

// TanStack Virtual import for virtualization
import { useVirtualizer } from '@tanstack/react-virtual';

// DnD Kit imports
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Format price with appropriate number of decimal places - memoize this function
const formatPrice = (price: number) => {
  if (price >= 1000) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else if (price >= 100) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } else if (price >= 0.01) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 6 });
  } else {
    return price.toLocaleString(undefined, { maximumFractionDigits: 8 });
  }
};

// Cache formatter results for common values
const priceFormatterCache = new Map<number, string>();
const memoizedFormatPrice = (price: number) => {
  if (priceFormatterCache.has(price)) {
    return priceFormatterCache.get(price)!;
  }
  const result = formatPrice(price);
  if (priceFormatterCache.size > 1000) {
    // Clear cache if it gets too large
    priceFormatterCache.clear();
  }
  priceFormatterCache.set(price, result);
  return result;
};

// Format market cap and volume to K, M, B, T - memoize this function
const formatLargeNumber = (value: number) => {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  } else if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toLocaleString();
};

// Cache large number formatter results
const largeNumberFormatterCache = new Map<number, string>();
const memoizedFormatLargeNumber = (value: number) => {
  if (largeNumberFormatterCache.has(value)) {
    return largeNumberFormatterCache.get(value)!;
  }
  const result = formatLargeNumber(value);
  if (largeNumberFormatterCache.size > 1000) {
    largeNumberFormatterCache.clear();
  }
  largeNumberFormatterCache.set(value, result);
  return result;
};

// Add the conversion rate as a constant at file level
const CURRENCY_CONVERSION_RATES = {
  EUR_USD: 1.08,
  USD_EUR: 0.93,
  GBP_USD: 1.25,
  USD_GBP: 0.80,
};

// Helper to get the right conversion rate between currencies
const getConversionRate = (from: AssetTicker, to: AssetTicker | null): number => {
  if (!to) return 1; // No conversion needed if no secondary currency
  if (from === to) return 1;
  
  console.log(`Converting from ${from} to ${to}`);
  
  // First check direct conversions
  if (from === 'EUR' && to === 'USD') return CURRENCY_CONVERSION_RATES.EUR_USD;
  if (from === 'USD' && to === 'EUR') return CURRENCY_CONVERSION_RATES.USD_EUR;
  if (from === 'GBP' && to === 'USD') return CURRENCY_CONVERSION_RATES.GBP_USD;
  if (from === 'USD' && to === 'GBP') return CURRENCY_CONVERSION_RATES.USD_GBP;
  
  // For pairs involving BTC, which might need a two-step conversion
  if (from === 'BTC' && to === 'USD') return 38000; // Example BTC to USD rate
  if (from === 'BTC' && to === 'EUR') return 35000; // Example BTC to EUR rate
  if (from === 'BTC' && to === 'GBP') return 30000; // Example BTC to GBP rate
  
  // For alt-coins or stablecoins to major fiat
  if (to === 'USD' || to === 'EUR' || to === 'GBP') {
    // Return some sample conversion rate based on the asset type
    return 1.0; // Default conversion
  }
  
  // For other pairs, use a default rate (this should be replaced with real data)
  console.log(`No direct conversion rate found for ${from} to ${to}, using default`);
  return 1.0;
};

interface MarketData {
  pair: string;
  baseAsset: AssetTicker;
  quoteAsset: AssetTicker;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume: number;
  rank: number;
  marginMultiplier?: number;
}

export type { MarketData };

interface MarketsWidgetProps {
  className?: string;
  compact?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  selectedQuoteAsset?: AssetTicker | 'ALL';
  onSelectedQuoteAssetChange?: (value: AssetTicker | 'ALL') => void;
  secondaryCurrency?: AssetTicker | null;
  onSecondaryCurrencyChange?: (value: AssetTicker | null) => void;
  onQuoteAssetsChange?: (assets: AssetTicker[]) => void;
  onRemove?: () => void;
}

// Sample market data with margin multipliers
const SAMPLE_MARKET_DATA: Record<string, {
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume: number;
  rank: number;
  marginMultiplier?: number;
}> = {
  "BTC/EUR": { price: 37000.50, change24h: 2.5, change7d: 5.2, marketCap: 720000000000, volume: 25000000000, rank: 1, marginMultiplier: 3 },
  "ETH/EUR": { price: 1875.25, change24h: -1.2, change7d: 3.4, marketCap: 225000000000, volume: 15000000000, rank: 2, marginMultiplier: 5 },
  "BTC/USD": { price: 40100.75, change24h: 2.6, change7d: 5.3, marketCap: 720000000000, volume: 27000000000, rank: 3, marginMultiplier: 3 },
  "ETH/USD": { price: 2025.80, change24h: -1.1, change7d: 3.5, marketCap: 225000000000, volume: 17000000000, rank: 4, marginMultiplier: 5 },
  "USDT/EUR": { price: 0.91, change24h: -0.1, change7d: 0.2, marketCap: 95000000000, volume: 50000000000, rank: 5 },
  "BNB/EUR": { price: 260.50, change24h: 0.8, change7d: -2.1, marketCap: 39000000000, volume: 2000000000, rank: 6 },
  "SOL/EUR": { price: 85.00, change24h: 3.2, change7d: 10.5, marketCap: 36000000000, volume: 3000000000, rank: 7 },
  "USDC/EUR": { price: 0.91, change24h: -0.2, change7d: 0.1, marketCap: 28000000000, volume: 4000000000, rank: 8 },
  "XRP/EUR": { price: 0.45, change24h: 1.3, change7d: -0.8, marketCap: 24000000000, volume: 1500000000, rank: 9, marginMultiplier: 3 },
  "ADA/EUR": { price: 0.30, change24h: 0.5, change7d: -1.2, marketCap: 10500000000, volume: 500000000, rank: 10 },
  "ETH/BTC": { price: 0.050632, change24h: -3.7, change7d: -1.8, marketCap: 0, volume: 8500000000, rank: 11 },
  "SOL/BTC": { price: 0.002297, change24h: 0.7, change7d: 5.2, marketCap: 0, volume: 1200000000, rank: 12 },
  "DOGE/EUR": { price: 0.012345, change24h: 1.5, change7d: 4.3, marketCap: 10000000000, volume: 900000000, rank: 13 },
  "DOT/EUR": { price: 10.05, change24h: 0.8, change7d: 2.1, marketCap: 8900000000, volume: 350000000, rank: 14 },
  "TIA/EUR": { price: 15.75, change24h: 4.2, change7d: 12.5, marketCap: 7500000000, volume: 850000000, rank: 15 },
  "LTC/EUR": { price: 65.40, change24h: -0.5, change7d: 1.2, marketCap: 4800000000, volume: 320000000, rank: 16 },
  "MATIC/EUR": { price: 0.52, change24h: -1.8, change7d: -3.5, marketCap: 4300000000, volume: 280000000, rank: 17 },
  "LINK/EUR": { price: 13.20, change24h: 2.1, change7d: 5.8, marketCap: 7200000000, volume: 450000000, rank: 18 },
  "ATOM/EUR": { price: 7.85, change24h: -0.3, change7d: 1.9, marketCap: 2900000000, volume: 180000000, rank: 19 },
  "XMR/EUR": { price: 145.60, change24h: 1.1, change7d: 3.7, marketCap: 2700000000, volume: 120000000, rank: 20 }
};

// SkeletonRow component for loading state
const SkeletonRow: React.FC<{ isMinWidth?: boolean }> = ({ isMinWidth = false }) => (
  <TableRow isHeader={false}>
    <TableCell className="bg-[hsl(var(--color-widget-header))] z-10">
      <div className="w-5 h-5 rounded bg-white/5 animate-pulse" />
    </TableCell>
    <TableCell className="bg-[hsl(var(--color-widget-header))] z-10">
      <div className="flex items-center gap-2">
        <div className="relative flex">
          <div className="w-6 h-6 rounded-full bg-white/5 animate-pulse z-10" />
          <div className="w-6 h-6 rounded-full bg-white/5 animate-pulse absolute -right-3 bottom-0 z-0" />
        </div>
        <div className="w-20 h-5 ml-2 rounded-md bg-white/5 animate-pulse" />
      </div>
    </TableCell>
    <TableCell className="text-right">
      <div className="flex flex-col items-end">
        <div className="w-24 h-5 ml-auto rounded bg-white/5 animate-pulse" />
        {isMinWidth && (
          <div className="w-16 h-3 mt-1 ml-auto rounded bg-white/5 animate-pulse" />
        )}
      </div>
    </TableCell>
    {!isMinWidth && (
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <div className="w-16 h-5 ml-auto rounded bg-white/5 animate-pulse" />
        </div>
      </TableCell>
    )}
    <TableCell className="text-right">
      <div className="w-16 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
    <TableCell className="text-right">
      <div className="w-20 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
    <TableCell className="text-right">
      <div className="w-20 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
  </TableRow>
);

// Draggable Table Header Component
const DraggableTableHeader = ({ header, currentTheme }: { header: Header<MarketData, unknown>, currentTheme: 'light' | 'dark' }) => {
  const isNarrowColumn = header.column.id === 'favorite'; // Identify narrow columns
  const isPairColumn = header.column.id === 'pair'; // Identify pair column for left alignment
  const isSorted = header.column.getIsSorted();

  // Handler for clicking the entire header
  const handleHeaderClick = () => {
    if (header.column.getCanSort()) {
      header.column.toggleSorting();
    }
  };

  return (
    <TableHead
      className={cn(
        "sticky top-0 bg-[hsl(var(--color-widget-header))] z-20 whitespace-nowrap cursor-pointer hover:text-foreground/80 group",
        isNarrowColumn && "p-0 w-[30px] max-w-[30px]"
      )}
      style={{ width: isNarrowColumn ? '30px' : undefined, maxWidth: isNarrowColumn ? '30px' : undefined }}
      onClick={handleHeaderClick}
      aria-sort={
        isSorted === "asc"
          ? "ascending"
          : isSorted === "desc"
            ? "descending"
            : "none"
      }
    >
      <div className="relative">
        <div className="absolute -inset-x-[1px] -inset-y-[0.5px] bg-[hsl(var(--color-widget-header))] shadow-[0_0_0_1px_hsl(var(--color-widget-header))]"></div>
        <div className={cn(
          "relative z-10 flex items-center gap-1",
          isPairColumn ? "justify-start" : "justify-end"
        )}>
          <span className={cn(
            "truncate", 
            isPairColumn ? "text-left" : "text-right", 
            isNarrowColumn && "sr-only"
          )}>
            {header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext())}
          </span>
          {header.column.getCanSort() && !isNarrowColumn && isSorted && (
            <div className="ml-1 h-4 w-4 flex items-center justify-center">
              {isSorted === "asc" ? (
                <ChevronUp className="shrink-0" size={16} aria-hidden="true" />
              ) : (
                <ChevronDownIcon className="shrink-0" size={16} aria-hidden="true" />
              )}
            </div>
          )}
        </div>
      </div>
    </TableHead>
  );
};

// Memoized DragAlongCell component using React.memo
const DragAlongCell = React.memo(
  ({ cell, currentTheme }: { cell: Cell<MarketData, unknown>, currentTheme: 'light' | 'dark' }) => {
    const cellContent = flexRender(cell.column.columnDef.cell, cell.getContext());
    const isNarrowColumn = cell.column.id === 'favorite'; // Identify narrow columns

    return (
      <TableCell
        className={cn(
          isNarrowColumn && "p-0 w-[30px] max-w-[30px]"
        )}
        style={{ width: isNarrowColumn ? '30px' : undefined, maxWidth: isNarrowColumn ? '30px' : undefined }}
      >
        {cellContent}
      </TableCell>
    );
  },
  // Custom comparison function to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    // Only re-render if the cell value changed
    const prevValue = prevProps.cell.getValue();
    const nextValue = nextProps.cell.getValue();
    
    // For complex objects in cell data, do more specific comparison
    if (typeof prevValue === 'object' || typeof nextValue === 'object') {
      return false; // Always re-render for complex values
    }
    
    return prevValue === nextValue && prevProps.currentTheme === nextProps.currentTheme;
  }
);

// Draggable Item for column visibility menu
const DraggableMenuItem = ({ 
  id, 
  children, 
  isChecked, 
  onCheckedChange 
}: { 
  id: string, 
  children: React.ReactNode, 
  isChecked: boolean, 
  onCheckedChange: (checked: boolean) => void 
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: false,
  });
  
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    zIndex: isDragging ? 50 : 0,
  };
  
  // Use internal state to make checkbox interaction feel immediate
  const [internalChecked, setInternalChecked] = useState(isChecked);
  
  // Sync internal state with parent state
  useEffect(() => {
    setInternalChecked(isChecked);
  }, [isChecked]);
  
  // Only allow drag on the handle, not the entire row
  const handleDragHandleProps = useMemo(() => {
    return {
      ...attributes,
      ...listeners
    };
  }, [attributes, listeners]);
  
  // Separate click handler for checkbox area that doesn't trigger drag
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Update internal state immediately 
    setInternalChecked(!internalChecked);
    
    // Then update parent state
    onCheckedChange(!internalChecked);
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex items-center justify-between rounded-sm px-1 py-0.5"
    >
      {/* Clickable checkbox area */}
      <div 
        className="flex items-center gap-3 py-1.5 px-1.5 cursor-pointer flex-1 hover:bg-accent/50 rounded-sm"
        onClick={handleCheckboxClick}
      >
        <div 
          className="flex items-center justify-center h-4 w-4 relative"
          onClick={(e) => {
            e.stopPropagation();
            handleCheckboxClick(e);
          }}
        >
          {/* Custom checkbox appearance */}
          <div 
            className={cn(
              "h-4 w-4 rounded-sm transition-colors flex items-center justify-center", 
              internalChecked ? "bg-white" : "bg-muted"
            )}
          >
            {internalChecked && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 1L3.5 6.5L1 4" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
        
        <span className="text-sm select-none">
          {children}
        </span>
      </div>
      
      {/* Drag handle - only this triggers dragging */}
      <div 
        {...handleDragHandleProps}
        className="cursor-grab active:cursor-grabbing h-full px-2 flex items-center justify-center"
      >
        <GripVerticalIcon size={16} className="text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
};

// Component for column visibility to be used in widget context menu
export const MarketsWidgetColumnVisibility: React.FC<{ 
  table: ReturnType<typeof useReactTable<any>> 
}> = ({ table }) => {
  const columnOrder = table.getState().columnOrder;
  const [localColumnOrder, setLocalColumnOrder] = useState<string[]>(
    columnOrder.filter(id => id !== 'pair')
  );
  
  // Keep local order in sync with table order (excluding 'pair')
  useEffect(() => {
    setLocalColumnOrder(columnOrder.filter(id => id !== 'pair'));
  }, [columnOrder]);

  // Initialize sensors for drag and drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 } // Increased distance to avoid accidental drags
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 } // Delay to distinguish between touch and drag
    }),
    useSensor(KeyboardSensor, {})
  );

  // Handle drag end for column visibility menu reordering
  function handleMenuDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setLocalColumnOrder(prevOrder => {
        const oldIndex = prevOrder.indexOf(active.id as string);
        const newIndex = prevOrder.indexOf(over.id as string);
        
        // Create a new order by moving the item
        const newOrder = arrayMove(prevOrder, oldIndex, newIndex);
        
        // Update the full column order with 'pair' always at the beginning
        const fullOrder = ['pair', ...newOrder];
        table.setColumnOrder(fullOrder);
        
        return newOrder;
      });
    }
  }
  
  // Direct column visibility toggle that uses the table API directly
  const handleColumnVisibilityChange = (columnId: string, isVisible: boolean) => {
    // Prevent toggling off the 'pair' column (safety check)
    if (columnId === 'pair') {
      return;
    }
    
    // Create a new visibility state object to avoid mutating the existing one
    const newState = {...table.getState().columnVisibility};
    
    if (isVisible) {
      // For TanStack Table, removing the column from the visibility state makes it visible
      delete newState[columnId];
    } else {
      // Setting the column's visibility to false makes it hidden
      newState[columnId] = false;
    }
    
    // Update the table's visibility state
    table.setColumnVisibility(newState);
  };

  return (
    <>
      <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <div className="max-h-[300px] overflow-auto py-1">
        <DndContext
          id={useId() + "-menu"}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleMenuDragEnd}
          sensors={sensors}
        >
          <SortableContext
            items={localColumnOrder}
            strategy={verticalListSortingStrategy}
          >
            {localColumnOrder.map((columnId) => {
              const column = table.getAllColumns().find(col => col.id === columnId);
              if (!column) return null;
              
              const headerLabel = typeof column.columnDef.header === 'string' 
                ? column.columnDef.header 
                : columnId;
              
              // Use column.getIsVisible() directly from the table API
              return (
                <DraggableMenuItem
                  key={column.id}
                  id={column.id}
                  isChecked={column.getIsVisible()}
                  onCheckedChange={(checked) => handleColumnVisibilityChange(column.id, checked)}
                >
                  {headerLabel}
                </DraggableMenuItem>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
};

export interface MarketsWidgetRef {
  getTable: () => ReturnType<typeof useReactTable<MarketData>> | null;
}

// Add a deep comparison memo utility
const useDeepCompareMemo = <T,>(factory: () => T, deps: React.DependencyList) => {
  const ref = useRef<{ deps: React.DependencyList; obj: T; initialized: boolean }>({
    deps: [],
    obj: null as unknown as T,
    initialized: false
  });
  
  const depsChanged = !ref.current.initialized || 
    deps.length !== ref.current.deps.length || 
    deps.some((dep, i) => {
      return JSON.stringify(dep) !== JSON.stringify(ref.current.deps[i]);
    });
  
  if (depsChanged) {
    ref.current.deps = deps;
    ref.current.obj = factory();
    ref.current.initialized = true;
  }
  
  return ref.current.obj;
};

export const MarketsWidget = forwardRef<MarketsWidgetRef, MarketsWidgetProps>(({ 
  className,
  searchQuery: externalSearchQuery,
  onSearchQueryChange: externalSearchQueryChange,
  selectedQuoteAsset: externalSelectedQuoteAsset,
  onSelectedQuoteAssetChange: externalSelectedQuoteAssetChange,
  secondaryCurrency: externalSecondaryCurrency,
  onSecondaryCurrencyChange: externalSecondaryCurrencyChange,
  onQuoteAssetsChange,
  compact = false,
}, ref) => {
  const { theme, resolvedTheme } = useTheme();
  const { dataSource } = useDataSource();
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [filteredData, setFilteredData] = useState<MarketData[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Use external state if provided, otherwise use local state
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  
  const [internalSelectedQuoteAsset, setInternalSelectedQuoteAsset] = useState<AssetTicker | 'ALL'>(
    getStoredValue<AssetTicker | 'ALL'>(STORAGE_KEYS.SELECTED_QUOTE_ASSET, 'ALL')
  );
  const selectedQuoteAsset = externalSelectedQuoteAsset !== undefined 
    ? externalSelectedQuoteAsset 
    : internalSelectedQuoteAsset;
  
  const [internalSecondaryCurrency, setInternalSecondaryCurrency] = useState<AssetTicker | null>(
    getStoredValue<AssetTicker | null>(STORAGE_KEYS.SECONDARY_CURRENCY, null)
  );
  const secondaryCurrency = externalSecondaryCurrency !== undefined 
    ? externalSecondaryCurrency 
    : internalSecondaryCurrency;
  
  // Initialize other state with values from localStorage
  const [sorting, setSorting] = useState<SortingState>(
    getStoredValue(STORAGE_KEYS.SORTING, [{ id: 'marketCap', desc: true }])
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    getStoredValue(STORAGE_KEYS.COLUMN_VISIBILITY, {})
  );
  
  const containerRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Debounce utility function
  const debounce = <F extends (...args: any[]) => any>(
    func: F, 
    wait: number
  ): ((...args: Parameters<F>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    return function(...args: Parameters<F>) {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(() => {
        timeout = null;
        func(...args);
      }, wait);
    };
  };
  
  // Define minimum column widths to maintain readability
  const minColumnWidths = {
    pair: 180, // Need space for asset icons and symbols
    price: 110, // Price values need reasonable width
    change24h: 90, // Percentage values are compact
    change7d: 90,
    marketCap: 120, // Financial figures need space
    volume: 120
  };
  
  // Define column flex weights for proportional resizing
  const columnFlexWeights = {
    pair: 1.6,     // Pair needs most room for asset names
    price: 1.2,    // Price is important, give it more space
    change24h: 0.9, // Change percentages are compact
    change7d: 0.9,
    marketCap: 1.1, // Financial data is important but can compress
    volume: 1.1
  };
  
  // Add a separate state for tracking dynamic column visibility based on container width
  const [dynamicVisibility, setDynamicVisibility] = useState<VisibilityState>({});
  
  // Dynamic column sizes that adapt to container width
  const [columnSizes, setColumnSizes] = useState(minColumnWidths);
  
  // Update column sizes based on container width
  const updateColumnSizes = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const padding = 20; // Buffer for borders, padding
    
    // Get only visible columns based on both user preferences and dynamic visibility
    const visibleColumnIds = Object.keys(minColumnWidths)
      .filter(id => 
        columnVisibility[id] !== false && 
        dynamicVisibility[id] !== false
      ) as (keyof typeof minColumnWidths)[];
    
    // Calculate total minimum width needed for visible columns only
    const totalMinWidth = visibleColumnIds.reduce((total, id) => 
      total + minColumnWidths[id], 0) + padding;
    
    // Calculate total flex weight for visible columns only
    const totalFlexWeight = visibleColumnIds.reduce((total, id) => 
      total + columnFlexWeights[id], 0);
    
    // If we have extra space, distribute it proportionally based on flex weights
    if (containerWidth > totalMinWidth) {
      const extraSpace = containerWidth - totalMinWidth;
      const newSizes = {...minColumnWidths};
      
      // Distribute extra space proportionally to visible columns
      visibleColumnIds.forEach(id => {
        const proportion = columnFlexWeights[id] / totalFlexWeight;
        newSizes[id] = Math.floor(minColumnWidths[id] + (extraSpace * proportion));
      });
      
      setColumnSizes(newSizes);
    } else {
      // If space is constrained, use minimum widths
      setColumnSizes(minColumnWidths);
    }
  }, [columnVisibility, dynamicVisibility]);
  
  // Debounce resize operations to improve performance
  const debouncedUpdateColumnSizes = useCallback(debounce(updateColumnSizes, 100), [updateColumnSizes]);
  
  // Initialize column sizes and set up resize listener
  useEffect(() => {
    // Initial update without debounce
    updateColumnSizes();
    
    // Set up resize observer with debounced handler
    const resizeObserver = new ResizeObserver(() => {
      debouncedUpdateColumnSizes();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Also add window resize event listener as backup
    window.addEventListener('resize', debouncedUpdateColumnSizes);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedUpdateColumnSizes);
    };
  }, [updateColumnSizes, debouncedUpdateColumnSizes]);

  // Force rerender when secondary currency changes
  const [forceRenderKey, setForceRenderKey] = useState(0);
  useEffect(() => {
    console.log('Secondary currency changed to:', secondaryCurrency);
    // Force a complete re-render by changing the key
    setForceRenderKey(prev => prev + 1);
  }, [secondaryCurrency]);
  
  // Dynamic key for table to force complete re-renders
  const tableKey = `table-${forceRenderKey}-${secondaryCurrency || 'none'}`;

  useEffect(() => {
    if (externalSelectedQuoteAsset !== undefined) {
      console.log('External quote asset changed:', externalSelectedQuoteAsset);
    } else {
      console.log('Internal quote asset changed:', internalSelectedQuoteAsset);
    }
  }, [externalSelectedQuoteAsset, internalSelectedQuoteAsset]);

  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      console.log('External search query changed:', externalSearchQuery);
    } else {
      console.log('Internal search query changed:', internalSearchQuery);
    }
  }, [externalSearchQuery, internalSearchQuery]);

  useEffect(() => {
    if (externalSecondaryCurrency !== undefined) {
      console.log('External secondary currency changed:', externalSecondaryCurrency);
    } else {
      console.log('Internal secondary currency changed:', internalSecondaryCurrency);
    }
  }, [externalSecondaryCurrency, internalSecondaryCurrency]);

  useEffect(() => {
    if (externalSelectedQuoteAsset === undefined) {
      setStoredValue(STORAGE_KEYS.SELECTED_QUOTE_ASSET, internalSelectedQuoteAsset);
    }
  }, [internalSelectedQuoteAsset, externalSelectedQuoteAsset]);

  useEffect(() => {
    if (externalSecondaryCurrency === undefined) {
      setStoredValue(STORAGE_KEYS.SECONDARY_CURRENCY, internalSecondaryCurrency);
    }
  }, [internalSecondaryCurrency, externalSecondaryCurrency]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.SORTING, sorting);
  }, [sorting]);

  // Get unique quote assets from market data
  const quoteAssets = useMemo(() => {
    const assets = new Set<AssetTicker>();
    marketData.forEach(item => assets.add(item.quoteAsset));
    return Array.from(assets);
  }, [marketData]);

  // Notify parent component of quote assets change
  useEffect(() => {
    if (onQuoteAssetsChange && quoteAssets.length > 0) {
      onQuoteAssetsChange(quoteAssets);
    }
  }, [quoteAssets, onQuoteAssetsChange]);

  // Handler functions that respect external handlers
  const handleSearchQueryChange = useCallback((value: string) => {
    if (externalSearchQueryChange) {
      externalSearchQueryChange(value);
    } else {
      setInternalSearchQuery(value);
    }
  }, [externalSearchQueryChange]);

  const handleSelectedQuoteAssetChange = useCallback((value: AssetTicker | 'ALL') => {
    if (externalSelectedQuoteAssetChange) {
      externalSelectedQuoteAssetChange(value);
    } else {
      setInternalSelectedQuoteAsset(value);
    }
  }, [externalSelectedQuoteAssetChange]);

  const handleSecondaryCurrencyChange = useCallback((value: AssetTicker | null) => {
    if (externalSecondaryCurrencyChange) {
      externalSecondaryCurrencyChange(value);
    } else {
      setInternalSecondaryCurrency(value);
    }
  }, [externalSecondaryCurrencyChange]);

  // Helper function to check if an asset matches the search query
  const assetMatchesSearch = useCallback((item: MarketData, query: string) => {
    if (!query.trim()) return true;
    
    const normalizedQuery = query.trim().toLowerCase();
    
    // Early optimization: Direct pair match check
    if (item.pair.toLowerCase().includes(normalizedQuery)) return true;
    
    // Destructure once
    const baseAsset = item.baseAsset;
    const quoteAsset = item.quoteAsset;
    
    // Check if query matches ticker symbols (case optimized)
    if (baseAsset.toLowerCase().includes(normalizedQuery)) return true;
    if (quoteAsset.toLowerCase().includes(normalizedQuery)) return true;
    
    // Check if query matches full asset names - only do this lookup if necessary
    const baseAssetFullName = (baseAsset in ASSETS) ? 
      ASSETS[baseAsset]?.name.toLowerCase() || '' : '';
    
    if (baseAssetFullName && baseAssetFullName.includes(normalizedQuery)) return true;
    
    const quoteAssetFullName = (quoteAsset in ASSETS) ? 
      ASSETS[quoteAsset]?.name.toLowerCase() || '' : '';
    
    if (quoteAssetFullName && quoteAssetFullName.includes(normalizedQuery)) return true;
    
    // Check for combined searches like "eth usd" - only split if there's a space
    if (normalizedQuery.includes(' ')) {
      const queryParts = normalizedQuery.split(/\s+/);
      if (queryParts.length > 1) {
        const [queryBase, queryQuote] = queryParts;
        
        const baseMatches = 
          baseAsset.toLowerCase().includes(queryBase) || 
          (baseAssetFullName && baseAssetFullName.includes(queryBase));
        
        const quoteMatches = 
          quoteAsset.toLowerCase().includes(queryQuote) || 
          (quoteAssetFullName && quoteAssetFullName.includes(queryQuote));
        
        if (baseMatches && quoteMatches) return true;
        
        // Also check the reverse order
        const baseMatchesReverse = 
          baseAsset.toLowerCase().includes(queryQuote) || 
          (baseAssetFullName && baseAssetFullName.includes(queryQuote));
        
        const quoteMatchesReverse = 
          quoteAsset.toLowerCase().includes(queryBase) || 
          (quoteAssetFullName && quoteAssetFullName.includes(queryBase));
        
        if (baseMatchesReverse && quoteMatchesReverse) return true;
      }
    }
    
    return false;
  }, []);

  // Filter market data based on selected quote asset and search query
  const filteredMarketData = useMemo(() => {
    console.log(`Filtering with selectedQuoteAsset: ${selectedQuoteAsset}, searchQuery: ${searchQuery}`);
    // First apply quote asset filter
    let filtered = selectedQuoteAsset === 'ALL' 
      ? marketData 
      : marketData.filter(item => item.quoteAsset === selectedQuoteAsset);
    
    // Apply search filter
    if (searchQuery?.trim()) {
      filtered = filtered.filter(item => assetMatchesSearch(item, searchQuery));
    }
    
    return filtered;
  }, [marketData, selectedQuoteAsset, searchQuery, assetMatchesSearch]);
  
  // Update the table with filtered data whenever filters change
  useEffect(() => {
    console.log('Filtered data updated:', filteredMarketData.length);
  }, [filteredMarketData]);

  // Responsive column hiding logic will be implemented after table initialization
  
  // Now let's update the price column cell to show extra info when columns are hidden
  const columns = useDeepCompareMemo<ColumnDef<MarketData>[]>(() => {
    console.log('Rebuilding columns with secondaryCurrency:', secondaryCurrency);
    
    return [
    {
      id: 'pair',
      header: 'Pair',
      accessorKey: 'pair',
      cell: ({ row }) => {
        const baseAssetConfig = ASSETS[row.original.baseAsset];
        const quoteAssetConfig = ASSETS[row.original.quoteAsset];
        const marginMultiplier = row.original.marginMultiplier;
        
        return (
          <div className="flex items-center gap-2">
            <div className="relative flex shrink-0">
              {/* Base asset icon */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden border border-border z-10">
                <img
                  src={baseAssetConfig.icon}
                  alt={row.original.baseAsset}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Quote asset icon */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden border border-border absolute -right-3 bottom-0 z-0">
                <img
                  src={quoteAssetConfig.icon}
                  alt={row.original.quoteAsset}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="ml-2 flex items-center gap-2">
              <span className="font-jakarta font-semibold text-sm">
                {row.original.baseAsset}
                <span className="text-muted-foreground font-semibold">/{row.original.quoteAsset}</span>
              </span>
              {marginMultiplier && marginMultiplier >= 5 && (
                <span className="text-xs px-1.5 py-0.5 rounded-sm bg-neutral-500/20 text-neutral-500 font-medium">
                  5×
                </span>
              )}
            </div>
          </div>
        );
      },
      size: columnSizes.pair,
    },
    {
      id: 'price',
      header: 'Price',
      accessorKey: 'price',
      cell: ({ row }) => {
        // Display in secondary currency if set, otherwise use quote asset currency
        const displayCurrency = secondaryCurrency || row.original.quoteAsset;
        
        const pricePrefix = displayCurrency === 'EUR' ? '€' : 
                           displayCurrency === 'USD' ? '$' :
                           displayCurrency === 'GBP' ? '£' : '';
        
        // Get conversion rate
        const conversionRate = getConversionRate(row.original.quoteAsset, secondaryCurrency);
        
        // Use original price or converted price based on secondary currency
        const displayPrice = secondaryCurrency && row.original.quoteAsset !== secondaryCurrency ? 
          row.original.price * conversionRate : 
          row.original.price;
        
        return (
          <div className="text-right font-jakarta font-mono font-semibold text-sm leading-[150%]">
            <span>{pricePrefix}{memoizedFormatPrice(displayPrice)}</span>
          </div>
        );
      },
      size: columnSizes.price,
    },
    {
      id: 'change24h',
      header: '24h %',
      accessorKey: 'change24h',
      cell: ({ row }) => {
        // Get the 24h change value
        const change24h = row.original.change24h;
        
        return (
          <div className={cn(
            "text-right whitespace-nowrap font-mono",
            change24h > 0 ? "text-price-up" : 
            change24h < 0 ? "text-price-down" : 
            "text-muted-foreground/80"
          )}>
            <span>{change24h > 0 ? '+' : ''}{change24h.toFixed(2)}%</span>
          </div>
        );
      },
      size: columnSizes.change24h,
    },
    {
      id: 'change7d',
      header: '7d %',
      accessorKey: 'change7d',
      cell: ({ row }) => (
        <div className={cn(
          "text-right whitespace-nowrap font-mono",
          row.original.change7d > 0 ? "text-price-up" : 
          row.original.change7d < 0 ? "text-price-down" : 
          "text-muted-foreground/80"
        )}>
          {row.original.change7d > 0 ? '+' : ''}{row.original.change7d.toFixed(2)}%
        </div>
      ),
      size: columnSizes.change7d,
    },
    {
      id: 'marketCap',
      header: 'Market Cap',
      accessorKey: 'marketCap',
      cell: ({ row }) => {
        // Display in secondary currency if set, otherwise use quote asset currency
        const displayCurrency = secondaryCurrency || row.original.quoteAsset;
        
        const pricePrefix = displayCurrency === 'EUR' ? '€' : 
                          displayCurrency === 'USD' ? '$' :
                          displayCurrency === 'GBP' ? '£' : '';
        
        // Get conversion rate
        const conversionRate = getConversionRate(row.original.quoteAsset, secondaryCurrency);
        
        // Use original marketCap or converted marketCap based on secondary currency
        const displayMarketCap = secondaryCurrency && row.original.quoteAsset !== secondaryCurrency ? 
          row.original.marketCap * conversionRate : 
          row.original.marketCap;
        
        return (
          <div className="text-right font-jakarta font-semibold text-sm leading-[150%]">
            {displayMarketCap > 0 ? `${pricePrefix}${memoizedFormatLargeNumber(displayMarketCap)}` : '-'}
          </div>
        );
      },
      size: columnSizes.marketCap,
    },
    {
      id: 'volume',
      header: 'Volume (24h)',
      accessorKey: 'volume',
      cell: ({ row }) => {
        // Display in secondary currency if set, otherwise use quote asset currency
        const displayCurrency = secondaryCurrency || row.original.quoteAsset;
        
        const pricePrefix = displayCurrency === 'EUR' ? '€' : 
                          displayCurrency === 'USD' ? '$' :
                          displayCurrency === 'GBP' ? '£' : '';
        
        // Get conversion rate
        const conversionRate = getConversionRate(row.original.quoteAsset, secondaryCurrency);
        
        // Use original volume or converted volume based on secondary currency
        const displayVolume = secondaryCurrency && row.original.quoteAsset !== secondaryCurrency ? 
          row.original.volume * conversionRate : 
          row.original.volume;
        
        return (
          <div className="text-right font-jakarta font-semibold text-sm leading-[150%]">
            {pricePrefix}{memoizedFormatLargeNumber(displayVolume)}
          </div>
        );
      },
      size: columnSizes.volume,
    }
  ]}, [columnSizes, secondaryCurrency]);

  // Setup column order
  const [columnOrder, setColumnOrder] = useState<string[]>(
    getStoredValue(STORAGE_KEYS.COLUMN_ORDER, columns.map((column) => column.id as string))
  );

  // Persist column order changes
  useEffect(() => {
    setStoredValue(STORAGE_KEYS.COLUMN_ORDER, columnOrder);
  }, [columnOrder]);

  // Detect theme from document class list
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setCurrentTheme(isDark ? 'dark' : 'light');
    };

    updateTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Create a setStoredValue function that uses debounce
  const setStoredValue = useCallback(<T,>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    
    // Inline debouncing to avoid closure issues
    const saveToStorage = () => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error writing to localStorage for key ${key}:`, error);
      }
    };
    
    // Use a short delay for responsiveness
    setTimeout(saveToStorage, 300);
  }, []);

  const fetchMarketData = useCallback(async () => {
    console.log(`[MarketsWidget] Fetching market data with data source: ${dataSource}`);
    try {
      // Only set loading state for initial load, not refreshes
      if (marketData.length === 0) {
        setIsInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (dataSource === 'sample') {
        try {
          // Use CoinGecko API for sample data
          const exchangeRates = await coinGeckoService.fetchExchangeRates();
          
          // Transform the exchange rates into MarketData format
          const marketDataArray: MarketData[] = [];
          let rank = 1;
          
          // Process each asset in the exchange rates
          for (const [baseAsset, rates] of Object.entries(exchangeRates)) {
            // Skip if the asset is not in our ASSETS lookup
            if (!(baseAsset in ASSETS)) continue;
            
            // Create market data for EUR, USD, and BTC pairs
            const quoteAssets: AssetTicker[] = ['EUR', 'USD', 'BTC'];
            
            for (const quoteAsset of quoteAssets) {
              // Skip if the quote asset is not in our ASSETS lookup
              if (!(quoteAsset in ASSETS)) continue;
              
              // Skip same asset pairs
              if (baseAsset === quoteAsset) continue;
              
              // Get the price in the quote currency
              let price = 0;
              if (quoteAsset === 'EUR' && rates.eur) {
                price = rates.eur;
              } else if (quoteAsset === 'USD' && rates.usd) {
                price = rates.usd;
              } else if (quoteAsset === 'BTC' && rates.btc) {
                price = rates.btc;
              } else {
                // Skip if we don't have a price for this quote asset
                continue;
              }
              
              // Generate random change percentages for sample data
              const change24h = (Math.random() * 20) - 10; // -10% to +10%
              const change7d = (Math.random() * 30) - 15;  // -15% to +15%
              
              // Calculate market cap and volume based on price
              const marketCap = price * (Math.random() * 1000000000 + 100000000); // Random market cap
              const volume = marketCap * (Math.random() * 0.3 + 0.05); // Random volume (5-35% of market cap)
              
              // Add margin multiplier for some assets
              const marginMultiplier = Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 1 : undefined;
              
              marketDataArray.push({
                pair: `${baseAsset}/${quoteAsset}`,
                baseAsset: baseAsset as AssetTicker,
                quoteAsset: quoteAsset as AssetTicker,
                price,
                change24h,
                change7d,
                marketCap,
                volume,
                rank: rank++,
                marginMultiplier
              });
            }
          }
          
          // Sort by market cap by default
          marketDataArray.sort((a, b) => b.marketCap - a.marketCap);
          
          // Update ranks based on sorted order
          marketDataArray.forEach((item, index) => {
            item.rank = index + 1;
          });
          
          setMarketData(marketDataArray);
          setError(null);
          return;
        } catch (error) {
          console.error('Error fetching market data from CoinGecko:', error);
          console.log('Falling back to sample data...');
          // Fall through to sample data as fallback
        }
        
        // Use sample data as fallback
        const marketDataArray = Object.entries(SAMPLE_MARKET_DATA)
          .map(([pair, details]) => {
            const [baseAsset, quoteAsset] = pair.split('/') as [AssetTicker, AssetTicker];
            
            if (!(baseAsset in ASSETS) || !(quoteAsset in ASSETS)) {
              return null;
            }
            
            return {
              pair,
              baseAsset,
              quoteAsset,
              price: details.price,
              change24h: details.change24h,
              change7d: details.change7d,
              marketCap: details.marketCap,
              volume: details.volume,
              rank: details.rank,
              marginMultiplier: details.marginMultiplier
            };
          })
          .filter(Boolean) as MarketData[];

        setMarketData(marketDataArray);
        setError(null);
      } else {
        try {
          const tokenResponse = await fetch(getApiUrl('open/demo/temp'));
          const tokenData = await tokenResponse.json();
          
          if (!tokenData.token) {
            throw new Error('Failed to get demo token');
          }

          // Use the CryptoCompare API to fetch market data for pairs
          const baseAssets = ['BTC', 'ETH', 'SOL', 'XRP', 'USDT', 'BNB', 'ADA', 'DOGE', 'MATIC', 'DOT', 'LTC', 'ATOM', 'LINK', 'XMR', 'TIA'];
          const quoteAssets = ['EUR', 'USD', 'BTC'];
          
          const apiUrl = 'https://min-api.cryptocompare.com/data/pricemultifull';
          const params = new URLSearchParams({
            fsyms: baseAssets.join(','),
            tsyms: quoteAssets.join(','),
            api_key: tokenData.token
          });
          
          const response = await fetch(`${apiUrl}?${params}`);
          
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data || !data.RAW) {
            throw new Error('Invalid API response format');
          }
          
          const marketDataArray: MarketData[] = [];
          let rank = 1;
          
          for (const baseAsset of baseAssets) {
            if (!(baseAsset in data.RAW)) continue;
            
            for (const quoteAsset of quoteAssets) {
              if (baseAsset === quoteAsset) continue;
              if (quoteAsset === 'BTC' && baseAsset === 'BTC') continue;
              
              if (quoteAsset in data.RAW[baseAsset]) {
                const pairData = data.RAW[baseAsset][quoteAsset];
                
                if (!(baseAsset in ASSETS) || !(quoteAsset in ASSETS)) continue;
                
                marketDataArray.push({
                  pair: `${baseAsset}/${quoteAsset}`,
                  baseAsset: baseAsset as AssetTicker,
                  quoteAsset: quoteAsset as AssetTicker,
                  price: pairData.PRICE || 0,
                  change24h: pairData.CHANGEPCT24HOUR || 0,
                  change7d: 0,
                  marketCap: pairData.MKTCAP || 0,
                  volume: pairData.TOTALVOLUME24H || 0,
                  rank: rank++,
                  marginMultiplier: pairData.MARGINALIZED ? pairData.MARGINALIZED : undefined
                });
              }
            }
          }
          
          marketDataArray.sort((a, b) => b.marketCap - a.marketCap);
          
          marketDataArray.forEach((item, index) => {
            item.rank = index + 1;
          });
          
          setMarketData(marketDataArray);
          setError(null);
        } catch (error) {
          console.error('Error fetching market data:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch market data');
        }
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [dataSource]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Update prices periodically
  useEffect(() => {
    // Fast polling when visible, slow when tab is hidden
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMarketData();
      }
    }, document.visibilityState === 'visible' ? 30000 : 120000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMarketData();
        clearInterval(interval);
        const newInterval = setInterval(() => {
          fetchMarketData();
        }, 30000);
        return newInterval;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMarketData]);

  // Initialize TanStack Table with filtered data
  const table = useReactTable({
    data: filteredMarketData,
    columns,
    state: {
      sorting,
      columnOrder,
      columnVisibility,
    },
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    enableSortingRemoval: false,
  });

  // Set up virtualization for rows
  const { rows } = table.getRowModel();
  
  // Configure the virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48, // Estimate row height in pixels
    overscan: 10, // Number of items to render before/after visible area
  });

  // Create refs to store calculated widths for DOM measurement
  const headerRefs = useRef<Record<string, HTMLElement | null>>({});

  // Calculate total width of all columns to ensure consistency
  const getTotalColumnsWidth = useCallback(() => {
    const visibleColumns = table.getVisibleLeafColumns().filter(column => {
      const columnId = column.id;
      return columnVisibility[columnId] !== false && dynamicVisibility[columnId] !== false;
    });
    
    return visibleColumns.reduce(
      (total, column) => {
        const columnId = column.id as keyof typeof columnSizes;
        return total + (columnSizes[columnId] || 100);
      },
      0
    );
  }, [table, columnSizes, columnVisibility, dynamicVisibility]);

  // Apply improved dynamic column hiding based on widget registry sizes
  useEffect(() => {
    const checkWidth = () => {
      try {
        if (!containerRef.current) return;
        
        const containerWidth = containerRef.current.clientWidth;
        
        // Define column display priorities (lower number = higher priority)
        const columnPriorities = {
          pair: 1,      // Always show pair
          price: 2,     // Price is second most important
          change24h: 3, // 24h change is important
          change7d: 4,  // 7d change comes next
          marketCap: 5, // Market cap is less critical
          volume: 6,    // Volume is lowest priority
        };
        
        // Define breakpoints more precisely based on actual measurement
        // Width ranges based on real-world testing with the component
        const breakpoints = {
          xs: 320,  // Minimum width for the widget (2-3 units)
          sm: 480,  // Small width (~4-5 units)
          md: 640,  // Medium width (~6-7 units)
          lg: 800,  // Large width (~8-9 units)
          xl: 1000, // Extra large width (10+ units)
        };
        
        // Determine how many columns to show based on available width
        let columnsToShowCount: number;
        
        if (containerWidth < breakpoints.xs) {
          columnsToShowCount = 2; // At minimum width, only show pair and price
        } else if (containerWidth < breakpoints.sm) {
          columnsToShowCount = 3; // Show 3 columns at small sizes
        } else if (containerWidth < breakpoints.md) {
          columnsToShowCount = 4; // Show 4 columns at medium sizes
        } else if (containerWidth < breakpoints.lg) {
          columnsToShowCount = 5; // Show 5 columns at large sizes
        } else {
          columnsToShowCount = 6; // Show all columns at extra large sizes
        }
        
        // Get user's column order and visibility preferences
        const userColumnOrder = table.getState().columnOrder || [];
        const userVisibility = table.getState().columnVisibility || {};
        
        // Sort columns by priority (respecting user's order when possible)
        const columnsByPriority = [...userColumnOrder].sort((a, b) => {
          // Use priority if available, or default to alphabetical
          const priorityA = columnPriorities[a as keyof typeof columnPriorities] || 999;
          const priorityB = columnPriorities[b as keyof typeof columnPriorities] || 999;
          return priorityA - priorityB;
        });
        
        // Select columns to show based on priority and count
        const columnsToShow = columnsByPriority.slice(0, columnsToShowCount);
        
        // Create new visibility state
        const newDynamicVisibility: VisibilityState = {};
        
        // Hide columns that aren't in the columns to show list
        userColumnOrder.forEach(columnId => {
          if (userVisibility[columnId] === false || !columnsToShow.includes(columnId)) {
            newDynamicVisibility[columnId] = false;
          }
        });
        
        // Update dynamic visibility state
        setDynamicVisibility(newDynamicVisibility);
        
        // After updating visibility, trigger column size update
        updateColumnSizes();
        
        // Log which columns are visible for debugging
        console.log(`Width: ${containerWidth}px, Showing ${columnsToShowCount} columns:`, 
          columnsToShow.join(', '));
        
      } catch (error) {
        console.error('Error in responsive column hiding:', error);
      }
    };
    
    // Run it without debounce first
    checkWidth();
    
    // Debounced version
    const debouncedCheckWidth = debounce(checkWidth, 150);
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(debouncedCheckWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [table, debounce, updateColumnSizes]);

  if (error) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-[hsl(var(--color-widget-highlight-bg))] rounded-lg p-6 text-center">
            <AlertTriangleIcon className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h3 className="text-lg font-medium mb-2">Unable to load market data</h3>
            <p className="text-[hsl(var(--color-widget-muted-text))] mb-4">
              {error.includes('Invalid API response') 
                ? 'The market data service is currently unavailable. This could be due to maintenance or API changes.'
                : error}
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setError(null);
                setIsInitialLoading(true);
                fetchMarketData?.(); // Fix the fetchMarketData reference
              }}
              className="mx-auto"
            >
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn("h-full flex flex-col relative", className)}
      ref={containerRef}
    >
      <div className="flex-1 min-h-0 relative w-full">
        <div className="h-full w-full relative">
          <div 
            className="h-full overflow-y-auto overflow-x-auto" 
            ref={tableContainerRef}
          >
            {isInitialLoading ? (
              <Table className="w-full table-fixed">
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="bg-[hsl(var(--color-widget-header))]">
                    {table.getHeaderGroups()[0].headers
                      .filter(header => {
                        const columnId = header.column.id;
                        return columnVisibility[columnId] !== false && dynamicVisibility[columnId] !== false;
                      })
                      .map((header) => (
                        <DraggableTableHeader key={header.id} header={header} currentTheme={currentTheme} />
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <SkeletonRow key={index} isMinWidth={dynamicVisibility.change24h === false} />
                  ))}
                </TableBody>
              </Table>
            ) : error ? (
              <Table className="w-full table-fixed">
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="bg-[hsl(var(--color-widget-header))]">
                    {table.getHeaderGroups()[0].headers
                      .filter(header => {
                        const columnId = header.column.id;
                        return columnVisibility[columnId] !== false && dynamicVisibility[columnId] !== false;
                      })
                      .map((header) => (
                        <DraggableTableHeader key={header.id} header={header} currentTheme={currentTheme} />
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={Object.keys(columnVisibility).filter(id => columnVisibility[id] !== false).length} className="h-24 text-center">
                      <div className="text-red-500">{error}</div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : marketData.length === 0 ? (
              <Table className="w-full table-fixed">
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="bg-[hsl(var(--color-widget-header))]">
                    {table.getHeaderGroups()[0].headers
                      .filter(header => {
                        const columnId = header.column.id;
                        return columnVisibility[columnId] !== false && dynamicVisibility[columnId] !== false;
                      })
                      .map((header) => (
                        <DraggableTableHeader key={header.id} header={header} currentTheme={currentTheme} />
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={Object.keys(columnVisibility).filter(id => columnVisibility[id] !== false).length} className="h-24 text-center">
                      <div className="text-sm text-muted-foreground">No market data found</div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="w-full">
                <div className="sticky top-0 z-20 w-full flex bg-[hsl(var(--color-widget-header))] border-b border-border">
                  {table.getHeaderGroups()[0].headers
                    .filter(header => {
                      const columnId = header.column.id;
                      return columnVisibility[columnId] !== false && dynamicVisibility[columnId] !== false;
                    })
                    .map((header) => {
                      const columnId = header.column.id;
                      const isPairColumn = columnId === 'pair';
                      const isNarrowColumn = columnId === 'favorite';
                      const isSorted = header.column.getIsSorted();
                      
                      // Calculate column width to match body cells
                      const totalWidth = getTotalColumnsWidth();
                      const visibleColumnsCount = table.getVisibleLeafColumns().length;
                      const width = columnSizes[columnId as keyof typeof columnSizes] || 
                                (isPairColumn ? Math.max(180, totalWidth * 0.3) : 
                                 Math.max(110, totalWidth / visibleColumnsCount));
                      
                      return (
                        <div
                          key={header.id}
                          className={cn(
                            "px-4 py-2 h-10 flex items-center",
                            isPairColumn ? "justify-start" : "justify-end",
                            isNarrowColumn && "p-0 w-[30px] max-w-[30px]",
                            "cursor-pointer hover:text-foreground/80"
                          )}
                          style={{
                            width: isNarrowColumn ? 30 : width,
                            minWidth: isNarrowColumn ? 30 : width,
                            flexShrink: 0,
                          }}
                          onClick={() => {
                            if (header.column.getCanSort()) {
                              header.column.toggleSorting();
                            }
                          }}
                          aria-sort={
                            isSorted === "asc"
                              ? "ascending"
                              : isSorted === "desc"
                                ? "descending"
                                : "none"
                          }
                        >
                          <div className="relative w-full">
                            <div className="absolute -inset-x-[1px] -inset-y-[0.5px] bg-[hsl(var(--color-widget-header))] shadow-[0_0_0_1px_hsl(var(--color-widget-header))]"></div>
                            <div className={cn(
                              "relative z-10 flex items-center gap-1",
                              isPairColumn ? "justify-start" : "justify-end"
                            )}>
                              <span className={cn(
                                "truncate", 
                                isPairColumn ? "text-left" : "text-right", 
                                isNarrowColumn && "sr-only"
                              )}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(header.column.columnDef.header, header.getContext())}
                              </span>
                              {header.column.getCanSort() && !isNarrowColumn && isSorted && (
                                <div className="ml-1 h-4 w-4 flex items-center justify-center">
                                  {isSorted === "asc" ? (
                                    <ChevronUp className="shrink-0" size={16} aria-hidden="true" />
                                  ) : (
                                    <ChevronDownIcon className="shrink-0" size={16} aria-hidden="true" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                <div 
                  style={{ 
                    height: `${rowVirtualizer.getTotalSize()}px`, 
                    width: '100%', 
                    position: 'relative',
                    overflow: 'hidden' 
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map(virtualRow => {
                    const row = rows[virtualRow.index];
                    const visibleCells = row.getVisibleCells().filter(cell => {
                      const columnId = cell.column.id;
                      return columnVisibility[columnId] !== false && dynamicVisibility[columnId] !== false;
                    });
                    
                    // Calculate total width to ensure proper alignment
                    const totalWidth = getTotalColumnsWidth();
                    
                    return (
                      <div
                        key={row.id}
                        data-index={virtualRow.index}
                        className={cn(
                          "absolute top-0 left-0 flex",
                          "hover:bg-[hsl(var(--color-widget-hover))]",
                          virtualRow.index % 2 === 0 ? "bg-transparent" : "bg-[hsl(var(--color-widget-alt-row))]"
                        )}
                        style={{
                          height: `48px`, // Fixed row height
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          display: 'flex',
                        }}
                      >
                        {visibleCells.map(cell => {
                          const columnId = cell.column.id;
                          const isNarrowColumn = columnId === 'favorite';
                          const isPairColumn = columnId === 'pair';
                          
                          // Get width from columnSizes or calculate proportion of container
                          const visibleColumnsCount = table.getVisibleLeafColumns().length;
                          const width = columnSizes[columnId as keyof typeof columnSizes] || 
                                     (isPairColumn ? Math.max(180, totalWidth * 0.3) : 
                                      Math.max(110, totalWidth / visibleColumnsCount));
                          
                          return (
                            <div
                              key={cell.id}
                              className={cn(
                                "flex items-center px-4 py-2 overflow-hidden",
                                isNarrowColumn && "w-[30px] max-w-[30px] p-0",
                                isPairColumn ? "justify-start" : "justify-end",
                                "border-b border-border"
                              )}
                              style={{
                                width: isNarrowColumn ? 30 : width,
                                minWidth: isNarrowColumn ? 30 : width,
                                flexShrink: 0,
                              }}
                              ref={(el) => {
                                // Store refs to header cells for measurements
                                if (virtualRow.index === 0) {
                                  headerRefs.current[columnId] = el;
                                }
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* Add fade mask at the bottom of the table */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[hsl(var(--color-widget-bg))] to-transparent pointer-events-none z-30"></div>
        </div>
      </div>
    </div>
  );
});

// Add displayName for easier debugging
MarketsWidget.displayName = 'MarketsWidget';

export default MarketsWidget; 

// Define storage key prefix for localStorage
const STORAGE_KEY_PREFIX = 'markets-widget-';
const STORAGE_KEYS = {
  SELECTED_QUOTE_ASSET: `${STORAGE_KEY_PREFIX}selected-quote-asset`,
  SECONDARY_CURRENCY: `${STORAGE_KEY_PREFIX}secondary-currency`,
  COLUMN_VISIBILITY: `${STORAGE_KEY_PREFIX}column-visibility`,
  COLUMN_ORDER: `${STORAGE_KEY_PREFIX}column-order`,
  SORTING: `${STORAGE_KEY_PREFIX}sorting`,
};

// Add the missing getStoredValue function
const getStoredValue = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from localStorage for key ${key}:`, error);
    return defaultValue;
  }
};