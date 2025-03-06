import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from './ui/table';
import { cn } from '@/lib/utils';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { getApiUrl } from '@/lib/api-config';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';
import { TableSkeleton } from './TableSkeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const formatBalance = (value: number, decimals: number) => {
  // Convert to string without scientific notation and ensure we get all digits
  const fullNumber = value.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 20 });
  
  // Split into whole and decimal parts
  let [whole, decimal = ''] = fullNumber.split('.');
  
  // Pad decimal with zeros if needed to match decimals parameter
  decimal = decimal.padEnd(decimals, '0');
  
  // Add thousand separators to whole part
  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  if (!decimal) return wholeWithCommas;
  
  // Find last non-zero digit
  const lastNonZeroIndex = decimal.split('').reverse().findIndex(char => char !== '0');
  
  if (lastNonZeroIndex === -1) {
    // If all decimals are zeros, show just one zero
    return `${wholeWithCommas}.0`;
  }
  
  // Keep all digits up to and including the last non-zero digit, plus one more
  const keepLength = decimal.length - lastNonZeroIndex + 1;
  const trimmedDecimal = decimal.slice(0, keepLength);
  
  return `${wholeWithCommas}.${trimmedDecimal}`;
};

const SkeletonRow: React.FC = () => (
  <TableRow isHeader={false}>
    <TableCell className="sticky left-0 bg-[hsl(var(--color-widget-header))] z-10 whitespace-nowrap">
      <div className="relative">
        <div className="absolute inset-0 bg-[hsl(var(--color-widget-header))]"></div>
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
          <div className="w-20 h-5 rounded-md bg-white/5 animate-pulse" />
        </div>
      </div>
    </TableCell>
    <TableCell className="text-right">
      <div className="w-24 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
    <TableCell className="text-right">
      <div className="w-20 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
    <TableCell className="text-right">
      <div className="w-16 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
    <TableCell className="text-right">
      <div className="w-12 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
  </TableRow>
);

interface PriceData {
  [key: string]: {
    price: number;
    change24h: number;
  };
}

interface BalanceData {
  asset: AssetTicker;
  balance: string;
  valueInEuro: string;
  change24h: string;
  availablePercentage: string;
}

interface BalancesWidgetProps {
  className?: string;
  compact?: boolean;
}

