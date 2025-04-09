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
  Ban as BanIcon
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
} from './ui/dropdown-menu';

// Helper functions for localStorage
const getLocalStorageItem = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading localStorage key “${key}”:`, error);
    return defaultValue;
  }
};

const setLocalStorageItem = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key “${key}”:`, error);
  }
};

interface MarketsWidgetHeaderProps {
  onSearchQueryChange: (value: string) => void;
  onSelectedQuoteAssetChange: (value: AssetTicker | 'ALL') => void;
  onSecondaryCurrencyChange: (value: AssetTicker | null) => void;
  quoteAssets: AssetTicker[];
  widgetId: string;
}

export const MarketsWidgetHeader: React.FC<MarketsWidgetHeaderProps> = ({
  onSearchQueryChange,
  onSelectedQuoteAssetChange,
  onSecondaryCurrencyChange,
  quoteAssets,
  widgetId
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    if (dropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [dropdownOpen]);

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
    setDropdownOpen(false); // Close the dropdown after clearing
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={"outline"}
            size="sm" 
            className={cn(
              "h-7 px-2.5 text-xs whitespace-nowrap flex items-center gap-1",
              isFiltered && "bg-white text-black hover:bg-white/90 hover:text-black"
            )}
          >
            <FilterIcon className="h-3 w-3" /> 
            Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-64 p-1"
          align="start"
        >
          <div 
            className="relative mb-1 px-1" 
            onClick={handleSearchWrapperInteraction}
            onFocus={handleSearchWrapperInteraction}
          >
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search Pairs"
              value={localSearchQuery}
              onChange={handleSearchInputChange}
              className="h-8 w-full pl-7 pr-7 text-xs"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            {localSearchQuery && (
              <button 
                aria-label="Clear search"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={handleClearSearch}
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
                localSelectedQuoteAsset === 'ALL' && "opacity-75"
              )}>
                {localSelectedQuoteAsset === 'ALL' ? (
                  <ListIcon className="mr-2 h-3.5 w-3.5 opacity-80 shrink-0" />
                ) : ASSETS[localSelectedQuoteAsset]?.icon ? (
                  <img 
                    src={ASSETS[localSelectedQuoteAsset].icon} 
                    alt={localSelectedQuoteAsset} 
                    className="w-4 h-4 mr-2 rounded-full shrink-0" 
                  />
                ) : (
                  <div className="w-4 h-4 mr-2 shrink-0"></div>
                )}
                <span className="flex-1 text-left truncate">
                  Quote: {localSelectedQuoteAsset === 'ALL' ? 'All Pairs' : localSelectedQuoteAsset}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-0 w-48">
                <Command>
                  <CommandInput placeholder="Filter pair..." className="h-8 text-xs" autoFocus />
                  <CommandList>
                    <CommandEmpty>No pair found.</CommandEmpty>
                    <CommandGroup>
                      {quoteAssetOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={(currentValue) => {
                            const newValue = currentValue === 'all' ? 'ALL' : currentValue.toUpperCase() as AssetTicker | 'ALL';
                            setLocalSelectedQuoteAsset(newValue);
                          }}
                          className="text-xs h-8 flex items-center justify-between"
                        >
                          <div className="flex items-center flex-1 truncate">
                            {option.icon ? (
                              typeof option.icon === 'string' ? (
                                <img 
                                  src={option.icon} 
                                  alt={option.label} 
                                  className="w-4 h-4 mr-2 rounded-full shrink-0" 
                                />
                              ) : (
                                <div className="mr-2 shrink-0">{option.icon}</div>
                              )
                            ) : (
                              <div className="w-4 h-4 mr-2 shrink-0"></div>
                            )}
                            <span className="truncate">{option.label}</span>
                          </div>
                          <Check
                            className={cn(
                              "ml-2 h-3 w-3 flex-shrink-0",
                              localSelectedQuoteAsset === option.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className={cn(
                "text-xs h-8 mx-1 pr-2",
                localSecondaryCurrency === null && "opacity-75"
              )}>
                {localSecondaryCurrency === null ? (
                  <BanIcon className="mr-2 h-3.5 w-3.5 opacity-80 shrink-0" />
                ) : ASSETS[localSecondaryCurrency]?.icon ? (
                  <img 
                    src={ASSETS[localSecondaryCurrency].icon} 
                    alt={localSecondaryCurrency} 
                    className="w-4 h-4 mr-2 rounded-full shrink-0" 
                  />
                ) : (
                  <div className="w-4 h-4 mr-2 shrink-0"></div>
                )}
                <span className="flex-1 text-left truncate">
                  {localSecondaryCurrency ? `Show in: ${localSecondaryCurrency}` : 'Secondary: None'}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-0 w-48">
                <Command>
                  <CommandInput placeholder="Filter currency..." className="h-8 text-xs" autoFocus />
                  <CommandList>
                    <CommandEmpty>No currency found.</CommandEmpty>
                    <CommandGroup>
                      {secondaryCurrencyOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={(currentValue) => {
                            const newValue = currentValue ? currentValue.toUpperCase() as AssetTicker : null;
                            setLocalSecondaryCurrency(newValue);
                          }}
                          className="text-xs h-8 flex items-center justify-between"
                        >
                          <div className="flex items-center flex-1 truncate">
                            {option.icon ? (
                              typeof option.icon === 'string' ? (
                                <img 
                                  src={option.icon} 
                                  alt={option.label} 
                                  className="w-4 h-4 mr-2 rounded-full shrink-0" 
                                />
                              ) : (
                                <div className="mr-2 shrink-0">{option.icon}</div>
                              )
                            ) : (
                              <div className="w-4 h-4 mr-2 shrink-0"></div>
                            )}
                            <span className="truncate">{option.label}</span>
                          </div>
                          <Check
                            className={cn(
                              "ml-2 h-3 w-3 flex-shrink-0",
                              (localSecondaryCurrency === option.value) || (localSecondaryCurrency === null && option.value === '')
                                ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
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
              !isFiltered 
                ? "opacity-50 pointer-events-none"
                : "cursor-pointer"
            )}
            onSelect={handleClearAllFilters}
            disabled={!isFiltered}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5 opacity-80" />
            <span>Clear All Filters</span>
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}; 