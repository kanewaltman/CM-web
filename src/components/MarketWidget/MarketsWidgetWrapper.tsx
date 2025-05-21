import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { MarketsWidgetHeader } from './MarketsWidgetHeader';
import { MarketData, QuoteAssetsWithCounts } from './MarketsWidget';
import { useReactTable } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ListIcon, RotateCcw, Search, X, Coins, CircleSlash } from 'lucide-react';
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { MarketsWidgetState, widgetStateRegistry, createDefaultMarketsWidgetState } from '@/lib/widgetState';

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

// Create React context for table ref sharing
export const TableRefContext = React.createContext<React.RefObject<{ getTable: () => ReturnType<typeof useReactTable<MarketData>> | null }> | null>(null);

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

  // Create table ref that will be shared through context
  const tableRef = React.useRef<{ getTable: () => ReturnType<typeof useReactTable<MarketData>> | null }>(null);

  // Initialize or get widget state from registry
  const initializeWidgetState = () => {
    // Check if state already exists in registry
    let state = widgetStateRegistry.get(widgetId) as MarketsWidgetState | undefined;
    
    if (!state) {
      // Load initial values from localStorage
      const searchQuery = getStoredValue<string>(instanceStorageKeys.SEARCH_QUERY, '');
      const selectedQuoteAsset = getStoredValue<AssetTicker | 'ALL'>(instanceStorageKeys.SELECTED_QUOTE_ASSET, 'ALL');
      const secondaryCurrency = getStoredValue<AssetTicker | null>(instanceStorageKeys.SECONDARY_CURRENCY, null);
      
      // Create new state with values from localStorage
      state = createDefaultMarketsWidgetState(
        searchQuery,
        selectedQuoteAsset,
        secondaryCurrency,
        {
          assets: ['USDT', 'BTC', 'ETH', 'USD', 'EUR'] as AssetTicker[],
          counts: {
            'USDT': 0,
            'BTC': 0,
            'ETH': 0,
            'USD': 0,
            'EUR': 0
          },
          totalCount: 0
        },
        widgetId
      );
      
      // Register the state
      widgetStateRegistry.set(widgetId, state);
    }
    
    return state;
  };
  
  // Get widget state
  const widgetState = useMemo(() => initializeWidgetState(), [widgetId, instanceStorageKeys]);
  
  // Local state that syncs with the widget state
  const [searchQuery, setSearchQuery] = useState(widgetState.searchQuery);
  const [selectedQuoteAsset, setSelectedQuoteAsset] = useState(widgetState.selectedQuoteAsset);
  const [secondaryCurrency, setSecondaryCurrency] = useState(widgetState.secondaryCurrency);
  const [quoteAssets, setQuoteAssets] = useState(widgetState.quoteAssets);
  
  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = widgetState.subscribe(() => {
      setSearchQuery(widgetState.searchQuery);
      setSelectedQuoteAsset(widgetState.selectedQuoteAsset);
      setSecondaryCurrency(widgetState.secondaryCurrency);
      setQuoteAssets(widgetState.quoteAssets);
    });
    
    return unsubscribe;
  }, [widgetState]);
  
  // Handlers that update widget state
  const handleSearchQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
    widgetState.setSearchQuery(value);
    // Persist search query for this widget instance
    setStoredValue(instanceStorageKeys.SEARCH_QUERY, value);
  }, [widgetState, instanceStorageKeys.SEARCH_QUERY]);
  
  const handleSelectedQuoteAssetChange = useCallback((value: AssetTicker | 'ALL') => {
    setSelectedQuoteAsset(value);
    widgetState.setSelectedQuoteAsset(value);
    // Persist selected quote asset for this widget instance
    setStoredValue(instanceStorageKeys.SELECTED_QUOTE_ASSET, value);
  }, [widgetState, instanceStorageKeys.SELECTED_QUOTE_ASSET]);
  
  const handleSecondaryCurrencyChange = useCallback((value: AssetTicker | null) => {
    setSecondaryCurrency(value);
    widgetState.setSecondaryCurrency(value);
    
    // Force refresh data to trigger UI update if table is available
    if (tableRef.current) {
      const table = tableRef.current.getTable();
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
    
    // Persist secondary currency for this widget instance
    setStoredValue(instanceStorageKeys.SECONDARY_CURRENCY, value);
  }, [widgetState, instanceStorageKeys.SECONDARY_CURRENCY]);
  
  const handleQuoteAssetsChange = useCallback((assets: QuoteAssetsWithCounts) => {
    setQuoteAssets(assets);
    widgetState.setQuoteAssets(assets);
  }, [widgetState]);
  
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
        
        <div className="border-t border-border pt-1 px-2">
          <div className="text-xs text-muted-foreground font-medium mb-1">Quote Assets</div>
          <div className="grid grid-cols-2 gap-1 mb-2">
            {quoteAssets.assets.map((asset) => (
              <div 
                key={asset} 
                className={cn(
                  "flex items-center gap-1 py-1 px-2 rounded text-xs cursor-pointer",
                  selectedQuoteAsset === asset ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => {
                  handleSelectedQuoteAssetChange(asset);
                  if (onFilterDropdownClose) onFilterDropdownClose();
                }}
              >
                <AssetIcon symbol={asset} size={14} />
                <div className="flex-1 font-medium">{asset}</div>
                <div className="text-xs opacity-70 tabular-nums">({quoteAssets.counts[asset] || 0})</div>
              </div>
            ))}
            <div 
              className={cn(
                "flex items-center gap-1 py-1 px-2 rounded text-xs cursor-pointer",
                selectedQuoteAsset === 'ALL' ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => {
                handleSelectedQuoteAssetChange('ALL');
                if (onFilterDropdownClose) onFilterDropdownClose();
              }}
            >
              <Coins className="h-3.5 w-3.5" />
              <div className="flex-1 font-medium">ALL</div>
              <div className="text-xs opacity-70 tabular-nums">({quoteAssets.totalCount})</div>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground font-medium mb-1">Secondary Currency</div>
          <div className="grid grid-cols-2 gap-1">
            {(['USD', 'EUR'] as AssetTicker[]).map((currency) => (
              <div 
                key={currency} 
                className={cn(
                  "flex items-center gap-1 py-1 px-2 rounded text-xs cursor-pointer",
                  secondaryCurrency === currency ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => {
                  handleSecondaryCurrencyChange(currency === secondaryCurrency ? null : currency);
                  if (onFilterDropdownClose) onFilterDropdownClose();
                }}
              >
                <AssetIcon symbol={currency} size={14} />
                <div className="flex-1 font-medium">{currency}</div>
                {secondaryCurrency === currency && (
                  <Check className="h-3 w-3" />
                )}
              </div>
            ))}
            <div 
              className={cn(
                "flex items-center gap-1 py-1 px-2 rounded text-xs cursor-pointer",
                secondaryCurrency === null ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => {
                handleSecondaryCurrencyChange(null);
                if (onFilterDropdownClose) onFilterDropdownClose();
              }}
            >
              <CircleSlash className="h-3.5 w-3.5" />
              <div className="flex-1 font-medium">None</div>
              {secondaryCurrency === null && (
                <Check className="h-3 w-3" />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }
  
  if (isHeader) {
    // Render just the header with controls
    return (
      <TableRefContext.Provider value={tableRef}>
        <MarketsWidgetHeader
          onSearchQueryChange={handleSearchQueryChange}
          onSelectedQuoteAssetChange={handleSelectedQuoteAssetChange}
          onSecondaryCurrencyChange={handleSecondaryCurrencyChange}
          quoteAssets={quoteAssets}
          widgetId={widgetId}
          tableRef={tableRef}
        />
      </TableRefContext.Provider>
    );
  }
  
  // Render the full component
  const assetSymbol = (asset: string) => {
    try {
      return <AssetIcon symbol={asset as AssetTicker} size={14} />;
    } catch (e) {
      return <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] opacity-70">{asset.substring(0, 1)}</span>;
    }
  };
  
  return (
    <TableRefContext.Provider value={tableRef}>
      <div className={cn(
        "flex flex-col w-full h-full",
        onRemove ? "max-h-[calc(100vh-10rem)]" : "max-h-[calc(100vh-2rem)]"
      )}>
        <WidgetComponent
          id={widgetId}
          className="w-full h-full"
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          selectedQuoteAsset={selectedQuoteAsset}
          onSelectedQuoteAssetChange={handleSelectedQuoteAssetChange}
          secondaryCurrency={secondaryCurrency}
          onSecondaryCurrencyChange={handleSecondaryCurrencyChange}
          onQuoteAssetsChange={handleQuoteAssetsChange}
          ref={tableRef}
          isInDialog={!!onRemove}
        />
      </div>
    </TableRefContext.Provider>
  );
};

interface AssetIconProps {
  symbol: AssetTicker;
  size?: number;
}

const AssetIcon: React.FC<AssetIconProps> = ({ symbol, size = 16 }) => {
  return (
    <div 
      className="flex items-center justify-center rounded-full overflow-hidden bg-muted"
      style={{width: size, height: size}}
    >
      {ASSETS[symbol]?.icon ? (
        <img 
          src={ASSETS[symbol].icon} 
          alt={symbol} 
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-[10px] font-medium">{symbol.substring(0, 1)}</span>
      )}
    </div>
  );
}; 