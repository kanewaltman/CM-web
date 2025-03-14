import { useId, useState, useEffect, useMemo, useRef } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Rectangle,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { CustomTooltipContent } from "./ChartExtras";
import { Badge } from "@/components/ui/badge";
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { getApiUrl } from '@/lib/api-config';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useDataSource } from '@/lib/DataSourceContext';
import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreHorizontal } from "lucide-react";

// Import sample balances from BalancesWidget
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
  },
  "DOGE": {
    "DOGE": "100000.00",
    "EUR": "1234.56"
  },
  "XCM": {
    "XCM": "5000.00",
    "EUR": "2500.00"
  },
  "SOL": {
    "SOL": "100.00",
    "EUR": "8500.00"
  },
  "ADA": {
    "ADA": "50000.00",
    "EUR": "15000.00"
  },
  "HBAR": {
    "HBAR": "25000.00",
    "EUR": "1250.00"
  }
} as const;

interface BalanceDetails {
  [key: string]: string;
}

interface BalanceDataPoint {
  timestamp: string;
  date: string;
  [key: string]: number | string;
}

interface CustomCursorProps {
  fill?: string;
  pointerEvents?: string;
  height?: number;
  points?: Array<{ x: number; y: number }>;
  className?: string;
}

function CustomCursor(props: CustomCursorProps) {
  const { fill, pointerEvents, height, points, className } = props;

  if (!points || points.length === 0) {
    return null;
  }

  const { x, y } = points[0]!;
  return (
    <>
      <Rectangle
        x={x - 12}
        y={y}
        fill={fill}
        pointerEvents={pointerEvents}
        width={24}
        height={height}
        className={className}
        type="linear"
      />
      <Rectangle
        x={x - 1}
        y={y}
        fill={fill}
        pointerEvents={pointerEvents}
        width={1}
        height={height}
        className="recharts-tooltip-inner-cursor"
        type="linear"
      />
    </>
  );
}

// Asset volatility profiles
const VOLATILITY_PROFILES = {
  FIAT: {
    trend: 0.03, // 3% macro trend
    volatility: 0.02, // 2% volatility
    noise: 0.005, // 0.5% noise
    variation: 0.05, // 5% variation in base value
    marketBeta: 0 // No correlation with crypto market
  },
  STABLECOIN: {
    trend: 0.001, // 0.1% macro trend
    volatility: 0.001, // 0.1% volatility
    noise: 0.0005, // 0.05% noise
    variation: 0.02, // 2% variation in base value
    marketBeta: 0 // No correlation with crypto market
  },
  MAJOR_CRYPTO: {
    trend: 0.4, // 40% macro trend
    volatility: 0.25, // 25% volatility
    noise: 0.1, // 10% noise
    variation: 0.15, // 15% variation in base value
    marketBeta: 1 // Base market correlation
  },
  LARGE_CAP: {
    trend: 0.5, // 50% macro trend
    volatility: 0.35, // 35% volatility
    noise: 0.15, // 15% noise
    variation: 0.2, // 20% variation in base value
    marketBeta: 1.2 // 20% more volatile than market
  },
  MID_CAP: {
    trend: 0.6, // 60% macro trend
    volatility: 0.45, // 45% volatility
    noise: 0.2, // 20% noise
    variation: 0.25, // 25% variation in base value
    marketBeta: 1.5 // 50% more volatile than market
  },
  SMALL_CAP: {
    trend: 0.7, // 70% macro trend
    volatility: 0.55, // 55% volatility
    noise: 0.25, // 25% noise
    variation: 0.3, // 30% variation in base value
    marketBeta: 2 // 100% more volatile than market
  }
} as const;

// Reference values from demo API (updated periodically)
const REFERENCE_VALUES: Record<string, number> = {
  'Euro': 40683,
  'USD': 46219,
  'BTC': 42556,
  'ETH': 50273,
  'XRP': 59952,
  'LTC': 68211,
  'BCH': 65389,
  'USDT': 55912,
  'USDC': 45508
};

