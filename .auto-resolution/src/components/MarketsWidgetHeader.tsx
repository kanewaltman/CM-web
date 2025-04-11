import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
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
  ChevronsUpDown
} from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
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
} from './ui/dropdown-menu';
import { useReactTable } from '@tanstack/react-table';
import { MarketsWidgetMenu, ListManager } from './MarketsWidgetMenu';
import { MarketsWidgetColumnVisibility } from './MarketsWidget';
import { MarketsWidgetFilter } from './MarketsWidgetFilter';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { SAMPLE_MARKET_DATA } from '@/services/marketsSampleData';
import { toast } from '@/hooks/use-toast';

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

  // Check if filters are active by getting stored values
  const storageKeys = {
    search: `marketsWidget_${widgetId}_searchQuery`,
    quoteAsset: `marketsWidget_${widgetId}_selectedQuoteAsset`,
    secondaryCurrency: `marketsWidget_${widgetId}_secondaryCurrency`,
  };
  
  const [isFiltersActive, setIsFiltersActive] = useState(false);
  
  // Get all trading pairs from sample data
  const availablePairs = Object.keys(SAMPLE_MARKET_DATA).sort();
  
  // Log available pairs for debugging
  useEffect(() => {
    console.log('Available trading pairs for selection:', availablePairs);
  }, [availablePairs]);

  // Check for active list 
  useEffect(() => {
    const checkActiveList = () => {
      const listId = ListManager.getActiveListId();
      setActiveListId(listId);
      
      if (listId) {
        const lists = ListManager.getLists();
        const activeList = lists.find(list => list.id === listId);
        setActiveListName(activeList?.name || 'Custom List');
      } else {
        setActiveListName('');
      }
    };
    
    // Check on mount
    checkActiveList();
    
    // Listen for list changes
    const handleListChanged = () => checkActiveList();
    document.addEventListener('markets-active-list-changed', handleListChanged);
    
    return () => {
      document.removeEventListener('markets-active-list-changed', handleListChanged);
    };
  }, []);
  
  // Check if any filters are active
  useEffect(() => {
    try {
      const searchQuery = localStorage.getItem(storageKeys.search) ? JSON.parse(localStorage.getItem(storageKeys.search) || '') : '';
      const selectedQuoteAsset = localStorage.getItem(storageKeys.quoteAsset) ? JSON.parse(localStorage.getItem(storageKeys.quoteAsset) || '') : 'ALL';
      const secondaryCurrency = localStorage.getItem(storageKeys.secondaryCurrency) ? JSON.parse(localStorage.getItem(storageKeys.secondaryCurrency) || '') : null;
      
      const active = searchQuery !== '' || selectedQuoteAsset !== 'ALL' || secondaryCurrency !== null;
      setIsFiltersActive(active);
    } catch (error) {
      console.error('Error checking filter state:', error);
      setIsFiltersActive(false);
    }
  }, [widgetId]);

  // Handle adding a pair to the current list
  const handleAddPair = (pairToAdd: string = selectedPair) => {
    if (!activeListId || !pairToAdd) return;
    
    // Store the full trading pair instead of just the base asset
    // This prevents adding multiple pairs with the same base asset
    ListManager.addAssetToList(activeListId, pairToAdd);
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
          <MarketsWidgetFilter 
            widgetId={widgetId}
            onSearchQueryChange={(val) => {
              onSearchQueryChange(val);
              // Update active state when filter changes
              setIsFiltersActive(
                val !== '' || 
                JSON.parse(localStorage.getItem(storageKeys.quoteAsset) || '"ALL"') !== 'ALL' || 
                JSON.parse(localStorage.getItem(storageKeys.secondaryCurrency) || 'null') !== null
              );
            }}
            onSelectedQuoteAssetChange={(val) => {
              onSelectedQuoteAssetChange(val);
              // Update active state when filter changes
              setIsFiltersActive(
                JSON.parse(localStorage.getItem(storageKeys.search) || '""') !== '' || 
                val !== 'ALL' || 
                JSON.parse(localStorage.getItem(storageKeys.secondaryCurrency) || 'null') !== null
              );
            }}
            onSecondaryCurrencyChange={(val) => {
              onSecondaryCurrencyChange(val);
              // Update active state when filter changes
              setIsFiltersActive(
                JSON.parse(localStorage.getItem(storageKeys.search) || '""') !== '' || 
                JSON.parse(localStorage.getItem(storageKeys.quoteAsset) || '"ALL"') !== 'ALL' || 
                val !== null
              );
            }}
            quoteAssets={quoteAssets}
            onCloseDropdown={() => setFilterDropdownOpen(false)}
          />
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