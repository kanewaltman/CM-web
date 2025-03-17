import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PerformanceChart } from './charts/PerformanceChart';
import { SubscribersChart } from './charts/SubscribersChart';
import { MRRGrowthChart } from './charts/MRRGrowthChart';
import { RefundsChart } from './charts/RefundsChart';
import { SubscriptionsChart } from './charts/SubscriptionsChart';
import { UpgradesChart } from './charts/UpgradesChart';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';
import { CalendarIcon } from 'lucide-react';
import { DateRange as DayPickerDateRange } from 'react-day-picker';
import {
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
  format,
  isSameDay,
  isEqual,
} from 'date-fns';
import { Card } from '@/components/ui/card';
import { KeyedPerformanceChart } from './KeyedPerformanceChart';

export type ChartVariant = 'revenue' | 'subscribers' | 'mrr-growth' | 'refunds' | 'subscriptions' | 'upgrades';

// Define a common interface for all chart components
interface BaseChartProps {
  dateRange?: { from: Date; to: Date };
}

// Update the chartComponents type to use React.ComponentType with the BaseChartProps
const chartComponents: Record<ChartVariant, React.ComponentType<BaseChartProps>> = {
  revenue: PerformanceChart,
  subscribers: SubscribersChart,
  'mrr-growth': MRRGrowthChart,
  refunds: RefundsChart,
  subscriptions: SubscriptionsChart,
  upgrades: UpgradesChart,
};

const chartLabels: Record<ChartVariant, string> = {
  revenue: 'Performance',
  subscribers: 'Subscribers',
  'mrr-growth': 'MRR Growth',
  refunds: 'Refunds',
  subscriptions: 'Subscriptions',
  upgrades: 'Upgrades',
};

// Define the view mode types
export type WidgetViewMode = 'split' | 'cumulative';
export type ChartViewMode = 'split' | 'stacked' | 'line' | 'cumulative';

interface PerformanceWidgetProps {
  className?: string;
  defaultVariant?: ChartVariant;
  defaultViewMode?: WidgetViewMode;
  onVariantChange?: (variant: ChartVariant) => void;
  onViewModeChange?: (mode: WidgetViewMode) => void;
  onTitleChange?: (title: string) => void;
  onRemove?: () => void;
  headerControls?: boolean;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  dateRange?: DateRange;
}

type DateRange = {
  from: Date;
  to: Date;
};

