import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { useReactTable } from '@tanstack/react-table';
import { MarketData } from './MarketsWidget'; // Import MarketData type

// Add window extension declaration
declare global {
  interface Window {
    __marketsWidgetDialogTable?: ReturnType<typeof useReactTable<MarketData>>;
  }
}

import { 
  Filter as FilterIcon,
  Search, 
  X,
  Check,
  Tags,
  RotateCcw,
  List as ListIcon,
  Ban as BanIcon,
  Columns as ColumnsIcon,
  ChevronsUpDown,
  SlidersHorizontal,
  Coins,
  CircleSlash
} from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { ListManager } from './MarketLists';
import { MarketsWidgetColumnVisibility } from './MarketsWidget';
import { QuoteAssetsWithCounts } from './MarketsWidget';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { SAMPLE_MARKET_DATA } from '@/services/marketsSampleData';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

// Helper functions for localStorage
const getLocalStorageItem = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
};

const setLocalStorageItem = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
};

interface MarketsWidgetHeaderProps {
  onSearchQueryChange: (value: string) => void;
  onSelectedQuoteAssetChange: (value: AssetTicker | 'ALL') => void;
  onSecondaryCurrencyChange: (value: AssetTicker | null) => void;
  quoteAssets: QuoteAssetsWithCounts;
  widgetId?: string;
  table?: ReturnType<typeof useReactTable<MarketData>> | null;
  tableRef?: React.RefObject<{ getTable: () => ReturnType<typeof useReactTable<MarketData>> | null }>;
}

