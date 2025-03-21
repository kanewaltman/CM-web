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
import { useDataSource } from '@/lib/DataSourceContext';

// Format price with appropriate number of decimal places
const formatPrice = (price: number) => {
  if (price >= 1000) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else if (price >= 100) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } else if (price >= 0.01) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 6 });
  } else {
    return price.toLocaleString(undefined, { maximumFractionDigits: 8 });
  }
};

// Format market cap and volume to K, M, B, T
const formatLargeNumber = (value: number) => {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  } else if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toLocaleString();
};

const SkeletonRow: React.FC<{ assetColumnWidth?: number }> = ({ assetColumnWidth = 150 }) => (
  <TableRow isHeader={false}>
    <TableCell 
      className="sticky left-0 bg-[hsl(var(--color-widget-header))] z-10 whitespace-nowrap text-center"
      style={{ width: '60px', minWidth: '60px' }}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-[hsl(var(--color-widget-header))]"></div>
        <div className="relative z-10 flex items-center justify-center">
          <div className="w-5 h-5 rounded bg-white/5 animate-pulse" />
        </div>
      </div>
    </TableCell>
    <TableCell 
      className="sticky left-[60px] bg-[hsl(var(--color-widget-header))] z-10 whitespace-nowrap"
      style={{ width: `${assetColumnWidth}px`, minWidth: `${assetColumnWidth}px` }}
    >
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
      <div className="w-16 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
    <TableCell className="text-right">
      <div className="w-16 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
    <TableCell className="text-right">
      <div className="w-20 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
    <TableCell className="text-right">
      <div className="w-20 h-5 ml-auto rounded bg-white/5 animate-pulse" />
    </TableCell>
  </TableRow>
);

interface PriceData {
  [key: string]: {
    price: number;
    change24h: number;
    change7d: number;
    marketCap: number;
    volume: number;
    rank: number;
  };
}

interface MarketData {
  asset: AssetTicker;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume: number;
  rank: number;
}

interface MarketsWidgetProps {
  className?: string;
  compact?: boolean;
}

type SortField = 'asset' | 'rank' | 'price' | 'change24h' | 'change7d' | 'marketCap' | 'volume';
type SortDirection = 'asc' | 'desc';

// Sample market data - in a real app, this would come from an API
const SAMPLE_MARKET_DATA: Record<string, {
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume: number;
  rank: number;
}> = {
  "BTCEUR": { price: 37000.50, change24h: 2.5, change7d: 5.2, marketCap: 720000000000, volume: 25000000000, rank: 1 },
  "ETHEUR": { price: 1875.25, change24h: -1.2, change7d: 3.4, marketCap: 225000000000, volume: 15000000000, rank: 2 },
  "USDTEUR": { price: 0.91, change24h: -0.1, change7d: 0.2, marketCap: 95000000000, volume: 50000000000, rank: 3 },
  "BNBEUR": { price: 260.50, change24h: 0.8, change7d: -2.1, marketCap: 39000000000, volume: 2000000000, rank: 4 },
  "SOLEUR": { price: 85.00, change24h: 3.2, change7d: 10.5, marketCap: 36000000000, volume: 3000000000, rank: 5 },
  "USDCEUR": { price: 0.91, change24h: -0.2, change7d: 0.1, marketCap: 28000000000, volume: 4000000000, rank: 6 },
  "XRPEUR": { price: 0.45, change24h: 1.3, change7d: -0.8, marketCap: 24000000000, volume: 1500000000, rank: 7 },
  "ADAEUR": { price: 0.30, change24h: 0.5, change7d: -1.2, marketCap: 10500000000, volume: 500000000, rank: 8 },
  "DOGEEUR": { price: 0.012345, change24h: 1.5, change7d: 4.3, marketCap: 10000000000, volume: 900000000, rank: 9 },
  "DOTEUR": { price: 10.05, change24h: 0.8, change7d: 2.1, marketCap: 8900000000, volume: 350000000, rank: 10 },
  "TIAEUR": { price: 15.75, change24h: 4.2, change7d: 12.5, marketCap: 7500000000, volume: 850000000, rank: 11 },
  "LTCEUR": { price: 65.40, change24h: -0.5, change7d: 1.2, marketCap: 4800000000, volume: 320000000, rank: 12 },
  "MATICEUR": { price: 0.52, change24h: -1.8, change7d: -3.5, marketCap: 4300000000, volume: 280000000, rank: 13 },
  "LINKEUR": { price: 13.20, change24h: 2.1, change7d: 5.8, marketCap: 7200000000, volume: 450000000, rank: 14 },
  "ATOMEUR": { price: 7.85, change24h: -0.3, change7d: 1.9, marketCap: 2900000000, volume: 180000000, rank: 15 },
  "XMREUR": { price: 145.60, change24h: 1.1, change7d: 3.7, marketCap: 2700000000, volume: 120000000, rank: 16 },
  "APTEUR": { price: 6.75, change24h: 3.5, change7d: 8.2, marketCap: 2500000000, volume: 210000000, rank: 17 },
  "XLMEUR": { price: 0.11, change24h: 0.2, change7d: -1.5, marketCap: 3100000000, volume: 140000000, rank: 18 },
  "HBAREUR": { price: 0.05, change24h: -1.0, change7d: -2.4, marketCap: 1500000000, volume: 75000000, rank: 19 },
  "XCMEUR": { price: 0.50, change24h: -0.8, change7d: 2.3, marketCap: 750000000, volume: 45000000, rank: 20 }
};