// Function to determine asset volatility profile
function getAssetProfile(asset: AssetTicker) {
  // Fiat currencies
  if (['Euro', 'USD', 'GBP', 'AUD'].some(fiat => asset.includes(fiat))) {
    return VOLATILITY_PROFILES.FIAT;
  }
  
  // Stablecoins
  if (asset.includes('USDT') || asset.includes('USDC')) {
    return VOLATILITY_PROFILES.STABLECOIN;
  }
  
  // Major cryptocurrencies
  if (['BTC', 'ETH'].includes(asset)) {
    return VOLATILITY_PROFILES.MAJOR_CRYPTO;
  }
  
  // Large cap assets
  if (['XRP', 'LTC', 'BCH', 'DOT', 'LINK'].includes(asset)) {
    return VOLATILITY_PROFILES.LARGE_CAP;
  }
  
  // Mid cap assets
  if (['ALGO', 'ATOM', 'XLM', 'FIL'].includes(asset)) {
    return VOLATILITY_PROFILES.MID_CAP;
  }
  
  // All other assets are treated as small cap
  return VOLATILITY_PROFILES.SMALL_CAP;
}

// Add sample data that reflects portfolio value history
function generateSampleData(currentBalances: Record<string, number>, pointCount: number) {
  return Array.from({ length: pointCount }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (pointCount - 1 - i) * 7);
    
    // Format date to include year for proper month transitions
    const dataPoint: BalanceDataPoint = {
      timestamp: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      date: date.toISOString() // Add the full date for tooltip use
    };

    Object.entries(currentBalances).forEach(([asset, currentValue]) => {
      const profile = getAssetProfile(asset as AssetTicker);
      
      if (i === pointCount - 1) {
        // For the last data point, use exact current balance
        dataPoint[asset] = currentValue;
      } else {
        const baseValue = currentValue * (1 + (Math.random() * 2 - 1) * profile.variation);
        
        const variation = () => {
          // Market influence based on asset's beta
          const marketInfluence = (Math.sin((i / pointCount) * Math.PI * 2) * profile.trend + Math.sin((i / pointCount) * Math.PI * 6) * profile.volatility) * profile.marketBeta;
          // Asset-specific noise
          const noise = (Math.random() - 0.5) * profile.noise;
          return 1 + marketInfluence + noise;
        };

        dataPoint[asset] = baseValue * variation();
      }
    });

    return dataPoint;
  });
}

export interface PerformanceChartProps {
  viewMode?: 'split' | 'cumulative';
  onViewModeChange?: (mode: 'split' | 'cumulative') => void;
}

