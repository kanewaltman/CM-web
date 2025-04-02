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
  Star, 
  Search, 
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

// Format price with appropriate number of decimal places
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

// Format market cap and volume to K, M, B, T
const formatLargeNumber = (value: number) => {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  } else if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toLocaleString();
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

interface MarketsWidgetProps {
  className?: string;
  compact?: boolean;
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
const SkeletonRow: React.FC = () => (
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
      <div className="w-24 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
    <TableCell className="text-right">
      <div className="w-16 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
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

// DragAlongCell Component (that moves along with its header)
const DragAlongCell = ({ cell, currentTheme }: { cell: Cell<MarketData, unknown>, currentTheme: 'light' | 'dark' }) => {
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
};

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

export const MarketsWidget = forwardRef<MarketsWidgetRef, MarketsWidgetProps>(({ className }, ref) => {
  const { theme, resolvedTheme } = useTheme();
  const { dataSource } = useDataSource();
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [filteredData, setFilteredData] = useState<MarketData[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  
  // Initialize state with values from localStorage
  const [sorting, setSorting] = useState<SortingState>(
    getStoredValue(STORAGE_KEYS.SORTING, [{ id: 'marketCap', desc: true }])
  );
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(getStoredValue<string[]>(STORAGE_KEYS.FAVORITES, []))
  );
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(
    getStoredValue(STORAGE_KEYS.SHOW_ONLY_FAVORITES, false)
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    getStoredValue(STORAGE_KEYS.COLUMN_VISIBILITY, {})
  );
  const [selectedQuoteAsset, setSelectedQuoteAsset] = useState<AssetTicker | 'ALL'>(
    getStoredValue<AssetTicker | 'ALL'>(STORAGE_KEYS.SELECTED_QUOTE_ASSET, 'ALL')
  );
  const [secondaryCurrency, setSecondaryCurrency] = useState<AssetTicker | null>(
    getStoredValue<AssetTicker | null>(STORAGE_KEYS.SECONDARY_CURRENCY, null)
  );
  
  // Add search state
  const [searchQuery, setSearchQuery] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnSizes, setColumnSizes] = useState({
    pair: 200, // Increased to accommodate favorite star
    price: 120,
    change24h: 100,
    change7d: 100,
    marketCap: 140,
    volume: 140
  });

  // Add a separate state for tracking dynamic column visibility based on container width
  const [dynamicVisibility, setDynamicVisibility] = useState<VisibilityState>({});

  // Persist state changes to localStorage
  useEffect(() => {
    setStoredValue(STORAGE_KEYS.FAVORITES, Array.from(favorites));
  }, [favorites]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.SHOW_ONLY_FAVORITES, showOnlyFavorites);
  }, [showOnlyFavorites]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.COLUMN_VISIBILITY, columnVisibility);
  }, [columnVisibility]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.SELECTED_QUOTE_ASSET, selectedQuoteAsset);
  }, [selectedQuoteAsset]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.SECONDARY_CURRENCY, secondaryCurrency);
  }, [secondaryCurrency]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.SORTING, sorting);
  }, [sorting]);

  // Get unique quote assets from market data
  const quoteAssets = useMemo(() => {
    const assets = new Set<AssetTicker>();
    marketData.forEach(item => assets.add(item.quoteAsset));
    return Array.from(assets);
  }, [marketData]);

  // Helper function to check if an asset matches the search query
  const assetMatchesSearch = useCallback((item: MarketData, query: string) => {
    if (!query.trim()) return true;
    
    const normalizedQuery = query.trim().toLowerCase();
    const [baseAsset, quoteAsset] = item.pair.split('/');
    
    // Check if query matches ticker symbols
    if (item.pair.toLowerCase().includes(normalizedQuery)) return true;
    if (baseAsset.toLowerCase().includes(normalizedQuery)) return true;
    if (quoteAsset.toLowerCase().includes(normalizedQuery)) return true;
    
    // Check if query matches full asset names
    const baseAssetFullName = (baseAsset in ASSETS) ? ASSETS[baseAsset as keyof typeof ASSETS]?.name.toLowerCase() || '' : '';
    const quoteAssetFullName = (quoteAsset in ASSETS) ? ASSETS[quoteAsset as keyof typeof ASSETS]?.name.toLowerCase() || '' : '';
    
    if (baseAssetFullName.includes(normalizedQuery)) return true;
    if (quoteAssetFullName.includes(normalizedQuery)) return true;
    
    // Check for combined searches like "eth usd"
    const queryParts = normalizedQuery.split(/\s+/);
    if (queryParts.length > 1) {
      const [queryBase, queryQuote] = queryParts;
      
      const baseMatches = 
        baseAsset.toLowerCase().includes(queryBase) || 
        baseAssetFullName.includes(queryBase);
      
      const quoteMatches = 
        quoteAsset.toLowerCase().includes(queryQuote) || 
        quoteAssetFullName.includes(queryQuote);
      
      if (baseMatches && quoteMatches) return true;
      
      // Also check the reverse order
      const baseMatchesReverse = 
        baseAsset.toLowerCase().includes(queryQuote) || 
        baseAssetFullName.includes(queryQuote);
      
      const quoteMatchesReverse = 
        quoteAsset.toLowerCase().includes(queryBase) || 
        quoteAssetFullName.includes(queryBase);
      
      if (baseMatchesReverse && quoteMatchesReverse) return true;
    }
    
    return false;
  }, []);

  // Filter market data based on selected quote asset, favorites filter, and search query
  const filteredMarketData = useMemo(() => {
    // First apply quote asset filter
    let filtered = selectedQuoteAsset === 'ALL' 
      ? marketData 
      : marketData.filter(item => item.quoteAsset === selectedQuoteAsset);
    
    // Then apply favorites filter if enabled
    if (showOnlyFavorites) {
      filtered = filtered.filter(item => favorites.has(item.pair));
    }
    
    // Finally, apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => assetMatchesSearch(item, searchQuery));
    }
    
    return filtered;
  }, [marketData, selectedQuoteAsset, favorites, showOnlyFavorites, searchQuery, assetMatchesSearch]);

  // Define columns for the table
  const columns = useMemo<ColumnDef<MarketData>[]>(() => [
    {
      id: 'pair',
      header: 'Pair',
      accessorKey: 'pair',
      cell: ({ row }) => {
        const baseAssetConfig = ASSETS[row.original.baseAsset];
        const quoteAssetConfig = ASSETS[row.original.quoteAsset];
        const marginMultiplier = row.original.marginMultiplier;
        const pair = row.original.pair;
        const isFavorite = favorites.has(pair);
        
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                "flex items-center justify-center p-0 mr-1",
                isFavorite ? "text-yellow-400 hover:text-yellow-500" : "text-muted-foreground/40 hover:text-muted-foreground/60"
              )}
              onClick={() => {
                handleFavoriteToggle(pair);
              }}
            >
              <Star
                size={16}
                className={cn(
                  "transition-colors",
                  isFavorite ? "fill-current" : "fill-none"
                )}
              />
            </button>
            
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
        const pricePrefix = secondaryCurrency ? 
          (secondaryCurrency === 'EUR' ? '€' : 
           secondaryCurrency === 'USD' ? '$' :
           secondaryCurrency === 'GBP' ? '£' : '') :
          (row.original.quoteAsset === 'EUR' ? '€' : 
           row.original.quoteAsset === 'USD' ? '$' :
           row.original.quoteAsset === 'GBP' ? '£' : '');
        
        // Use original price or converted price based on secondary currency
        const displayPrice = secondaryCurrency && row.original.quoteAsset !== secondaryCurrency ? 
          row.original.price * 1.08 : // Example conversion rate
          row.original.price;
        
        return (
          <div className="text-right font-jakarta font-mono font-semibold text-sm leading-[150%]">
            {pricePrefix}{formatPrice(displayPrice)}
          </div>
        );
      },
      size: columnSizes.price,
    },
    {
      id: 'change24h',
      header: '24h %',
      accessorKey: 'change24h',
      cell: ({ row }) => (
        <div className={cn(
          "text-right whitespace-nowrap font-mono",
          row.original.change24h > 0 ? "text-price-up" : 
          row.original.change24h < 0 ? "text-price-down" : 
          "text-muted-foreground/80"
        )}>
          {row.original.change24h > 0 ? '+' : ''}{row.original.change24h.toFixed(2)}%
        </div>
      ),
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
        const pricePrefix = secondaryCurrency ? 
          (secondaryCurrency === 'EUR' ? '€' : 
           secondaryCurrency === 'USD' ? '$' :
           secondaryCurrency === 'GBP' ? '£' : '') :
          (row.original.quoteAsset === 'EUR' ? '€' : 
           row.original.quoteAsset === 'USD' ? '$' :
           row.original.quoteAsset === 'GBP' ? '£' : '');
        
        // Use original marketCap or converted marketCap based on secondary currency
        const displayMarketCap = secondaryCurrency && row.original.quoteAsset !== secondaryCurrency ? 
          row.original.marketCap * 1.08 : // Example conversion rate
          row.original.marketCap;
        
        return (
          <div className="text-right font-jakarta font-semibold text-sm leading-[150%]">
            {displayMarketCap > 0 ? `${pricePrefix}${formatLargeNumber(displayMarketCap)}` : '-'}
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
        const pricePrefix = secondaryCurrency ? 
          (secondaryCurrency === 'EUR' ? '€' : 
           secondaryCurrency === 'USD' ? '$' :
           secondaryCurrency === 'GBP' ? '£' : '') :
          (row.original.quoteAsset === 'EUR' ? '€' : 
           row.original.quoteAsset === 'USD' ? '$' :
           row.original.quoteAsset === 'GBP' ? '£' : '');
        
        // Use original volume or converted volume based on secondary currency
        const displayVolume = secondaryCurrency && row.original.quoteAsset !== secondaryCurrency ? 
          row.original.volume * 1.08 : // Example conversion rate
          row.original.volume;
        
        return (
          <div className="text-right font-jakarta font-semibold text-sm leading-[150%]">
            {pricePrefix}{formatLargeNumber(displayVolume)}
          </div>
        );
      },
      size: columnSizes.volume,
    }
  ], [favorites, columnSizes, secondaryCurrency]);

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

  const fetchMarketData = useCallback(async () => {
    console.log(`[MarketsWidget] Fetching market data with data source: ${dataSource}`);
    try {
      setIsInitialLoading(true);

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
    }
  }, [dataSource]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Update prices periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarketData();
    }, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
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

  // Expose the table instance via ref
  useImperativeHandle(ref, () => ({
    getTable: () => table
  }), [table]);

  // Filter visible columns based on both user preferences and dynamic constraints
  const visibleColumnIds = useMemo(() => {
    // Start with user preferences
    const userVisibleColumns = columnOrder.filter(id => columnVisibility[id] !== false);
    
    // Then apply dynamic constraints without modifying user preferences
    return userVisibleColumns.filter(id => dynamicVisibility[id] !== false);
  }, [columnOrder, columnVisibility, dynamicVisibility]);

  // Update favorites and handle emptying favorites while in favorites view
  const handleFavoriteToggle = useCallback((pair: string) => {
    setFavorites(prevFavorites => {
      const newFavorites = new Set(prevFavorites);
      if (newFavorites.has(pair)) {
        newFavorites.delete(pair);
        // If we're removing the last favorite while in favorites view, reset to all view
        if (newFavorites.size === 0 && showOnlyFavorites) {
          setShowOnlyFavorites(false);
        }
      } else {
        newFavorites.add(pair);
      }
      return newFavorites;
    });
  }, [showOnlyFavorites]);

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
      className={cn("h-full flex flex-col p-2 relative", className)}
      ref={containerRef}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {/* Search input - moved to the far left */}
        <div className="relative h-9">
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-[200px] pl-8 pr-8"
          />
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {searchQuery && (
            <button 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Button 
          variant={showOnlyFavorites ? "default" : "outline"} 
          size="sm"
          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          className={cn(
            showOnlyFavorites ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""
          )}
        >
          <Star
            size={16}
            className={cn(
              "mr-1 transition-colors",
              showOnlyFavorites ? "fill-black" : "fill-none"
            )}
          />
          Favorites
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {selectedQuoteAsset === 'ALL' ? 'All Pairs' : `${selectedQuoteAsset} Pairs`}
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSelectedQuoteAsset('ALL')}>
              All Pairs
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {quoteAssets.map((asset) => (
              <DropdownMenuItem 
                key={asset}
                onClick={() => setSelectedQuoteAsset(asset)}
              >
                {asset} Pairs
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {secondaryCurrency ? `Show in ${secondaryCurrency}` : 'Secondary Currency'}
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSecondaryCurrency(null)}>
              None
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {['USD', 'EUR', 'GBP'].map((currency) => (
              <DropdownMenuItem 
                key={currency}
                onClick={() => setSecondaryCurrency(currency as AssetTicker)}
              >
                Show in {currency}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 min-h-0 relative w-full">
        <div className="absolute left-[8px] right-[16px] h-[1px] bg-border z-30" style={{ top: '40px' }}></div>
        <div className="h-full w-full overflow-x-auto">
          <Table className="w-full table-fixed">
            <TableHeader className="sticky top-0 z-20">
              <TableRow className="bg-[hsl(var(--color-widget-header))]">
                {table.getHeaderGroups()[0].headers
                  .filter(header => visibleColumnIds.includes(header.column.id))
                  .map((header) => (
                    <DraggableTableHeader key={header.id} header={header} currentTheme={currentTheme} />
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInitialLoading ? (
                // Loading skeleton rows
                Array.from({ length: 10 }).map((_, index) => (
                  <SkeletonRow key={index} />
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnIds.length} className="h-24 text-center">
                    <div className="text-red-500">{error}</div>
                  </TableCell>
                </TableRow>
              ) : marketData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnIds.length} className="h-24 text-center">
                    <div className="text-sm text-muted-foreground">No market data found</div>
                  </TableCell>
                </TableRow>
              ) : (
                // Actual data rows
                table.getRowModel().rows.map((row, index) => (
                  <TableRow 
                    key={row.id} 
                    className={cn(
                      "group hover:bg-[hsl(var(--color-widget-hover))]",
                      index % 2 === 0 ? "bg-transparent" : "bg-[hsl(var(--color-widget-alt-row))]"
                    )} 
                    isHeader={false}
                  >
                    {row.getVisibleCells()
                      .filter(cell => visibleColumnIds.includes(cell.column.id))
                      .map((cell) => (
                        <DragAlongCell key={cell.id} cell={cell} currentTheme={currentTheme} />
                      ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
});

// Add displayName for easier debugging
MarketsWidget.displayName = 'MarketsWidget';

export default MarketsWidget; 

const STORAGE_KEY_PREFIX = 'markets-widget-';
const STORAGE_KEYS = {
  FAVORITES: `${STORAGE_KEY_PREFIX}favorites`,
  SHOW_ONLY_FAVORITES: `${STORAGE_KEY_PREFIX}show-only-favorites`,
  SELECTED_QUOTE_ASSET: `${STORAGE_KEY_PREFIX}selected-quote-asset`,
  SECONDARY_CURRENCY: `${STORAGE_KEY_PREFIX}secondary-currency`,
  COLUMN_VISIBILITY: `${STORAGE_KEY_PREFIX}column-visibility`,
  COLUMN_ORDER: `${STORAGE_KEY_PREFIX}column-order`,
  SORTING: `${STORAGE_KEY_PREFIX}sorting`,
};

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

const setStoredValue = <T,>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage for key ${key}:`, error);
  }
};