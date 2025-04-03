import React, { useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { AssetTicker } from '@/assets/AssetTicker';
import { 
  ChevronDown as ChevronDownIcon, 
  Search, 
  X
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from './ui/dropdown-menu';
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs whitespace-nowrap">
            {selectedQuoteAsset === 'ALL' ? 'All Pairs' : `${selectedQuoteAsset} Pairs`}
            <ChevronDownIcon className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onSelectedQuoteAssetChange('ALL')}>
            All Pairs
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {quoteAssets.map((asset) => (
            <DropdownMenuItem 
              key={asset}
              onClick={() => onSelectedQuoteAssetChange(asset)}
            >
              {asset} Pairs
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs whitespace-nowrap">
            {secondaryCurrency ? `Show in ${secondaryCurrency}` : 'Secondary Currency'}
            <ChevronDownIcon className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onSecondaryCurrencyChange(null)}>
            None
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {['USD', 'EUR', 'GBP'].map((currency) => (
            <DropdownMenuItem 
              key={currency}
              onClick={() => onSecondaryCurrencyChange(currency as AssetTicker)}
            >
              Show in {currency}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}; 