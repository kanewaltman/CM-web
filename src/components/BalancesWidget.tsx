import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useDataSource } from '@/lib/DataSourceContext';
import { Treemap, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

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
    lastDayPrice?: number;
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
  gridSize?: number;
}

const HeaderDivider: React.FC = () => {
  return (
    <div className="w-full sticky z-10" style={{ top: '33px' }}>
      <div className="h-px w-full bg-border"></div>
    </div>
  );
};

// Add sample data
const SAMPLE_BALANCES = {
  "BTC": {
    "BTC": "1.23456789",
    "EUR": "45678.90"
  },
  "ETH": {
    "ETH": "15.432109",
    "EUR": "28901.23"
  },
  "DOT": {
    "DOT": "1234.5678",
    "EUR": "12345.67"
  },
  "USDT": {
    "USDT": "50000.00",
    "EUR": "45678.90"
  }
};

const SAMPLE_PRICES = {
  "BTCEUR": { price: 37000.50, change24h: 2.5 },
  "ETHEUR": { price: 1875.25, change24h: -1.2 },
  "DOTEUR": { price: 10.05, change24h: 0.8 },
  "USDTEUR": { price: 0.91, change24h: -0.1 }
};

export const BalancesWidget: React.FC<BalancesWidgetProps> = ({ className, compact = false, gridSize = 0 }) => {
  const { theme, resolvedTheme } = useTheme();
  const { dataSource } = useDataSource();
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [balances, setBalances] = useState<BalanceData[]>([]);
  const [prices, setPrices] = useState<PriceData>({});
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [showTreemap, setShowTreemap] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Check for container dimensions to determine layout and treemap visibility
  useEffect(() => {
    const FULL_TABLE_MIN_WIDTH = 400; // Minimum width in pixels for full table view
    const MIN_HEIGHT_FOR_TREEMAP = 300; // Minimum height needed for treemap
    const MIN_WIDTH_FOR_TREEMAP = 600; // Minimum width needed for treemap
    
    const checkDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        setContainerSize({ width: containerWidth, height: containerHeight });
        setIsCompact(containerWidth < FULL_TABLE_MIN_WIDTH);
        
        // Show treemap only if we have enough space for both table and treemap
        const shouldShowTreemap = containerWidth >= MIN_WIDTH_FOR_TREEMAP && 
                                 containerHeight >= MIN_HEIGHT_FOR_TREEMAP;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Container dimensions: ${containerWidth}x${containerHeight} - Show treemap: ${shouldShowTreemap}`);
        }
        
        setShowTreemap(shouldShowTreemap);
      }
    };

    // Initial check
    checkDimensions();

    // Set up resize observer
    const resizeObserver = new ResizeObserver(checkDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also add window resize event listener as backup
    window.addEventListener('resize', checkDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkDimensions);
    };
  }, []);

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

  // Initial balance fetch
  useEffect(() => {
    const fetchInitialBalances = async () => {
      try {
        setIsInitialLoading(true);

        if (dataSource === 'sample') {
          // Use sample data
          const balancesArray = Object.entries(SAMPLE_BALANCES)
            .filter(([asset]) => asset !== 'TOTAL')
            .map(([asset, details]: [string, any]) => ({
              asset: asset as AssetTicker,
              balance: details[asset]?.toString() || '0',
              valueInEuro: details.EUR?.toString() || '0',
              change24h: '0',
              availablePercentage: '100'
            }))
            .filter(balance => 
              balance.asset in ASSETS && 
              parseFloat(balance.balance) > 0
            );

            setBalances(balancesArray);
            setError(null);
        } else {
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
        }
      } catch (err) {
        console.error('Error fetching balances:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchInitialBalances();
  }, [dataSource]); // Add dataSource as dependency

  // Memoize the fetch prices function to prevent recreating it on every render
  const fetchPrices = useCallback(async () => {
    if (dataSource === 'sample') {
      setPrices(SAMPLE_PRICES);
      return;
    }

    try {
      setIsUpdating(true);
      
      const pricesResponse = await fetch(getApiUrl('open/exchange/prices'));
      if (!pricesResponse.ok) {
        throw new Error(`Prices request failed with status ${pricesResponse.status}`);
      }
      const rawPriceData = await pricesResponse.json();
      
      console.log('📊 Raw prices data received:', {
        timestamp: new Date().toISOString(),
        latestPrices: rawPriceData.latestPrices?.length,
        info24h: rawPriceData['24hInfo']?.length,
        data: rawPriceData
      });

      // Process latest prices into a more usable format
      const currentPrices: Record<string, any> = {};
      
      // First, process latest prices
      rawPriceData.latestPrices.forEach((price: any) => {
        currentPrices[price.pair] = {
          price: parseFloat(price.price),
          change24h: 0
        };
      });

      console.log('📈 Current prices before 24h calculation:', currentPrices);

      // Calculate 24h changes
      if (rawPriceData['24hInfo']) {
        rawPriceData['24hInfo'].forEach((info: any) => {
          if (currentPrices[info.pair]) {
            // Log the full info object to see its structure
            console.log(`📊 24h info for ${info.pair}:`, info);
            
            // Use the delta value directly (it's already in percentage form)
            const change = info.delta * 100; // Convert to percentage
            currentPrices[info.pair].change24h = change;
            console.log(`✅ Set 24h change for ${info.pair}: ${change}%`);
          }
        });
      }

      // Get unique pairs from balances, excluding EUR/EUR
      const pairs = balances
        .map(balance => `${balance.asset}EUR`)
        .filter((value, index, self) => 
          self.indexOf(value) === index && 
          !value.startsWith('EUR')
        );

      console.log('🔍 Pairs from balances:', pairs);

      // Initialize enriched prices with current data
      const enrichedPrices: PriceData = {};
      
      // Add all pairs with current price data
      pairs.forEach(pair => {
        const baseAsset = pair.replace('EUR', '');
        const alternativePairs = [
          { pair: `${baseAsset}EUR`, type: 'EUR' },
          { pair: `${baseAsset}USD`, type: 'USD' },
          { pair: `${baseAsset}USDT`, type: 'USDT' },
          { pair: `${baseAsset}USDC`, type: 'USDC' }
        ];
        
        console.log(`🔎 Looking for price data for ${baseAsset}:`, {
          availablePairs: alternativePairs.map(p => ({
            pair: p.pair,
            hasData: !!currentPrices[p.pair],
            change: currentPrices[p.pair]?.change24h
          }))
        });

        // Find the best price data (prioritize non-zero changes)
        let bestPriceData = null;
        for (const { pair: pairName } of alternativePairs) {
          if (currentPrices[pairName]) {
            const priceData = currentPrices[pairName];
            // If we don't have any data yet, or if this pair has a non-zero change
            if (!bestPriceData || (priceData.change24h !== 0 && bestPriceData.change24h === 0)) {
              bestPriceData = priceData;
              console.log(`📈 Found better price data for ${baseAsset} from ${pairName}:`, priceData);
            }
          }
        }

        if (bestPriceData) {
          enrichedPrices[pair] = {
            price: bestPriceData.price,
            change24h: bestPriceData.change24h
          };
          console.log(`💹 Added price data for ${pair}:`, enrichedPrices[pair]);
        } else {
          console.log(`⚠️ No price data found for ${baseAsset} in any pair`);
        }
      });

      // Add EUR with no change
      enrichedPrices['EUREUR'] = {
        price: 1,
        change24h: 0,
        lastDayPrice: 1
      };

      console.log('💰 Final enriched prices:', enrichedPrices);

      setPrices(enrichedPrices);

    } catch (err) {
      console.error('Error fetching prices:', err);
    } finally {
      setIsUpdating(false);
    }
  }, [dataSource, balances]);

  // Update prices periodically
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Update price-dependent values when prices change
  const balancesWithPrices = useMemo(() => {
    return balances.map(balance => ({
      ...balance,
      change24h: (prices[`${balance.asset}EUR`]?.change24h || 0).toFixed(2)
    }));
  }, [balances, prices]);
  
  // Format data for treemap
  const treemapData = useMemo(() => {
    const totalValue = balancesWithPrices.reduce((sum, balance) => sum + parseFloat(balance.valueInEuro), 0);
    
    return balancesWithPrices.map(balance => {
      const value = parseFloat(balance.valueInEuro);
      const percentage = (value / totalValue) * 100;
      
      return {
        name: balance.asset,
        size: value,
        color: ASSETS[balance.asset]?.theme?.[currentTheme] || '#888888',
        formattedValue: `€${value.toLocaleString(undefined, { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`,
        percentage: percentage.toFixed(1)
      };
    });
  }, [balancesWithPrices, currentTheme]);

  // Custom Treemap content component with white text
  const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, percentage, color } = props;
    
    // Only show text if rectangle is big enough - reduced threshold to show more text
    if (width < 40 || height < 30) return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: color,
            stroke: 'var(--border)',
            strokeWidth: 2,
          }}
        />
      </g>
    );
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: color,
            stroke: 'var(--border)',
            strokeWidth: 2,
          }}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - 12}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize={14}
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
        >
          {name}
        </text>
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize={13}
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
        >
          {percentage}%
        </text>
      </g>
    );
  };

  return (
    <div 
      className={cn("h-full flex flex-col p-2", className)}
      ref={containerRef}
    >
      {/* Debug indicator - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground mb-1">
          Container: {containerSize.width}x{containerSize.height} | 
          Show treemap: {showTreemap ? 'Yes' : 'No'} | 
          Compact: {isCompact ? 'Yes' : 'No'}
        </div>
      )}
      
      <div className={cn("flex-1 min-h-0 relative", showTreemap ? "flex gap-4" : "")}>
        <div className={cn("relative", showTreemap ? "w-1/2" : "w-full")}>
          <div className="absolute left-[8px] right-[8px] h-[1px] bg-border z-30" style={{ top: '40px' }}></div>
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
                {!isCompact && (
                  <>
                    <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-10 text-right whitespace-nowrap">Value (EUR)</TableHead>
                    <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-10 text-right whitespace-nowrap">24h Change</TableHead>
                    <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-10 text-right whitespace-nowrap">Available</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            {isInitialLoading ? (
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </TableBody>
            ) : error ? (
              <div className="p-3">
                <div className="text-red-500">{error}</div>
              </div>
            ) : balances.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground">No balances found</div>
              </div>
            ) : (
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
                            <span
                              className="font-jakarta font-bold text-sm rounded-md px-1 transition-all duration-150"
                              style={{ 
                                color: assetColor,
                                backgroundColor: `${assetColor}14`
                              }}
                            >
                              {assetConfig.name}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {isCompact ? (
                          <div className="flex flex-col items-end">
                            <span className="font-jakarta font-semibold text-sm leading-[150%]">
                              €{parseFloat(balance.valueInEuro).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <div className="text-muted-foreground">
                              <span className="font-jakarta font-semibold text-sm leading-[150%]">
                                {formatBalance(parseFloat(balance.balance), assetConfig.decimalPlaces)}
                              </span>
                              <span className="font-jakarta font-bold text-sm leading-[150%] ml-1">
                                {balance.asset}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-jakarta font-semibold text-sm leading-[150%]">
                              {formatBalance(parseFloat(balance.balance), assetConfig.decimalPlaces)}
                            </span>
                            <span className="font-jakarta font-bold text-sm leading-[150%] text-muted-foreground/80 ml-1">
                              {balance.asset}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      {!isCompact && (
                        <>
                          <TableCell className="text-right whitespace-nowrap">
                            <span className="font-jakarta font-semibold text-sm leading-[150%]">
                              €{parseFloat(balance.valueInEuro).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className={cn(
                            "text-right whitespace-nowrap font-mono",
                            parseFloat(balance.change24h) > 0 ? "text-green-500" : parseFloat(balance.change24h) < 0 ? "text-red-500" : "text-muted-foreground/80"
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
                                      <span className="flex grow gap-2 text-muted-foreground/80">
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
                                      <span className="flex grow gap-2 text-muted-foreground/80">
                                        In Exchange <span className="ml-auto">0%</span>
                                      </span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            )}
          </Table>
        </div>
        
        {showTreemap && !isInitialLoading && balances.length > 0 && (
          <div className="w-1/2 border border-border rounded-md overflow-hidden">
            <div className="w-full h-full p-1">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  stroke="var(--border)"
                  fill="#8884d8"
                  content={<CustomTreemapContent />}
                  isAnimationActive={false}
                >
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background p-2 border border-border rounded-md shadow-md">
                            <p className="font-bold">{data.name}</p>
                            <p className="text-lg font-semibold">{data.percentage}%</p>
                            <p className="text-xs text-muted-foreground">
                              {data.formattedValue}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalancesWidget; 