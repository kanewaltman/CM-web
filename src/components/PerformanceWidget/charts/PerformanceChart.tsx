import { useId, useState, useEffect, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Rectangle,
  XAxis,
  YAxis,
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

// Add sample data
const SAMPLE_PERFORMANCE_DATA = Array.from({ length: 12 }).map((_, i) => {
  const date = new Date();
  date.setMonth(date.getMonth() - (11 - i));
  return {
    timestamp: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    BTC: 35000 + Math.random() * 10000,
    ETH: 1800 + Math.random() * 400,
    DOT: 9 + Math.random() * 3,
    USDT: 0.92 + Math.random() * 0.02
  };
});

export function PerformanceChart() {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const { dataSource } = useDataSource();
  const [balanceData, setBalanceData] = useState<BalanceDataPoint[]>([]);
  const [assets, setAssets] = useState<AssetTicker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch balance data
  useEffect(() => {
    const fetchBalanceData = async () => {
      try {
        setIsLoading(true);

        if (dataSource === 'sample') {
          // Use sample data
          const validAssets = Object.keys(SAMPLE_PERFORMANCE_DATA[0])
            .filter(key => key !== 'timestamp' && key in ASSETS) as AssetTicker[];
          
          setAssets(validAssets);
          setBalanceData(SAMPLE_PERFORMANCE_DATA);
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

            // Create mock historical data for the last 12 months
            const historicalData: BalanceDataPoint[] = Array.from({ length: 12 }).map((_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - (11 - i));
              const dataPoint: BalanceDataPoint = {
                timestamp: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              };

              validAssets.forEach(asset => {
                const currentValue = parseFloat(data[asset].EUR || '0');
                // Create some variation in historical data
                const variation = 1 + (Math.random() * 0.4 - 0.2); // ±20% variation
                dataPoint[asset] = currentValue * variation;
              });

              return dataPoint;
            });

            setBalanceData(historicalData);
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
  }, [dataSource]);

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
            <CardTitle>Performance</CardTitle>
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
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ChartContainer
          config={chartConfig}
          className="h-full w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[hsl(var(--color-widget-hover))] [&_.recharts-rectangle.recharts-tooltip-cursor]:opacity-25 [&_.recharts-rectangle.recharts-tooltip-inner-cursor]:fill-white/20"
        >
          <LineChart
            accessibilityLayer
            data={balanceData}
            margin={{ left: -12, right: 12, top: 12 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="2 2"
              stroke="hsl(var(--color-border-muted))"
              opacity={0.5}
            />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              tickMargin={12}
              tickFormatter={(value) => value.slice(0, 3)}
              stroke="hsl(var(--color-border-muted))"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (value === 0) return "€0";
                return `€${(value / 1000000).toFixed(1)}M`;
              }}
              interval="preserveStartEnd"
            />
            {assets.map(asset => (
              <Line
                key={asset}
                type="monotone"
                dataKey={asset}
                stroke={resolvedTheme === 'dark' ? ASSETS[asset].theme.dark : ASSETS[asset].theme.light}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: resolvedTheme === 'dark' ? ASSETS[asset].theme.dark : ASSETS[asset].theme.light,
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />
            ))}
            <ChartTooltip
              content={
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
              }
              cursor={<CustomCursor fill="currentColor" />}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 