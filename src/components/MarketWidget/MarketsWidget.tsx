import React, { useState, useEffect, useCallback, useMemo, useRef, useId, CSSProperties, forwardRef, useImperativeHandle } from 'react';
import isEqual from 'fast-deep-equal';

// Disable verbose logging in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
}

import { useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { ASSET_TYPE } from '@/assets/common';
import { AssetIcon } from '@/assets/AssetIcon';
import { formatAmount, formatCurrency, formatPercentage } from '@/utils/formatting';
import { coinGeckoService } from '@/services/coinGeckoService';
import { getApiUrl } from '@/lib/api-config';
import { ASSET_TICKER_TO_COINGECKO_ID } from '@/services/coinGeckoService';
import { SAMPLE_MARKET_DATA, SampleMarketDataItem, getBalancedSampleData } from '@/services/marketsSampleData';
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '../ui/table';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { useDataSource } from '@/lib/DataSourceContext';
import { 
  ChevronDown as ChevronDownIcon, 
  X,
  AlertTriangle as AlertTriangleIcon,
  RefreshCw as RefreshCwIcon,
  ChevronUp,
  SlidersHorizontal,
  GripVertical as GripVerticalIcon,
  Plus,
  ListPlus,
  Sparkles,
  Search as SearchIcon,
  Plus as PlusIcon,
  ListChecks,
  ChevronsUpDown
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem 
} from '../ui/dropdown-menu';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { MarketsWidgetHeader } from './MarketsWidgetHeader';
import { ListManager } from './MarketsWidgetMenu';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../ui/dialog';
import { toast } from '../ui/use-toast';

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
  VisibilityState,
  ColumnOrderState
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
  DragStartEvent,
  DragMoveEvent,
  DragOverEvent
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
  // Shrink cache threshold to reduce memory churn
  if (priceFormatterCache.size > 500) {
    priceFormatterCache.clear();
  }
  priceFormatterCache.set(price, result);
  return result;
};