export const MarketsWidgetHeader: React.FC<MarketsWidgetHeaderProps> = ({
  onSearchQueryChange,
  onSelectedQuoteAssetChange,
  onSecondaryCurrencyChange,
  quoteAssets,
  widgetId = 'default',
  table,
  tableRef
}) => {
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [activeListName, setActiveListName] = useState<string>('');
  
  // Get actual table instance - enhanced access pattern with dialog support
  const actualTable = useMemo(() => {
    // First try direct table prop
    if (table) {
      console.log('[MarketsWidgetHeader] Using direct table prop for widget', widgetId);
      return table;
    }
    
    // Then try tableRef
    if (tableRef?.current?.getTable) {
      const tableFromRef = tableRef.current.getTable();
      if (tableFromRef) {
        console.log('[MarketsWidgetHeader] Using table from ref for widget', widgetId);
        console.log('[MarketsWidgetHeader] Column visibility state:', tableFromRef.getState().columnVisibility);
        return tableFromRef;
      }
    }
    
    // Lastly, check for dialog mode table reference
    if (typeof window !== 'undefined' && window.__marketsWidgetDialogTable) {
      console.log('[MarketsWidgetHeader] Using global table reference (dialog mode) for widget', widgetId);
      return window.__marketsWidgetDialogTable;
    }
    
    console.log('[MarketsWidgetHeader] No table reference found for widget', widgetId);
    return null;
  }, [table, tableRef, widgetId]);

  // Storage keys for local storage
  const storageKeys = {
    search: `marketsWidget_${widgetId}_searchQuery`,
    quoteAsset: `marketsWidget_${widgetId}_selectedQuoteAsset`,
    secondaryCurrency: `marketsWidget_${widgetId}_secondaryCurrency`,
  };

  // Local state variables for filter values
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuoteAsset, setSelectedQuoteAsset] = useState<AssetTicker | 'ALL'>('ALL');
  const [secondaryCurrency, setSecondaryCurrency] = useState<AssetTicker | null>(null);
  const [isFiltersActive, setIsFiltersActive] = useState(false);
  
  // Initialize from localStorage
  useEffect(() => {
    try {
      const storedSearchQuery = getLocalStorageItem<string>(storageKeys.search, '');
      const storedQuoteAsset = getLocalStorageItem<AssetTicker | 'ALL'>(storageKeys.quoteAsset, 'ALL');
      const storedSecondaryCurrency = getLocalStorageItem<AssetTicker | null>(storageKeys.secondaryCurrency, null);
      
      setSearchQuery(storedSearchQuery);
      setSelectedQuoteAsset(storedQuoteAsset);
      setSecondaryCurrency(storedSecondaryCurrency);
      
      const active = storedSearchQuery !== '' || storedQuoteAsset !== 'ALL' || storedSecondaryCurrency !== null;
      setIsFiltersActive(active);
    } catch (error) {
      console.error('Error loading filter state from localStorage:', error);
    }
  }, [widgetId]);
  
  // Check for active list 
  useEffect(() => {
    const checkActiveList = () => {
      const listId = ListManager.getActiveListId(widgetId);
      setActiveListId(listId);
      
      if (listId) {
        const lists = ListManager.getLists(widgetId);
        const activeList = lists.find(list => list.id === listId);
        setActiveListName(activeList?.name || 'Custom List');
      } else {
        setActiveListName('');
      }
    };
    
    // Check on mount
    checkActiveList();
    
    // Listen for list changes, but only respond to events for this widget ID
    const handleListChanged = (event: CustomEvent) => {
      // Only process if the event is for this widget
      if (event.detail?.instanceId === widgetId) {
        console.log(`[MarketsWidgetHeader] Received list change event for widget ${widgetId}:`, event.detail);
        checkActiveList();
      }
    };
    
    document.addEventListener('markets-active-list-changed', handleListChanged as EventListener);
    
    return () => {
      document.removeEventListener('markets-active-list-changed', handleListChanged as EventListener);
    };
  }, [widgetId]);
  
  // Update isFiltersActive whenever filters change
  useEffect(() => {
    const active = searchQuery !== '' || selectedQuoteAsset !== 'ALL';
    setIsFiltersActive(active);
  }, [searchQuery, selectedQuoteAsset]);

  // Handle filter changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setLocalStorageItem(storageKeys.search, value);
    onSearchQueryChange(value);
  };

  const handleQuoteAssetChange = (value: AssetTicker | 'ALL') => {
    setSelectedQuoteAsset(value);
    setLocalStorageItem(storageKeys.quoteAsset, value);
    onSelectedQuoteAssetChange(value);
  };

  const handleSecondaryCurrencyChange = (value: AssetTicker | null) => {
    setSecondaryCurrency(value);
    setLocalStorageItem(storageKeys.secondaryCurrency, value);
    onSecondaryCurrencyChange(value);
  };

  const clearAllFilters = () => {
    handleSearchChange('');
    handleQuoteAssetChange('ALL');
    handleSecondaryCurrencyChange(null);
    setFilterDropdownOpen(false);
  };

  // Listen for tab click events
  const handleTabClick = (value: string) => {
    console.log(`[MarketsWidgetHeader] Tab clicked: ${value} for widget ${widgetId}`);
    if (value === 'markets') {
      // Deactivate any active list
      ListManager.setActiveListId(null, widgetId);
    } else if (value.startsWith('list-')) {
      const listId = value.substring(5); // Remove 'list-' prefix
      ListManager.setActiveListId(listId, widgetId);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={filterDropdownOpen} onOpenChange={setFilterDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={isFiltersActive ? "default" : "outline"}
            size="sm" 
            className="h-7 px-2.5 text-xs whitespace-nowrap max-w-[180px] flex items-center"
          >
            <FilterIcon className="mr-1 h-3 w-3 flex-shrink-0" /> 
            <span className="truncate leading-none">Filter</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full p-1" align="end">
          {/* Improved filter implementation */}
          <>
            <div className="relative mb-1 px-1" onClick={(e) => e.stopPropagation()} onFocus={(e) => e.stopPropagation()}>
              <Input
                type="text"
                placeholder="Search Pairs"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-8 w-full pl-7 pr-7 text-xs"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              {searchQuery && (
                <button 
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSearchChange('');
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            
            <DropdownMenuSeparator className="mx-1 my-1"/>

            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className={cn(
                  "text-xs h-8 mx-1 pr-2",
                  selectedQuoteAsset === 'ALL' && "opacity-75"
                )}>
                  {selectedQuoteAsset === 'ALL' ? (
                    <Coins className="mr-2 h-3.5 w-3.5 opacity-80 shrink-0" />
                  ) : ASSETS[selectedQuoteAsset]?.icon ? (
                    <img 
                      src={ASSETS[selectedQuoteAsset].icon} 
                      alt={selectedQuoteAsset} 
                      className="w-4 h-4 mr-2 rounded-full shrink-0" 
                    />
                  ) : (
                    <div className="w-4 h-4 mr-2 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0 flex items-center justify-center">
                      <span className="text-[10px] font-medium">{selectedQuoteAsset.charAt(0)}</span>
                    </div>
                  )}
                  <span className="flex-1 text-left truncate   text-sm ">
                    Quote: {selectedQuoteAsset === 'ALL' ? 'All Pairs' : selectedQuoteAsset}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-0 w-48">
                  <Command>
                    <CommandInput placeholder="Filter pair..." className="h-8 text-xs" autoFocus />
                    <CommandList>
                      <CommandEmpty>
                        <div className="  text-sm  py-2 text-center">No pair found.</div>
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="ALL"
                          onSelect={() => handleQuoteAssetChange('ALL')}
                          className="text-xs h-8 flex items-center justify-between"
                        >
                          <div className="flex items-center flex-1 truncate">
                            <Coins className="mr-2 h-3.5 w-3.5 opacity-80 shrink-0" />
                            <span className="truncate   text-sm ">All Pairs</span>
                            <span className="ml-1 text-xs px-1.5 py-0.5 rounded-sm bg-neutral-500/20 text-neutral-500">
                              {quoteAssets.totalCount || 0}
                            </span>
                          </div>
                          <Check
                            className={cn(
                              "ml-2 h-3 w-3 flex-shrink-0",
                              selectedQuoteAsset === 'ALL' ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                        {quoteAssets.assets.map((asset) => {
                          const assetConfig = ASSETS[asset];
                          const assetCount = quoteAssets.counts[asset] || 0;
                          
                          return (
                            <CommandItem
                              key={asset}
                              value={asset}
                              onSelect={(currentValue) => {
                                handleQuoteAssetChange(currentValue.toUpperCase() as AssetTicker);
                              }}
                              className="text-xs h-8 flex items-center justify-between"
                            >
                              <div className="flex items-center flex-1 truncate">
                                {assetConfig?.icon ? (
                                  <img 
                                    src={assetConfig.icon} 
                                    alt={asset} 
                                    className="w-4 h-4 mr-2 rounded-full shrink-0" 
                                  />
                                ) : (
                                  <div className="w-4 h-4 mr-2 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0 flex items-center justify-center">
                                    <span className="text-[10px] font-medium">{asset.charAt(0)}</span>
                                  </div>
                                )}
                                <span className="truncate   text-sm ">{asset}</span>
                                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-sm bg-neutral-500/20 text-neutral-500">
                                  {assetCount}
                                </span>
                              </div>
                              <Check
                                className={cn(
                                  "ml-2 h-3 w-3 flex-shrink-0",
                                  selectedQuoteAsset === asset ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            
            {/* Separator and Clear Filters Button */}
            <DropdownMenuSeparator className="mx-1 my-1" />
            <DropdownMenuItem 
              className={cn(
                "text-xs h-8 mx-1 pr-2 focus:bg-muted",
                !isFiltersActive 
                  ? "opacity-50 pointer-events-none"
                  : "cursor-pointer"
              )}
              onSelect={clearAllFilters}
              disabled={!isFiltersActive}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5 opacity-80" />
              <span className="  text-sm ">Clear All Filters</span>
            </DropdownMenuItem>
          </>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New Currency Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={secondaryCurrency ? "default" : "outline"} 
            size="sm" 
            className="h-7 px-2.5 text-xs whitespace-nowrap max-w-[180px] flex items-center"
          >
            {secondaryCurrency ? (
              ASSETS[secondaryCurrency]?.icon ? (
                <img 
                  src={ASSETS[secondaryCurrency].icon} 
                  alt={secondaryCurrency} 
                  className="w-3.5 h-3.5 mr-1 rounded-full shrink-0" 
                />
              ) : (
                <div className="w-3.5 h-3.5 mr-1 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0 flex items-center justify-center">
                  <span className="text-[8px] font-medium">{secondaryCurrency.charAt(0)}</span>
                </div>
              )
            ) : (
              <CircleSlash className="mr-1 h-3 w-3 flex-shrink-0" />
            )}
            <span className="truncate leading-none">Currency</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="p-0 w-48" align="end">
          <Command>
            <CommandInput placeholder="Filter currency..." className="h-8 text-xs" autoFocus />
            <CommandList>
              <CommandEmpty>
                <div className="text-sm py-2 text-center">No currency found.</div>
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value=""
                  onSelect={() => handleSecondaryCurrencyChange(null)}
                  className="text-xs h-8 flex items-center justify-between"
                >
                  <div className="flex items-center flex-1 truncate">
                    <CircleSlash className="mr-2 h-3.5 w-3.5 opacity-80 shrink-0" />
                    <span className="truncate text-sm">None</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-3 w-3 flex-shrink-0",
                      secondaryCurrency === null ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
                {(['USD', 'EUR', 'GBP'] as const).map((currency) => {
                  const assetConfig = ASSETS[currency];
                  return (
                    <CommandItem
                      key={currency}
                      value={currency}
                      onSelect={(currentValue) => {
                        handleSecondaryCurrencyChange(currentValue.toUpperCase() as AssetTicker);
                      }}
                      className="text-xs h-8 flex items-center justify-between"
                    >
                      <div className="flex items-center flex-1 truncate">
                        {assetConfig?.icon ? (
                          <img 
                            src={assetConfig.icon} 
                            alt={currency} 
                            className="w-4 h-4 mr-2 rounded-full shrink-0" 
                          />
                        ) : (
                          <div className="w-4 h-4 mr-2 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0 flex items-center justify-center">
                            <span className="text-[10px] font-medium">{currency.charAt(0)}</span>
                          </div>
                        )}
                        <span className="truncate text-sm">Show in {currency}</span>
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-3 w-3 flex-shrink-0",
                          secondaryCurrency === currency ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu open={columnsDropdownOpen} onOpenChange={setColumnsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2.5 text-xs whitespace-nowrap max-w-[180px] flex items-center"
          >
            <ColumnsIcon className="mr-1 h-3 w-3 flex-shrink-0" /> 
            <span className="truncate leading-none">Columns</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full p-1" align="end">
          {actualTable ? (
            <MarketsWidgetColumnVisibility table={actualTable} />
          ) : (
            <>
              <DropdownMenuLabel className="  text-sm ">Column Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2   text-sm  text-muted-foreground text-center">
                Table not available
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}; 