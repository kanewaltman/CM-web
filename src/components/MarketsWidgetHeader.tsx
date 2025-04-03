import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { AssetTicker } from '@/assets/AssetTicker';
import { 
  ChevronDown as ChevronDownIcon, 
  Search, 
  X,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from './ui/dropdown-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { useReactTable } from '@tanstack/react-table';

interface MarketsWidgetHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedQuoteAsset: AssetTicker | 'ALL';
  onSelectedQuoteAssetChange: (value: AssetTicker | 'ALL') => void;
  secondaryCurrency: AssetTicker | null;
  onSecondaryCurrencyChange: (value: AssetTicker | null) => void;
  quoteAssets: AssetTicker[];
}

export const MarketsWidgetHeader: React.FC<MarketsWidgetHeaderProps> = ({
  searchQuery,
  onSearchQueryChange,
  selectedQuoteAsset,
  onSelectedQuoteAssetChange,
  secondaryCurrency,
  onSecondaryCurrencyChange,
  quoteAssets
}) => {
  const [quoteAssetPopoverOpen, setQuoteAssetPopoverOpen] = useState(false);
  const [secondaryCurrencyPopoverOpen, setSecondaryCurrencyPopoverOpen] = useState(false);

  // Make sure we have default quote assets if none are provided
  const availableQuoteAssets = quoteAssets.length > 0 
    ? quoteAssets 
    : ['EUR', 'USD', 'USDT', 'USDC', 'BTC'] as AssetTicker[];

  // Format quote assets for display
  const quoteAssetOptions = [
    { value: 'ALL', label: 'All Quote Pairs' },
    ...availableQuoteAssets.map(asset => ({
      value: asset,
      label: `${asset}`
    }))
  ];

  // Secondary currency options
  const secondaryCurrencyOptions = [
    { value: '', label: 'None' },
    { value: 'USD', label: 'Show in USD' },
    { value: 'EUR', label: 'Show in EUR' },
    { value: 'GBP', label: 'Show in GBP' }
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search input */}
      <div className="relative h-7">
        <Input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-7 w-[180px] pl-7 pr-7 text-xs"
        />
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        {searchQuery && (
          <button 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center"
            onClick={() => onSearchQueryChange('')}
          >
            <X className="h-2 w-2" />
          </button>
        )}
      </div>

      {/* Quote Asset Combobox */}
      <Popover open={quoteAssetPopoverOpen} onOpenChange={setQuoteAssetPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            role="combobox"
            aria-expanded={quoteAssetPopoverOpen}
            className="h-7 px-2.5 text-xs whitespace-nowrap flex items-center"
          >
            {selectedQuoteAsset === 'ALL' ? 'Quote Pair' : selectedQuoteAsset}
            <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search quote pairs..." className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>No quote pairs found.</CommandEmpty>
              <CommandGroup >
                {quoteAssetOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      onSelectedQuoteAssetChange(currentValue as AssetTicker | 'ALL');
                      setQuoteAssetPopoverOpen(false);
                    }}
                    className="text-xs flex items-center justify-between"
                  >
                    {option.label}
                    <Check
                      className={cn(
                        "ml-auto h-3 w-3",
                        selectedQuoteAsset === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Secondary Currency Combobox */}
      <Popover open={secondaryCurrencyPopoverOpen} onOpenChange={setSecondaryCurrencyPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            role="combobox"
            aria-expanded={secondaryCurrencyPopoverOpen}
            className="h-7 px-2.5 text-xs whitespace-nowrap flex items-center"
          >
            {secondaryCurrency ? `Show in ${secondaryCurrency}` : 'Secondary Currency'}
            <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search currency..." className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>No currency found.</CommandEmpty>
              <CommandGroup>
                {secondaryCurrencyOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      console.log('Secondary currency selected:', currentValue || null);
                      
                      // Immediately close popover
                      setSecondaryCurrencyPopoverOpen(false);
                      
                      // Immediately update without delay - delays can cause issues
                      onSecondaryCurrencyChange(currentValue ? currentValue as AssetTicker : null);
                      
                      // Force focus on the search to trigger a re-render
                      setTimeout(() => {
                        const searchInput = document.querySelector('input[type="text"][placeholder="Search"]');
                        if (searchInput instanceof HTMLElement) {
                          searchInput.focus();
                          searchInput.blur();
                        }
                      }, 100);
                    }}
                    className="text-xs"
                  >
                    {option.label}
                    <Check
                      className={cn(
                        "ml-auto h-3 w-3",
                        (secondaryCurrency === option.value) || 
                        (secondaryCurrency === null && option.value === '') 
                          ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}; 