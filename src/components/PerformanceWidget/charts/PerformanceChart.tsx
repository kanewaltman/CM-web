import { useId, useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { AssetPriceTooltip } from "@/components/AssetPriceTooltip";

// Debug logging utility - only logs in development and when enabled
const DEBUG_ENABLED = false; // Set to true to enable detailed debug logs
function debugLog(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development' && DEBUG_ENABLED) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
}

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
  dayIndex: number;
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
function generateSampleData(currentBalances: Record<string, number>, dateRange?: { from: Date; to: Date }, containerWidth: number = 0) {
  // Create a default date range of the last 156 weeks if none provided
  if (!dateRange) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (156 * 7)); // 156 weeks
    dateRange = { from: startDate, to: endDate };
    debugLog('generateSampleData: Using default date range (last 156 weeks)');
  }
  
  // Calculate number of days in range
  let days = Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (24 * 60 * 60 * 1000)));
  
  // Respect the exact date range provided, even for single-day views
  // No longer expanding 0-1 day ranges to 7 days
  
  debugLog('generateSampleData: Using provided date range:', {
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString(),
    days
  });
  
  // Ensure the start date is before the end date
  const startDate = new Date(dateRange.from);
  const endDate = new Date(dateRange.to);
  
  if (startDate > endDate) {
    console.warn('generateSampleData: Start date is after end date, swapping dates');
    const temp = startDate;
    startDate.setTime(endDate.getTime());
    endDate.setTime(temp.getTime());
  }
  
  // Calculate number of days between dates
  const daysInRange = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
  debugLog(`generateSampleData: Generating data for ${daysInRange} days`);
  
  // Calculate the number of data points based on the date range and container width
  // For short date ranges (less than 60 days), ensure we have at least 60 data points
  // to maintain visual consistency and ensure hover reference lines display properly
  let numDataPoints = Math.max(days, 60);
  
  // For very short ranges (0-2 days), increase data point density for smooth time display
  if (daysInRange <= 2) {
    // For 0-1 day range, generate a point roughly every 15-30 minutes (48-96 points per day)
    // For 2 day range, generate a point roughly every 30-60 minutes (24-48 points per day)
    const pointsPerDay = daysInRange <= 1 ? 96 : 48;
    numDataPoints = Math.max(numDataPoints, daysInRange * pointsPerDay);
  }
  
  // Adjust data points based on container width for larger screens
  if (containerWidth > 0) {
    // Allocate roughly 1 data point per 8-12px of width for smoother visuals
    const basePoints = Math.ceil(containerWidth / 10);
    numDataPoints = Math.max(numDataPoints, basePoints);
  }
  
  // Ensure we have a reasonable minimum number of points even for very short ranges
  numDataPoints = Math.max(numDataPoints, 60);
  
  debugLog('generateSampleData: Will generate data with points:', numDataPoints);
  
  // Use consistent seed for random number generation
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  // Determine the appropriate date format based on the date range
  let dateFormat: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
  
  // For very short ranges (≤ 2 days), include hours and minutes
  if (daysInRange <= 2) {
    dateFormat = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  }
  // For shorter date ranges (≤ 60 days), include the day in the format
  else if (daysInRange <= 60) {
    dateFormat = { month: 'short', day: 'numeric', year: 'numeric' };
  }
  // For short ranges (≤ 7 days), show more detailed info with hours
  else if (daysInRange <= 7) {
    dateFormat = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit' };
  }
  
  // Generate data points
  return Array.from({ length: numDataPoints }).map((_, i) => {
    const date = new Date(startDate);
    const progress = i / (numDataPoints - 1);
    date.setTime(startDate.getTime() + progress * (endDate.getTime() - startDate.getTime()));
    
    const dataPoint: BalanceDataPoint = {
      // Store formatted date string for display
      timestamp: date.toLocaleDateString('en-US', dateFormat),
      // Store actual date for calculations
      date: date.toISOString(),
      // Store the number of days from start for x-axis calculations
      dayIndex: Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    };

    Object.entries(currentBalances).forEach(([asset, currentValue]) => {
      const profile = getAssetProfile(asset as AssetTicker);
      
      if (i === numDataPoints - 1) {
        dataPoint[asset] = currentValue;
      } else {
        // Use a more consistent seeded random for smoother transitions
        // Seed based on asset and relative position in date range for consistency
        const daysSinceEpoch = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
        const seed = daysSinceEpoch * 100 + Object.keys(currentBalances).indexOf(asset);
        
        const baseValue = currentValue * (1 + (seededRandom(seed) * 2 - 1) * profile.variation);
        
        // Make variation more consistent between date range changes
        const variation = () => {
          const relativePosition = progress; // 0 to 1
          const marketInfluence = (
            Math.sin(relativePosition * Math.PI * 2) * profile.trend + 
            Math.sin(relativePosition * Math.PI * 6) * profile.volatility
          ) * profile.marketBeta;
          const noise = (seededRandom(seed + daysSinceEpoch) - 0.5) * profile.noise;
          return 1 + marketInfluence + noise;
        };

        dataPoint[asset] = baseValue * variation();
      }
    });

    return dataPoint;
  });
}