export const BalancesWidget: React.FC<BalancesWidgetProps> = ({ className, compact = false }) => {
  const { theme, resolvedTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [balances, setBalances] = useState<BalanceData[]>([]);
  const [prices, setPrices] = useState<PriceData>({});
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Detect theme from document class list
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setCurrentTheme(isDark ? 'dark' : 'light');
    };

    // Initial theme detection
    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Memoize the fetch prices function to prevent recreating it on every render
  const fetchPrices = useCallback(async () => {
    try {
      setIsUpdating(true);
      const response = await fetch(getApiUrl('exchange/prices'));
      if (!response.ok) {
        throw new Error(`Prices request failed with status ${response.status}`);
      }
      const data = await response.json();
      setPrices(data);
    } catch (err) {
      console.error('Error fetching prices:', err);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Initial balance fetch
  useEffect(() => {
    const fetchInitialBalances = async () => {
      try {
        setIsInitialLoading(true);
        const tokenResponse = await fetch(getApiUrl('open/demo/temp'));
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.token) {
          throw new Error('Failed to get demo token');
        }

        const balancesResponse = await fetch(getApiUrl('open/users/balances'), {
          headers: {
            'Authorization': `Bearer ${tokenData.token}`
          }
        });
        
        if (!balancesResponse.ok) {
          throw new Error(`Balances request failed with status ${balancesResponse.status}`);
        }
        
        const data = await balancesResponse.json();

        if (data && typeof data === 'object') {
          const balancesArray = Object.entries(data)
            .filter(([asset]) => asset !== 'TOTAL')
            .map(([asset, details]: [string, any]) => {
              const balance = parseFloat(details[asset]?.toString() || '0');
              const valueInEuro = details.EUR?.toString() || '0';
              
              return {
                asset: asset as AssetTicker,
                balance: balance.toString(),
                valueInEuro: parseFloat(valueInEuro).toFixed(2),
                change24h: '0',
                availablePercentage: '100'
              };
            })
            .filter(balance => 
              balance.asset in ASSETS && 
              parseFloat(balance.balance) > 0
            );

          setBalances(balancesArray);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching balances:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchInitialBalances();
  }, []);

  // Update prices periodically
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Update price-dependent values when prices change
  const balancesWithPrices = useMemo(() => {
    return balances.map(balance => ({
      ...balance,
      change24h: (prices[`${balance.asset}/EUR`]?.change24h || 0).toFixed(2)
    }));
  }, [balances, prices]);

  const renderContent = () => {
    if (isInitialLoading) {
      return (
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </TableBody>
      );
    }

    if (error) {
      return (
        <div className="p-3">
          <div className="text-red-500">{error}</div>
        </div>
      );
    }

    if (balances.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">No balances found</div>
        </div>
      );
    }

    return (
      <TableBody>
        {balancesWithPrices.map((balance) => {
          const assetConfig = ASSETS[balance.asset];
          const assetColor = currentTheme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light;
          return (
            <TableRow key={balance.asset} className="group" isHeader={false}>
              <TableCell className="sticky left-0 bg-[hsl(var(--color-widget-header))] z-10 whitespace-nowrap">
                <div className="relative">
                  <div className="absolute inset-0 bg-[hsl(var(--color-widget-header))]"></div>
                  <div className="absolute inset-0 bg-[hsl(var(--color-widget-hover))] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10 flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
                    >
                      <img
                        src={assetConfig.icon}
                        alt={balance.asset}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button 
                      type="button"
                      className="font-jakarta font-bold text-sm rounded-md px-1 transition-all duration-150"
                      style={{ 
                        color: assetColor,
                        backgroundColor: `${assetColor}14`,
                        cursor: 'pointer',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'text',
                        userSelect: 'text'
                      }}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget;
                        target.style.backgroundColor = assetColor;
                        target.style.color = 'hsl(var(--color-widget-bg))';
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget;
                        target.style.backgroundColor = `${assetColor}14`;
                        target.style.color = assetColor;
                      }}
                      onMouseDown={(e) => {
                        if (e.detail > 1) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {assetConfig.name}
                    </button>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <span className="font-jakarta font-semibold text-sm leading-[150%]">
                  {formatBalance(parseFloat(balance.balance), assetConfig.decimalPlaces)}
                </span>
                <span className="font-jakarta font-bold text-sm leading-[150%] text-muted-foreground ml-1">
                  {balance.asset}
                </span>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <span className="font-jakarta font-semibold text-sm leading-[150%]">
                  {parseFloat(balance.valueInEuro).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </TableCell>
              <TableCell className={cn(
                "text-right whitespace-nowrap font-mono",
                parseFloat(balance.change24h) >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {balance.change24h}%
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        type="button"
                        className="font-jakarta font-bold text-sm rounded-md px-1 bg-white/[0.03] hover:bg-white/[0.08] transition-colors duration-150 opacity-50 hover:opacity-100"
                        style={{
                          cursor: 'pointer',
                          WebkitTouchCallout: 'none',
                          WebkitUserSelect: 'text',
                          userSelect: 'text'
                        }}
                        onMouseDown={(e) => {
                          if (e.detail > 1) {
                            e.preventDefault();
                          }
                        }}
                      >
                        {balance.availablePercentage}%
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="py-2 px-3 w-56 bg-background text-foreground border border-border">
                      <div className="space-y-2">
                        <div className="text-[13px] font-medium text-left">Balances</div>
                        <div className="flex items-center gap-2 text-xs">
                          <svg
                            width="8"
                            height="8"
                            fill="currentColor"
                            viewBox="0 0 8 8"
                            xmlns="http://www.w3.org/2000/svg"
                            className="shrink-0 text-green-500"
                            aria-hidden="true"
                          >
                            <circle cx="4" cy="4" r="4"></circle>
                          </svg>
                          <span className="flex grow gap-2">
                            Available <span className="ml-auto">100%</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <svg
                            width="8"
                            height="8"
                            fill="currentColor"
                            viewBox="0 0 8 8"
                            xmlns="http://www.w3.org/2000/svg"
                            className="shrink-0 text-muted-foreground/40"
                            aria-hidden="true"
                          >
                            <circle cx="4" cy="4" r="4"></circle>
                          </svg>
                          <span className="flex grow gap-2 text-muted-foreground/70">
                            Staked <span className="ml-auto">0%</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <svg
                            width="8"
                            height="8"
                            fill="currentColor"
                            viewBox="0 0 8 8"
                            xmlns="http://www.w3.org/2000/svg"
                            className="shrink-0 text-muted-foreground/40"
                            aria-hidden="true"
                          >
                            <circle cx="4" cy="4" r="4"></circle>
                          </svg>
                          <span className="flex grow gap-2 text-muted-foreground/70">
                            In Exchange <span className="ml-auto">0%</span>
                          </span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    );
  };

  return (
    <div className={cn(
      "h-full flex flex-col p-2",
      className
    )}>
      <div className="flex-1 min-h-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 top-0 bg-[hsl(var(--color-widget-header))] z-20 whitespace-nowrap">
                <div className="relative">
                  <div className="absolute inset-0 bg-[hsl(var(--color-widget-header))]"></div>
                  <div className="relative z-10 px-0 py-1">Asset</div>
                </div>
              </TableHead>
              <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-10 text-right whitespace-nowrap">Balance</TableHead>
              <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-10 text-right whitespace-nowrap">Value (EUR)</TableHead>
              <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-10 text-right whitespace-nowrap">24h Change</TableHead>
              <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-10 text-right whitespace-nowrap">Available</TableHead>
            </TableRow>
          </TableHeader>
          {renderContent()}
        </Table>
      </div>
    </div>
  );
};

export default BalancesWidget; 