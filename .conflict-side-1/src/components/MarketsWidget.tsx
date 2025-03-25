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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem 
} from './ui/dropdown-menu';
import { Checkbox } from './ui/checkbox';

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
import { ChevronDownIcon, ChevronUpIcon, GripVerticalIcon, SlidersHorizontal } from 'lucide-react';

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
}

interface MarketsWidgetProps {
  className?: string;
  compact?: boolean;
}

// Sample market data - in a real app, this would come from an API
const SAMPLE_MARKET_DATA: Record<string, {
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume: number;
  rank: number;
}> = {
  "BTC/EUR": { price: 37000.50, change24h: 2.5, change7d: 5.2, marketCap: 720000000000, volume: 25000000000, rank: 1 },
  "ETH/EUR": { price: 1875.25, change24h: -1.2, change7d: 3.4, marketCap: 225000000000, volume: 15000000000, rank: 2 },
  "BTC/USD": { price: 40100.75, change24h: 2.6, change7d: 5.3, marketCap: 720000000000, volume: 27000000000, rank: 3 },
  "ETH/USD": { price: 2025.80, change24h: -1.1, change7d: 3.5, marketCap: 225000000000, volume: 17000000000, rank: 4 },
  "USDT/EUR": { price: 0.91, change24h: -0.1, change7d: 0.2, marketCap: 95000000000, volume: 50000000000, rank: 5 },
  "BNB/EUR": { price: 260.50, change24h: 0.8, change7d: -2.1, marketCap: 39000000000, volume: 2000000000, rank: 6 },
  "SOL/EUR": { price: 85.00, change24h: 3.2, change7d: 10.5, marketCap: 36000000000, volume: 3000000000, rank: 7 },
  "USDC/EUR": { price: 0.91, change24h: -0.2, change7d: 0.1, marketCap: 28000000000, volume: 4000000000, rank: 8 },
  "XRP/EUR": { price: 0.45, change24h: 1.3, change7d: -0.8, marketCap: 24000000000, volume: 1500000000, rank: 9 },
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
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: header.column.id,
    disabled: false,
  });

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    transform: CSS.Translate.toString(transform),
    transition,
    whiteSpace: 'nowrap',
    width: header.column.getSize(),
    zIndex: isDragging ? 30 : 20,
    touchAction: 'none', // Prevent touch events from causing scrolling during drag
  };

  // Create enhanced listeners with stopPropagation
  const enhancedListeners = {
    ...listeners,
    onMouseDown: (e: React.MouseEvent) => {
      e.stopPropagation(); // Stop event from reaching GridStack
      if (listeners && typeof listeners.onMouseDown === 'function') {
        listeners.onMouseDown(e);
      }
    },
    onTouchStart: (e: React.TouchEvent) => {
      e.stopPropagation(); // Stop event from reaching GridStack
      if (listeners && typeof listeners.onTouchStart === 'function') {
        listeners.onTouchStart(e);
      }
    },
  };

  return (
    <TableHead
      ref={setNodeRef}
      className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-20 whitespace-nowrap cursor-pointer hover:text-foreground/80"
      style={style}
      aria-sort={
        header.column.getIsSorted() === "asc"
          ? "ascending"
          : header.column.getIsSorted() === "desc"
            ? "descending"
            : "none"
      }
    >
      <div className="relative">
        <div className="absolute -inset-x-[1px] -inset-y-[0.5px] bg-[hsl(var(--color-widget-header))] shadow-[0_0_0_1px_hsl(var(--color-widget-header))]"></div>
        <div className="relative z-10 flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="-ml-2 h-7 w-7 shadow-none cursor-grab active:cursor-grabbing"
            {...attributes}
            {...enhancedListeners}
            aria-label="Drag to reorder"
            data-draggable="true"
            onMouseDown={(e) => { 
              e.stopPropagation();
              if (enhancedListeners.onMouseDown) enhancedListeners.onMouseDown(e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              if (enhancedListeners.onTouchStart) enhancedListeners.onTouchStart(e);
            }}
          >
            <GripVerticalIcon className="opacity-60" size={16} aria-hidden="true" />
          </Button>
          <span className="grow truncate">
            {header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext())}
          </span>
          {header.column.getCanSort() && (
            <Button
              size="icon"
              variant="ghost"
              className="group -mr-1 h-7 w-7 shadow-none"
              onClick={(e) => {
                e.stopPropagation();
                header.column.getToggleSortingHandler()?.(e);
              }}
              onKeyDown={(e) => {
                if (header.column.getCanSort() && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  e.stopPropagation();
                  header.column.getToggleSortingHandler()?.(e);
                }
              }}
            >
              {{
                asc: <ChevronUpIcon className="shrink-0 opacity-60" size={16} aria-hidden="true" />,
                desc: <ChevronDownIcon className="shrink-0 opacity-60" size={16} aria-hidden="true" />,
              }[header.column.getIsSorted() as string] ?? (
                <ChevronUpIcon
                  className="shrink-0 opacity-0 group-hover:opacity-60"
                  size={16}
                  aria-hidden="true"
                />
              )}
            </Button>
          )}
        </div>
      </div>
    </TableHead>
  );
};

