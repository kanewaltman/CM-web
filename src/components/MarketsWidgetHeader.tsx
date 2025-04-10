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
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);
  
  // Get actual table instance - simplified access pattern
  const actualTable = table || tableRef?.current?.getTable() || null;

  // Check if filters are active by getting stored values
  const storageKeys = {
    search: `marketsWidget_${widgetId}_searchQuery`,
    quoteAsset: `marketsWidget_${widgetId}_selectedQuoteAsset`,
    secondaryCurrency: `marketsWidget_${widgetId}_secondaryCurrency`,
  };
  
  const [isFiltersActive, setIsFiltersActive] = useState(false);
  
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

  return (
    <div className="flex items-center gap-2">
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