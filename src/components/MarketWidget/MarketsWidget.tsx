import React, { useState, useEffect, useCallback, useMemo, useRef, useId, CSSProperties, forwardRef, useImperativeHandle } from 'react';

import { useTheme } from 'next-themes';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { SAMPLE_MARKET_DATA, SampleMarketDataItem } from '@/services/marketsSampleData';
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
  AlertTriangle as AlertTriangleIcon,
  RefreshCw as RefreshCwIcon,
  ChevronUp,
  GripVertical as GripVerticalIcon,
  Plus as PlusIcon,
  ListChecks,
  ChevronsUpDown,
  AlertCircle,
  ListIcon,
  ListXIcon,
  XIcon
} from 'lucide-react';
import { 
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
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
import ValueFlash from './ValueFlash';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { WidgetTab } from './WidgetTab';
import { Tooltip } from '../ui/tooltip';

// TanStack Table imports
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Header,
  VisibilityState,
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
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Constants for data refresh intervals
const UPDATE_INTERVAL_VISIBLE = 7000; // 7 seconds when tab is visible
const UPDATE_DEBOUNCE_TIME = 300;     // 0.3 second debounce

// Format price with appropriate number of decimal places
const priceFormatterCache = new Map<number, string>();
const formatPrice = (price: number) => {
  if (priceFormatterCache.has(price)) {
    return priceFormatterCache.get(price)!;
  }
  
  let result;
  if (price >= 1000) {
    result = price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else if (price >= 100) {
    result = price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else if (price >= 1) {
    result = price.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } else if (price >= 0.01) {
    result = price.toLocaleString(undefined, { maximumFractionDigits: 6 });
  } else {
    result = price.toLocaleString(undefined, { maximumFractionDigits: 8 });
  }
  
  if (priceFormatterCache.size > 500) {
    priceFormatterCache.clear();
  }
  priceFormatterCache.set(price, result);
  return result;
};

// Format numbers into K, M, B, T notation
const largeNumberFormatterCache = new Map<number, string>();
const formatLargeNumber = (value: number) => {
  if (largeNumberFormatterCache.has(value)) {
    return largeNumberFormatterCache.get(value)!;
  }
  
  let result;
  if (value === 0) {
    result = '0';
  } else if (value >= 1_000_000_000_000) {
    result = `${(value / 1_000_000_000_000).toFixed(2)}T`;
  } else if (value >= 1_000_000_000) {
    result = `${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 10_000_000) {
    result = `${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000_000) {
    const inMillions = value / 1_000_000;
    if (inMillions < 0.01) {
      result = `${(value / 1_000).toFixed(2)}K`;
    } else {
      result = `${inMillions.toFixed(2)}M`;
    }
  } else if (value >= 10_000) {
    result = `${(value / 1_000).toFixed(1)}K`;
  } else if (value >= 1_000) {
    result = `${(value / 1_000).toFixed(2)}K`;
  } else if (value >= 100) {
    result = value.toFixed(0);
  } else if (value >= 10) {
    result = value.toFixed(1);
  } else if (value >= 1) {
    result = value.toFixed(2);
  } else if (value > 0) {
    if (value >= 0.1) {
      result = value.toFixed(2);
    } else if (value >= 0.01) {
      result = value.toFixed(3);
    } else if (value >= 0.001) {
      result = value.toFixed(4);
    } else {
      result = value.toExponential(2);
    }
  } else {
    result = value.toLocaleString();
  }
  
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

// Gets conversion rate between currencies, handling direct rates, BTC pairs, and defaults
const getConversionRate = (from: AssetTicker, to: AssetTicker | null): number => {
  if (!to) return 1;
  if (from === to) return 1;
  
  if (from === 'EUR' && to === 'USD') return CURRENCY_CONVERSION_RATES.EUR_USD;
  if (from === 'USD' && to === 'EUR') return CURRENCY_CONVERSION_RATES.USD_EUR;
  if (from === 'GBP' && to === 'USD') return CURRENCY_CONVERSION_RATES.GBP_USD;
  if (from === 'USD' && to === 'GBP') return CURRENCY_CONVERSION_RATES.USD_GBP;
  
  if (from === 'BTC') {
    if (to === 'USD') return 38000;
    if (to === 'EUR') return 35000;
    if (to === 'GBP') return 30000;
  }
  
  if (to === 'USD' || to === 'EUR' || to === 'GBP') return 1.0;
  
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

interface CustomList {
  id: string;
  name: string;
  assets: string[];
}

interface MarketsWidgetProps {
  className?: string;
  compact?: boolean;
  
  // External state controls
  id?: string; // Unique ID for this widget instance
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  selectedQuoteAsset?: AssetTicker | 'ALL';
  onSelectedQuoteAssetChange?: (value: AssetTicker | 'ALL') => void;
  secondaryCurrency?: AssetTicker | null;
  onSecondaryCurrencyChange?: (value: AssetTicker | null) => void;
  onQuoteAssetsChange?: (assets: AssetTicker[]) => void;
  
  // Column controls
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
  
  // Custom list controls
  customLists?: CustomList[];
  onCustomListsChange?: (lists: CustomList[]) => void;
  activeListId?: string | null;
  onActiveListChange?: (listId: string | null) => void;
  
  // Persistence options
  persistState?: boolean;
  
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
      <div className="w-24 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
    {!isMinWidth && (
      <TableCell className="text-right">
        <div className="w-16 h-5 ml-auto rounded bg-white/5 animate-pulse" />
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
  
  const [internalChecked, setInternalChecked] = useState(isChecked); // For immediate checkbox interaction
  
  useEffect(() => {
    setInternalChecked(isChecked);
  }, [isChecked]);
  
  const handleDragHandleProps = useMemo(() => ({ ...attributes, ...listeners }), [attributes, listeners]); // Only allow drag on handle
  
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setInternalChecked(!internalChecked); // Update internal state immediately
    requestAnimationFrame(() => { onCheckedChange(!internalChecked); }); // Debounce parent update to prevent flickering
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
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
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
  
  const tableRef = (table as any)._getTableOptions?.()?.meta?.updateColumnSizes; // Get updateColumnSizes function from table context
  
  const handleColumnVisibilityChange = (columnId: string, isVisible: boolean) => {
    if (columnId === 'pair') return; // Prevent toggling off the 'pair' column
    
    const newState = {...table.getState().columnVisibility}; // Create new visibility state object
    
    if (isVisible) {
      delete newState[columnId]; // Remove column from visibility state to make it visible
    } else {
      newState[columnId] = false; // Set column visibility to false to hide it
    }
    
    table.setColumnVisibility(newState); // Update the table's visibility state
    
    // If available, update column sizes after a delay to prevent flickering
    if (typeof tableRef === 'function') {
      setTimeout(() => tableRef(), 50);
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

// Define a header rendering function to replace DraggableTableHeader
const renderTableHeader = (
  header: Header<MarketData, unknown>, 
  currentTheme: 'light' | 'dark', 
  columnSizes?: Record<string, number>,
  getTotalWidth?: () => number,
  useTableHead = false // Flag to determine if we should use TableHead instead of div
) => {
  const columnId = header.column.id;
  const isPairColumn = columnId === 'pair';
  const isNarrowColumn = columnId === 'favorite';
  const isSorted = header.column.getIsSorted();
  
  let width: string | number | undefined;
  
  if (columnSizes && getTotalWidth) { // For the main view with dynamic sizing
    const totalWidth = getTotalWidth();
    const visibleColumnsCount = 6; // Reasonable default for this specific table
    
    if (isNarrowColumn) {
      width = 30;
    } else {
      width = columnSizes[columnId as keyof typeof columnSizes] || 
              (isPairColumn ? Math.max(180, totalWidth * 0.3) : 
               Math.max(110, totalWidth / visibleColumnsCount));
    }
  } else { // Simple sizing for loading/error states
    width = isNarrowColumn ? 30 : undefined;
  }
  
  // Common props for both div and TableHead
  const commonProps = {
    key: header.id,
    onClick: () => {
      if (header.column.getCanSort()) {
        header.column.toggleSorting();
      }
    }
  };
  // Common content for both div and TableHead
  const headerContent = (
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
  );
  
  if (useTableHead) {
    return (
      <TableHead
        {...commonProps}
        className={cn(
          "sticky top-0 bg-[hsl(var(--color-widget-header))] z-20 whitespace-nowrap cursor-pointer hover:text-foreground/80 group text-sm text-muted-foreground",
          isNarrowColumn && "p-0 w-[30px] max-w-[30px]",
          COLUMN_TRANSITION_CLASSES
        )}
        style={{ width: isNarrowColumn ? '30px' : undefined, maxWidth: isNarrowColumn ? '30px' : undefined }}
        aria-sort={
          isSorted === "asc"
            ? "ascending"
            : isSorted === "desc"
              ? "descending"
              : "none"
        }
      >
        {headerContent}
      </TableHead>
    );
  }
  
  return (
    <div
      {...commonProps}
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
      aria-sort={
        isSorted === "asc"
          ? "ascending"
          : isSorted === "desc"
            ? "descending"
            : "none"
      }
    >
      {headerContent}
    </div>
  );
};

export const MarketsWidget = forwardRef<MarketsWidgetRef, MarketsWidgetProps>((props, ref) => {
  const { 
    className,
    id = 'default',
    searchQuery: externalSearchQuery,
    onSearchQueryChange: externalSearchQueryChange,
    selectedQuoteAsset: externalSelectedQuoteAsset,
    onSelectedQuoteAssetChange: externalSelectedQuoteAssetChange,
    secondaryCurrency: externalSecondaryCurrency,
    onSecondaryCurrencyChange: externalSecondaryCurrencyChange,
    onQuoteAssetsChange,
    compact = false,
    sorting: externalSorting,
    onSortingChange,
    columnVisibility: externalColumnVisibility,
    onColumnVisibilityChange,
    columnOrder: externalColumnOrder,
    onColumnOrderChange,
    customLists: externalCustomLists,
    onCustomListsChange,
    activeListId: externalActiveListId,
    onActiveListChange,
    persistState = false,
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
  
  // Generate storage keys with instance ID to prevent conflicts
  const instanceStorageKeys = useMemo(() => ({
    SELECTED_QUOTE_ASSET: `${STORAGE_KEY_PREFIX}${id}-selected-quote-asset`,
    SECONDARY_CURRENCY: `${STORAGE_KEY_PREFIX}${id}-secondary-currency`,
    COLUMN_VISIBILITY: `${STORAGE_KEY_PREFIX}${id}-column-visibility`,
    COLUMN_ORDER: `${STORAGE_KEY_PREFIX}${id}-column-order`,
    SORTING: `${STORAGE_KEY_PREFIX}${id}-sorting`,
    CUSTOM_LISTS: `${STORAGE_KEY_PREFIX}${id}-custom-lists`,
    ACTIVE_LIST: `${STORAGE_KEY_PREFIX}${id}-active-list`,
  }), [id]);
  
  // Add custom lists state - use external if provided, otherwise internal
  const [internalCustomLists, setInternalCustomLists] = useState<CustomList[]>(
    persistState ? getStoredValue(instanceStorageKeys.CUSTOM_LISTS, []) : []
  );
  const customLists = externalCustomLists !== undefined ? externalCustomLists : internalCustomLists;
  
  const [internalActiveListId, setInternalActiveListId] = useState<string | null>(
    persistState ? getStoredValue(instanceStorageKeys.ACTIVE_LIST, null) : null
  );
  const activeListId = externalActiveListId !== undefined ? externalActiveListId : internalActiveListId;
  
  // Load custom lists from ListManager on mount
  useEffect(() => {
    if (externalCustomLists === undefined) {
      // Only load if we're managing lists internally
      const loadedLists = ListManager.getLists(id);
      setInternalCustomLists(loadedLists);
    }
    
    if (externalActiveListId === undefined) {
      // Only load active list if we're managing it internally
      const activeList = ListManager.getActiveListId(id);
      setInternalActiveListId(activeList);
    }
  }, [id, externalCustomLists, externalActiveListId]);
  
  const [showAddToListDialog, setShowAddToListDialog] = useState(false);
  const [selectedAssetForList, setSelectedAssetForList] = useState<string | null>(null);
  
  // Update storage if using internal state and persistence is enabled
  useEffect(() => {
    if (persistState && externalCustomLists === undefined) {
      setStoredValue(instanceStorageKeys.CUSTOM_LISTS, internalCustomLists);
    }
  }, [persistState, externalCustomLists, internalCustomLists, instanceStorageKeys.CUSTOM_LISTS]);
  
  useEffect(() => {
    if (persistState && externalActiveListId === undefined) {
      setStoredValue(instanceStorageKeys.ACTIVE_LIST, internalActiveListId);
    }
  }, [persistState, externalActiveListId, internalActiveListId, instanceStorageKeys.ACTIVE_LIST]);
  
  // Generate a stable ID for this widget instance
  const marketWidgetId = useId();
  
  // Use external state if provided, otherwise use local state
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  
  const [internalSelectedQuoteAsset, setInternalSelectedQuoteAsset] = useState<AssetTicker | 'ALL'>(
    persistState ? getStoredValue<AssetTicker | 'ALL'>(instanceStorageKeys.SELECTED_QUOTE_ASSET, 'ALL') : 'ALL'
  );
  const selectedQuoteAsset = externalSelectedQuoteAsset !== undefined 
    ? externalSelectedQuoteAsset 
    : internalSelectedQuoteAsset;
  
  const [internalSecondaryCurrency, setInternalSecondaryCurrency] = useState<AssetTicker | null>(
    persistState ? getStoredValue<AssetTicker | null>(instanceStorageKeys.SECONDARY_CURRENCY, null) : null
  );
  const secondaryCurrency = externalSecondaryCurrency !== undefined 
    ? externalSecondaryCurrency 
    : internalSecondaryCurrency;
  
  // Initialize other state with values from localStorage
  const [internalSorting, setInternalSorting] = useState<SortingState>(
    persistState ? getStoredValue(instanceStorageKeys.SORTING, [{ id: 'marketCap', desc: true }]) : [{ id: 'marketCap', desc: true }]
  );
  const sorting = externalSorting !== undefined ? externalSorting : internalSorting;
  
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<VisibilityState>(
    persistState ? getStoredValue(instanceStorageKeys.COLUMN_VISIBILITY, {}) : {}
  );
  const columnVisibility = externalColumnVisibility !== undefined ? externalColumnVisibility : internalColumnVisibility;
  
  const [internalColumnOrder, setInternalColumnOrder] = useState<string[]>(
    persistState ? getStoredValue(instanceStorageKeys.COLUMN_ORDER, 
      ['pair', 'price', 'change24h', 'change7d', 'marketCap', 'volume']) : 
      ['pair', 'price', 'change24h', 'change7d', 'marketCap', 'volume']
  );
  const columnOrder = externalColumnOrder !== undefined ? externalColumnOrder : internalColumnOrder;
  
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
  
  // State for tracking dynamic column visibility based on container width
  const [dynamicVisibility, setDynamicVisibility] = useState<VisibilityState>({});
  
  // Dynamic column sizes that adapt to container width
  const [columnSizes, setColumnSizes] = useState(minColumnWidths);
  
  // Batch column size updates to reduce flickering
  const batchedColumnSizeUpdate = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Add missing references needed for virtualized rendering
  const headerRefs = useRef<Record<string, HTMLElement | null>>({});
  
  // Update column sizes based on container width
  const updateColumnSizes = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current?.clientWidth || 0;
    const padding = 20; // Buffer for borders, padding
    
    // Get only visible columns based on both user preferences and dynamic visibility
    const visibleColumnIds = Object.keys(minColumnWidths)
      .filter(id => 
        columnVisibility[id] !== false && 
        dynamicVisibility[id] !== false
      ) as (keyof typeof minColumnWidths)[];
    
    // Calculate total minimum width and flex weight for visible columns
    const totalMinWidth = visibleColumnIds.reduce((total, id) => total + minColumnWidths[id], 0) + padding;
    const totalFlexWeight = visibleColumnIds.reduce((total, id) => total + columnFlexWeights[id], 0);
    
    const newSizes = {...minColumnWidths};
    
    if (containerWidth > totalMinWidth) {
      const extraSpace = containerWidth - totalMinWidth;
      
      // Distribute extra space proportionally to visible columns
      visibleColumnIds.forEach(id => {
        const proportion = columnFlexWeights[id] / totalFlexWeight;
        newSizes[id] = Math.floor(minColumnWidths[id] + (extraSpace * proportion));
      });
    }
    
    setColumnSizes(newSizes);
  }, [columnVisibility, dynamicVisibility, minColumnWidths, columnFlexWeights]);
  
  // Debounce resize operations to improve performance
  const debouncedUpdateColumnSizes = useCallback(debounce(updateColumnSizes, 100), [updateColumnSizes]);
  
  // Initialize column sizes and set up resize listener
  useEffect(() => {
    updateColumnSizes(); // Initial update without debounce
    
    // Set up resize observer with debounced handler
    const resizeObserver = new ResizeObserver(() => {
      debouncedUpdateColumnSizes();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', debouncedUpdateColumnSizes); // Also add window resize event listener as backup
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedUpdateColumnSizes);
    };
  }, [updateColumnSizes, debouncedUpdateColumnSizes]);

  const [forceRenderKey, setForceRenderKey] = useState(0); // Force rerender when secondary currency changes
  const prevSecondaryCurrencyRef = useRef<AssetTicker | null>(null);
  
  useEffect(() => {
    if (prevSecondaryCurrencyRef.current !== secondaryCurrency && prevSecondaryCurrencyRef.current !== null) {
      setForceRenderKey(prev => prev + 1);
    }
    prevSecondaryCurrencyRef.current = secondaryCurrency;
  }, [secondaryCurrency]);
  
  const tableKey = useMemo(() => `table-${forceRenderKey}-${secondaryCurrency || 'none'}`, [forceRenderKey, secondaryCurrency]);

  useEffect(() => { /* External/internal quote asset handling */ }, [externalSelectedQuoteAsset, internalSelectedQuoteAsset]);
  useEffect(() => { /* External/internal search query handling */ }, [externalSearchQuery, internalSearchQuery]);
  useEffect(() => { /* External/internal secondary currency handling */ }, [externalSecondaryCurrency, internalSecondaryCurrency]);

  useEffect(() => {
    if (externalSelectedQuoteAsset === undefined) {
      setStoredValue(instanceStorageKeys.SELECTED_QUOTE_ASSET, internalSelectedQuoteAsset);
    }
  }, [internalSelectedQuoteAsset, externalSelectedQuoteAsset]);

  useEffect(() => {
    if (externalSecondaryCurrency === undefined) {
      setStoredValue(instanceStorageKeys.SECONDARY_CURRENCY, internalSecondaryCurrency);
    }
  }, [internalSecondaryCurrency, externalSecondaryCurrency]);

  useEffect(() => {
    setStoredValue(instanceStorageKeys.SORTING, sorting);
  }, [sorting]);

  const quoteAssets = useMemo(() => { // Get unique quote assets from market data
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

  // Update handlers for state changes
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
      if (persistState) {
        setStoredValue(instanceStorageKeys.SELECTED_QUOTE_ASSET, value);
      }
    }
  }, [externalSelectedQuoteAssetChange, persistState, instanceStorageKeys.SELECTED_QUOTE_ASSET]);

  const handleSecondaryCurrencyChange = useCallback((value: AssetTicker | null) => {
    if (externalSecondaryCurrencyChange) {
      externalSecondaryCurrencyChange(value);
    } else {
      setInternalSecondaryCurrency(value);
      if (persistState) {
        setStoredValue(instanceStorageKeys.SECONDARY_CURRENCY, value);
      }
    }
  }, [externalSecondaryCurrencyChange, persistState, instanceStorageKeys.SECONDARY_CURRENCY]);

  // After handleSecondaryCurrencyChange but before the event handler

  const handleSortingChange = useCallback((value: SortingState) => {
    if (onSortingChange) {
      onSortingChange(value);
    } else {
      setInternalSorting(value);
      if (persistState) {
        setStoredValue(instanceStorageKeys.SORTING, value);
      }
    }
  }, [onSortingChange, persistState, instanceStorageKeys.SORTING]);

  const handleColumnVisibilityChange = useCallback((value: VisibilityState) => {
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(value);
    } else {
      setInternalColumnVisibility(value);
      if (persistState) {
        setStoredValue(instanceStorageKeys.COLUMN_VISIBILITY, value);
      }
    }
  }, [onColumnVisibilityChange, persistState, instanceStorageKeys.COLUMN_VISIBILITY]);

  const handleColumnOrderChange = useCallback((value: string[]) => {
    if (onColumnOrderChange) {
      onColumnOrderChange(value);
    } else {
      setInternalColumnOrder(value);
      if (persistState) {
        setStoredValue(instanceStorageKeys.COLUMN_ORDER, value);
      }
    }
  }, [onColumnOrderChange, persistState, instanceStorageKeys.COLUMN_ORDER]);

  // Custom list handlers
  const handleCustomListsChange = useCallback((lists: CustomList[]) => {
    if (onCustomListsChange) {
      onCustomListsChange(lists);
    } else {
      setInternalCustomLists(lists);
      if (persistState) {
        setStoredValue(instanceStorageKeys.CUSTOM_LISTS, lists);
      }
    }
  }, [onCustomListsChange, persistState, instanceStorageKeys.CUSTOM_LISTS]);

  const handleActiveListChange = useCallback((listId: string | null) => {
    if (onActiveListChange) {
      onActiveListChange(listId);
    } else {
      setInternalActiveListId(listId);
      if (persistState) {
        setStoredValue(instanceStorageKeys.ACTIVE_LIST, listId);
      }
    }
  }, [onActiveListChange, persistState, instanceStorageKeys.ACTIVE_LIST]);

  // Listen for custom events but only if they match this instance ID or are global
  useEffect(() => {
    // Log initialization
    console.log(`[MarketsWidget] Setting up event listeners for widget ${id}`);
    
    const handleListsUpdated = (event: CustomEvent) => {
      // Process global list updates or this widget's specific updates
      if ((event.detail.instanceId === 'all' || event.detail.instanceId === id) && event.detail?.lists) {
        console.log(`[MarketsWidget] Widget ${id} received lists update from ${event.detail.instanceId}`);
        if (!onCustomListsChange) { // Only update internal state if not externally controlled
          setInternalCustomLists(event.detail.lists);
        }
      }
    };
    
    const handleActiveListChanged = (event: CustomEvent) => {
      // CRITICAL: Only process this event if it's specifically for this widget instance
      console.log(`[MarketsWidget] Widget ${id} received list selection event from ${event.detail?.instanceId}:`, event.detail?.listId);
      
      if (event.detail?.instanceId === id && 'listId' in event.detail) {
        console.log(`[MarketsWidget] Widget ${id} APPLYING list selection:`, event.detail.listId);
        
        if (!onActiveListChange) { // Only update internal state if not externally controlled
          setInternalActiveListId(event.detail.listId);
        } else {
          onActiveListChange(event.detail.listId);
        }
      } else {
        console.log(`[MarketsWidget] Widget ${id} IGNORING list selection event - different instance`);
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
  }, [id, onCustomListsChange, onActiveListChange, setInternalActiveListId]);
  
  // Debug: Log active list changes
  useEffect(() => {
    console.log(`[MarketsWidget] Widget ${id} active list changed to:`, activeListId);
  }, [activeListId, id]);
  
  // Initialize the widget
  useEffect(() => {
    // Ensure widget has an ID for proper instance management
    if (!id) {
      console.warn('MarketsWidget: No ID provided. Using default.');
    }
    
    // Log widget initialization
    console.log(`Initializing MarketsWidget ${id || 'default'}`);

    // Load initial data will be handled in the data fetching useEffect
    
  }, [id]);
  
  // Load initial lists from the global storage
  useEffect(() => {
    // Only load lists if not externally controlled
    if (externalCustomLists === undefined) {
      // Ensure widget has an ID for proper instance management
      if (!id) {
        console.warn('MarketsWidget: No ID provided. Using default.');
      }
      
      // Log widget initialization for lists
      console.log(`Widget ${id || 'default'} loading lists`);
      
      // Get global lists
      const lists = ListManager.getLists();
      console.log(`Widget ${id} loading ${lists.length} global lists`);
      setInternalCustomLists(lists);
      
      // Get instance-specific active list
      const instanceActiveListId = ListManager.getActiveListId(id);
      console.log(`Widget ${id} loading active list: ${instanceActiveListId}`);
      if (instanceActiveListId !== null) {
        setInternalActiveListId(instanceActiveListId);
      }
    }
  }, [id, externalCustomLists]);

  // Add/remove asset from list
  const addAssetToList = useCallback((listId: string, asset: string) => {
    // Format the asset in a consistent format (base:quote) before adding to the list
    // If asset is a ticker, find the full market data for it
    const formattedAsset = asset.includes(':') || asset.includes('/') 
      ? asset 
      : (() => {
          // Find the market data for this asset
          const marketItem = marketData.find(item => item.baseAsset === asset);
          if (marketItem) {
            return `${marketItem.baseAsset}:${marketItem.quoteAsset}`;
          }
          return asset;
        })();
    
    // Use ListManager to update the global list
    ListManager.addAssetToList(listId, formattedAsset, id);
    
    // Update our local state with the latest from ListManager
    const updatedLists = ListManager.getLists();
    handleCustomListsChange(updatedLists);
  }, [id, handleCustomListsChange, marketData]);

  const removeAssetFromList = useCallback((listId: string, asset: string) => {
    // Format the asset in a consistent format (base:quote) before removing from the list
    // If asset is a ticker, find the full market data for it
    const formattedAsset = asset.includes(':') || asset.includes('/') 
      ? asset 
      : (() => {
          // Find the market data for this asset
          const marketItem = marketData.find(item => item.baseAsset === asset);
          if (marketItem) {
            return `${marketItem.baseAsset}:${marketItem.quoteAsset}`;
          }
          return asset;
        })();
    
    // Use ListManager to update the global list
    ListManager.removeAssetFromList(listId, formattedAsset, id);
    
    // Update our local state with the latest from ListManager
    const updatedLists = ListManager.getLists();
    handleCustomListsChange(updatedLists);
  }, [id, handleCustomListsChange, marketData]);

  // Show the add to list dialog
  const handleShowAddToListDialog = useCallback((asset: string) => {
    setSelectedAssetForList(asset);
    setShowAddToListDialog(true);
  }, []);

  // Add a helper function to update active list with proper instance ID
  const setActiveList = useCallback((listId: string | null) => {
    console.log(`[MarketsWidget] Widget ${id} setting active list to:`, listId);
    
    // Use ListManager directly to set active list per widget instance
    ListManager.setActiveListId(listId, id);
    
    // Update our internal state
    handleActiveListChange(listId);
  }, [id, handleActiveListChange]);

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
    
    return false;
  }, []);

  // Define the columns
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
          const asset = `${row.original.baseAsset}:${row.original.quoteAsset}`;
          
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
              
              {/* Add context menu for lists */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowAddToListDialog(asset);
                  }}
                >
                  <PlusIcon className="h-3 w-3" />
                </Button>
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
                formatter={(price) => `${pricePrefix}${formatPrice(price)}`}
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
                  formatter={(value) => `${pricePrefix}${formatLargeNumber(value)}`}
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
                  formatter={(value) => `${pricePrefix}${formatLargeNumber(value)}`}
                />
              ) : '—'}
            </div>
          );
        },
      }
    ];
  }, [secondaryCurrency]);

  // Apply sizes separately in a lightweight memo
  const columnsWithSizes = useMemo(() => {
    return columns.map(col => ({
      ...col,
      size: columnSizes[col.id as keyof typeof columnSizes] || 100
    }));
  }, [columns, columnSizes]);

  // Update the filtering logic to apply list filters
  useEffect(() => {
    if (marketData.length === 0) {
      setFilteredData([]);
      return;
    }

    const debouncedFilter = () => {
      let filtered = [...marketData];

      // Apply filters: quote asset, search query, and custom list
      if (selectedQuoteAsset !== 'ALL') {
        filtered = filtered.filter(item => item.quoteAsset === selectedQuoteAsset);
      }
      
      if (searchQuery) {
        filtered = filtered.filter(item => assetMatchesSearch(item, searchQuery));
      }
      
      if (activeListId) {
        console.log(`Widget ${id} filtering by list: ${activeListId}`);
        // Get the list data from the global lists
        const activeList = customLists.find(list => list.id === activeListId);
        if (activeList) {
          console.log(`List ${activeList.name} has ${activeList.assets.length} assets`);
          filtered = filtered.filter(item => {
            // Check multiple formats that might be used in the assets array
            const isIncluded = (
              // Check if the asset is in the list in any of the possible formats
              activeList.assets.includes(item.pair) || 
              activeList.assets.includes(item.baseAsset) ||
              activeList.assets.includes(`${item.baseAsset}:${item.quoteAsset}`) ||
              activeList.assets.includes(`${item.baseAsset}/${item.quoteAsset}`)
            );
            return isIncluded;
          });
          console.log(`Filtered to ${filtered.length} assets`);
        } else {
          console.log(`List ${activeListId} not found in ${customLists.length} lists`);
        }
      }
      
      setFilteredData(filtered);
    };
    
    const timeoutId = setTimeout(debouncedFilter, 50);
    return () => clearTimeout(timeoutId);
  }, [marketData, selectedQuoteAsset, searchQuery, activeListId, customLists, assetMatchesSearch, id]);
  
  // Update the table with instance-specific settings
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
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      handleSortingChange(newSorting);
    },
    onColumnOrderChange: (updater) => {
      const newOrder = typeof updater === 'function' ? updater(columnOrder) : updater;
      handleColumnOrderChange(newOrder);
    },
    onColumnVisibilityChange: (updater) => {
      const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;
      handleColumnVisibilityChange(newVisibility);
      setTimeout(() => {
        updateColumnSizes();
      }, 50);
    },
    enableSortingRemoval: false,
    meta: {
      updateColumnSizes,
    },
  });
  
  // Get total width of all columns for table sizing
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

  // Get row data for virtualization
  const { rows } = table.getRowModel();
  
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  useImperativeHandle(ref, () => ({
    getTable: () => table
  }), [table]);
  
  // For visual debugging
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  
  // Constants for controlling data variations
  const MAX_PRICE_CHANGE_PERCENT = 0.001; // Max 0.1% change per update
  const MAX_VOLUME_CHANGE_PERCENT = 0.002; // Max 0.2% change per update
  const UPDATE_PROBABILITY = 0.5; // 50% chance for any asset to update
  const VOLUME_UPDATE_PROBABILITY = 0.6; // 60% chance for volume to update when price updates

  // Fetch market data with improved logging and error handling
  const fetchMarketData = useCallback(async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);

      if (dataSource === 'sample') {
        try {
          // Intentionally skip CoinGecko API for now to use our expanded sample data
          throw new Error('Using expanded sample data instead of CoinGecko API');
        } catch (error) {
          // If we get here, we're using sample data as fallback
          if (marketData.length === 0) {
            // Initial load with sample data
            const sampleDataArray = Object.entries(SAMPLE_MARKET_DATA)
              .map(([pair, details]) => {
                const parts = pair.split('/');
                if (parts.length !== 2) return null;
                
                const baseAsset = parts[0] as AssetTicker;
                const quoteAsset = parts[1] as AssetTicker;
                
                // Verify the assets exist in our asset registry
                if (!(baseAsset in ASSETS) || !(quoteAsset in ASSETS)) return null;
                
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
              
            setMarketData(sampleDataArray);
          } else {
            // Update existing market data with random changes
            setMarketData(prevData => {
              return prevData.map(item => {
                // Randomly decide if this item should update
                if (Math.random() > UPDATE_PROBABILITY) return item;

                // Calculate price change
                const priceChangePercent = (Math.random() * 2 - 1) * MAX_PRICE_CHANGE_PERCENT;
                const newPrice = item.price * (1 + priceChangePercent);

                // Update chances and make changes more noticeable
                const shouldUpdate24h = Math.random() < 0.8; // 80% chance to update with price
                const shouldUpdate7d = Math.random() < 0.6;  // 60% chance to update with price
                const change24hDelta = shouldUpdate24h ? (Math.random() * 2 - 1) * 0.08 : 0;
                const change7dDelta = shouldUpdate7d ? (Math.random() * 2 - 1) * 0.1 : 0;
                const newChange24h = Math.max(Math.min(item.change24h + change24hDelta, 15), -15);
                const newChange7d = Math.max(Math.min(item.change7d + change7dDelta, 25), -25);

                // More frequent volume updates
                const shouldUpdateVolume = Math.random() < VOLUME_UPDATE_PROBABILITY;
                const volumeChangePercent = shouldUpdateVolume ? (Math.random() * 2 - 1) * MAX_VOLUME_CHANGE_PERCENT : 0;
                const newVolume = item.volume * (1 + volumeChangePercent);

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
          
          setLastUpdateTime(new Date().toLocaleTimeString());
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
  }, [dataSource, marketData.length, isRefreshing]);
  
  // Set up data fetching with regular updates
  useEffect(() => {
    let updateInterval: NodeJS.Timeout | null = null;
    let lastUpdateTime = Date.now();
    let isUpdating = false;

    const debouncedFetchData = debounce(async () => {
      if (isUpdating) return;
      
      try {
        isUpdating = true;
        requestAnimationFrame(() => {
          fetchMarketData().catch(err => {
            console.error('Error refreshing market data:', err);
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

      if (document.visibilityState === 'visible') {
        updateInterval = setInterval(debouncedFetchData, UPDATE_INTERVAL_VISIBLE);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        debouncedFetchData();
        scheduleNextUpdate();
      } else {
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
      }
    };

    // Initial data fetch
    debouncedFetchData();
    scheduleNextUpdate();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Removed fetchMarketData from the dependency array since it's a stable reference

  // Actual component rendering with full functionality
  return (
    <div 
      className={cn("h-full flex flex-col relative", className)}
      ref={containerRef}
    >
      <div className="flex-1 min-h-0 relative w-full">
        <div className="h-full w-full relative">
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
                      .map((header) => renderTableHeader(header, currentTheme, undefined, undefined, true))}
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
                      .map((header) => renderTableHeader(header, currentTheme, undefined, undefined, true))}
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
                                    addAssetToList(activeListId, pair);
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
                      .map((header) => renderTableHeader(header, currentTheme, undefined, undefined, true))}
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
                    .map((header) => renderTableHeader(header, currentTheme, columnSizes, () => getTotalColumnsWidth()))}
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
                          // Use the instance-specific method to add assets
                          ListManager.addAssetToList(list.id, selectedAssetForList, id);
                          // Update our local state with the latest from ListManager
                          const updatedLists = ListManager.getLists(id);
                          handleCustomListsChange(updatedLists);
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

// Helper functions for localStorage persistence
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

// Debounced localStorage setter
const setStoredValue = <T,>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  const saveToStorage = () => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage for key ${key}:`, error);
    }
  };
  setTimeout(saveToStorage, 300);
};