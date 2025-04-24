import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { MarketsWidgetHeader } from './MarketsWidgetHeader';
import { MarketsWidgetMenu } from './MarketsWidgetMenu';
import { MarketData } from './MarketsWidget';
import { useReactTable } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ListIcon, BanIcon, RotateCcw, Search, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';

// Constants for localStorage keys
const STORAGE_KEY_PREFIX = 'markets-widget-';

// Helper functions to generate instance-specific keys
const getInstanceStorageKey = (widgetId: string, key: string) => {
  return `${STORAGE_KEY_PREFIX}${widgetId}-${key}`;
};

// Helper functions for localStorage
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

// Registry to keep track of widget state
const marketsWidgetRegistry = new Map<string, {
  searchQuery: string;
  selectedQuoteAsset: AssetTicker | 'ALL';
  secondaryCurrency: AssetTicker | null;
  quoteAssets: AssetTicker[];
  tableRef: React.RefObject<{ getTable: () => ReturnType<typeof useReactTable<MarketData>> | null }>;
}>();

interface MarketsWidgetWrapperProps {
  isHeader?: boolean;
  widgetId: string;
  widgetComponent: React.FC<any>;
  onRemove?: () => void;
  isMenu?: boolean;
  isFilterContent?: boolean;
  onFilterDropdownClose?: () => void;
}

