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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { getApiUrl } from '@/lib/api-config';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useDataSource } from '@/lib/DataSourceContext';
import React from "react";

interface BalanceDataPoint {
  timestamp: string;
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
      timestamp: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
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
  const [viewMode, setViewMode] = useState<'split' | 'cumulative'>(propViewMode);
  const [hoverValues, setHoverValues] = useState<{ index: number; values: { [key: string]: number }; activeLine?: string } | null>(null);
  const [hiddenAssets, setHiddenAssets] = useState<Set<string>>(new Set());
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setViewMode(propViewMode);
  }, [propViewMode]);

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
          // Use hardcoded sample balances that match the demo values
          const sampleBalances = {
            'BTC': 45678.90,
            'ETH': 28901.23,
            'DOT': 12345.67,
            'USDT': 45678.90
          };
          
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
    assets.forEach(asset => {
      const assetConfig = ASSETS[asset];
      config[asset] = {
        label: assetConfig.name,
        color: resolvedTheme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light
      };
    });
    return config;
  }, [assets, resolvedTheme]);

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
    const visibleData = viewMode === 'split' ? balanceData : cumulativeData;
    
    visibleData.forEach((point, index) => {
      const [, year] = point.timestamp.split(' ');
      if (lastYear !== null && year !== lastYear) {
        transitions.push({ index, year });
      }
      lastYear = year;
    });
    
    return transitions;
  }, [balanceData, cumulativeData, viewMode]);

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
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle>
              {viewMode === 'split' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {assets.map(asset => {
                    const assetConfig = ASSETS[asset];
                    const assetColor = resolvedTheme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light;
                    const isHidden = hiddenAssets.has(asset);
                    return (
                      <button 
                        key={asset}
                        type="button"
                        className="font-jakarta font-bold text-sm rounded-md px-1 transition-all duration-150"
                        style={{ 
                          color: assetColor,
                          backgroundColor: `${assetColor}14`,
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
                          target.style.backgroundColor = `${assetColor}14`;
                          target.style.color = assetColor;
                          
                          // Delay clearing the hover state
                          hoverTimeoutRef.current = setTimeout(() => {
                            setHoveredAsset(null);
                          }, 150); // 150ms delay matches the transition duration
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
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="font-jakarta font-bold text-sm rounded-md px-1">Portfolio</div>
                </div>
              )}
            </CardTitle>
            <div className="flex items-start gap-2">
              <div className="font-semibold text-2xl">
                €{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <Badge className={cn(
                "mt-1.5 border-none",
                totalChange > 0 ? "bg-emerald-500/24 text-emerald-500" : "bg-red-500/24 text-red-500"
              )}>
                {totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)}%
              </Badge>
            </div>
          </div>
          <RadioGroup
            defaultValue={viewMode}
            value={viewMode}
            onValueChange={(value) => {
              const newMode = value as 'split' | 'cumulative';
              setViewMode(newMode);
              onViewModeChange?.(newMode);
            }}
            className="flex items-center space-x-2"
          >
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="split" id="split" />
              <label htmlFor="split" className="text-sm">Split</label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="cumulative" id="cumulative" />
              <label htmlFor="cumulative" className="text-sm">Combined</label>
            </div>
          </RadioGroup>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ChartContainer
          ref={chartContainerRef}
          config={viewMode === 'split' ? chartConfig : { total: { label: 'Portfolio Total', color: 'hsl(var(--foreground))' } }}
          className="h-full w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[hsl(var(--color-widget-hover))] [&_.recharts-rectangle.recharts-tooltip-cursor]:opacity-25 [&_.recharts-rectangle.recharts-tooltip-inner-cursor]:fill-white/20"
        >
          <LineChart
            accessibilityLayer
            data={viewMode === 'split' ? balanceData : cumulativeData}
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
            {viewMode === 'split' ? 
              assets.map(asset => {
                const isHidden = hiddenAssets.has(asset);
                const assetColor = resolvedTheme === 'dark' ? ASSETS[asset].theme.dark : ASSETS[asset].theme.light;
                return (
                  <React.Fragment key={asset}>
                    {!isHidden && (
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
                          strokeWidth={20}
                          dot={false}
                          isAnimationActive={false}
                          style={{ cursor: 'pointer', pointerEvents: 'all' }}
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
                    strokeWidth={20}
                    dot={false}
                    isAnimationActive={false}
                    style={{ cursor: 'pointer', pointerEvents: 'all' }}
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
                viewMode === 'split' ? (
                  <CustomTooltipContent
                    colorMap={Object.fromEntries(
                      assets.map(asset => [
                        asset,
                        resolvedTheme === 'dark' ? ASSETS[asset].theme.dark : ASSETS[asset].theme.light
                      ])
                    )}
                    labelMap={Object.fromEntries(
                      assets.map(asset => [asset, ASSETS[asset].name])
                    )}
                    dataKeys={assets}
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