export interface PerformanceChartProps {
  viewMode?: 'split' | 'cumulative' | 'combined';
  onViewModeChange?: (mode: 'split' | 'cumulative' | 'combined') => void;
  dateRange?: { from: Date; to: Date };
}

export function PerformanceChart({ viewMode: propViewMode = 'split', onViewModeChange, dateRange }: PerformanceChartProps) {
  // Create component ID for debugging and instance tracking
  const componentId = useId();
  const instanceRef = useRef(Date.now());
  
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
  
  // Store the current date range for comparison
  const prevDateRangeRef = useRef<{ from?: Date; to?: Date; instanceId?: number; dateRangeStr?: string }>({});

  // Track the last shown date for year/month labels
  const lastShownDate = useRef<{ month: string; year: string }>({ month: '', year: '' });

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

  // Fetch balance data - defined as a memoized callback to avoid recreation on each render
  const fetchBalanceData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) {
      debugLog(`PerformanceChart [${componentId}:${instanceRef.current}] cannot fetch data without dateRange`);
      return;
    }
    
    // Always respect the original date range, even for single-day or same-day selections
    const effectiveDateRange = dateRange;
    
    debugLog(`PerformanceChart [${componentId}:${instanceRef.current}] fetchBalanceData called with dateRange:`, {
      from: effectiveDateRange.from.toISOString(),
      to: effectiveDateRange.to.toISOString(),
      dayDiff: Math.ceil((effectiveDateRange.to.getTime() - effectiveDateRange.from.getTime()) / (24 * 60 * 60 * 1000))
    });
    
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
        
        // Generate data for the exact date range with container width
        const newData = generateSampleData(sampleBalances, effectiveDateRange, containerWidth);
        debugLog(`PerformanceChart [${componentId}:${instanceRef.current}] generated sample data:`, {
          dataPoints: newData.length,
          dateRange: {
            from: effectiveDateRange.from.toISOString(),
            to: effectiveDateRange.to.toISOString()
          }
        });
        
        // Using a smoother state update that allows for animation
        setFullBalanceData(prevData => {
          // If there's no previous data, just return the new data
          if (prevData.length === 0) return newData;
          
          // If there is previous data, check if the new data has the same length
          // Having the same length helps with smoother transitions
          if (prevData.length === newData.length) {
            debugLog('Same number of data points, animation should be smooth');
          } else {
            debugLog('Different number of data points, may affect animation');
          }
          
          return newData;
        });
        
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

          // Generate data points based on date range with container width
          const newData = generateSampleData(currentBalances, effectiveDateRange, containerWidth);
          debugLog(`PerformanceChart [${componentId}:${instanceRef.current}] generated data for date range:`, {
            dataPoints: newData.length,
            dateRange: {
              from: effectiveDateRange.from.toISOString(),
              to: effectiveDateRange.to.toISOString()
            }
          });
          
          // Similar smooth state update for API data
          setFullBalanceData(prevData => {
            if (prevData.length === 0) return newData;
            if (prevData.length === newData.length) {
              debugLog('Same number of data points, animation should be smooth');
            } else {
              debugLog('Different number of data points, may affect animation');
            }
            return newData;
          });
        }

        setError(null);
      }
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, [dataSource, containerWidth, componentId]);

  // Update the effect to handle date range changes
  useEffect(() => {
    // Always log whenever this effect is triggered, regardless of values
    debugLog(`PerformanceChart [${componentId}] date range effect TRIGGERED`, { 
      hasDateRange: !!dateRange,
      instanceId: instanceRef.current 
    });
    
    if (!dateRange?.from || !dateRange?.to) {
      debugLog(`PerformanceChart [${componentId}] missing dateRange, skipping update`);
      return;
    }
    
    // Always log date range received for debugging
    debugLog(`PerformanceChart [${componentId}] received dateRange:`, {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
      timestamp: Date.now() // For tracking sequence
    });
    
    // Create string representation of current date range for reliable comparison
    const currentDateRangeStr = JSON.stringify({
      from: dateRange.from.getTime(),
      to: dateRange.to.getTime()
    });
    
    // Check if this is the first render or if the date range has changed
    const isNewInstance = !prevDateRangeRef.current.instanceId || 
                          prevDateRangeRef.current.instanceId !== instanceRef.current;
    
    const dateRangeChanged = isNewInstance || 
                           !prevDateRangeRef.current.from || 
                           !prevDateRangeRef.current.to ||
                           currentDateRangeStr !== prevDateRangeRef.current.dateRangeStr;
    
    debugLog(`PerformanceChart [${componentId}:${instanceRef.current}] date range effect triggered:`, {
      isNewInstance,
      dateRangeChanged,
      previousRange: prevDateRangeRef.current.from ? {
        from: prevDateRangeRef.current.from.toISOString(),
        to: prevDateRangeRef.current.to?.toISOString()
      } : null,
      currentRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      }
    });
    
    // Only regenerate data if this is a new instance or if the date range has changed
    if (dateRangeChanged) {
      // Store current date range for future reference
      prevDateRangeRef.current = { 
        from: new Date(dateRange.from), 
        to: new Date(dateRange.to),
        instanceId: instanceRef.current,
        dateRangeStr: currentDateRangeStr
      };
      
      debugLog(`PerformanceChart [${componentId}:${instanceRef.current}] date range CHANGED, fetching new data for:`, {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });
      
      // Eliminate timeout to ensure immediate data fetching
      fetchBalanceData();
    }
  }, [dateRange, fetchBalanceData, componentId]);

  // Add a specific initialization effect
  useEffect(() => {
    debugLog(`PerformanceChart [${componentId}] INITIALIZATION with dateRange:`, 
      dateRange ? {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        daySpan: dateRange.from && dateRange.to ? 
          Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (24 * 60 * 60 * 1000)) : 
          'unknown'
      } : 'undefined'
    );

    // Check if we have a valid date range
    if (dateRange?.from && dateRange?.to) {
      // Set initial reference point with exactly the provided date range
      prevDateRangeRef.current = { 
        from: new Date(dateRange.from), 
        to: new Date(dateRange.to),
        instanceId: instanceRef.current,
        dateRangeStr: JSON.stringify({
          from: dateRange.from.getTime(),
          to: dateRange.to.getTime()
        })
      };
      
      // Trigger immediate initial fetch
      debugLog(`PerformanceChart [${componentId}] Triggering INITIAL data fetch`);
      fetchBalanceData();
    } else {
      debugLog(`PerformanceChart [${componentId}] INITIALIZATION has no dateRange, waiting for prop update`);
    }
  }, []); // Empty dependency array ensures this runs once on component mount

  // Get visible data based on screen width and date range
  const balanceData = useMemo(() => {
    if (fullBalanceData.length === 0) {
      return [];
    }
    
    let filteredData = [...fullBalanceData];
    
    if (dateRange?.from && dateRange?.to) {
      // Always respect the original date range, even for single-day views
      const effectiveFromDate = dateRange.from;
      const effectiveToDate = dateRange.to;
      
      const fromTimeMs = effectiveFromDate.getTime();
      const toTimeMs = effectiveToDate.getTime();
      
      filteredData = filteredData.filter(point => {
        const pointDate = new Date(point.date);
        const pointTimeMs = pointDate.getTime();
        return pointTimeMs >= fromTimeMs && pointTimeMs <= toTimeMs;
      });
    }
    
    if (filteredData.length === 0) {
      return [];
    }
    
    filteredData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return filteredData;
  }, [fullBalanceData, dateRange]);

  // Reset lastShownDate when date range changes
  useEffect(() => {
    lastShownDate.current = { month: '', year: '' };
  }, [dateRange]);

  // Calculate responsive chart parameters
  const chartParams = useMemo(() => {
    // Calculate date range in days
    let daysInRange = 0;
    
    // First try to get days from balance data
    if (balanceData.length > 0 && 'dayIndex' in balanceData[balanceData.length - 1]) {
      const lastItem = balanceData[balanceData.length - 1];
      daysInRange = (lastItem.dayIndex as number) || 0;
    } 
    // Otherwise calculate from dateRange prop
    else if (dateRange?.from && dateRange?.to) {
      daysInRange = Math.ceil(
        (dateRange.to.getTime() - dateRange.from.getTime()) / 
        (24 * 60 * 60 * 1000)
      );
    }
    
    // Base number of labels on container width
    let targetLabels = 6; // Default for small screens
    
    if (containerWidth >= 480) targetLabels = 7;
    if (containerWidth >= 768) targetLabels = 8;
    if (containerWidth >= 1024) targetLabels = 10;
    if (containerWidth >= 1280) targetLabels = 12;
    if (containerWidth >= 1536) targetLabels = 13;
    
    // Adjust based on date range
    if (daysInRange <= 7) {
      // For very short ranges (week or less), show more labels
      targetLabels = Math.min(daysInRange + 1, targetLabels + 2);
    } else if (daysInRange <= 30) {
      // For month range, keep standard labels
      // no adjustment needed
    } else if (daysInRange > 90) {
      // For longer ranges, reduce label density
      targetLabels = Math.max(6, targetLabels - 2);
    }
    
    // Calculate interval based on data points and target labels
    const interval = Math.max(1, Math.floor(balanceData.length / targetLabels));
    
    debugLog(`Chart params: ${balanceData.length} points, ${daysInRange} days, ${targetLabels} labels, interval ${interval}`);
    
    return { interval };
  }, [containerWidth, balanceData.length, dateRange]);

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

  // Update the yearTransitions calculation to respect the original date range
  const yearTransitions = useMemo(() => {
    if (balanceData.length === 0) return [];
    
    const transitions: { index: number; year: string }[] = [];
    let lastYear: string | null = null;
    
    // Get the visible data range
    const visibleData = propViewMode === 'split' ? balanceData : cumulativeData;
    
    visibleData.forEach((point, index) => {
      const date = new Date(point.date);
      const year = date.getFullYear().toString();
      
      // Check if this is a new year or the first data point
      if ((lastYear !== null && year !== lastYear) || (index === 0 && dateRange?.from)) {
        transitions.push({ index, year });
      }
      lastYear = year;
    });
    
    // Make sure we have year markers at reasonable intervals
    // If we have multiple years but no transitions detected
    if (transitions.length === 0 && dateRange?.from && dateRange?.to) {
      const startYear = dateRange.from.getFullYear();
      const endYear = dateRange.to.getFullYear();
      
      if (endYear > startYear) {
        // Add year transitions at estimated positions
        for (let year = startYear + 1; year <= endYear; year++) {
          // Try to find the closest point to January 1st of this year
          const jan1 = new Date(year, 0, 1);
          const jan1Time = jan1.getTime();
          
          // Find the closest index in the data
          const totalDuration = dateRange.to.getTime() - dateRange.from.getTime();
          const yearProgress = (jan1Time - dateRange.from.getTime()) / totalDuration;
          const estimatedIndex = Math.floor(yearProgress * visibleData.length);
          
          // Ensure the index is valid
          const safeIndex = Math.max(0, Math.min(estimatedIndex, visibleData.length - 1));
          transitions.push({ index: safeIndex, year: year.toString() });
        }
      }
    }
    
    return transitions;
  }, [balanceData, cumulativeData, propViewMode, dateRange]);

  // Get visible and hidden assets
  const visibleAssets = useMemo(() => sortedAssets.slice(0, 5), [sortedAssets]);
  const truncatedAssets = useMemo(() => sortedAssets.slice(5), [sortedAssets]);

  // Optimize chart hover handling
  const handleChartMouseMove = useCallback((e: any) => {
    if (e?.activePayload?.[0] && e.activeTooltipIndex !== undefined) {
      const values = Object.fromEntries(
        e.activePayload.map((entry: {dataKey: string, value: number}) => [entry.dataKey, entry.value])
      );

      setHoverValues({
        index: e.activeTooltipIndex,
        values,
        activeLine: hoverValues?.activeLine || e.activePayload[0].dataKey
      });
    }
  }, [hoverValues?.activeLine]);

  const handleChartMouseLeave = useCallback(() => {
    setHoverValues(null);
  }, []);

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
                    <AssetPriceTooltip key={asset} asset={asset}>
                      <button 
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
                    </AssetPriceTooltip>
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
                            <AssetPriceTooltip key={asset} asset={asset} delayDuration={300}>
                              <button
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
                            </AssetPriceTooltip>
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
                          opacity={hoverValues?.values[asset] ? 0.4 : 0}
                          ifOverflow="extendDomain"
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
                          isAnimationActive={true}
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
                          animationEasing="ease-out"
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
                    opacity={hoverValues?.values.total ? 0.4 : 0}
                    ifOverflow="extendDomain"
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
                    isAnimationActive={true}
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
                    animationEasing="ease-out"
                    animationBegin={0}
                    strokeOpacity={1}
                    className="transition-[stroke-opacity] duration-150 ease-out"
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
                // Get the current date range span in days
                const daySpan = dateRange ? 
                  Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (24 * 60 * 60 * 1000)) : 
                  999;
                
                // For very short ranges (0-2 days), show detailed time
                if (daySpan <= 2) {
                  // Format like "10:30 AM" or "3:45 PM" for very short ranges
                  if (value.includes(':')) {
                    // Already has time component
                    const [datePart, timePart] = value.split(', ');
                    // Extract hour and minute from time part
                    const timeComponents = timePart.split(':');
                    const hour = parseInt(timeComponents[0]);
                    const hour12 = hour % 12 || 12; // Convert to 12-hour format
                    
                    // Get full minutes (not truncated)
                    let minutes = '00';
                    if (timeComponents.length > 1) {
                      // Extract just the minutes, handle cases where it might include seconds
                      const minutePart = timeComponents[1].split(' ')[0].split(':')[0];
                      minutes = minutePart.padStart(2, '0');
                    }
                    
                    const meridiem = hour >= 12 ? 'PM' : 'AM';
                    
                    // For single day view show just time, for 2-day view include day
                    if (daySpan <= 1) {
                      return `${hour12}:${minutes} ${meridiem}`;
                    } else {
                      // For 2-day view, also include AM/PM indicator
                      return `${datePart.split(' ')[1]}/${hour12}:${minutes} ${meridiem}`;
                    }
                  } else {
                    // Try to parse the date to extract time
                    try {
                      const date = new Date(value);
                      const hour = date.getHours();
                      const minute = date.getMinutes();
                      const hour12 = hour % 12 || 12; // Convert to 12-hour format
                      const meridiem = hour >= 12 ? 'PM' : 'AM';
                      const minuteStr = minute.toString().padStart(2, '0'); // Ensure 2 digits
                      
                      if (daySpan <= 1) {
                        return `${hour12}:${minuteStr} ${meridiem}`;
                      } else {
                        // For 2-day view, also include AM/PM indicator
                        return `${date.getDate()}/${hour12}:${minuteStr} ${meridiem}`;
                      }
                    } catch (e) {
                      // Fallback if parsing fails
                      return value;
                    }
                  }
                }
                
                // Parse the timestamp based on its format
                if (value.includes(':')) {
                  // Format for very short date ranges (≤ 7 days) with hours
                  const [datePart, timePart] = value.split(', ');
                  return `${datePart.split(' ')[1]} ${timePart.split(':')[0]}h`;
                } else if (value.match(/\d{1,2},/)) {
                  // Format for medium date ranges (≤ 60 days) with day numbers
                  const parts = value.split(' ');
                  
                  // For multi-year data, include the year if different from last shown
                  if (parts.length >= 3 && yearTransitions.length > 1) {
                    const date = new Date(value);
                    const year = date.getFullYear().toString();
                    
                    // Check if this year is different from the last shown
                    if (lastShownDate.current.year !== year) {
                      lastShownDate.current.year = year;
                      lastShownDate.current.month = parts[0];
                      // Return month and year
                      return `${parts[0]}'${year.slice(-2)}`;
                    }
                  }
                  
                  // Return format like "Jan 15"
                  return `${parts[0]} ${parts[1].replace(',', '')}`;
                } else {
                  // Format for longer date ranges - month and year
                  const [month, year] = value.split(' ');
                  
                  // Always include year for multi-year data
                  if (yearTransitions.length > 1 || (dateRange?.from && dateRange?.to && 
                      dateRange.from.getFullYear() !== dateRange.to.getFullYear())) {
                    return `${month}'${year.slice(-2)}`;
                  }
                  
                  return month;
                }
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