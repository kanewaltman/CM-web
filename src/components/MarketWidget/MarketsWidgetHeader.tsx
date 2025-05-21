import React, { useState, useEffect, useRef, useMemo, useContext, useLayoutEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { useReactTable } from '@tanstack/react-table';
import { MarketData } from './MarketsWidget'; // Import MarketData type
import { MarketsWidgetState, widgetStateRegistry } from '@/lib/widgetState';
import { TableRefContext } from './MarketsWidgetWrapper';

// Lucide Icon imports
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

// Create a simple placeholder component for column visibility when table isn't directly available
const FallbackColumnVisibility: React.FC<{id: string}> = ({id}) => {
  // This is a minimal implementation that shows standard columns
  // We'll store visibility in localStorage to maintain consistency
  const storageKey = `markets-widget-${id}-column-visibility`;
  
  // Default columns - similar to what's in MarketsWidget
  const standardColumns = [
    { id: 'pair', label: 'Pair' },
    { id: 'price', label: 'Price' },
    { id: 'change24h', label: '24h %' },
    { id: 'change7d', label: '7d %' },
    { id: 'marketCap', label: 'Market Cap' },
    { id: 'volume', label: 'Volume' }
  ];
  
  // Get stored visibility or use defaults (all visible except maybe some specific ones)
  const [columnVisibility, setColumnVisibility] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });
  
  // Update visibility and store it
  const toggleVisibility = (columnId: string) => {
    const newVisibility = { ...columnVisibility };
    newVisibility[columnId] = !newVisibility[columnId];
    
    // Don't allow hiding the pair column
    if (columnId === 'pair') {
      delete newVisibility['pair'];
    }
    
    setColumnVisibility(newVisibility);
    
    // Save to localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(newVisibility));
    } catch (e) {
      console.error('Error saving column visibility', e);
    }
    
    // Dispatch an event that MarketsWidget can listen for
    const event = new CustomEvent('markets-column-visibility-changed', {
      detail: {
        widgetId: id,
        visibility: newVisibility
      }
    });
    document.dispatchEvent(event);
  };
  
  return (
    <>
      <DropdownMenuLabel className="text-sm">Customize Columns</DropdownMenuLabel>
      <div className="max-h-[300px] overflow-auto py-1">
        {standardColumns.map(column => (
          <DropdownMenuItem
            key={column.id}
            className="text-xs h-8 flex items-center px-2 justify-between cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              toggleVisibility(column.id);
            }}
          >
            <span>{column.label}</span>
            <span className={`h-4 w-4 rounded-sm border border-primary ${columnVisibility[column.id] !== false ? 'bg-primary text-primary-foreground' : 'opacity-50'}`}>
              {columnVisibility[column.id] !== false && (
                <Check className="h-3 w-3" />
              )}
            </span>
          </DropdownMenuItem>
        ))}
      </div>
    </>
  );
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
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Get table ref from context if not provided directly
  const contextTableRef = useContext(TableRefContext);
  const effectiveTableRef = tableRef || contextTableRef;
  
  // Get actual table instance
  const actualTable = useMemo(() => {
    // First try direct table prop
    if (table) {
      console.log(`[${widgetId}] Using direct table prop`);
      return table;
    }
    
    // Then try tableRef
    if (effectiveTableRef?.current?.getTable) {
      const tableFromRef = effectiveTableRef.current.getTable();
      if (tableFromRef) {
        console.log(`[${widgetId}] Using table from ref`, effectiveTableRef.current);
        return tableFromRef;
      }
    }
    
    // If we couldn't get a table, log more details to help debug
    if (effectiveTableRef) {
      console.log(`[${widgetId}] Table ref exists but couldn't get table:`, 
        effectiveTableRef.current ? 'Ref has current' : 'Ref missing current',
        effectiveTableRef.current?.getTable ? 'getTable exists' : 'getTable missing');
    } else {
      console.log(`[${widgetId}] No table ref available`);
    }
    
    return null;
  }, [table, effectiveTableRef, widgetId, forceUpdate]);

  // Poll for the table ref to be available - handles late initialization
  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 10;
    const pollIntervalMs = 500;
    
    // Function to check if the table is available
    const pollForTable = () => {
      // Only poll if we don't have a table yet
      if (!actualTable) {
        // Check if we have a table ref that's been populated
        let tableFound = false;
        
        if (table) {
          tableFound = true;
        } else if (effectiveTableRef?.current?.getTable?.()) {
          tableFound = true;
        }
        
        if (tableFound) {
          // Force update to re-run the actualTable useMemo
          setForceUpdate(prev => prev + 1);
          return;
        }
        
        // Continue polling if we haven't reached the max count
        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(pollForTable, pollIntervalMs);
        }
      }
    };
    
    // Start polling
    pollForTable();
    
    return () => {
      pollCount = maxPolls; // Stop polling if component unmounts
    };
  }, [actualTable, table, effectiveTableRef]);

  // Get state from widget registry
  const widgetState = useMemo(() => {
    return widgetStateRegistry.get(widgetId) as MarketsWidgetState | undefined;
  }, [widgetId]);

  // Local state variables for filter values
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuoteAsset, setSelectedQuoteAsset] = useState<AssetTicker | 'ALL'>('ALL');
  const [secondaryCurrency, setSecondaryCurrency] = useState<AssetTicker | null>(null);
  const [isFiltersActive, setIsFiltersActive] = useState(false);
  
  // Initialize from widget state
  useEffect(() => {
    if (widgetState) {
      setSearchQuery(widgetState.searchQuery);
      setSelectedQuoteAsset(widgetState.selectedQuoteAsset);
      setSecondaryCurrency(widgetState.secondaryCurrency);
      
      const active = widgetState.searchQuery !== '' || 
                    widgetState.selectedQuoteAsset !== 'ALL' || 
                    widgetState.secondaryCurrency !== null;
                    
      setIsFiltersActive(active);
    }
  }, [widgetState]);
  
  // Subscribe to widget state changes
  useEffect(() => {
    if (widgetState) {
      return widgetState.subscribe(() => {
        setSearchQuery(widgetState.searchQuery);
        setSelectedQuoteAsset(widgetState.selectedQuoteAsset);
        setSecondaryCurrency(widgetState.secondaryCurrency);
        
        const active = widgetState.searchQuery !== '' || 
                      widgetState.selectedQuoteAsset !== 'ALL' || 
                      widgetState.secondaryCurrency !== null;
                      
        setIsFiltersActive(active);
      });
    }
    return () => {};
  }, [widgetState]);
  
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
        checkActiveList();
      }
    };
    
    document.addEventListener('markets-active-list-changed', handleListChanged as EventListener);
    
    return () => {
      document.removeEventListener('markets-active-list-changed', handleListChanged as EventListener);
    };
  }, [widgetId]);

  // Add an effect to log when the table becomes available
  useEffect(() => {
    let checkCount = 0;
    const maxChecks = 5;
    
    const checkForTable = () => {
      let tableFound = false;
      
      // Try direct table prop first
      if (table) {
        tableFound = true;
        console.log(`[TableCheck-${widgetId}] Found direct table prop`);
      }
      // Then try from ref
      else if (effectiveTableRef?.current?.getTable?.()) {
        tableFound = true;
        console.log(`[TableCheck-${widgetId}] Found table via ref`);
      }
      
      if (tableFound) {
        console.log(`[TableCheck-${widgetId}] Table is now available`);
        return; // Stop checking if we found a table
      }
      
      checkCount++;
      if (checkCount < maxChecks) {
        setTimeout(checkForTable, 500); // Check again after 500ms
      } else {
        console.log(`[TableCheck-${widgetId}] Gave up looking for table after ${maxChecks} attempts`);
      }
    };
    
    // Start checking
    checkForTable();
    
    return () => {
      checkCount = maxChecks; // Prevent further checks if component unmounts
    };
  }, [table, effectiveTableRef, widgetId]);

  // Define original handlers directly without referencing themselves
  function handleFilterDropdownOpenChange(open: boolean) {
    setFilterDropdownOpen(open);
    if (open) {
      console.log('Filter dropdown opened with:',
        `Widget ID: ${widgetId}`,
        `Cached actualTable: ${actualTable ? 'Available' : 'Not available'}`
      );
    }
  }

  function handleColumnsDropdownOpenChange(open: boolean) {
    setColumnsDropdownOpen(open);
    if (open) {
      console.log('Columns dropdown opened with:',
        `Widget ID: ${widgetId}`,
        `Cached actualTable: ${actualTable ? 'Available' : 'Not available'}`
      );
    }
  }

  // Handle filter changes
  function handleSearchChange(value: string) {
    setSearchQuery(value);
    onSearchQueryChange(value);
  }

  function handleQuoteAssetChange(value: AssetTicker | 'ALL') {
    setSelectedQuoteAsset(value);
    onSelectedQuoteAssetChange(value);
  }

  function handleSecondaryCurrencyChange(value: AssetTicker | null) {
    setSecondaryCurrency(value);
    onSecondaryCurrencyChange(value);
  }

  function clearAllFilters() {
    handleSearchChange('');
    handleQuoteAssetChange('ALL');
    handleSecondaryCurrencyChange(null);
    setFilterDropdownOpen(false);
  }

  // Listen for tab click events
  function handleTabClick(value: string) {
    if (value === 'markets') {
      // Deactivate any active list
      ListManager.setActiveListId(null, widgetId);
    } else if (value.startsWith('list-')) {
      const listId = value.substring(5); // Remove 'list-' prefix
      ListManager.setActiveListId(listId, widgetId);
    }
  }

  // Get a fresh reference to the table at render time
  function getTableForComponent() {
    // First try direct table prop
    if (table) {
      return table;
    }
    
    // Then try tableRef for most up-to-date reference
    if (effectiveTableRef?.current?.getTable) {
      const tableFromRef = effectiveTableRef.current.getTable();
      if (tableFromRef) {
        return tableFromRef;
      }
    }
    
    // Last resort - use cached actualTable
    return actualTable;
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={filterDropdownOpen} onOpenChange={handleFilterDropdownOpenChange}>
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

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className={cn(
                  "text-xs h-8 mx-1 pr-2",
                  secondaryCurrency === null && "opacity-75"
                )}>
                  {secondaryCurrency === null ? (
                    <CircleSlash className="mr-2 h-3.5 w-3.5 opacity-80 shrink-0" />
                  ) : ASSETS[secondaryCurrency]?.icon ? (
                    <img 
                      src={ASSETS[secondaryCurrency].icon} 
                      alt={secondaryCurrency} 
                      className="w-4 h-4 mr-2 rounded-full shrink-0" 
                    />
                  ) : (
                    <div className="w-4 h-4 mr-2 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0 flex items-center justify-center">
                      <span className="text-[10px] font-medium">{secondaryCurrency.charAt(0)}</span>
                    </div>
                  )}
                  <span className="flex-1 text-left truncate   text-sm ">
                    {secondaryCurrency ? `Show in: ${secondaryCurrency}` : 'Secondary: None'}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-0 w-48">
                  <Command>
                    <CommandInput placeholder="Filter currency..." className="h-8 text-xs" autoFocus />
                    <CommandList>
                      <CommandEmpty>
                        <div className="  text-sm  py-2 text-center">No currency found.</div>
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => handleSecondaryCurrencyChange(null)}
                          className="text-xs h-8 flex items-center justify-between"
                        >
                          <div className="flex items-center flex-1 truncate">
                            <CircleSlash className="mr-2 h-3.5 w-3.5 opacity-80 shrink-0" />
                            <span className="truncate   text-sm ">None</span>
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
                                <span className="truncate   text-sm ">Show in {currency}</span>
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
              <span className="  text-sm ">Clear All Filters</span>
            </DropdownMenuItem>
          </>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu open={columnsDropdownOpen} onOpenChange={handleColumnsDropdownOpenChange}>
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
            <FallbackColumnVisibility id={widgetId} />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}; 