export function PerformanceChart({ viewMode: propViewMode = 'split', onViewModeChange }: PerformanceChartProps) {
  const id = useId();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const { resolvedTheme } = useTheme();
  const { dataSource } = useDataSource();
  const [fullBalanceData, setFullBalanceData] = useState<BalanceDataPoint[]>([]);
  const [assets, setAssets] = useState<AssetTicker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverValues, setHoverValues] = useState<{ index: number; values: { [key: string]: number }; activeLine?: string } | null>(null);
  const [hiddenAssets, setHiddenAssets] = useState<Set<string>>(new Set());
  const [enabledTruncatedAssets, setEnabledTruncatedAssets] = useState<Set<string>>(new Set());
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleAssetVisibility = (asset: string) => {
    setHiddenAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(asset)) {
        newSet.delete(asset);
      } else {
        newSet.add(asset);
      }
      return newSet;
    });
  };

  const toggleTruncatedAsset = (asset: string) => {
    setEnabledTruncatedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(asset)) {
        newSet.delete(asset);
      } else {
        newSet.add(asset);
      }
      return newSet;
    });
  };

  // Track container width
  useEffect(() => {
    const updateWidth = () => {
      if (chartContainerRef.current) {
        setContainerWidth(chartContainerRef.current.clientWidth);
      }
    };

    // Initial width
    updateWidth();

    // Update width on resize
    const resizeObserver = new ResizeObserver(updateWidth);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Track the last shown date to prevent repetition
  const lastShownDate = useRef<{ month: string; year: string }>({ month: '', year: '' });

  // Calculate responsive chart parameters
  const chartParams = useMemo(() => {
    // Default values for narrow screens (< 480px)
    let interval = Math.floor(26 / 6); // Show ~6 labels
    let visiblePoints = 26;

    // Adjust based on container width
    if (containerWidth >= 480) {
      interval = Math.floor(39 / 7); // Show ~7 labels
      visiblePoints = 39;
    }
    if (containerWidth >= 768) {
      interval = Math.floor(52 / 8); // Show ~8 labels
      visiblePoints = 52;
    }
    if (containerWidth >= 1024) {
      interval = Math.floor(104 / 10); // Show ~10 labels
      visiblePoints = 104;
    }
    if (containerWidth >= 1280) {
      interval = Math.floor(156 / 12); // Show ~12 labels
      visiblePoints = 156;
    }
    if (containerWidth >= 1536) {
      interval = Math.floor(156 / 13); // Show ~13 labels
      visiblePoints = 156;
    }

    return { interval, visiblePoints };
  }, [containerWidth]);

  // Get visible data based on screen width
  const balanceData = useMemo(() => {
    if (fullBalanceData.length === 0) return [];
    
    // Always show the most recent data points based on visiblePoints
    return fullBalanceData.slice(-chartParams.visiblePoints);
  }, [fullBalanceData, chartParams.visiblePoints]);

  // Fetch balance data
  useEffect(() => {
    const fetchBalanceData = async () => {
      try {
        setIsLoading(true);

        if (dataSource === 'sample') {
          // Use sample balances from the BalancesWidget
          const sampleBalances = Object.fromEntries(
            Object.entries(SAMPLE_BALANCES)
              .filter(([asset]) => asset !== 'TOTAL' && asset in ASSETS)
              .map(([asset, details]) => [asset, parseFloat((details as BalanceDetails).EUR || '0')])
          );
          
          const validAssets = Object.keys(sampleBalances) as AssetTicker[];
          setAssets(validAssets);
          // Generate maximum number of data points once
          setFullBalanceData(generateSampleData(sampleBalances, 156));
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

          // Process balances and create mock historical data
          if (data && typeof data === 'object') {
            const validAssets = Object.entries(data)
              .filter(([asset]) => asset !== 'TOTAL' && asset in ASSETS)
              .map(([asset]) => asset as AssetTicker);

            setAssets(validAssets);

            // Create current balances object
            const currentBalances = Object.fromEntries(
              validAssets.map(asset => [asset, parseFloat(data[asset].EUR || '0')])
            );

            // Generate maximum number of data points once
            setFullBalanceData(generateSampleData(currentBalances, 156));
          }

          setError(null);
        }
      } catch (err) {
        console.error('Error fetching balances:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalanceData();
  }, [dataSource]); // Remove chartParams.dataPoints dependency

  // Create chart configuration based on assets
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    // Sort assets by their current value in descending order
    const sortedAssets = [...assets].sort((a, b) => {
      const aValue = balanceData[balanceData.length - 1]?.[a] as number || 0;
      const bValue = balanceData[balanceData.length - 1]?.[b] as number || 0;
      return bValue - aValue;
    });
    
    sortedAssets.forEach(asset => {
      const assetConfig = ASSETS[asset];
      config[asset] = {
        label: assetConfig.name,
        color: resolvedTheme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light
      };
    });
    return config;
  }, [assets, resolvedTheme, balanceData]);

  // Get sorted assets for consistent ordering
  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      const aValue = balanceData[balanceData.length - 1]?.[a] as number || 0;
      const bValue = balanceData[balanceData.length - 1]?.[b] as number || 0;
      return bValue - aValue;
    });
  }, [assets, balanceData]);

  // Calculate total value and 24h change
  const { totalValue, totalChange } = useMemo(() => {
    if (balanceData.length < 2) return { totalValue: 0, totalChange: 0 };
    
    const currentTotal = assets.reduce((sum, asset) => {
      return sum + (balanceData[balanceData.length - 1]?.[asset] as number || 0);
    }, 0);

    const previousTotal = assets.reduce((sum, asset) => {
      return sum + (balanceData[balanceData.length - 2]?.[asset] as number || 0);
    }, 0);

    const change = ((currentTotal - previousTotal) / previousTotal) * 100;

    return {
      totalValue: currentTotal,
      totalChange: change
    };
  }, [balanceData, assets]);

  // Calculate cumulative data
  const cumulativeData = useMemo(() => {
    return balanceData.map(point => {
      const total = assets.reduce((sum, asset) => sum + (point[asset] as number || 0), 0);
      return {
        timestamp: point.timestamp,
        date: point.date,
        total
      };
    });
  }, [balanceData, assets]);

  // Find year transition points in the visible data
  const yearTransitions = useMemo(() => {
    if (balanceData.length === 0) return [];
    
    const transitions: { index: number; year: string }[] = [];
    let lastYear: string | null = null;
    
    // Get the visible data range
    const visibleData = propViewMode === 'split' ? balanceData : cumulativeData;
    
    visibleData.forEach((point, index) => {
      const [, year] = point.timestamp.split(' ');
      if (lastYear !== null && year !== lastYear) {
        transitions.push({ index, year });
      }
      lastYear = year;
    });
    
    return transitions;
  }, [balanceData, cumulativeData, propViewMode]);

  // Get visible and hidden assets
  const visibleAssets = useMemo(() => sortedAssets.slice(0, 5), [sortedAssets]);
  const truncatedAssets = useMemo(() => sortedAssets.slice(5), [sortedAssets]);

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="flex items-center justify-center flex-1">
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="w-full flex flex-col gap-2">
          <CardTitle className="w-full">
            {propViewMode === 'split' ? (
              <div className="flex items-center gap-2 flex-wrap w-full">
                {visibleAssets.map((asset: AssetTicker) => {
                  const assetConfig = ASSETS[asset];
                  const assetColor = resolvedTheme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light;
                  const isHidden = hiddenAssets.has(asset);
                  const isTruncated = truncatedAssets.includes(asset);
                  const isEnabled = !isTruncated || enabledTruncatedAssets.has(asset);
                  const isActive = hoverValues?.activeLine === asset;
                  const currentValue = isActive ? hoverValues?.values[asset] : undefined;
                  const previousIndex = hoverValues?.index ? hoverValues.index - 1 : 0;
                  const previousValue = previousIndex >= 0 ? balanceData[previousIndex]?.[asset] : undefined;
                  const change = typeof currentValue === 'number' && typeof previousValue === 'number' && previousValue !== 0
                    ? ((currentValue - previousValue) / previousValue * 100)
                    : 0;
                  return (
                    <button 
                      key={asset}
                      type="button"
                      className="font-jakarta font-bold text-sm rounded-md px-1 transition-all duration-150 flex items-center gap-1"
                      style={{ 
                        color: isActive ? 'hsl(var(--color-widget-bg))' : assetColor,
                        backgroundColor: isActive ? assetColor : `${assetColor}14`,
                        cursor: 'pointer',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'text',
                        userSelect: 'text',
                        opacity: isHidden ? 0.5 : 1
                      }}
                      onClick={() => toggleAssetVisibility(asset)}
                      onMouseEnter={(e) => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = null;
                        }
                        const target = e.currentTarget;
                        target.style.backgroundColor = assetColor;
                        target.style.color = 'hsl(var(--color-widget-bg))';
                        setHoveredAsset(asset);
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget;
                        if (!isActive) {
                          target.style.backgroundColor = `${assetColor}14`;
                          target.style.color = assetColor;
                        }
                        
                        hoverTimeoutRef.current = setTimeout(() => {
                          setHoveredAsset(null);
                        }, 150);
                      }}
                      onMouseDown={(e) => {
                        if (e.detail > 1) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {assetConfig.name}
                    </button>
                  );
                })}
                {truncatedAssets.length > 0 && (
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="font-jakarta font-bold text-sm rounded-md px-2 h-5 transition-all duration-150 flex items-center gap-1 bg-muted hover:bg-muted/80"
                        onMouseEnter={() => {
                          if (popoverTimeoutRef.current) {
                            clearTimeout(popoverTimeoutRef.current);
                            popoverTimeoutRef.current = null;
                          }
                          setIsPopoverOpen(true);
                        }}
                        onMouseLeave={() => {
                          popoverTimeoutRef.current = setTimeout(() => {
                            setIsPopoverOpen(false);
                          }, 150);
                        }}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                        {enabledTruncatedAssets.size > 0 && (
                          <div className="flex -space-x-0.5">
                            {Array.from(enabledTruncatedAssets).map((asset, index) => {
                              const assetConfig = ASSETS[asset as AssetTicker];
                              const assetColor = resolvedTheme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light;
                              return (
                                <div
                                  key={asset}
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: assetColor }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-auto p-2"
                      sideOffset={4}
                      align="start"
                      onMouseEnter={() => {
                        if (popoverTimeoutRef.current) {
                          clearTimeout(popoverTimeoutRef.current);
                          popoverTimeoutRef.current = null;
                        }
                      }}
                      onMouseLeave={() => {
                        popoverTimeoutRef.current = setTimeout(() => {
                          setIsPopoverOpen(false);
                        }, 150);
                      }}
                    >
                      <div className="flex flex-col gap-1">
                        {truncatedAssets.map((asset: AssetTicker) => {
                          const assetConfig = ASSETS[asset];
                          const assetColor = resolvedTheme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light;
                          const isEnabled = enabledTruncatedAssets.has(asset);
                          const isActive = hoverValues?.activeLine === asset;
                          return (
                            <button
                              key={asset}
                              type="button"
                              className="font-jakarta font-bold text-sm rounded-md px-1 transition-all duration-150 flex items-center gap-1"
                              style={{ 
                                color: isActive ? 'hsl(var(--color-widget-bg))' : assetColor,
                                backgroundColor: isActive ? assetColor : `${assetColor}14`,
                                cursor: 'pointer',
                                WebkitTouchCallout: 'none',
                                WebkitUserSelect: 'text',
                                userSelect: 'text',
                                opacity: isEnabled ? 1 : 0.5
                              }}
                              onClick={() => toggleTruncatedAsset(asset)}
                              onMouseEnter={(e) => {
                                if (hoverTimeoutRef.current) {
                                  clearTimeout(hoverTimeoutRef.current);
                                  hoverTimeoutRef.current = null;
                                }
                                const target = e.currentTarget;
                                target.style.backgroundColor = assetColor;
                                target.style.color = 'hsl(var(--color-widget-bg))';
                                setHoveredAsset(asset);
                              }}
                              onMouseLeave={(e) => {
                                const target = e.currentTarget;
                                if (!isActive) {
                                  target.style.backgroundColor = `${assetColor}14`;
                                  target.style.color = assetColor;
                                }
                                
                                hoverTimeoutRef.current = setTimeout(() => {
                                  setHoveredAsset(null);
                                }, 150);
                              }}
                            >
                              {assetConfig.name}
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            ) : (
              <div className="flex items-center">
                <div className="font-jakarta font-bold text-sm rounded-md px-1">Portfolio</div>
              </div>
            )}
          </CardTitle>
          <div className="flex items-center justify-between w-full gap-2 min-h-[2rem]">
            <div className="flex items-baseline gap-2">
              <div className="font-semibold text-2xl leading-none">
                €{(propViewMode === 'split' && hoverValues?.activeLine ? 
                  hoverValues.values[hoverValues.activeLine] :
                  hoverValues?.values.total ?? totalValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="flex-none h-5">
                {((propViewMode === 'cumulative' && !hoverValues) || (propViewMode === 'split' && hoverValues?.activeLine) || (propViewMode === 'cumulative' && hoverValues)) ? (
                  <Badge variant="outline" className={cn(
                    "flex items-center h-5 translate-y-[-2px]",
                    (() => {
                      if (propViewMode === 'split' && hoverValues?.activeLine) {
                        const currentValue = hoverValues.values[hoverValues.activeLine] as number;
                        const previousIndex = hoverValues.index - 1;
                        const previousValue = previousIndex >= 0 ? 
                          (balanceData[previousIndex]?.[hoverValues.activeLine] as number || 0) : 0;
                        const change = ((currentValue - previousValue) / (previousValue || 1)) * 100;
                        return change > 0 ? 
                          "bg-price-up/10 text-price-up hover:bg-price-up/20" : 
                          change < 0 ?
                          "bg-price-down/10 text-price-down hover:bg-price-down/20" :
                          "bg-muted/10 text-muted-foreground hover:bg-muted/20";
                      } else if (propViewMode === 'cumulative' && hoverValues) {
                        const currentValue = hoverValues.values.total as number;
                        const previousIndex = hoverValues.index - 1;
                        const previousValue = previousIndex >= 0 ? 
                          cumulativeData[previousIndex]?.total || 0 : 0;
                        const change = ((currentValue - previousValue) / (previousValue || 1)) * 100;
                        return change > 0 ? 
                          "bg-price-up/10 text-price-up hover:bg-price-up/20" : 
                          change < 0 ?
                          "bg-price-down/10 text-price-down hover:bg-price-down/20" :
                          "bg-muted/10 text-muted-foreground hover:bg-muted/20";
                      } else {
                        const change = totalChange;
                        return change > 0 ? 
                          "bg-price-up/10 text-price-up hover:bg-price-up/20" : 
                          change < 0 ?
                          "bg-price-down/10 text-price-down hover:bg-price-down/20" :
                          "bg-muted/10 text-muted-foreground hover:bg-muted/20";
                      }
                    })()
                  )}>
                    {(() => {
                      if (propViewMode === 'split' && hoverValues?.activeLine) {
                        const currentValue = hoverValues.values[hoverValues.activeLine] as number;
                        const previousIndex = hoverValues.index - 1;
                        const previousValue = previousIndex >= 0 ? 
                          (balanceData[previousIndex]?.[hoverValues.activeLine] as number || 0) : 0;
                        const change = ((currentValue - previousValue) / (previousValue || 1)) * 100;
                        return `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;
                      } else if (propViewMode === 'cumulative' && hoverValues) {
                        const currentValue = hoverValues.values.total as number;
                        const previousIndex = hoverValues.index - 1;
                        const previousValue = previousIndex >= 0 ? 
                          cumulativeData[previousIndex]?.total || 0 : 0;
                        const change = ((currentValue - previousValue) / (previousValue || 1)) * 100;
                        return `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;
                      } else {
                        return `${totalChange > 0 ? "+" : ""}${totalChange.toFixed(1)}%`;
                      }
                    })()}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="invisible flex items-center h-5 translate-y-[-2px] bg-muted/10 text-muted-foreground">
                    +0.00%
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center rounded-md bg-muted p-0.5 text-muted-foreground">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center rounded-sm px-2.5 py-0.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  propViewMode === 'split' 
                    ? "bg-background text-foreground shadow-sm" 
                    : "hover:text-foreground hover:bg-background/50"
                )}
                onClick={() => onViewModeChange?.('split')}
              >
                Split
              </button>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center rounded-sm px-2.5 py-0.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  propViewMode === 'cumulative' 
                    ? "bg-background text-foreground shadow-sm" 
                    : "hover:text-foreground hover:bg-background/50"
                )}
                onClick={() => onViewModeChange?.('cumulative')}
              >
                Combined
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ChartContainer
          ref={chartContainerRef}
          config={propViewMode === 'split' ? chartConfig : { total: { label: 'Portfolio Total', color: 'hsl(var(--foreground))' } }}
          className="h-full w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[hsl(var(--color-widget-hover))] [&_.recharts-rectangle.recharts-tooltip-cursor]:opacity-25 [&_.recharts-rectangle.recharts-tooltip-inner-cursor]:fill-white/20"
        >
          <LineChart
            accessibilityLayer
            data={propViewMode === 'split' ? balanceData : cumulativeData}
            margin={{ left: -12, right: 12, top: 12 }}
            onMouseMove={(e) => {
              if (e?.activePayload?.[0] && e.activeTooltipIndex !== undefined) {
                const values = Object.fromEntries(
                  e.activePayload.map(entry => [entry.dataKey, entry.value])
                );

                setHoverValues({ 
                  index: e.activeTooltipIndex, 
                  values,
                  activeLine: hoverValues?.activeLine || e.activePayload[0].dataKey
                });
              }
            }}
            onMouseLeave={() => {
              setHoverValues(null);
            }}
          >
            <defs>
              <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="hsl(var(--color-border-muted))" strokeWidth="0.5" />
              </pattern>
            </defs>
            <CartesianGrid
              horizontal={false}
              vertical={false}
              strokeDasharray="2 2"
              stroke="hsl(var(--color-border-muted))"
              opacity={0.5}
            />
            {yearTransitions.map(({ index, year }) => (
              <ReferenceLine
                key={`year-${index}`}
                x={index}
                stroke="hsl(var(--color-border-muted))"
                strokeDasharray="2 2"
                opacity={0.5}
                ifOverflow="hidden"
                position="middle"
                label={{
                  value: year,
                  position: 'top',
                  fill: 'hsl(var(--color-border-muted))',
                  fontSize: 10,
                  opacity: 0.5,
                  dy: -8
                }}
              />
            ))}
            {propViewMode === 'split' ? 
              assets.map(asset => {
                const isHidden = hiddenAssets.has(asset);
                const isTruncated = truncatedAssets.includes(asset);
                const isEnabled = !isTruncated || enabledTruncatedAssets.has(asset);
                const assetColor = resolvedTheme === 'dark' ? ASSETS[asset].theme.dark : ASSETS[asset].theme.light;
                return (
                  <React.Fragment key={asset}>
                    {isEnabled && !isHidden && (
                      <>
                        <ReferenceLine
                          key={`value-${asset}`}
                          stroke={assetColor}
                          strokeDasharray="2 2"
                          opacity={hoverValues?.values[asset] ? 0.25 : 0}
                          ifOverflow="hidden"
                          position="middle"
                          segment={[
                            { x: 0, y: hoverValues?.values[asset] || 0 },
                            { x: hoverValues?.index || 0, y: hoverValues?.values[asset] || 0 }
                          ]}
                        />
                        {/* Invisible wider line for hover detection */}
                        <Line
                          key={`hover-${asset}`}
                          type="linear"
                          dataKey={asset}
                          stroke="rgba(0,0,0,0)"
                          strokeWidth={40}
                          dot={false}
                          isAnimationActive={false}
                          style={{ 
                            cursor: 'pointer', 
                            pointerEvents: 'all',
                            zIndex: hoveredAsset === asset ? 2 : 
                                   hoverValues?.activeLine === asset ? 2 : 1
                          }}
                          connectNulls={true}
                          onMouseMove={() => {
                            if (hoverValues) {
                              setHoverValues({
                                ...hoverValues,
                                activeLine: asset
                              });
                            }
                          }}
                          className="[&_path]:!pointer-events-auto"
                        />
                        <Line
                          key={`line-${asset}`}
                          type="linear"
                          dataKey={asset}
                          stroke={assetColor}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={true}
                          animationDuration={1000}
                          animationBegin={0}
                          strokeOpacity={hoverValues ? 
                            (hoverValues.activeLine === asset ? 1 : 0.3) : 
                            hoveredAsset ? 
                              (hoveredAsset === asset ? 1 : 0.3) : 
                              1}
                          className="transition-[stroke-opacity] duration-150 ease-out"
                          connectNulls={true}
                          style={{
                            zIndex: hoveredAsset === asset ? 2 : 
                                   hoverValues?.activeLine === asset ? 2 : 1
                          }}
                        />
                      </>
                    )}
                  </React.Fragment>
                );
              }) : (
                <React.Fragment>
                  <ReferenceLine
                    key="value-total"
                    stroke="hsl(var(--foreground))"
                    strokeDasharray="2 2"
                    opacity={hoverValues?.values.total ? 0.25 : 0}
                    ifOverflow="hidden"
                    position="middle"
                    segment={[
                      { x: 0, y: hoverValues?.values.total || 0 },
                      { x: hoverValues?.index || 0, y: hoverValues?.values.total || 0 }
                    ]}
                  />
                  {/* Invisible wider line for hover detection */}
                  <Line
                    key="hover-total"
                    type="linear"
                    dataKey="total"
                    stroke="rgba(0,0,0,0)"
                    strokeWidth={40}
                    dot={false}
                    isAnimationActive={false}
                    style={{ 
                      cursor: 'pointer', 
                      pointerEvents: 'all',
                      zIndex: hoveredAsset === 'total' ? 2 : 
                             hoverValues?.activeLine === 'total' ? 2 : 1
                    }}
                    connectNulls={true}
                    onMouseMove={() => {
                      if (hoverValues) {
                        setHoverValues({
                          ...hoverValues,
                          activeLine: 'total'
                        });
                      }
                    }}
                    className="[&_path]:!pointer-events-auto"
                  />
                  <Line
                    key="line-total"
                    type="linear"
                    dataKey="total"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationBegin={0}
                    connectNulls={true}
                  />
                </React.Fragment>
              )
            }
            <XAxis
              dataKey="timestamp"
              type="category"
              tickLine={false}
              tickMargin={12}
              tickFormatter={(value) => {
                const [month, year] = value.split(' ');
                
                if (month !== lastShownDate.current.month || year !== lastShownDate.current.year) {
                  // Show year if this is the first month we're seeing in a new year
                  const showYear = year !== lastShownDate.current.year;
                  lastShownDate.current = { month, year };
                  return showYear ? `${month}'${year.slice(-2)}` : month;
                }
                return '';
              }}
              stroke="hsl(var(--color-border-muted))"
              interval={chartParams.interval}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (value === 0) return "0";
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                }
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(1)}K`;
                }
                return value.toFixed(0);
              }}
              interval="preserveStartEnd"
            />
            <ChartTooltip
              content={
                propViewMode === 'split' ? (
                  <CustomTooltipContent
                    colorMap={Object.fromEntries(
                      sortedAssets.map(asset => [
                        asset,
                        resolvedTheme === 'dark' ? ASSETS[asset].theme.dark : ASSETS[asset].theme.light
                      ])
                    )}
                    labelMap={Object.fromEntries(
                      sortedAssets.map(asset => [asset, ASSETS[asset].name])
                    )}
                    dataKeys={sortedAssets}
                    valueFormatter={(value) => `€${value.toLocaleString()}`}
                  />
                ) : (
                  <CustomTooltipContent
                    colorMap={{ total: 'hsl(var(--foreground))' }}
                    labelMap={{ total: 'Portfolio Total' }}
                    dataKeys={['total']}
                    valueFormatter={(value) => `€${value.toLocaleString()}`}
                  />
                )
              }
              cursor={<CustomCursor fill="currentColor" />}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 