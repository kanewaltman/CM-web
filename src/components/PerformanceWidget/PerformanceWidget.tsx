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
import { PerformanceWidgetProps } from '../../types/widgets';

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
export type WidgetViewMode = 'split' | 'cumulative' | 'combined';
export type ChartViewMode = 'split' | 'stacked' | 'line' | 'cumulative' | 'combined';

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
  widgetId,
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
  const [date, setDate] = useState<{ from: Date; to: Date } | undefined>(propDateRange || last7Days);
  const [month, setMonth] = useState(today);
  const [activePreset, setActivePreset] = useState<string>('Last 7 Days');
  
  // Helper function to compare date ranges
  const isDateRangeEqual = useCallback((range1: { from: Date; to: Date }, range2: { from: Date; to: Date }): boolean => {
    return isEqual(new Date(range1.from), new Date(range2.from)) && 
           isEqual(new Date(range1.to), new Date(range2.to));
  }, []);
  
  // Update the formatDateRange function to provide different formats based on context
  const formatDateRange = useCallback((range: { from: Date; to: Date } | undefined) => {
    if (!range?.from) return 'Date Range';
    if (!range.to) return format(range.from, 'MMM d, yyyy');
    
    if (isSameDay(range.from, range.to)) {
      return format(range.from, 'MMM d, yyyy');
    }
    
    if (range.from.getMonth() === range.to.getMonth() && 
        range.from.getFullYear() === range.to.getFullYear()) {
      return `${format(range.from, 'MMM d')}-${format(range.to, 'd, yyyy')}`;
    }
    
    if (range.from.getFullYear() === range.to.getFullYear()) {
      return `${format(range.from, 'MMM d')}-${format(range.to, 'MMM d, yyyy')}`;
    }
    
    return `${format(range.from, 'MMM d, yyyy')}-${format(range.to, 'MMM d, yyyy')}`;
  }, []);
  
  // Update the formatCompactDateRange function to handle cross-year formatting better
  const formatCompactDateRange = useCallback((range: { from: Date; to: Date } | undefined) => {
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
  }, []);
  
  // Keep track of render count to debug re-rendering issues
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  // Log when component renders - only in development and only once every 1000 renders
  if (process.env.NODE_ENV === 'development' && renderCount.current % 1000 === 0) {
    console.log(`PerformanceWidget render #${renderCount.current}`, {
      headerControls,
      widgetId
    });
  }

  // Memoize date presets to prevent unnecessary re-renders
  const datePresets = useMemo(() => ({
    yesterday,
    last7Days,
    last30Days,
    monthToDate,
    lastMonth,
    yearToDate,
    lastYear
  }), [yesterday, last7Days, last30Days, monthToDate, lastMonth, yearToDate, lastYear]);

  // Listen for custom date change events to sync between header and content
  useEffect(() => {
    // Only process date change events that target this specific widget
    const handleDateChangeEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { dateRange, widgetId: eventWidgetId } = customEvent.detail;
      
      // Only update if this event is for our widget ID and we're not the header
      if (!headerControls && widgetId === eventWidgetId) {
        setDate({
          from: new Date(dateRange.from),
          to: new Date(dateRange.to)
        });
      }
    };
    
    document.addEventListener('performance-widget-date-change', handleDateChangeEvent);
    
    return () => {
      document.removeEventListener('performance-widget-date-change', handleDateChangeEvent);
    };
  }, [headerControls, widgetId]);

  // Update date state when the prop changes - use deep comparison for dates
  useEffect(() => {
    if (!propDateRange?.from || !propDateRange?.to) return;
    if (!date?.from || !date?.to) {
      setDate({
        from: new Date(propDateRange.from),
        to: new Date(propDateRange.to)
      });
      return;
    }
    
    const fromTimeChanged = propDateRange.from.getTime() !== date.from.getTime();
    const toTimeChanged = propDateRange.to.getTime() !== date.to.getTime();
    
    // Only update if different by time value
    if (fromTimeChanged || toTimeChanged) {
      setDate({
        from: new Date(propDateRange.from),
        to: new Date(propDateRange.to)
      });
      
      // If this is the header controls, also notify parent of change to keep in sync
      if (headerControls && onDateRangeChange) {
        onDateRangeChange({
          from: new Date(propDateRange.from),
          to: new Date(propDateRange.to)
        });
      }
    }
  }, [
    propDateRange?.from?.getTime(), 
    propDateRange?.to?.getTime(), 
    headerControls, 
    onDateRangeChange
  ]);

  // Update local state when defaultVariant changes
  useEffect(() => {
    if (defaultVariant !== selectedVariant) {
      setSelectedVariant(defaultVariant);
      onTitleChange?.(chartLabels[defaultVariant]);
    }
  }, [defaultVariant, onTitleChange, selectedVariant]);

  // Update local state when defaultViewMode changes
  useEffect(() => {
    if (defaultViewMode !== viewMode) {
      setViewMode(defaultViewMode);
    }
  }, [defaultViewMode, viewMode]);
  
  // Initialize view mode from localStorage if no default is provided
  useEffect(() => {
    // Only try to restore from localStorage if no default was provided
    if (!defaultViewMode || defaultViewMode === 'split') {
      try {
        // Check widget-specific storage first
        const storedMode = localStorage.getItem('performance_widget_view_mode');
        if (storedMode && (storedMode === 'split' || storedMode === 'cumulative' || storedMode === 'combined')) {
          console.log('PerformanceWidget: Restoring view mode from localStorage:', storedMode);
          setViewMode(storedMode as WidgetViewMode);
          
          // Notify parent of the restored mode
          onViewModeChange?.(storedMode as WidgetViewMode);
        }
      } catch (error) {
        console.error('Error retrieving view mode from localStorage:', error);
      }
    }
  }, []); // Run only on mount

  // This effect initializes the date range on component mount - use useRef to ensure it only runs once
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    
    // Try to load saved date range from localStorage first
    try {
      const savedDateRangeStr = localStorage.getItem(`widget_${widgetId}_date_range`);
      if (savedDateRangeStr) {
        const savedDateRange = JSON.parse(savedDateRangeStr);
        
        const restoredRange = {
          from: new Date(savedDateRange.from),
          to: new Date(savedDateRange.to)
        };
        
        // Update local state
        setDate(restoredRange);
        
        // Notify parent component about the restored date range
        if (onDateRangeChange) {
          onDateRangeChange(restoredRange);
        }
        
        // Determine which preset this matches, if any
        if (isDateRangeEqual(restoredRange, yesterday)) {
          setActivePreset('Yesterday');
        } else if (isDateRangeEqual(restoredRange, last7Days)) {
          setActivePreset('Last 7 Days');
        } else if (isDateRangeEqual(restoredRange, last30Days)) {
          setActivePreset('Last 30 Days');
        } else if (isDateRangeEqual(restoredRange, monthToDate)) {
          setActivePreset('Month to Date');
        } else if (isDateRangeEqual(restoredRange, lastMonth)) {
          setActivePreset('Last Month');
        } else if (isDateRangeEqual(restoredRange, yearToDate)) {
          setActivePreset('Year to Date');
        } else if (isDateRangeEqual(restoredRange, lastYear)) {
          setActivePreset('Last Year');
        } else {
          // For custom date range, set a formatted date string
          setActivePreset(formatDateRange(restoredRange));
        }
        
        return; // Exit early as we've restored the saved date range
      }
    } catch (error) {
      console.error('Error loading date range from localStorage:', error);
    }

    // Initialize date range from props or defaults
    if (propDateRange?.from && propDateRange?.to) {
      // Check if the prop date range is a same-day range and needs to be expanded
      const dayDiff = Math.ceil((propDateRange.to.getTime() - propDateRange.from.getTime()) / (24 * 60 * 60 * 1000));
      if (dayDiff <= 1 && (activePreset === 'Last 7 Days' || !activePreset)) {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        setDate({
          from: sevenDaysAgo,
          to: now
        });
        
        // Also update the active preset to match
        setActivePreset('Last 7 Days');
      } else {
        setDate({
          from: propDateRange.from,
          to: propDateRange.to
        });
      }
      
      // Let the parent component know about the date range
      if (!headerControls && onDateRangeChange) {
        onDateRangeChange({
          from: propDateRange.from,
          to: propDateRange.to
        });
      }
    } else {
      // Use default date range
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 6);
      
      setDate({
        from: sevenDaysAgo,
        to: now
      });
      
      // Set the active range to "Last 7 Days"
      setActivePreset('Last 7 Days');
      
      // Let the parent component know about the date range
      if (!headerControls && onDateRangeChange) {
        onDateRangeChange({
          from: sevenDaysAgo,
          to: now
        });
      }
    }
  }, [
    widgetId, 
    onDateRangeChange, 
    headerControls,
    yesterday, 
    last7Days, 
    last30Days, 
    monthToDate, 
    lastMonth, 
    yearToDate, 
    lastYear, 
    activePreset,
    isDateRangeEqual, 
    formatDateRange,
    propDateRange
  ]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleVariantChange = useCallback((value: ChartVariant) => {
    setSelectedVariant(value);
    onVariantChange?.(value);
  }, [onVariantChange]);

  const handleViewModeChange = useCallback((mode: WidgetViewMode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  // Handler for receiving chart view mode changes and mapping them to widget view modes
  const handleChartViewModeChange = useCallback((mode: ChartViewMode) => {
    // Map chart view modes to widget view modes
    const widgetMode: WidgetViewMode = mode === 'cumulative' || mode === 'split' || mode === 'combined'
      ? mode 
      : 'split'; // Default to split for other modes (stacked, line)
    
    // Set the local state first for immediate feedback
    setViewMode(widgetMode);
    
    // Notify parent component via callback
    if (onViewModeChange) {
      onViewModeChange(widgetMode);
    } else {
      // If no parent handler, save locally as fallback
      try {
        localStorage.setItem('performance_widget_view_mode', widgetMode);
      } catch (error) {
        console.error('Failed to save view mode to localStorage:', error);
      }
    }
  }, [onViewModeChange]);

  const handleDateRangeChange = useCallback((newDate: { from: Date; to: Date } | undefined) => {
    if (!newDate?.from || !newDate?.to) return;
    
    // Create deep copies of the dates to avoid reference issues
    const newDateCopy = {
      from: new Date(newDate.from),
      to: new Date(newDate.to)
    };
    
    // Save to localStorage with widget-specific key
    try {
      localStorage.setItem(`widget_${widgetId}_date_range`, JSON.stringify({
        from: newDateCopy.from.toISOString(),
        to: newDateCopy.to.toISOString()
      }));
    } catch (error) {
      console.error('Failed to save date range to localStorage:', error);
    }
    
    setDate(newDateCopy);
    onDateRangeChange?.(newDateCopy);
  }, [widgetId, onDateRangeChange]);

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
    const newDateRange: { from: Date; to: Date } = {
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
    
    // Force new object creation with time values to ensure React detects the change
    return { 
      from: new Date(date.from.getTime()),
      to: new Date(date.to.getTime())
    };
  }, [date?.from?.getTime(), date?.to?.getTime()]);

  // Add a key generator that updates when date changes but allows for animation
  const getChartKey = useCallback((variant: ChartVariant) => {
    if (!date?.from || !date?.to) return `chart-${variant}-no-date`;
    return `chart-${variant}-${date.from.getTime()}-${date.to.getTime()}`;
  }, [date]);

  const ChartComponent = MemoizedCharts[selectedVariant];

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