export const MarketsWidget: React.FC<MarketsWidgetProps> = ({ className, compact = false }) => {
  const { theme, resolvedTheme } = useTheme();
  const { dataSource } = useDataSource();
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [sortField, setSortField] = useState<SortField>('marketCap');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const containerRef = useRef<HTMLDivElement>(null);
  const textMeasureRef = useRef<HTMLDivElement>(null);
  const [assetColumnWidth, setAssetColumnWidth] = useState<number>(150);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      if (field === 'rank') {
        setSortDirection('asc');
      } else if (field === 'asset') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  // Sort market data
  const sortedMarketData = useMemo(() => {
    return [...marketData].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'asset':
          comparison = ASSETS[a.asset].name.localeCompare(ASSETS[b.asset].name);
          break;
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'change24h':
          comparison = a.change24h - b.change24h;
          break;
        case 'change7d':
          comparison = a.change7d - b.change7d;
          break;
        case 'marketCap':
          comparison = a.marketCap - b.marketCap;
          break;
        case 'volume':
          comparison = a.volume - b.volume;
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [marketData, sortField, sortDirection]);

  // Check for container width to determine compact mode
  useEffect(() => {
    const calculateMinTableWidth = () => {
      const assetColWidth = assetColumnWidth;
      const rankColWidth = 80;
      const priceColWidth = 120;
      const change24hColWidth = 110;
      const change7dColWidth = 110;
      const marketCapColWidth = 140;
      const volumeColWidth = 140;
      const buffer = 10;
      
      return assetColWidth + rankColWidth + priceColWidth + change24hColWidth + 
             change7dColWidth + marketCapColWidth + volumeColWidth + buffer;
    };

    const checkWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const minTableWidth = calculateMinTableWidth();
        const shouldBeCompact = containerWidth < minTableWidth;
        setIsCompact(shouldBeCompact);
      }
    };

    checkWidth();
    const resizeObserver = new ResizeObserver(checkWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', checkWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkWidth);
    };
  }, [assetColumnWidth]);

  // Detect theme from document class list
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setCurrentTheme(isDark ? 'dark' : 'light');
    };

    updateTheme();

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

  // Effect to load market data
  useEffect(() => {
    const fetchMarketData = async () => {
      console.log(`[MarketsWidget] Fetching market data with data source: ${dataSource}. Component ID: ${Math.random().toString(36).substring(7)}`);
      try {
        setIsInitialLoading(true);

        if (dataSource === 'sample') {
          // Use sample data
          const marketDataArray = Object.entries(SAMPLE_MARKET_DATA)
            .map(([pair, details]) => {
              const asset = pair.replace('EUR', '') as AssetTicker;
              if (!(asset in ASSETS)) {
                return null;
              }
              
              return {
                asset,
                price: details.price,
                change24h: details.change24h,
                change7d: details.change7d,
                marketCap: details.marketCap,
                volume: details.volume,
                rank: details.rank
              };
            })
            .filter(Boolean) as MarketData[];

          setMarketData(marketDataArray);
          setError(null);
        } else {
          try {
            const tokenResponse = await fetch(getApiUrl('open/demo/temp'));
            const tokenData = await tokenResponse.json();
            
            if (!tokenData.token) {
              throw new Error('Failed to get demo token');
            }

            // In a real implementation, you would fetch market data from an actual API
            // For this example, we'll just use the sample data
            const marketDataArray = Object.entries(SAMPLE_MARKET_DATA)
              .map(([pair, details]) => {
                const asset = pair.replace('EUR', '') as AssetTicker;
                if (!(asset in ASSETS)) {
                  return null;
                }
                
                return {
                  asset,
                  price: details.price,
                  change24h: details.change24h,
                  change7d: details.change7d,
                  marketCap: details.marketCap,
                  volume: details.volume,
                  rank: details.rank
                };
              })
              .filter(Boolean) as MarketData[];

            setMarketData(marketDataArray);
            setError(null);
          } catch (error) {
            console.error('Error fetching market data:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch market data');
          }
        }
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch market data');
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchMarketData();
  }, [dataSource]);

  // Memoize the fetch prices function to prevent recreating it on every render
  const fetchPrices = useCallback(async () => {
    if (dataSource === 'sample') {
      // Already using sample data
      return;
    }

    try {
      setIsUpdating(true);
      
      // In a real implementation, you would fetch updated market data
      // For now, we'll just simulate a delay and reuse the sample data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsUpdating(false);
    } catch (err) {
      console.error('Error updating market data:', err);
      setIsUpdating(false);
    }
  }, [dataSource]);

  // Update prices periodically
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Calculate the width needed for the asset column based on the longest asset name
  useEffect(() => {
    if (!textMeasureRef.current) return;

    // Create a temporary span to measure text width
    const measureElement = document.createElement('span');
    measureElement.style.visibility = 'hidden';
    measureElement.style.position = 'absolute';
    measureElement.style.whiteSpace = 'nowrap';
    measureElement.style.fontFamily = 'var(--font-jakarta)';
    measureElement.style.fontWeight = 'bold';
    measureElement.style.fontSize = '14px';
    document.body.appendChild(measureElement);

    // Find the longest asset name
    let maxWidth = 0;
    Object.values(ASSETS).forEach(asset => {
      measureElement.textContent = asset.name;
      const width = measureElement.getBoundingClientRect().width;
      maxWidth = Math.max(maxWidth, width);
    });

    // Remove the temporary element
    document.body.removeChild(measureElement);

    // Add padding for icon (32px) + gap (8px) + padding (16px)
    const totalWidth = maxWidth + 32 + 8 + 16;
    
    // Set minimum width
    const minWidth = 120;
    setAssetColumnWidth(Math.max(totalWidth, minWidth));
  }, []);

  return (
    <div 
      className={cn("h-full flex flex-col p-2 relative", className)}
      ref={containerRef}
    >
      <div className="flex-1 min-h-0 relative">
        <div className="absolute left-[8px] right-[16px] h-[1px] bg-border z-30" style={{ top: '40px' }}></div>
        {/* Hidden div for text measurement */}
        <div ref={textMeasureRef} className="absolute -left-[9999px] -top-[9999px]"></div>
        <Table>
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="bg-[hsl(var(--color-widget-header))]">
              <TableHead 
                className="sticky left-0 top-0 bg-[hsl(var(--color-widget-header))] z-30 whitespace-nowrap cursor-pointer hover:text-foreground/80 text-center"
                style={{ width: '60px', minWidth: '60px' }}
                onClick={() => handleSort('rank')}
              >
                <div className="relative">
                  <div className="absolute -inset-x-[1px] -inset-y-[0.5px] bg-[hsl(var(--color-widget-header))] shadow-[0_0_0_1px_hsl(var(--color-widget-header))]"></div>
                  <div className="relative z-10 flex items-center justify-center gap-1">
                    #
                    {sortField === 'rank' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </div>
              </TableHead>
              <TableHead 
                className="sticky left-[60px] top-0 bg-[hsl(var(--color-widget-header))] z-30 whitespace-nowrap cursor-pointer hover:text-foreground/80"
                style={{ width: `${assetColumnWidth}px`, minWidth: `${assetColumnWidth}px` }}
                onClick={() => handleSort('asset')}
              >
                <div className="px-0 py-1 flex items-center gap-1">
                  Asset
                  {sortField === 'asset' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-20 text-right whitespace-nowrap cursor-pointer hover:text-foreground/80"
                onClick={() => handleSort('price')}
              >
                <div className="relative">
                  <div className="absolute -inset-x-[1px] -inset-y-[0.5px] bg-[hsl(var(--color-widget-header))] shadow-[0_0_0_1px_hsl(var(--color-widget-header))]"></div>
                  <div className="relative z-10 flex items-center justify-end gap-1">
                    Price (EUR)
                    {sortField === 'price' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </div>
              </TableHead>
              <TableHead 
                className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-20 text-right whitespace-nowrap cursor-pointer hover:text-foreground/80"
                onClick={() => handleSort('change24h')}
              >
                <div className="relative">
                  <div className="absolute -inset-x-[1px] -inset-y-[0.5px] bg-[hsl(var(--color-widget-header))] shadow-[0_0_0_1px_hsl(var(--color-widget-header))]"></div>
                  <div className="relative z-10 flex items-center justify-end gap-1">
                    24h %
                    {sortField === 'change24h' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </div>
              </TableHead>
              {!isCompact && (
                <>
                  <TableHead 
                    className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-20 text-right whitespace-nowrap cursor-pointer hover:text-foreground/80"
                    onClick={() => handleSort('change7d')}
                  >
                    <div className="relative">
                      <div className="absolute -inset-x-[1px] -inset-y-[0.5px] bg-[hsl(var(--color-widget-header))] shadow-[0_0_0_1px_hsl(var(--color-widget-header))]"></div>
                      <div className="relative z-10 flex items-center justify-end gap-1">
                        7d %
                        {sortField === 'change7d' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </div>
                  </TableHead>
                  <TableHead 
                    className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-20 text-right whitespace-nowrap cursor-pointer hover:text-foreground/80"
                    onClick={() => handleSort('marketCap')}
                  >
                    <div className="relative">
                      <div className="absolute -inset-x-[1px] -inset-y-[0.5px] bg-[hsl(var(--color-widget-header))] shadow-[0_0_0_1px_hsl(var(--color-widget-header))]"></div>
                      <div className="relative z-10 flex items-center justify-end gap-1">
                        Market Cap
                        {sortField === 'marketCap' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </div>
                  </TableHead>
                  <TableHead 
                    className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-20 text-right whitespace-nowrap cursor-pointer hover:text-foreground/80"
                    onClick={() => handleSort('volume')}
                  >
                    <div className="relative">
                      <div className="absolute -inset-x-[1px] -inset-y-[0.5px] bg-[hsl(var(--color-widget-header))] shadow-[0_0_0_1px_hsl(var(--color-widget-header))]"></div>
                      <div className="relative z-10 flex items-center justify-end gap-1">
                        Volume (24h)
                        {sortField === 'volume' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </div>
                  </TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          {isInitialLoading ? (
            <TableBody>
              {[...Array(10)].map((_, i) => (
                <SkeletonRow key={i} assetColumnWidth={assetColumnWidth} />
              ))}
            </TableBody>
          ) : error ? (
            <div className="p-3">
              <div className="text-red-500">{error}</div>
            </div>
          ) : marketData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-muted-foreground">No market data found</div>
            </div>
          ) : (
            <TableBody>
              {sortedMarketData.map((market) => {
                const assetConfig = ASSETS[market.asset];
                const assetColor = currentTheme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light;
                return (
                  <TableRow key={market.asset} className="group hover:bg-[hsl(var(--color-widget-hover))]" isHeader={false}>
                    <TableCell 
                      className="sticky left-0 z-10 whitespace-nowrap p-0 overflow-hidden text-center"
                      style={{ width: '60px', minWidth: '60px' }}
                    >
                      <div className={cn(
                        "relative h-full bg-[hsl(var(--color-widget-header))]",
                        "group-hover:bg-[hsl(var(--color-widget-hover))]"
                      )}>
                        <div className="p-2 relative z-10 flex items-center justify-center">
                          <span className="font-jakarta font-semibold text-sm leading-[150%] text-muted-foreground">
                            {market.rank}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell 
                      className="sticky left-[60px] z-10 whitespace-nowrap p-0 overflow-hidden"
                      style={{ width: `${assetColumnWidth}px`, minWidth: `${assetColumnWidth}px` }}
                    >
                      <div className={cn(
                        "relative h-full bg-[hsl(var(--color-widget-header))]",
                        "group-hover:bg-[hsl(var(--color-widget-hover))]"
                      )}>
                        <div className="p-2 relative z-10 flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden"
                          >
                            <img
                              src={assetConfig.icon}
                              alt={market.asset}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-jakarta font-semibold text-sm">
                            {assetConfig.name}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap p-0 overflow-hidden">
                      <div className="relative h-full">
                        <div className="p-2 relative z-10">
                          <span className="font-jakarta font-mono font-semibold text-sm leading-[150%]">
                            €{formatPrice(market.price)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right whitespace-nowrap font-mono p-0 overflow-hidden",
                      market.change24h > 0 ? "text-price-up" : market.change24h < 0 ? "text-price-down" : "text-muted-foreground/80"
                    )}>
                      <div className="relative h-full">
                        <div className="p-2 relative z-10">
                          {market.change24h > 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </TableCell>
                    {!isCompact && (
                      <>
                        <TableCell className={cn(
                          "text-right whitespace-nowrap font-mono p-0 overflow-hidden",
                          market.change7d > 0 ? "text-price-up" : market.change7d < 0 ? "text-price-down" : "text-muted-foreground/80"
                        )}>
                          <div className="relative h-full">
                            <div className="p-2 relative z-10">
                              {market.change7d > 0 ? '+' : ''}{market.change7d.toFixed(2)}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap p-0 overflow-hidden">
                          <div className="relative h-full">
                            <div className="p-2 relative z-10">
                              <span className="font-jakarta font-semibold text-sm leading-[150%]">
                                €{formatLargeNumber(market.marketCap)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap p-0 overflow-hidden">
                          <div className="relative h-full">
                            <div className="p-2 relative z-10">
                              <span className="font-jakarta font-semibold text-sm leading-[150%]">
                                €{formatLargeNumber(market.volume)}
                              </span>
                            </div>
                          </div>
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
    </div>
  );
};

export default MarketsWidget; 