// Format market cap and volume to K, M, B, T - memoize this function
const formatLargeNumber = (value: number) => {
  // For zero values 
  if (value === 0) return '0';
  
  // Format numbers based on their magnitude
  if (value >= 1_000_000_000_000) {
    // Trillions - 2 decimal places
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  } else if (value >= 1_000_000_000) {
    // Billions - 2 decimal places
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 10_000_000) {
    // Larger millions - 2 decimal places
    return `${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000_000) {
    // Smaller millions - avoid showing 0.00M for very small values
    const inMillions = value / 1_000_000;
    // If less than 0.01 million, show in thousands instead
    if (inMillions < 0.01) {
      return `${(value / 1_000).toFixed(2)}K`;
    }
    return `${inMillions.toFixed(2)}M`;
  } else if (value >= 10_000) {
    // Larger thousands - 1 decimal place 
    return `${(value / 1_000).toFixed(1)}K`;
  } else if (value >= 1_000) {
    // Smaller thousands - 2 decimal places
    return `${(value / 1_000).toFixed(2)}K`;
  } else if (value >= 100) {
    // 100 to 999 - no decimal places
    return value.toFixed(0);
  } else if (value >= 10) {
    // 10 to 99 - 1 decimal place
    return value.toFixed(1);
  } else if (value >= 1) {
    // 1 to 9.99 - 2 decimal places
    return value.toFixed(2);
  } else if (value > 0) {
    // Small values - use appropriate precision based on size
    if (value >= 0.1) {
      return value.toFixed(2);
    } else if (value >= 0.01) {
      return value.toFixed(3);
    } else if (value >= 0.001) {
      return value.toFixed(4);
    } else {
      // For very small values, use scientific notation
      return value.toExponential(2);
    }
  }
  
  // Fallback for any other case
  return value.toLocaleString();
};

// Cache large number formatter results
const largeNumberFormatterCache = new Map<number, string>();
const memoizedFormatLargeNumber = (value: number) => {
  if (largeNumberFormatterCache.has(value)) {
    return largeNumberFormatterCache.get(value)!;
  }
  const result = formatLargeNumber(value);
  if (largeNumberFormatterCache.size > 500) {
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

// Add this CSS class at the top of the file - this will be applied to our column cells
const COLUMN_TRANSITION_CLASSES = "transition-all duration-300 ease-in-out";

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
        "sticky top-0 bg-[hsl(var(--color-widget-header))] z-20 whitespace-nowrap cursor-pointer hover:text-foreground/80 group text-sm text-muted-foreground",
        isNarrowColumn && "p-0 w-[30px] max-w-[30px]",
        COLUMN_TRANSITION_CLASSES
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
          isNarrowColumn && "p-0 w-[30px] max-w-[30px]",
          COLUMN_TRANSITION_CLASSES
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
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Update internal state immediately for responsive UI
    setInternalChecked(!internalChecked);
    
    // Debounce the parent state update to avoid cascading re-renders
    // This helps prevent flickering when toggling columns
    requestAnimationFrame(() => {
      onCheckedChange(!internalChecked);
    });
  }, [internalChecked, onCheckedChange]);
  
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
  
  // Get the updateColumnSizes function from the table context if available
  const tableRef = (table as any)._getTableOptions?.()?.meta?.updateColumnSizes;
  
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
    
    // If available, update column sizes after a delay to prevent flickering
    if (typeof tableRef === 'function') {
      setTimeout(() => {
        tableRef();
      }, 50);
    }
  };

  return (
    <>
      <DropdownMenuLabel>Customize Columns</DropdownMenuLabel>
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

// Add a deep comparison memo utility using fast-deep-equal
const useDeepCompareMemo = <T,>(factory: () => T, deps: React.DependencyList): T => {
  const ref = useRef<{ deps: React.DependencyList; value: T }>({ deps: [], value: factory() });
  if (!isEqual(ref.current.deps, deps)) {
    ref.current.deps = deps;
    ref.current.value = factory();
  }
  return ref.current.value;
};

export const MarketsWidget = forwardRef<MarketsWidgetRef, MarketsWidgetProps>((props, ref) => {
  const { 
    className,
    searchQuery: externalSearchQuery,
    onSearchQueryChange: externalSearchQueryChange,
    selectedQuoteAsset: externalSelectedQuoteAsset,
    onSelectedQuoteAssetChange: externalSelectedQuoteAssetChange,
    secondaryCurrency: externalSecondaryCurrency,
    onSecondaryCurrencyChange: externalSecondaryCurrencyChange,
    onQuoteAssetsChange,
    compact = false,
    onRemove,
  } = props;
  
  const { theme, resolvedTheme } = useTheme();
  const { dataSource } = useDataSource();
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [filteredData, setFilteredData] = useState<MarketData[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Add custom lists state
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showAddToListDialog, setShowAddToListDialog] = useState(false);
  const [selectedAssetForList, setSelectedAssetForList] = useState<string | null>(null);
  
  // Load custom lists from localStorage
  useEffect(() => {
    try {
      const savedLists = localStorage.getItem(MARKETS_LISTS_KEY);
      const savedActiveList = localStorage.getItem(ACTIVE_LIST_KEY);
      
      if (savedLists) {
        setCustomLists(JSON.parse(savedLists));
      }
      
      if (savedActiveList) {
        setActiveListId(JSON.parse(savedActiveList));
      }
    } catch (error) {
      console.error('Error loading custom lists:', error);
    }
  }, []);
  
  // Listen for custom events for list changes
  useEffect(() => {
    const handleListsUpdated = (event: CustomEvent) => {
      if (event.detail?.lists) {
        setCustomLists(event.detail.lists);
      }
    };
    
    const handleActiveListChanged = (event: CustomEvent) => {
      if ('listId' in event.detail) {
        setActiveListId(event.detail.listId);
      }
    };
    
    // Add event listeners
    document.addEventListener('markets-lists-updated', handleListsUpdated as EventListener);
    document.addEventListener('markets-active-list-changed', handleActiveListChanged as EventListener);
    
    // Cleanup event listeners
    return () => {
      document.removeEventListener('markets-lists-updated', handleListsUpdated as EventListener);
      document.removeEventListener('markets-active-list-changed', handleActiveListChanged as EventListener);
    };
  }, []);
  
  // Add an asset to a list
  const addAssetToList = useCallback((listId: string, asset: string) => {
    const updatedLists = customLists.map(list => {
      if (list.id === listId) {
        // Only add if not already in the list
        if (!list.assets.includes(asset)) {
          return {
            ...list,
            assets: [...list.assets, asset]
          };
        }
      }
      return list;
    });
    
    setCustomLists(updatedLists);
    localStorage.setItem(MARKETS_LISTS_KEY, JSON.stringify(updatedLists));
    
    // Dispatch event for other components
    const event = new CustomEvent('markets-lists-updated', {
      detail: { lists: updatedLists },
      bubbles: true
    });
    document.dispatchEvent(event);
  }, [customLists]);
  
  // Remove an asset from a list
  const removeAssetFromList = useCallback((listId: string, asset: string) => {
    const updatedLists = customLists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          assets: list.assets.filter(a => a !== asset)
        };
      }
      return list;
    });
    
    setCustomLists(updatedLists);
    localStorage.setItem(MARKETS_LISTS_KEY, JSON.stringify(updatedLists));
    
    // Dispatch event for other components
    const event = new CustomEvent('markets-lists-updated', {
      detail: { lists: updatedLists },
      bubbles: true
    });
    document.dispatchEvent(event);
  }, [customLists]);
  
  // Show the add to list dialog
  const handleShowAddToListDialog = useCallback((asset: string) => {
    setSelectedAssetForList(asset);
    setShowAddToListDialog(true);
  }, []);
  
  // Generate a stable ID for this widget instance
  const marketWidgetId = useId();
  
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
  
  // Batch column size updates to reduce flickering
  const batchedColumnSizeUpdate = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Update column sizes based on container width
  const updateColumnSizes = useCallback(() => {
    if (!containerRef.current) return;
    
    // Use a single RAF call to ensure synchronous measurements
    const containerWidth = containerRef.current?.clientWidth || 0;
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
    const newSizes = {...minColumnWidths};
    
    if (containerWidth > totalMinWidth) {
      const extraSpace = containerWidth - totalMinWidth;
      
      // Distribute extra space proportionally to visible columns
      visibleColumnIds.forEach(id => {
        const proportion = columnFlexWeights[id] / totalFlexWeight;
        newSizes[id] = Math.floor(minColumnWidths[id] + (extraSpace * proportion));
      });
    }
    
    // Use a single setState call to avoid multiple re-renders
    setColumnSizes(newSizes);
  }, [columnVisibility, dynamicVisibility, minColumnWidths, columnFlexWeights]);
  
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

  // Only force rerender when secondary currency changes from one value to another (not on initial render)
  const [forceRenderKey, setForceRenderKey] = useState(0);
  const prevSecondaryCurrencyRef = useRef<AssetTicker | null>(null);
  
  useEffect(() => {
    // Only trigger the re-render if this is an actual change, not the initial value
    if (prevSecondaryCurrencyRef.current !== secondaryCurrency && prevSecondaryCurrencyRef.current !== null) {
      setForceRenderKey(prev => prev + 1);
    }
    prevSecondaryCurrencyRef.current = secondaryCurrency;
  }, [secondaryCurrency]);
  
  // Dynamic key for table to force complete re-renders
  const tableKey = useMemo(() => 
    `table-${forceRenderKey}-${secondaryCurrency || 'none'}`, 
    [forceRenderKey, secondaryCurrency]
  );

  useEffect(() => {
    // External/internal quote asset handling (console logs removed)
  }, [externalSelectedQuoteAsset, internalSelectedQuoteAsset]);

  useEffect(() => {
    // External/internal search query handling (console logs removed)
  }, [externalSearchQuery, internalSearchQuery]);

  useEffect(() => {
    // External/internal secondary currency handling (console logs removed)
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

  // Update the filtering logic to apply list filters
  useEffect(() => {
    // Don't filter if no data, search query, or quote asset selection
    if (marketData.length === 0) {
      setFilteredData([]);
      return;
    }

    // Debounce filtering operations to reduce layout thrashing
    const debouncedFilter = () => {
      // Only log in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Filtering ${marketData.length} items with query: "${searchQuery}"`);
      }
      
      // Apply all filters sequentially
      let filtered = [...marketData];
      
      // Filter by selected quote asset if not ALL
      if (selectedQuoteAsset !== 'ALL') {
        filtered = filtered.filter(item => item.quoteAsset === selectedQuoteAsset);
      }
      
      // Apply search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item => 
          // Simple multi-field search
          (item.baseAsset.toLowerCase().includes(query) || 
           item.quoteAsset.toLowerCase().includes(query) ||
           item.pair.toLowerCase().includes(query))
        );
      }
      
      // Filter by custom list if one is active
      if (activeListId) {
        const activeList = customLists.find(list => list.id === activeListId);
        if (activeList) {
          filtered = filtered.filter(item => 
            // Check if the full trading pair is in the assets list
            // If it's an old format list (only base assets), still support that
            activeList.assets.includes(item.pair) || activeList.assets.includes(item.baseAsset)
          );
        }
      }
      
      setFilteredData(filtered);
    };
    
    // Use a short timeout to batch filtering work
    const timeoutId = setTimeout(debouncedFilter, 50);
    return () => clearTimeout(timeoutId);
  }, [marketData, selectedQuoteAsset, searchQuery, activeListId, customLists]);

  // Update the table with filtered data whenever filters change
  useEffect(() => {
    // Filtered data update logic - remove console logging
  }, [filteredData]);

  // Responsive column hiding logic will be implemented after table initialization
  
  // Now let's update the price column cell to show extra info when columns are hidden
  const columns = useMemo<ColumnDef<MarketData>[]>(() => {
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
            <div className="flex items-center gap-2 justify-between group">
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
            </div>
          );
        },
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
            <div className="text-right font-jakarta font-mono font-semibold text-sm leading-[150%] tabular-nums">
              <ValueFlash 
                value={displayPrice} 
                formatter={(price) => `${pricePrefix}${memoizedFormatPrice(price)}`}
              />
            </div>
          );
        },
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
              "text-right whitespace-nowrap font-mono tabular-nums",
              change24h > 0 ? "text-price-up" : 
              change24h < 0 ? "text-price-down" : 
              "text-muted-foreground/80"
            )}>
              <ValueFlash 
                value={change24h} 
                formatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`}
                className={cn(
                  change24h > 0 ? "text-price-up" : 
                  change24h < 0 ? "text-price-down" : 
                  "text-muted-foreground/80"
                )}
              />
            </div>
          );
        },
      },
      {
        id: 'change7d',
        header: '7d %',
        accessorKey: 'change7d',
        cell: ({ row }) => (
          <div className={cn(
            "text-right whitespace-nowrap font-mono tabular-nums",
            row.original.change7d > 0 ? "text-price-up" : 
            row.original.change7d < 0 ? "text-price-down" : 
            "text-muted-foreground/80"
          )}>
            <ValueFlash 
              value={row.original.change7d} 
              formatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`}
              className={cn(
                row.original.change7d > 0 ? "text-price-up" : 
                row.original.change7d < 0 ? "text-price-down" : 
                "text-muted-foreground/80"
              )}
            />
          </div>
        ),
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
          
          // Handle very small values that might be rounding errors
          // Only show values that are meaningfully non-zero (above some threshold)
          const isSignificant = displayMarketCap > 100; // Only show values above $100 or equivalent
          
          return (
            <div className="text-right font-jakarta font-semibold text-sm leading-[150%] tabular-nums">
              {isSignificant ? (
                <ValueFlash 
                  value={displayMarketCap} 
                  formatter={(value) => `${pricePrefix}${memoizedFormatLargeNumber(value)}`}
                />
              ) : '—'}
            </div>
          );
        },
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
          
          // Handle very small values that might be rounding errors
          // Only show values that are meaningfully non-zero (above some threshold)
          const isSignificant = displayVolume > 100; // Only show values above $100 or equivalent
          
          return (
            <div className="text-right font-jakarta font-semibold text-sm leading-[150%] tabular-nums">
              {isSignificant ? (
                <ValueFlash 
                  value={displayVolume} 
                  formatter={(value) => `${pricePrefix}${memoizedFormatLargeNumber(value)}`}
                />
              ) : '—'}
            </div>
          );
        },
      }
    ]
  }, [secondaryCurrency]);

  // Apply sizes separately in a lightweight memo
  const columnsWithSizes = useMemo(() => {
    return columns.map(col => ({
      ...col,
      size: columnSizes[col.id as keyof typeof columnSizes] || 100
    }));
  }, [columns, columnSizes]);

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

  // Add this to track the last update time for visual debugging
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  
  // Add these constants for controlling variations
  const MAX_PRICE_CHANGE_PERCENT = 0.001; // Maximum 0.1% change per update
  const MAX_VOLUME_CHANGE_PERCENT = 0.002; // Maximum 0.2% change per update
  const UPDATE_PROBABILITY = 0.5; // 50% chance for any asset to update
  const VOLUME_UPDATE_PROBABILITY = 0.6; // 60% chance for volume to update when price updates

  // Modify the fetchMarketData function to add better logging and error handling
  const fetchMarketData = useCallback(async () => {
    // Only log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[MarketsWidget] Fetching market data with data source: ${dataSource}`);
    }
    
    if (isRefreshing) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Update already in progress, skipping...');
      }
      return;
    }

    try {
      setIsRefreshing(true);

      if (dataSource === 'sample') {
        try {
          if (process.env.NODE_ENV !== 'production') {
            console.log('Attempting to fetch data from CoinGecko API...');
          }
          
          // Intentionally skip CoinGecko API for now to use our expanded sample data
          throw new Error('Using expanded sample data instead of CoinGecko API');
          
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('Using balanced sample data, total pairs available:', Object.keys(SAMPLE_MARKET_DATA).length);
          }
          
          // If we get here, we're using sample data as fallback
          if (marketData.length === 0) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('Initial load with sample data');
            }
            // Use all sample data instead of a balanced subset
            const sampleDataArray = Object.entries(SAMPLE_MARKET_DATA)
              .map(([pair, details]) => {
                const parts = pair.split('/');
                if (parts.length !== 2) {
                  console.error(`Invalid pair format: ${pair}`);
                  return null;
                }
                
                const baseAsset = parts[0] as AssetTicker;
                const quoteAsset = parts[1] as AssetTicker;
                
                // Debug logging to catch any issues with the quote assets
                console.log(`Processing pair ${pair}: baseAsset=${baseAsset}, quoteAsset=${quoteAsset}`);
                
                // Verify the assets exist in our asset registry
                if (!(baseAsset in ASSETS)) {
                  console.warn(`Base asset not found in ASSETS registry: ${baseAsset}`);
                  return null;
                }
                
                if (!(quoteAsset in ASSETS)) {
                  console.warn(`Quote asset not found in ASSETS registry: ${quoteAsset}`);
                  return null;
                }
                
                // Create market data item with explicit quote asset
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

            // Verify the final data has the expected distribution of quote assets
            const quoteAssetCounts = sampleDataArray.reduce((acc, item) => {
              acc[item.quoteAsset] = (acc[item.quoteAsset] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            
            console.log('Final sample data quote asset distribution:', quoteAssetCounts);
            console.log('Sample data array created with', sampleDataArray.length, 'pairs');
            setMarketData(sampleDataArray);
          } else {
            // Using existing update logic
            setMarketData(prevData => {
              // Track if we actually change any items
              let hasUpdatedAnyItem = false;
              
              return prevData.map(item => {
                // Randomly decide if this item should update
                if (Math.random() > UPDATE_PROBABILITY) {
                  return item; // Skip update for this item
                }

                // Calculate price change
                const priceChangePercent = (Math.random() * 2 - 1) * MAX_PRICE_CHANGE_PERCENT;
                const newPrice = item.price * (1 + priceChangePercent);

                // Increase chances of updates
                const shouldUpdate24h = Math.random() < 0.8; // 80% chance to update with price
                const shouldUpdate7d = Math.random() < 0.6;  // 60% chance to update with price
                
                // Make changes slightly more noticeable
                const change24hDelta = shouldUpdate24h ? (Math.random() * 2 - 1) * 0.08 : 0;
                const change7dDelta = shouldUpdate7d ? (Math.random() * 2 - 1) * 0.1 : 0;
                
                const newChange24h = Math.max(Math.min(item.change24h + change24hDelta, 15), -15);
                const newChange7d = Math.max(Math.min(item.change7d + change7dDelta, 25), -25);

                // More frequent volume updates
                const shouldUpdateVolume = Math.random() < VOLUME_UPDATE_PROBABILITY;
                const volumeChangePercent = shouldUpdateVolume ? (Math.random() * 2 - 1) * MAX_VOLUME_CHANGE_PERCENT : 0;
                const newVolume = item.volume * (1 + volumeChangePercent);

                // Lower the threshold for significant changes
                const hasSignificantChange = 
                  Math.abs(newPrice - item.price) >= 0.0000001 ||
                  Math.abs(newChange24h - item.change24h) >= 0.000001 ||
                  Math.abs(newChange7d - item.change7d) >= 0.000001 ||
                  Math.abs(newVolume - item.volume) >= 0.1;

                // If no significant changes, return original item
                if (!hasSignificantChange) {
                  return item;
                }

                // Mark that we're actually updating something
                hasUpdatedAnyItem = true;

                return {
                  ...item,
                  price: newPrice,
                  change24h: shouldUpdate24h ? newChange24h : item.change24h,
                  change7d: shouldUpdate7d ? newChange7d : item.change7d,
                  volume: shouldUpdateVolume ? newVolume : item.volume,
                  marketCap: Math.abs(priceChangePercent) > 0.0000001 ? item.marketCap * (1 + priceChangePercent) : item.marketCap
                };
              });
            });
          }
          
          if (process.env.NODE_ENV !== 'production') {
            setLastUpdateTime(new Date().toLocaleTimeString());
          }
          setError(null);
        }
      } else {
        // Similar implementation for the real API...
        // keeping this simple for now
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  }, [dataSource, marketData.length]);

  // Replace the existing fetchMarketData useEffect with this improved version
  useEffect(() => {
    let updateInterval: NodeJS.Timeout | null = null;
    let lastUpdateTime = Date.now();
    let isUpdating = false;

    const debouncedFetchData = debounce(async () => {
      if (isUpdating) return;
      
      try {
        isUpdating = true;
        // Use requestAnimationFrame to batch React state updates
        requestAnimationFrame(() => {
          fetchMarketData().catch(err => {
            if (process.env.NODE_ENV !== 'production') {
              console.error('Error fetching market data:', err);
            }
          });
        });
        lastUpdateTime = Date.now();
      } finally {
        isUpdating = false;
      }
    }, UPDATE_DEBOUNCE_TIME);

    const scheduleNextUpdate = () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }

      const interval = document.visibilityState === 'visible' 
        ? UPDATE_INTERVAL_VISIBLE 
        : UPDATE_INTERVAL_HIDDEN;

      updateInterval = setInterval(debouncedFetchData, interval);
    };

    // Handle visibility changes
    const handleVisibilityChange = () => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTime;
      
      if (document.visibilityState === 'visible' && timeSinceLastUpdate > UPDATE_INTERVAL_VISIBLE) {
        debouncedFetchData();
      }
      
      scheduleNextUpdate();
    };

    // Initial fetch
    debouncedFetchData();
    scheduleNextUpdate();

    // Set up visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMarketData]);

  // Initialize TanStack Table with filtered data
  const table = useReactTable({
    data: filteredData,
    columns: columnsWithSizes,
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
    onColumnVisibilityChange: (newState) => {
      setColumnVisibility(newState);
      // Schedule a column size update after visibility changes
      setTimeout(() => {
        updateColumnSizes();
      }, 50);
    },
    enableSortingRemoval: false,
    // Expose the updateColumnSizes function via meta for use in child components
    meta: {
      updateColumnSizes,
    },
  });

  // Expose table instance via ref
  useImperativeHandle(ref, () => ({
    getTable: () => table
  }), [table]);

  // Set up virtualization for rows
  const { rows } = table.getRowModel();
  
  // Configure the virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48, // Estimate row height in pixels
    overscan: 0, // reduce overscan to zero for performance
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
        
        // Define breakpoints more precisely based on actual measurement
        const breakpoints = {
          xs: 320,  
          sm: 480,  
          md: 640,  
          lg: 800,  
          xl: 1000,
        };
        
        // Get user's column order and visibility preferences
        const userColumnOrder = table.getState().columnOrder || [];
        const userVisibility = table.getState().columnVisibility || {};
        
        // Always ensure pair is shown first
        const orderedColumns = userColumnOrder.filter(col => 
          // Only include visible columns (that the user hasn't manually hidden)
          userVisibility[col] !== false
        );
        
        // Always ensure 'pair' is included and is first
        if (!orderedColumns.includes('pair')) {
          orderedColumns.unshift('pair');
        } else if (orderedColumns[0] !== 'pair') {
          // Move pair to the front if it exists but isn't first
          orderedColumns.splice(orderedColumns.indexOf('pair'), 1);
          orderedColumns.unshift('pair');
        }
        
        // Calculate minimum column width requirements (pair + at least one data column)
        const minPairWidth = 150; // Minimum width for pair column
        const minDataColWidth = 100; // Minimum width for data columns
        
        // Determine maximum number of columns that can fit
        let maxFittingColumns = Math.max(
          2, // Always show at least pair + one data column
          Math.floor((containerWidth - minPairWidth) / minDataColWidth) + 1
        );
        
        // Add a buffer to prevent overflow
        maxFittingColumns = Math.max(2, maxFittingColumns - 1);
        
        // Determine initial columns to show based on available width
        let columnsToShow = orderedColumns.slice(0, maxFittingColumns);
        
        // Create new visibility state
        const newDynamicVisibility: VisibilityState = {};
        
        // Hide columns that aren't in the columnsToShow list
        userColumnOrder.forEach(columnId => {
          if (!columnsToShow.includes(columnId)) {
            newDynamicVisibility[columnId] = false;
          }
        });
        
        // Check if the visibility state has actually changed before updating
        const hasVisibilityChanged = userColumnOrder.some(columnId => {
          const isCurrentlyHidden = dynamicVisibility[columnId] === false;
          const willBeHidden = newDynamicVisibility[columnId] === false;
          return isCurrentlyHidden !== willBeHidden;
        });
        
        // Only update if there's a change to avoid unnecessary renders
        if (hasVisibilityChanged) {
          // Use a combined update strategy to prevent flickering
          // First update column sizes to ensure they're correct for the current visibility
          requestAnimationFrame(() => {
            // Update visibility state first
            setDynamicVisibility(newDynamicVisibility);
            
            // Then update column sizes in the same frame to ensure visual consistency
            updateColumnSizes();
          });
        }
      } catch (error) {
        console.error('Error in responsive column hiding:', error);
      }
    };
    
    // Use a more efficient debounce that doesn't cause flickering
    const debouncedCheckWidth = (() => {
      let timeout: NodeJS.Timeout | null = null;
      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          // Pass the table reference to the checkWidth function through closure
          requestAnimationFrame(() => checkWidth());
        }, 200);
      };
    })();
    
    // Run initial check
    requestAnimationFrame(checkWidth);
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(debouncedCheckWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [table, updateColumnSizes, dynamicVisibility]);

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
          {/* Remove the MarketsWidgetHeader since it's now in the widget container header */}
          <div 
            className="h-full overflow-y-auto overflow-x-auto scrollbar-thin" 
            ref={tableContainerRef}
          >
            {isInitialLoading ? (
              <Table className="w-full table-fixed">
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="bg-[hsl(var(--color-widget-header))] text-sm text-muted-foreground">
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
                  <TableRow className="bg-[hsl(var(--color-widget-header))] text-sm text-muted-foreground">
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
            ) : activeListId && filteredData.length === 0 ? (
              // Empty list placeholder
              <div className="w-full h-full flex flex-col items-center justify-center p-8">
                <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">This list is empty</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                  Add your first asset to start tracking prices in this list
                </p>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      className="h-9 px-4 flex items-center gap-2"
                    >
                      <PlusIcon className="h-4 w-4" /> 
                      Add Asset
                      <ChevronsUpDown className="h-4 w-4 opacity-50 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[220px]" align="center">
                    <Command>
                      <CommandInput 
                        placeholder="Search trading pairs..." 
                        className="h-9"
                      />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>No trading pairs found</CommandEmpty>
                        <CommandGroup>
                          {Object.keys(SAMPLE_MARKET_DATA).sort().map((pair) => {
                            const [baseAsset, quoteAsset] = pair.split('/');
                            
                            return (
                              <CommandItem
                                key={pair}
                                value={pair}
                                onSelect={() => {
                                  if (activeListId) {
                                    ListManager.addAssetToList(activeListId, pair);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center">
                                    {ASSETS[baseAsset as AssetTicker]?.icon ? (
                                      <img 
                                        src={ASSETS[baseAsset as AssetTicker].icon} 
                                        alt={baseAsset} 
                                        className="w-5 h-5 mr-2 rounded-full" 
                                      />
                                    ) : (
                                      <div className="w-5 h-5 mr-2 rounded-full bg-muted flex items-center justify-center">
                                        <span className="text-xs">{baseAsset.charAt(0)}</span>
                                      </div>
                                    )}
                                    <span className="font-medium">{baseAsset}</span>
                                  </div>
                                  
                                  <div className="flex items-center text-muted-foreground">
                                    <span className="text-xs">/</span>
                                    <span className="text-xs ml-1">{quoteAsset}</span>
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : filteredData.length === 0 ? (
              // Empty filter results (no list or empty search/filter)
              <Table className="w-full table-fixed">
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="bg-[hsl(var(--color-widget-header))] text-sm text-muted-foreground">
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
                <div 
                  className="sticky top-0 z-20 w-full flex bg-[hsl(var(--color-widget-header))] border-b border-border"
                >
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
                            "px-4 py-2 h-10 flex items-center text-sm text-muted-foreground",
                            isPairColumn ? "justify-start" : "justify-end",
                            isNarrowColumn && "p-0 w-[30px] max-w-[30px]",
                            "cursor-pointer hover:text-foreground/80",
                            COLUMN_TRANSITION_CLASSES
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

                          // Directly use width from columnSizes state, provide simple fallbacks
                          const width = columnSizes[columnId as keyof typeof columnSizes] || (isPairColumn ? 180 : 110);

                          return (
                            <div
                              key={cell.id}
                              className={cn(
                                "flex items-center px-4 py-2 overflow-hidden",
                                isNarrowColumn && "w-[30px] max-w-[30px] p-0",
                                isPairColumn ? "justify-start" : "justify-end",
                                "border-b border-border",
                                COLUMN_TRANSITION_CLASSES
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
      
      {/* Add the dialog for adding an asset to a list */}
      <Dialog open={showAddToListDialog} onOpenChange={setShowAddToListDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {selectedAssetForList} to List</DialogTitle>
            <DialogDescription>
              Choose a list to add this asset to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {customLists.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No custom lists available. Create one using the dropdown menu on the widget header.
              </div>
            ) : (
              <div className="space-y-2">
                {customLists.map(list => (
                  <div key={list.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <div className="font-medium">{list.name}</div>
                      <div className="text-xs text-muted-foreground">{list.assets.length} assets</div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (selectedAssetForList) {
                          addAssetToList(list.id, selectedAssetForList);
                          setShowAddToListDialog(false);
                        }
                      }}
                      disabled={selectedAssetForList ? list.assets.includes(selectedAssetForList) : false}
                    >
                      {selectedAssetForList && list.assets.includes(selectedAssetForList) 
                        ? "Already in list" 
                        : "Add"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

// Enhance the ValueFlash component with better animation and background effect
const ValueFlash = React.memo<{
  value: number | string;
  formatter?: (value: number) => string;
  className?: string;
  children?: React.ReactNode;
}>(({ value, formatter, className, children }) => {
  // Use refs to store the previous value to compare against
  const prevValueRef = useRef<number | string>(value);
  const [isFlashing, setIsFlashing] = useState(false);
  
  // Check if value has changed with proper number comparison
  useEffect(() => {
    const prevValue = prevValueRef.current;
    
    // Use a small epsilon value for floating point comparison
    const hasChanged = typeof value === 'number' && typeof prevValue === 'number'
      ? Math.abs((value - prevValue) / (Math.abs(prevValue) || 1)) > 0.0000001 // Use relative difference with a small epsilon
      : value !== prevValue;
    
    if (hasChanged) {
      // Update prevValue before setting isFlashing to ensure we capture changes correctly
      prevValueRef.current = value;
      
      // Force the flash effect to reset if it's already flashing
      setIsFlashing(false);
      
      // Use requestAnimationFrame to ensure the DOM has time to process the false state
      requestAnimationFrame(() => {
        setIsFlashing(true);
        
        // Remove the flash effect after animation completes
        const timer = setTimeout(() => {
          setIsFlashing(false);
        }, 800); // Animation duration + small buffer
        
        return () => clearTimeout(timer);
      });
    }
  }, [value]); // Only depend on value, not on prevValueRef.current
  
  // Format the value if a formatter is provided and value is a number
  const displayValue = typeof formatter === 'function' && typeof value === 'number' 
    ? formatter(value) 
    : value;
  
  return (
    <span 
      className={cn(
        className,
        isFlashing && "animate-value-flash"
      )}
    >
      {children || displayValue}
    </span>
  );
});

ValueFlash.displayName = 'ValueFlash';

// Add these constants at the top level after imports
const UPDATE_INTERVAL_VISIBLE = 7000; // 7 seconds when tab is visible (was 5s)
const UPDATE_INTERVAL_HIDDEN = 45000;  // 45 seconds when tab is hidden (was 30s)
const UPDATE_DEBOUNCE_TIME = 300;     // 0.3 second debounce (was 0.5s)

// LocalStorage keys for custom lists
const MARKETS_LISTS_KEY = 'markets-widget-custom-lists';
const ACTIVE_LIST_KEY = 'markets-widget-active-list';

// Interface for custom lists
interface CustomList {
  id: string;
  name: string;
  assets: string[];
}

export interface MarketsWidgetRef {
  getTable: () => ReturnType<typeof useReactTable<MarketData>> | null;
}