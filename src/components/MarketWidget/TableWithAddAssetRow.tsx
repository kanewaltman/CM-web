import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { flexRender } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '../ui/popover';
import { ListManager } from './MarketLists';
import { SAMPLE_MARKET_DATA } from '@/services/marketsSampleData';

// AddAssetRow component (moved from separate file)
interface AddAssetRowProps {
  activeListId: string;
  widgetId: string;
  colSpan: number;
}

const AddAssetRow: React.FC<AddAssetRowProps> = ({ 
  activeListId, 
  widgetId, 
  colSpan 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  // Get all trading pairs from sample data
  const availablePairs = Object.keys(SAMPLE_MARKET_DATA).sort();
  
  const filteredPairs = searchValue === ''
    ? availablePairs
    : availablePairs.filter((pair) =>
        pair.toLowerCase().includes(searchValue.toLowerCase())
      );
  
  const handleAddPair = (pair: string) => {
    if (!activeListId || !pair) return;
    
    // Store the full trading pair instead of just the base asset
    ListManager.addAssetToList(activeListId, pair, widgetId);
    setIsOpen(false);
  };
  
  // Split rendering pair into components for better styling
  const renderPairOption = (pair: string) => {
    const [baseAsset, quoteAsset] = pair.split('/');
    
    return (
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
    );
  };

  return (
    <div className="flex items-center h-[48px] px-4 border-t border-border/30">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button 
            className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors h-full"
          >
            <Plus className="h-4 w-4 opacity-70 group-hover:opacity-100" /> 
            <span className="group-hover:underline underline-offset-2">Add asset</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[220px] z-50" align="start">
          <Command>
            <CommandInput 
              placeholder="Search trading pairs..." 
              className="h-9"
              value={searchValue}
              onValueChange={setSearchValue}
              autoFocus
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No trading pairs found</CommandEmpty>
              <CommandGroup>
                {filteredPairs.map((pair) => (
                  <CommandItem
                    key={pair}
                    value={pair}
                    onSelect={() => handleAddPair(pair)}
                  >
                    {renderPairOption(pair)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface TableWithAddAssetRowProps {
  table: any;
  rowVirtualizer: any;
  rows: any[];
  activeListId: string | null;
  widgetId: string;
  columnVisibility: Record<string, boolean>;
  dynamicVisibility: Record<string, boolean>;
  columnSizes: Record<string, number>;
  getTotalColumnsWidth: () => number;
  renderTableHeader: any;
  currentTheme: 'light' | 'dark';
  COLUMN_TRANSITION_CLASSES: string;
  headerRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
}

export const TableWithAddAssetRow: React.FC<TableWithAddAssetRowProps> = ({
  table,
  rowVirtualizer,
  rows,
  activeListId,
  widgetId,
  columnVisibility,
  dynamicVisibility,
  columnSizes,
  getTotalColumnsWidth,
  renderTableHeader,
  currentTheme,
  COLUMN_TRANSITION_CLASSES,
  headerRefs,
}) => {
  // Calculate the number of visible columns for colSpan
  const visibleColumnsCount = Object.keys(columnVisibility)
    .filter(id => columnVisibility[id] !== false && dynamicVisibility[id] !== false)
    .length;

  // Calculate the height for the virtualized table, accounting for the add asset row
  const virtualizedHeight = rowVirtualizer.getTotalSize() + (activeListId ? 48 : 0);

  return (
    <div className="w-full">
      <div 
        className="sticky top-0 z-20 w-full flex bg-[hsl(var(--color-widget-header))] border-b border-border"
      >
        {table.getHeaderGroups()[0].headers
          .filter((header: any) => {
            const columnId = header.column.id;
            return columnVisibility[columnId] !== false && dynamicVisibility[columnId] !== false;
          })
          .map((header: any) => renderTableHeader(header, currentTheme, columnSizes, () => getTotalColumnsWidth()))}
      </div>
      
      <div 
        style={{ 
          height: `${virtualizedHeight}px`, 
          width: '100%', 
          position: 'relative',
          overflow: 'hidden' 
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow: any) => {
          const row = rows[virtualRow.index];
          const visibleCells = row.getVisibleCells().filter((cell: any) => {
            const columnId = cell.column.id;
            return columnVisibility[columnId] !== false && dynamicVisibility[columnId] !== false;
          });
          
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
              {visibleCells.map((cell: any) => {
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
        
        {/* Add Asset Row - Only show when a list is active */}
        {activeListId && (
          <div
            className="absolute top-0 left-0 flex w-full"
            style={{
              transform: `translateY(${rowVirtualizer.getTotalSize()}px)`,
            }}
          >
            <div 
              className="flex-1"
              style={{
                minWidth: `${getTotalColumnsWidth()}px`,
              }}
            >
              <AddAssetRow 
                activeListId={activeListId} 
                widgetId={widgetId} 
                colSpan={visibleColumnsCount} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 