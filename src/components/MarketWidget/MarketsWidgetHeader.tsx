import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
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
  Plus as PlusIcon,
  ChevronsUpDown,
  SlidersHorizontal
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
import { useReactTable } from '@tanstack/react-table';
import { MarketsWidgetMenu } from './MarketsWidgetMenu';
import { ListManager } from './MarketLists';
import { MarketsWidgetColumnVisibility } from './MarketsWidget';
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
  quoteAssets: AssetTicker[];
  widgetId?: string;
  table?: ReturnType<typeof useReactTable<any>> | null;
  tableRef?: React.RefObject<{ getTable: () => ReturnType<typeof useReactTable<any>> | null }>;
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
  const [pairPopoverOpen, setPairPopoverOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState('');
  const [pairSearchValue, setPairSearchValue] = useState('');
  
  // Get actual table instance - simplified access pattern
  const actualTable = table || tableRef?.current?.getTable() || null;

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
  
  // Get all trading pairs from sample data
  const availablePairs = Object.keys(SAMPLE_MARKET_DATA).sort();
  
  // Log available pairs for debugging
  useEffect(() => {
    console.log('Available trading pairs for selection:', availablePairs);
  }, [availablePairs]);

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
    const active = searchQuery !== '' || selectedQuoteAsset !== 'ALL' || secondaryCurrency !== null;
    setIsFiltersActive(active);
  }, [searchQuery, selectedQuoteAsset, secondaryCurrency]);

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

  // Handle adding a pair to the current list
  const handleAddPair = (pairToAdd: string = selectedPair) => {
    if (!activeListId || !pairToAdd) return;
    
    // Store the full trading pair instead of just the base asset
    // This prevents adding multiple pairs with the same base asset
    ListManager.addAssetToList(activeListId, pairToAdd, widgetId);
    setSelectedPair('');
    setPairPopoverOpen(false);
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

  const filteredPairs = pairSearchValue === ''
    ? availablePairs
    : availablePairs.filter((pair) =>
        pair.toLowerCase().includes(pairSearchValue.toLowerCase())
      );

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
      {/* Add Pair button with direct combobox */}
      {activeListId && (
        <Popover open={pairPopoverOpen} onOpenChange={setPairPopoverOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-3 text-xs whitespace-nowrap flex items-center gap-1.5 min-w-[180px] justify-between"
              onClick={() => setPairPopoverOpen(true)}
            >
              <div className="flex items-center">
                <PlusIcon className="h-3.5 w-3.5 mr-1.5" /> 
                {selectedPair ? 
                  <span className="truncate max-w-[100px]">{selectedPair}</span> : 
                  "Add Asset"
                }
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 ml-auto opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[220px]" align="start">
            <Command>
              <CommandInput 
                placeholder="Search trading pairs..." 
                className="h-9"
                value={pairSearchValue}
                onValueChange={setPairSearchValue}
              />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>No trading pairs found</CommandEmpty>
                <CommandGroup>
                  {filteredPairs.map((pair) => (
                    <CommandItem
                      key={pair}
                      value={pair}
                      onSelect={() => {
                        // Pass the pair directly to handleAddPair to avoid state timing issues
                        handleAddPair(pair);
                      }}
                    >
                      {renderPairOption(pair)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      <DropdownMenu open={filterDropdownOpen} onOpenChange={setFilterDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={isFiltersActive ? "default" : "outline"}
            size="sm" 
            className="h-8 px-3 text-xs whitespace-nowrap flex items-center gap-1.5"
          >
            <FilterIcon className="h-3.5 w-3.5" /> 
            Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 p-1" align="start">
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
                    <ListIcon className="mr-2 h-3.5 w-3.5 opacity-80 shrink-0" />
                  ) : ASSETS[selectedQuoteAsset]?.icon ? (
                    <img 
                      src={ASSETS[selectedQuoteAsset].icon} 
                      alt={selectedQuoteAsset} 
                      className="w-4 h-4 mr-2 rounded-full shrink-0" 
                    />
                  ) : (
                    <div className="w-4 h-4 mr-2 shrink-0"></div>
                  )}
                  <span className="flex-1 text-left truncate">
                    Quote: {selectedQuoteAsset === 'ALL' ? 'All Pairs' : selectedQuoteAsset}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-0 w-48">
                  <Command>
                    <CommandInput placeholder="Filter pair..." className="h-8 text-xs" autoFocus />
                    <CommandList>
                      <CommandEmpty>No pair found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="ALL"
                          onSelect={() => handleQuoteAssetChange('ALL')}
                          className="text-xs h-8 flex items-center justify-between"
                        >
                          <div className="flex items-center flex-1 truncate">
                            <ListIcon className="mr-2 h-3.5 w-3.5 opacity-80 shrink-0" />
                            <span className="truncate">All Pairs</span>
                          </div>
                          <Check
                            className={cn(
                              "ml-2 h-3 w-3 flex-shrink-0",
                              selectedQuoteAsset === 'ALL' ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                        {quoteAssets.map((asset) => {
                          const assetConfig = ASSETS[asset];
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
                                  <div className="w-4 h-4 mr-2 shrink-0"></div>
                                )}
                                <span className="truncate">{asset}</span>
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

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className={cn(
                  "text-xs h-8 mx-1 pr-2",
                  secondaryCurrency === null && "opacity-75"
                )}>
                  {secondaryCurrency === null ? (
                    <BanIcon className="mr-2 h-3.5 w-3.5 opacity-80 shrink-0" />
                  ) : ASSETS[secondaryCurrency]?.icon ? (
                    <img 
                      src={ASSETS[secondaryCurrency].icon} 
                      alt={secondaryCurrency} 
                      className="w-4 h-4 mr-2 rounded-full shrink-0" 
                    />
                  ) : (
                    <div className="w-4 h-4 mr-2 shrink-0"></div>
                  )}
                  <span className="flex-1 text-left truncate">
                    {secondaryCurrency ? `Show in: ${secondaryCurrency}` : 'Secondary: None'}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-0 w-48">
                  <Command>
                    <CommandInput placeholder="Filter currency..." className="h-8 text-xs" autoFocus />
                    <CommandList>
                      <CommandEmpty>No currency found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => handleSecondaryCurrencyChange(null)}
                          className="text-xs h-8 flex items-center justify-between"
                        >
                          <div className="flex items-center flex-1 truncate">
                            <BanIcon className="mr-2 h-3.5 w-3.5 opacity-80 shrink-0" />
                            <span className="truncate">None</span>
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
                                  <div className="w-4 h-4 mr-2 shrink-0"></div>
                                )}
                                <span className="truncate">Show in {currency}</span>
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
              <span>Clear All Filters</span>
            </DropdownMenuItem>
          </>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu open={columnsDropdownOpen} onOpenChange={setColumnsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 text-xs whitespace-nowrap flex items-center gap-1.5"
          >
            <ColumnsIcon className="h-3.5 w-3.5" /> 
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 p-1" align="start">
          {actualTable ? (
            <MarketsWidgetColumnVisibility table={actualTable} />
          ) : (
            <>
              <DropdownMenuLabel>Column Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 text-xs text-muted-foreground text-center">
                Table not available
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}; 