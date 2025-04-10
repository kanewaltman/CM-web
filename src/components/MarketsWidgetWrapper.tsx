import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AssetTicker } from '@/assets/AssetTicker';
import { MarketsWidgetHeader } from './MarketsWidgetHeader';
import { MarketsWidgetMenu } from './MarketsWidgetMenu';
import { MarketData } from './MarketsWidget';
import { useReactTable } from '@tanstack/react-table';
import { MarketsWidgetFilter } from './MarketsWidgetFilter';

// Constants for localStorage keys
const STORAGE_KEY_PREFIX = 'markets-widget-';
const STORAGE_KEYS = {
  SELECTED_QUOTE_ASSET: `${STORAGE_KEY_PREFIX}selected-quote-asset`,
  SECONDARY_CURRENCY: `${STORAGE_KEY_PREFIX}secondary-currency`,
  COLUMN_VISIBILITY: `${STORAGE_KEY_PREFIX}column-visibility`,
  COLUMN_ORDER: `${STORAGE_KEY_PREFIX}column-order`,
  SORTING: `${STORAGE_KEY_PREFIX}sorting`,
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
  getTable?: (table: ReturnType<typeof useReactTable<any>> | null) => void;
}

export const MarketsWidgetWrapper: React.FC<MarketsWidgetWrapperProps> = ({
  isHeader,
  widgetId,
  widgetComponent: WidgetComponent,
  onRemove,
  isMenu,
  isFilterContent,
  onFilterDropdownClose,
  getTable
}) => {
  // Initialize state either from registry or with defaults
  const initializeWidgetState = () => {
    let state = marketsWidgetRegistry.get(widgetId);
    
    if (!state) {
      const tableRef = React.createRef<{ getTable: () => ReturnType<typeof useReactTable<MarketData>> | null }>();
      
      // Create new state with defaults
      state = {
        searchQuery: '',
        selectedQuoteAsset: getStoredValue<AssetTicker | 'ALL'>(STORAGE_KEYS.SELECTED_QUOTE_ASSET, 'ALL'),
        secondaryCurrency: getStoredValue<AssetTicker | null>(STORAGE_KEYS.SECONDARY_CURRENCY, null),
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
  }, [widgetId]);
  
  const handleSelectedQuoteAssetChange = useCallback((value: AssetTicker | 'ALL') => {
    setSelectedQuoteAsset(value);
    const state = marketsWidgetRegistry.get(widgetId);
    if (state) {
      state.selectedQuoteAsset = value;
    }
    setStoredValue(STORAGE_KEYS.SELECTED_QUOTE_ASSET, value);
  }, [widgetId]);
  
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
    setStoredValue(STORAGE_KEYS.SECONDARY_CURRENCY, value);
  }, [widgetId]);
  
  const handleQuoteAssetsChange = useCallback((assets: AssetTicker[]) => {
    setQuoteAssets(assets);
    const state = marketsWidgetRegistry.get(widgetId);
    if (state) {
      state.quoteAssets = assets;
    }
  }, [widgetId]);
  
  // Use the table ref from the registry
  const tableRef = widgetState.tableRef;
  
  // Expose the table to parent components if needed
  useEffect(() => {
    if (getTable && tableRef.current) {
      const table = tableRef.current.getTable();
      getTable(table);
    }
  }, [getTable, tableRef]);
  
  // If this is a menu component request, render the menu
  if (isMenu) {
    return <MarketsWidgetMenu tableRef={tableRef} />;
  }
  
  // If this is the filter content component request
  if (isFilterContent) {
    return (
      <MarketsWidgetFilter 
        widgetId={widgetId}
        onSearchQueryChange={handleSearchQueryChange}
        onSelectedQuoteAssetChange={handleSelectedQuoteAssetChange}
        onSecondaryCurrencyChange={handleSecondaryCurrencyChange}
        quoteAssets={quoteAssets}
        onCloseDropdown={onFilterDropdownClose}
      />
    );
  }
  
  // If this is the header component, render the header controls
  if (isHeader) {
    return (
      <MarketsWidgetHeader
        onSearchQueryChange={handleSearchQueryChange}
        onSelectedQuoteAssetChange={handleSelectedQuoteAssetChange}
        onSecondaryCurrencyChange={handleSecondaryCurrencyChange}
        quoteAssets={quoteAssets}
        widgetId={widgetId}
        tableRef={tableRef}
      />
    );
  }
  
  // For the main content, pass the props to the MarketsWidget component
  return (
    <WidgetComponent
      ref={tableRef}
      searchQuery={searchQuery}
      onSearchQueryChange={handleSearchQueryChange}
      selectedQuoteAsset={selectedQuoteAsset}
      onSelectedQuoteAssetChange={handleSelectedQuoteAssetChange}
      secondaryCurrency={secondaryCurrency}
      onSecondaryCurrencyChange={handleSecondaryCurrencyChange}
      onQuoteAssetsChange={handleQuoteAssetsChange}
      onRemove={onRemove}
    />
  );
}; 