export const MarketsWidgetWrapper: React.FC<MarketsWidgetWrapperProps> = ({
  isHeader,
  widgetId,
  widgetComponent: WidgetComponent,
  onRemove,
  isMenu,
  isFilterContent,
  onFilterDropdownClose,
}) => {
  // Generate instance-specific storage keys
  const instanceStorageKeys = useMemo(() => ({
    SELECTED_QUOTE_ASSET: getInstanceStorageKey(widgetId, 'selected-quote-asset'),
    SECONDARY_CURRENCY: getInstanceStorageKey(widgetId, 'secondary-currency'),
    SEARCH_QUERY: getInstanceStorageKey(widgetId, 'search-query'),
  }), [widgetId]);

  // Initialize state either from registry or with defaults
  const initializeWidgetState = () => {
    let state = marketsWidgetRegistry.get(widgetId);
    
    if (!state) {
      const tableRef = React.createRef<{ getTable: () => ReturnType<typeof useReactTable<MarketData>> | null }>();
      
      // Create new state with defaults and load from localStorage
      state = {
        searchQuery: getStoredValue<string>(instanceStorageKeys.SEARCH_QUERY, ''),
        selectedQuoteAsset: getStoredValue<AssetTicker | 'ALL'>(instanceStorageKeys.SELECTED_QUOTE_ASSET, 'ALL'),
        secondaryCurrency: getStoredValue<AssetTicker | null>(instanceStorageKeys.SECONDARY_CURRENCY, null),
        quoteAssets: [],
        tableRef
      };
      
      // Store in registry for shared access
      marketsWidgetRegistry.set(widgetId, state);
    }
    
    return state;
  };
  
  // Get stored state
  const widgetState = useMemo(() => initializeWidgetState(), [widgetId]);
  
  // Local state for this instance (header or content)
  const [searchQuery, setSearchQuery] = useState(widgetState.searchQuery);
  const [selectedQuoteAsset, setSelectedQuoteAsset] = useState(widgetState.selectedQuoteAsset);
  const [secondaryCurrency, setSecondaryCurrency] = useState(widgetState.secondaryCurrency);
  const [quoteAssets, setQuoteAssets] = useState(widgetState.quoteAssets);
  
  // Add synchronization effect
  useEffect(() => {
    // When the component mounts, synchronize its state with the registry
    const state = marketsWidgetRegistry.get(widgetId);
    if (state) {
      setSearchQuery(state.searchQuery);
      setSelectedQuoteAsset(state.selectedQuoteAsset);
      setSecondaryCurrency(state.secondaryCurrency);
      setQuoteAssets(state.quoteAssets);
    }

    // Listen for changes in the registry state
    const interval = setInterval(() => {
      const updatedState = marketsWidgetRegistry.get(widgetId);
      if (updatedState) {
        if (updatedState.searchQuery !== searchQuery) {
          setSearchQuery(updatedState.searchQuery);
        }
        if (updatedState.selectedQuoteAsset !== selectedQuoteAsset) {
          setSelectedQuoteAsset(updatedState.selectedQuoteAsset);
        }
        if (updatedState.secondaryCurrency !== secondaryCurrency) {
          setSecondaryCurrency(updatedState.secondaryCurrency);
        }
      }
    }, 100); // Check for changes every 100ms

    return () => clearInterval(interval);
  }, [widgetId, searchQuery, selectedQuoteAsset, secondaryCurrency]);
  
  // Handlers that update both local state and registry
  const handleSearchQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
    const state = marketsWidgetRegistry.get(widgetId);
    if (state) {
      state.searchQuery = value;
    }
    // Persist search query for this widget instance
    setStoredValue(instanceStorageKeys.SEARCH_QUERY, value);
  }, [widgetId, instanceStorageKeys.SEARCH_QUERY]);
  
  const handleSelectedQuoteAssetChange = useCallback((value: AssetTicker | 'ALL') => {
    setSelectedQuoteAsset(value);
    const state = marketsWidgetRegistry.get(widgetId);
    if (state) {
      state.selectedQuoteAsset = value;
    }
    // Persist selected quote asset for this widget instance
    setStoredValue(instanceStorageKeys.SELECTED_QUOTE_ASSET, value);
  }, [widgetId, instanceStorageKeys.SELECTED_QUOTE_ASSET]);
  
  const handleSecondaryCurrencyChange = useCallback((value: AssetTicker | null) => {
    console.log('Wrapper changing secondary currency to:', value);
    setSecondaryCurrency(value);
    const state = marketsWidgetRegistry.get(widgetId);
    if (state) {
      state.secondaryCurrency = value;
      
      // Force refresh data to trigger UI update - more aggressively
      if (state.tableRef.current) {
        const table = state.tableRef.current.getTable();
        if (table) {
          // Try multiple refresh strategies
          table.setColumnVisibility({...table.getState().columnVisibility});
          
          // Force re-sorting to trigger a re-render
          const currentSorting = table.getState().sorting;
          if (currentSorting.length > 0) {
            table.setSorting([...currentSorting]);
          } else {
            // If no sorting active, toggle it briefly
            const firstSortableColumn = table.getAllColumns().find(col => col.getCanSort());
            if (firstSortableColumn) {
              table.setSorting([{ id: firstSortableColumn.id, desc: false }]);
              setTimeout(() => {
                table.setSorting([]);
              }, 10);
            }
          }
          
          // Additional trigger for re-render
          setTimeout(() => {
            table.setColumnVisibility({...table.getState().columnVisibility});
          }, 50);
        }
      }
    }
    // Persist secondary currency for this widget instance
    setStoredValue(instanceStorageKeys.SECONDARY_CURRENCY, value);
  }, [widgetId, instanceStorageKeys.SECONDARY_CURRENCY]);
  
  const handleQuoteAssetsChange = useCallback((assets: AssetTicker[]) => {
    setQuoteAssets(assets);
    const state = marketsWidgetRegistry.get(widgetId);
    if (state) {
      state.quoteAssets = assets;
    }
  }, [widgetId]);
  
  // Use the table ref from the registry
  const tableRef = widgetState.tableRef;
  
  // If this is a menu component request, render the menu
  if (isMenu) {
    return <MarketsWidgetMenu tableRef={tableRef} />;
  }
  
  // If this is the filter content component request
  if (isFilterContent) {
    return (
      <>
        <div className="relative mb-1 px-1" onClick={(e) => e.stopPropagation()} onFocus={(e) => e.stopPropagation()}>
          <Input
            type="text"
            placeholder="Search Pairs"
            value={searchQuery}
            onChange={(e) => handleSearchQueryChange(e.target.value)}
            className="h-8 w-full pl-7 pr-7 text-xs"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          {searchQuery && (
            <button 
              aria-label="Clear search"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleSearchQueryChange('');
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
                      onSelect={() => handleSelectedQuoteAssetChange('ALL')}
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
                            const newValue = currentValue.toUpperCase() as AssetTicker | 'ALL';
                            handleSelectedQuoteAssetChange(newValue);
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
                            const newValue = currentValue.toUpperCase() as AssetTicker;
                            handleSecondaryCurrencyChange(newValue);
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
            !(searchQuery !== '' || selectedQuoteAsset !== 'ALL' || secondaryCurrency !== null)
              ? "opacity-50 pointer-events-none"
              : "cursor-pointer"
          )}
          onSelect={() => {
            handleSearchQueryChange('');
            handleSelectedQuoteAssetChange('ALL');
            handleSecondaryCurrencyChange(null);
            if (onFilterDropdownClose) {
              setTimeout(onFilterDropdownClose, 100);
            }
          }}
          disabled={!(searchQuery !== '' || selectedQuoteAsset !== 'ALL' || secondaryCurrency !== null)}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5 opacity-80" />
          <span>Clear All Filters</span>
        </DropdownMenuItem>
      </>
    );
  }
  
  // If this is the header component, render the header
  if (isHeader) {
    return (
      <MarketsWidgetHeader
        widgetId={widgetId}
        onSearchQueryChange={handleSearchQueryChange}
        onSelectedQuoteAssetChange={handleSelectedQuoteAssetChange}
        onSecondaryCurrencyChange={handleSecondaryCurrencyChange}
        quoteAssets={quoteAssets}
        tableRef={tableRef}
      />
    );
  }
  
  // If this is the filter content component, render nothing (handled by DropdownContent)
  if (isFilterContent) {
    return null;
  }
  
  // Main widget content - render the widget component with the current state
  return (
    <WidgetComponent
      id={widgetId}
      ref={tableRef}
      searchQuery={searchQuery}
      onSearchQueryChange={handleSearchQueryChange}
      selectedQuoteAsset={selectedQuoteAsset}
      onSelectedQuoteAssetChange={handleSelectedQuoteAssetChange}
      secondaryCurrency={secondaryCurrency}
      onSecondaryCurrencyChange={handleSecondaryCurrencyChange}
      onQuoteAssetsChange={handleQuoteAssetsChange}
      onRemove={onRemove}
      persistState={true}
    />
  );
}; 