export const PerformanceWidget: React.FC<PerformanceWidgetProps> = ({ 
  className,
  defaultVariant = 'revenue',
  defaultViewMode = 'split',
  onVariantChange,
  onViewModeChange,
  onTitleChange,
  onRemove,
  headerControls,
  onDateRangeChange,
  dateRange: propDateRange,
}: PerformanceWidgetProps): React.ReactNode => {
  const [selectedVariant, setSelectedVariant] = useState<ChartVariant>(defaultVariant);
  const [viewMode, setViewMode] = useState<WidgetViewMode>(defaultViewMode);
  const today = new Date();
  
  // Define date range presets
  const yesterday = {
    from: subDays(today, 1),
    to: subDays(today, 1),
  };
  
  const last7Days = {
    from: subDays(today, 6),
    to: today,
  };
  
  const last30Days = {
    from: subDays(today, 29),
    to: today,
  };
  
  const monthToDate = {
    from: startOfMonth(today),
    to: today,
  };
  
  const lastMonth = {
    from: startOfMonth(subMonths(today, 1)),
    to: endOfMonth(subMonths(today, 1)),
  };
  
  const yearToDate = {
    from: startOfYear(today),
    to: today,
  };
  
  const lastYear = {
    from: startOfYear(subYears(today, 1)),
    to: endOfYear(subYears(today, 1)),
  };
  
  // Set initial state to last 7 days or use prop date range if provided
  const [date, setDate] = useState<DateRange | undefined>(propDateRange || last7Days);
  const [month, setMonth] = useState(today);
  const [activePreset, setActivePreset] = useState<string>('Last 7 Days');
  
  // Keep track of render count to debug re-rendering issues
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  // Log when component renders
  console.log(`PerformanceWidget render #${renderCount.current}`, {
    headerControls,
    propDateRange: propDateRange ? {
      from: propDateRange.from.toISOString(),
      to: propDateRange.to.toISOString()
    } : 'undefined',
    currentDate: date ? {
      from: date.from.toISOString(),
      to: date.to.toISOString()
    } : 'undefined'
  });

  // Update date state when the prop changes
  useEffect(() => {
    if (propDateRange?.from && propDateRange?.to) {
      console.log('PerformanceWidget received new dateRange prop:', {
        from: propDateRange.from.toISOString(),
        to: propDateRange.to.toISOString()
      });
      
      // Only update if different
      if (!date || 
          propDateRange.from.getTime() !== date.from.getTime() || 
          propDateRange.to.getTime() !== date.to.getTime()) {
        setDate({
          from: new Date(propDateRange.from),
          to: new Date(propDateRange.to)
        });
      }
    }
  }, [propDateRange]);

  // Update local state when defaultVariant changes
  useEffect(() => {
    if (defaultVariant !== selectedVariant) {
      setSelectedVariant(defaultVariant);
      // Update title when variant changes via prop
      onTitleChange?.(chartLabels[defaultVariant]);
    }
  }, [defaultVariant, onTitleChange, selectedVariant]);

  // Update local state when defaultViewMode changes
  useEffect(() => {
    if (defaultViewMode !== viewMode) {
      setViewMode(defaultViewMode);
    }
  }, [defaultViewMode, viewMode]);

  const handleVariantChange = (value: ChartVariant) => {
    console.log('Changing variant to', value);
    setSelectedVariant(value);
    onVariantChange?.(value);
  };

  const handleViewModeChange = (mode: WidgetViewMode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  // Handler for receiving chart view mode changes and mapping them to widget view modes
  const handleChartViewModeChange = (mode: ChartViewMode) => {
    console.log('PerformanceWidget: Chart view mode changed to:', mode);
    
    // Map chart view modes to widget view modes
    const widgetMode: WidgetViewMode = mode === 'cumulative' || mode === 'split' 
      ? mode 
      : 'split'; // Default to split for other modes (stacked, line)
    
    // Set the local state
    setViewMode(widgetMode);
    
    // Notify parent component
    onViewModeChange?.(widgetMode);
    
    console.log('PerformanceWidget: Updated widget view mode to:', widgetMode);
  };

  const handleDateRangeChange = (newDate: DateRange | undefined) => {
    if (!newDate?.from || !newDate?.to) return;
    
    // Create deep copies of the dates to avoid reference issues
    const newDateCopy = {
      from: new Date(newDate.from),
      to: new Date(newDate.to)
    };
    
    console.log('Date range changed to:', {
      from: newDateCopy.from.toISOString(),
      to: newDateCopy.to.toISOString(),
      timestamp: Date.now() // Add timestamp for tracking
    });
    
    setDate(newDateCopy);
    onDateRangeChange?.(newDateCopy);
  };

  // Date range buttons
  const handleYesterday = () => {
    setActivePreset('Yesterday');
    handleDateRangeChange(yesterday);
  };

  const handleLast7Days = () => {
    setActivePreset('Last 7 Days');
    handleDateRangeChange(last7Days);
  };

  const handleLast30Days = () => {
    setActivePreset('Last 30 Days');
    handleDateRangeChange(last30Days);
  };

  const handleMonthToDate = () => {
    setActivePreset('Month to Date');
    handleDateRangeChange(monthToDate);
  };

  const handleLastMonth = () => {
    setActivePreset('Last Month');
    handleDateRangeChange(lastMonth);
  };

  const handleYearToDate = () => {
    setActivePreset('Year to Date');
    handleDateRangeChange(yearToDate);
  };

  const handleLastYear = () => {
    setActivePreset('Last Year');
    handleDateRangeChange(lastYear);
  };

  // Calendar
  const handleCalendarSelect = (range: DayPickerDateRange | undefined) => {
    if (!range?.from) return;
    
    // Create a proper DateRange object from the DayPickerDateRange
    const newDateRange: DateRange = {
      from: range.from,
      to: range.to || range.from
    };
    
    // Check if the new range matches any preset
    if (isDateRangeEqual(newDateRange, yesterday)) {
      setActivePreset('Yesterday');
    } else if (isDateRangeEqual(newDateRange, last7Days)) {
      setActivePreset('Last 7 Days');
    } else if (isDateRangeEqual(newDateRange, last30Days)) {
      setActivePreset('Last 30 Days');
    } else if (isDateRangeEqual(newDateRange, monthToDate)) {
      setActivePreset('Month to Date');
    } else if (isDateRangeEqual(newDateRange, lastMonth)) {
      setActivePreset('Last Month');
    } else if (isDateRangeEqual(newDateRange, yearToDate)) {
      setActivePreset('Year to Date');
    } else if (isDateRangeEqual(newDateRange, lastYear)) {
      setActivePreset('Last Year');
    } else {
      // For custom date range, set a formatted date string
      setActivePreset(formatDateRange(newDateRange));
    }
    
    handleDateRangeChange(newDateRange);
  };

  // Helper function to compare date ranges
  const isDateRangeEqual = (range1: DateRange, range2: DateRange): boolean => {
    return isEqual(new Date(range1.from), new Date(range2.from)) && 
           isEqual(new Date(range1.to), new Date(range2.to));
  };

  // Chart components for each variant
  const charts = {
    'revenue': PerformanceChart,
    'subscribers': SubscribersChart,
    'mrr-growth': MRRGrowthChart,
    'refunds': RefundsChart,
    'subscriptions': SubscriptionsChart,
    'upgrades': UpgradesChart,
  };

  // Create a unique chart ID for each variant for proper component keying
  const chartIds = {
    'revenue': 'revenue-chart',
    'subscribers': 'subscribers-chart',
    'mrr-growth': 'mrr-growth-chart',
    'refunds': 'refunds-chart',
    'subscriptions': 'subscriptions-chart',
    'upgrades': 'upgrades-chart',
  };

  // Memoize chart components for better performance
  const MemoizedCharts = useMemo(() => {
    return Object.entries(charts).reduce((acc, [key, Component]) => {
      acc[key as ChartVariant] = React.memo(Component);
      return acc;
    }, {} as Record<ChartVariant, React.ComponentType<BaseChartProps>>);
  }, []);

  // Create a fresh dateRange object to ensure React detects changes
  const dateRangeProp = useMemo(() => {
    if (!date?.from || !date?.to) return undefined;
    
    // Create new Date objects to break reference equality
    const result = { 
      from: new Date(date.from),
      to: new Date(date.to)
    };
    
    console.log('PerformanceWidget providing dateRange:', {
      from: result.from.toISOString(),
      to: result.to.toISOString(),
      hash: Date.now() // Add timestamp for tracking
    });
    
    return result;
  }, [date]);

  // Add a key generator that updates when date changes but allows for animation
  const getChartKey = (variant: ChartVariant) => {
    if (!date?.from || !date?.to) return `chart-${variant}-no-date`;
    return `chart-${variant}-${date.from.getTime()}-${date.to.getTime()}`;
  };

  // Log each render with date information
  console.log('PerformanceWidget rendering with date range:', dateRangeProp ? {
    from: dateRangeProp.from.toISOString(),
    to: dateRangeProp.to.toISOString(),
    key: getChartKey(selectedVariant)
  } : 'undefined');

  const ChartComponent = MemoizedCharts[selectedVariant];

  // Update the formatDateRange function to provide different formats based on context
  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return 'Date Range';
    if (!range.to) return format(range.from, 'MMM d, yyyy');
    
    // For same day selections
    if (isSameDay(range.from, range.to)) {
      return format(range.from, 'MMM d, yyyy');
    }
    
    // For same month and year selections
    if (range.from.getMonth() === range.to.getMonth() && 
        range.from.getFullYear() === range.to.getFullYear()) {
      return `${format(range.from, 'MMM d')}-${format(range.to, 'd, yyyy')}`;
    }
    
    // For same year but different month selections
    if (range.from.getFullYear() === range.to.getFullYear()) {
      return `${format(range.from, 'MMM d')}-${format(range.to, 'MMM d, yyyy')}`;
    }
    
    // For different year selections
    return `${format(range.from, 'MMM d, yyyy')}-${format(range.to, 'MMM d, yyyy')}`;
  };

  // Update the formatCompactDateRange function to handle cross-year formatting better
  const formatCompactDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return 'Date';
    if (!range.to) return format(range.from, 'MMM d, yyyy');
    
    // For same day selections
    if (isSameDay(range.from, range.to)) {
      return format(range.from, 'MMM d, yyyy');
    }
    
    // For same month and same year
    if (range.from.getMonth() === range.to.getMonth() && 
        range.from.getFullYear() === range.to.getFullYear()) {
      // Format as "Mar 3-17, 2025" for same month/year
      return `${format(range.from, 'MMM d')}-${format(range.to, 'd, yyyy')}`;
    }
    
    // For same year
    if (range.from.getFullYear() === range.to.getFullYear()) {
      // Format as "Mar 3-Apr 17, 2025" for different months in same year
      return `${format(range.from, 'MMM d')}-${format(range.to, 'MMM d, yyyy')}`;
    }
    
    // For different years, use a more compact format that clearly shows both years
    // Format as "Nov'23-Mar'25" for different years
    const fromYear = range.from.getFullYear().toString().slice(-2);
    const toYear = range.to.getFullYear().toString().slice(-2);
    return `${format(range.from, 'MMM d')}'${fromYear}-${format(range.to, 'MMM d')}'${toYear}`;
  };

  // Create compact header controls that will be returned when onRemove is provided
  const headerControlsContent = (
    <div className="flex items-center gap-2">
      {/* Date range selector */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs max-w-[180px] whitespace-nowrap">
            <CalendarIcon className="mr-1 h-3 w-3 flex-shrink-0" />
            <span className="truncate leading-none">
              {date?.from && date?.to ? 
                // If it's one of the standard presets, show the name, otherwise show compact date format
                (['Yesterday', 'Last 7 Days', 'Last 30 Days', 'Month to Date', 'Last Month', 'Year to Date', 'Last Year'].includes(activePreset) 
                  ? activePreset 
                  : formatCompactDateRange(date)) 
                : 'Date Range'
              }
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex max-sm:flex-col">
            <div className="relative py-4 max-sm:order-1 max-sm:border-t sm:w-32">
              <div className="h-full sm:border-e">
                <div className="flex flex-col px-2">
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleYesterday}
                  >
                    Yesterday
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleLast7Days}
                  >
                    Last 7 Days
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleLast30Days}
                  >
                    Last 30 Days
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleMonthToDate}
                  >
                    Month to Date
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleLastMonth}
                  >
                    Last Month
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleYearToDate}
                  >
                    Year to Date
                  </Button>
                </div>
              </div>
            </div>
            <Calendar
              mode="range"
              selected={date}
              onSelect={handleCalendarSelect}
              month={month}
              onMonthChange={setMonth}
              className="p-2"
              disabled={[
                { after: today },
              ]}
              numberOfMonths={1}
              defaultMonth={month}
            />
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Variant selector dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs whitespace-nowrap ml-1">
            Views
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {Object.entries(chartLabels).map(([key, label]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => handleVariantChange(key as ChartVariant)}
              className={cn(
                "text-xs",
                selectedVariant === key ? "font-medium bg-accent" : ""
              )}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Return only the header controls when headerControls=true or onRemove is provided (for the widget header)
  if (headerControls || onRemove) {
    return headerControlsContent;
  }

  // Main content now only returns the chart component, without duplicating the controls
  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Chart Display */}
      <div className="flex-1 overflow-hidden">
        {selectedVariant === 'revenue' ? (
          <KeyedPerformanceChart
            viewMode={viewMode}
            onViewModeChange={handleChartViewModeChange}
            dateRange={dateRangeProp}
          />
        ) : (
          <ChartComponent 
            dateRange={dateRangeProp}
            key={getChartKey(selectedVariant)}
          />
        )}
      </div>
    </div>
  );
}; 