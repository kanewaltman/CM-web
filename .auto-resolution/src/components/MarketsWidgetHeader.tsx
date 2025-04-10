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
  Columns as ColumnsIcon
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
import { MarketsWidgetMenu } from './MarketsWidgetMenu';
import { MarketsWidgetColumnVisibility } from './MarketsWidget';
import { MarketsWidgetFilter } from './MarketsWidgetFilter';

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
  // Unique localStorage keys based on widgetId
  const storageKeys = {
    search: `marketsWidget_${widgetId}_searchQuery`,
    quoteAsset: `marketsWidget_${widgetId}_selectedQuoteAsset`,
    secondaryCurrency: `marketsWidget_${widgetId}_secondaryCurrency`,
  };

  // Local state for filters, initialized from localStorage or defaults
  const [localSearchQuery, setLocalSearchQuery] = useState<string>(() => 
    getLocalStorageItem(storageKeys.search, '')
  );
  const [localSelectedQuoteAsset, setLocalSelectedQuoteAsset] = useState<AssetTicker | 'ALL'>(() => 
    getLocalStorageItem(storageKeys.quoteAsset, 'ALL')
  );
  const [localSecondaryCurrency, setLocalSecondaryCurrency] = useState<AssetTicker | null>(() => 
    getLocalStorageItem(storageKeys.secondaryCurrency, null)
  );

  // State for main dropdown visibility
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence and Sync Logic ---

  useEffect(() => {
    onSearchQueryChange(localSearchQuery);
    onSelectedQuoteAssetChange(localSelectedQuoteAsset);
    onSecondaryCurrencyChange(localSecondaryCurrency);
  }, []);

  useEffect(() => {
    setLocalStorageItem(storageKeys.search, localSearchQuery);
    onSearchQueryChange(localSearchQuery);
  }, [localSearchQuery, storageKeys.search]);

  useEffect(() => {
    setLocalStorageItem(storageKeys.quoteAsset, localSelectedQuoteAsset);
    onSelectedQuoteAssetChange(localSelectedQuoteAsset);
  }, [localSelectedQuoteAsset, storageKeys.quoteAsset]);

  useEffect(() => {
    setLocalStorageItem(storageKeys.secondaryCurrency, localSecondaryCurrency);
    onSecondaryCurrencyChange(localSecondaryCurrency);
  }, [localSecondaryCurrency, storageKeys.secondaryCurrency]);

  useEffect(() => {
    if (filterDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [filterDropdownOpen]);

  const isFiltered = 
    localSearchQuery !== '' || 
    localSelectedQuoteAsset !== 'ALL' || 
    localSecondaryCurrency !== null;

  const availableQuoteAssets = quoteAssets.length > 0 
    ? quoteAssets 
    : ['EUR', 'USD', 'USDT', 'USDC', 'BTC'] as AssetTicker[];

  // Prepare options for dropdowns, including icons
  const quoteAssetOptions = [
    { value: 'ALL', label: 'All Pairs', icon: <ListIcon className="h-3.5 w-3.5 opacity-80" /> },
    ...availableQuoteAssets.map(asset => {
      const assetConfig = ASSETS[asset];
      return {
        value: asset,
        label: `${asset}`,
        icon: assetConfig?.icon // Get icon URL from ASSETS
      };
    })
  ];

  const secondaryCurrencyOptions = [
    { value: '', label: 'None', icon: <BanIcon className="h-3.5 w-3.5 opacity-80" /> },
    ...(['USD', 'EUR', 'GBP'] as const).map(currency => {
      const assetConfig = ASSETS[currency];
      return {
        value: currency,
        label: `Show in ${currency}`,
        icon: assetConfig?.icon // Get icon URL from ASSETS
      };
    })
  ];

  // Handler to prevent dropdown closing when clicking inside search input wrapper
  const handleSearchWrapperInteraction = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
  };
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchQuery(e.target.value);
  };
  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalSearchQuery('');
    searchInputRef.current?.focus();
  };

  // Handler to clear all filters
  const handleClearAllFilters = () => {
    setLocalSearchQuery('');
    setLocalSelectedQuoteAsset('ALL');
    setLocalSecondaryCurrency(null);
    setFilterDropdownOpen(false); // Close the dropdown after clearing
  };

  // Get actual table instance
  const actualTable = table || (tableRef?.current?.getTable() || null);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={filterDropdownOpen} onOpenChange={setFilterDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
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
            onSearchQueryChange={onSearchQueryChange}
            onSelectedQuoteAssetChange={onSelectedQuoteAssetChange}
            onSecondaryCurrencyChange={onSecondaryCurrencyChange}
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