// Draggable Cell Component (that moves along with its header)
const DragAlongCell = ({ cell, currentTheme }: { cell: Cell<MarketData, unknown>, currentTheme: 'light' | 'dark' }) => {
  const { isDragging, setNodeRef, transform, transition } = useSortable({
    id: cell.column.id,
    disabled: false,
  });

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    transform: CSS.Translate.toString(transform),
    transition,
    width: cell.column.getSize(),
    zIndex: isDragging ? 1 : 0,
    touchAction: 'none', // Prevent touch events from causing scrolling during drag
  };

  const cellContent = flexRender(cell.column.columnDef.cell, cell.getContext());

  return (
    <TableCell ref={setNodeRef} style={style}>
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
  const [localColumnOrder, setLocalColumnOrder] = useState<string[]>(columnOrder);
  
  // Keep local order in sync with table order
  useEffect(() => {
    setLocalColumnOrder(columnOrder);
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
        const newOrder = arrayMove(prevOrder, oldIndex, newIndex);
        table.setColumnOrder(newOrder);
        return newOrder;
      });
    }
  }
  
  // Direct column visibility toggle that uses the table API directly
  const handleColumnVisibilityChange = (columnId: string, isVisible: boolean) => {
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
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'marketCap', desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    rank: false
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Define columns for the table
  const columns = useMemo<ColumnDef<MarketData>[]>(() => [
    {
      id: 'rank',
      header: 'Rank',
      accessorKey: 'rank',
      cell: ({ row }) => (
        <div className="font-jakarta font-semibold text-sm leading-[150%] text-muted-foreground text-center">
          {row.original.rank}
        </div>
      ),
      size: 40,
    },
    {
      id: 'pair',
      header: 'Pair',
      accessorKey: 'pair',
      cell: ({ row }) => {
        const baseAssetConfig = ASSETS[row.original.baseAsset];
        const quoteAssetConfig = ASSETS[row.original.quoteAsset];
        
        return (
          <div className="flex items-center gap-2">
            <div className="relative flex">
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
            <span className="font-jakarta font-semibold text-sm ml-2">
              {row.original.baseAsset}/{row.original.quoteAsset}
            </span>
          </div>
        );
      },
      size: 160,
    },
    {
      id: 'price',
      header: 'Price',
      accessorKey: 'price',
      cell: ({ row }) => {
        const pricePrefix = row.original.quoteAsset === 'EUR' ? '€' : 
                           row.original.quoteAsset === 'USD' ? '$' :
                           row.original.quoteAsset === 'GBP' ? '£' : '';
        
        return (
          <div className="text-right font-jakarta font-mono font-semibold text-sm leading-[150%]">
            {pricePrefix}{formatPrice(row.original.price)}
          </div>
        );
      },
      size: 120,
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
      size: 100,
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
      size: 100,
    },
    {
      id: 'marketCap',
      header: 'Market Cap',
      accessorKey: 'marketCap',
      cell: ({ row }) => {
        const pricePrefix = row.original.quoteAsset === 'EUR' ? '€' : 
                           row.original.quoteAsset === 'USD' ? '$' :
                           row.original.quoteAsset === 'GBP' ? '£' : '';
        
        return (
          <div className="text-right font-jakarta font-semibold text-sm leading-[150%]">
            {row.original.marketCap > 0 ? `${pricePrefix}${formatLargeNumber(row.original.marketCap)}` : '-'}
          </div>
        );
      },
      size: 140,
    },
    {
      id: 'volume',
      header: 'Volume (24h)',
      accessorKey: 'volume',
      cell: ({ row }) => {
        const pricePrefix = row.original.quoteAsset === 'EUR' ? '€' : 
                           row.original.quoteAsset === 'USD' ? '$' :
                           row.original.quoteAsset === 'GBP' ? '£' : '';
        
        return (
          <div className="text-right font-jakarta font-semibold text-sm leading-[150%]">
            {pricePrefix}{formatLargeNumber(row.original.volume)}
          </div>
        );
      },
      size: 140,
    },
  ], []);

  // Setup column order
  const [columnOrder, setColumnOrder] = useState<string[]>(
    columns.map((column) => column.id as string)
  );

  // Check for container width to determine compact mode
  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Calculate minimum width based on column sizes
        const minTableWidth = columns.reduce((sum, col) => sum + (col.size || 100), 0);
        const shouldBeCompact = containerWidth < minTableWidth;
        setIsCompact(shouldBeCompact);
      }
    };

    checkWidth();
    const resizeObserver = new ResizeObserver(checkWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', checkWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkWidth);
    };
  }, [columns]);

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

  // Effect to load market data
  useEffect(() => {
    const fetchMarketData = async () => {
      console.log(`[MarketsWidget] Fetching market data with data source: ${dataSource}`);
      try {
        setIsInitialLoading(true);

        if (dataSource === 'sample') {
          // Use sample data
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
                rank: details.rank
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
                    rank: rank++
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
    };

    fetchMarketData();
  }, [dataSource]);

  // Memoize the fetch prices function to prevent recreating it on every render
  const fetchPrices = useCallback(async () => {
    if (dataSource === 'sample') return;

    try {
      setIsUpdating(true);
      
      const tokenResponse = await fetch(getApiUrl('open/demo/temp'));
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.token) {
        throw new Error('Failed to get demo token');
      }
      
      const baseAssets = [...new Set(marketData.map(item => item.baseAsset))];
      const quoteAssets = [...new Set(marketData.map(item => item.quoteAsset))];
      
      if (baseAssets.length === 0 || quoteAssets.length === 0) {
        return;
      }
      
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
      
      setMarketData(prevData => {
        return prevData.map(market => {
          const { baseAsset, quoteAsset } = market;
          
          if (data.RAW[baseAsset] && data.RAW[baseAsset][quoteAsset]) {
            const updatedData = data.RAW[baseAsset][quoteAsset];
            return {
              ...market,
              price: updatedData.PRICE || market.price,
              change24h: updatedData.CHANGEPCT24HOUR || market.change24h,
              volume: updatedData.TOTALVOLUME24H || market.volume,
              marketCap: updatedData.MKTCAP || market.marketCap
            };
          }
          return market;
        });
      });
      
      setIsUpdating(false);
    } catch (err) {
      console.error('Error updating market data:', err);
      setIsUpdating(false);
    }
  }, [dataSource, marketData]);

  // Update prices periodically
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Initialize TanStack Table
  const table = useReactTable({
    data: marketData,
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

  // Handle drag end for column reordering
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setColumnOrder((columnOrder) => {
        const oldIndex = columnOrder.indexOf(active.id as string);
        const newIndex = columnOrder.indexOf(over.id as string);
        return arrayMove(columnOrder, oldIndex, newIndex);
      });
    }
  }

  // Initialize sensors for drag and drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Lower the activation constraint for easier dragging
      activationConstraint: {
        distance: 5, // Start dragging after moving 5px instead of the default
      }
    }),
    useSensor(TouchSensor, {
      // Increase delay for touch to distinguish from scrolling
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      }
    }),
    useSensor(KeyboardSensor, {})
  );

  // Filter visible columns based on compact mode
  const visibleColumnIds = useMemo(() => {
    if (isCompact) {
      // Even in compact mode, respect column visibility settings
      const compactDefault = ['pair', 'price', 'change24h'];
      
      // Add rank only if it's visible
      if (columnVisibility.rank !== false) {
        compactDefault.unshift('rank');
      }
      
      return compactDefault;
    }
    return columnOrder.filter(id => columnVisibility[id] !== false);
  }, [isCompact, columnOrder, columnVisibility]);

  return (
    <div 
      className={cn("h-full flex flex-col p-2 relative", className)}
      ref={containerRef}
    >
      <div className="flex-1 min-h-0 relative">
        <div className="absolute left-[8px] right-[16px] h-[1px] bg-border z-30" style={{ top: '40px' }}></div>
        <div 
          onMouseDown={(e) => e.stopPropagation()} 
          onTouchStart={(e) => e.stopPropagation()}
          className="h-full"
        >
          <DndContext
            id={useId()}
            collisionDetection={closestCenter}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            autoScroll={true}
          >
            <Table>
              <TableHeader className="sticky top-0 z-20">
                <TableRow className="bg-[hsl(var(--color-widget-header))]">
                  <SortableContext 
                    items={visibleColumnIds} 
                    strategy={horizontalListSortingStrategy}
                  >
                    {table.getHeaderGroups()[0].headers
                      .filter(header => visibleColumnIds.includes(header.column.id))
                      .map((header) => (
                        <DraggableTableHeader key={header.id} header={header} currentTheme={currentTheme} />
                      ))}
                  </SortableContext>
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
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="group hover:bg-[hsl(var(--color-widget-hover))]" isHeader={false}>
                      <SortableContext
                        items={visibleColumnIds}
                        strategy={horizontalListSortingStrategy}
                      >
                        {row.getVisibleCells()
                          .filter(cell => visibleColumnIds.includes(cell.column.id))
                          .map((cell) => (
                            <DragAlongCell key={cell.id} cell={cell} currentTheme={currentTheme} />
                          ))}
                      </SortableContext>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </div>
    </div>
  );
});

// Add displayName for easier debugging
MarketsWidget.displayName = 'MarketsWidget';

export default MarketsWidget; 