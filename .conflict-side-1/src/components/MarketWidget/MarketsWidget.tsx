import React, { useState, useEffect, useCallback, useMemo, useRef, useId, CSSProperties, forwardRef, useImperativeHandle } from 'react';
import isEqual from 'fast-deep-equal';

// Disable verbose logging in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
}

import { useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { ASSET_TYPE } from '@/assets/common';
import { AssetIcon } from '@/assets/AssetIcon';
import { formatAmount, formatCurrency, formatPercentage } from '@/utils/formatting';
import { coinGeckoService } from '@/services/coinGeckoService';
import { getApiUrl } from '@/lib/api-config';
import { ASSET_TICKER_TO_COINGECKO_ID } from '@/services/coinGeckoService';
import { SAMPLE_MARKET_DATA, SampleMarketDataItem, getBalancedSampleData } from '@/services/marketsSampleData';
import { 
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableColumnResizeHandler,
} from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { MarketsWidgetHeader } from './MarketsWidgetHeader';
import { ListManager } from './MarketsWidgetMenu';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';

// Constants for localStorage keys
const MARKETS_LISTS_KEY = 'markets-widget-custom-lists';
const ACTIVE_LIST_KEY = 'markets-widget-active-list';

// Interface for custom lists
interface CustomList {
  id: string;
  name: string;
  assets: string[];
}

// ... existing code ...
