import React, { useState, useEffect } from 'react';
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
import { DateRange } from 'react-day-picker';
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
} from 'date-fns';

export type ChartVariant = 'revenue' | 'subscribers' | 'mrr-growth' | 'refunds' | 'subscriptions' | 'upgrades';

const chartComponents: Record<ChartVariant, React.ComponentType> = {
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

interface PerformanceWidgetProps {
  className?: string;
  defaultVariant?: ChartVariant;
  defaultViewMode?: 'split' | 'cumulative';
  onVariantChange?: (variant: ChartVariant) => void;
  onViewModeChange?: (mode: 'split' | 'cumulative') => void;
  onTitleChange?: (title: string) => void;
  onRemove?: () => void;
  headerControls?: boolean;
  widgetId?: string;
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

export const PerformanceWidget: React.FC<PerformanceWidgetProps> = ({ 
  className,
  defaultVariant = 'revenue',
  defaultViewMode = 'split',
  onVariantChange,
  onViewModeChange,
  onTitleChange,
  onRemove,
  headerControls,
  widgetId,
  onDateRangeChange
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ChartVariant>(defaultVariant);
  const [viewMode, setViewMode] = useState<'split' | 'cumulative'>(defaultViewMode);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [month, setMonth] = useState(new Date());
  const ChartComponent = chartComponents[selectedVariant];

  const today = new Date();
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

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return 'Date Range';
    if (!range.to) return format(range.from, 'MMM d, yyyy');
    if (isSameDay(range.from, range.to)) {
      return format(range.from, 'MMM d, yyyy');
    }
    return `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`;
  };

  // Update local state when defaultVariant changes
  useEffect(() => {
    if (defaultVariant !== selectedVariant) {
      setSelectedVariant(defaultVariant);
      // Update title when variant changes via prop
      onTitleChange?.(chartLabels[defaultVariant]);
    }
  }, [defaultVariant, onTitleChange]);

  // Update local state when defaultViewMode changes
  useEffect(() => {
    if (defaultViewMode !== viewMode) {
      setViewMode(defaultViewMode);
    }
  }, [defaultViewMode]);

  const handleVariantChange = (value: ChartVariant) => {
    setSelectedVariant(value);
    onVariantChange?.(value);
    // Update title when variant changes via user interaction
    onTitleChange?.(chartLabels[value]);
  };

  const handleViewModeChange = (mode: 'split' | 'cumulative') => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  const handleDateRangeChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    onDateRangeChange?.(newDate);
  };

  const controls = (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(date)}
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
                    onClick={() => {
                      handleDateRangeChange({
                        from: today,
                        to: today,
                      });
                      setMonth(today);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleDateRangeChange(yesterday);
                      setMonth(yesterday.to);
                    }}
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleDateRangeChange(last7Days);
                      setMonth(last7Days.to);
                    }}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleDateRangeChange(last30Days);
                      setMonth(last30Days.to);
                    }}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleDateRangeChange(monthToDate);
                      setMonth(monthToDate.to);
                    }}
                  >
                    Month to date
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleDateRangeChange(lastMonth);
                      setMonth(lastMonth.to);
                    }}
                  >
                    Last month
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleDateRangeChange(yearToDate);
                      setMonth(yearToDate.to);
                    }}
                  >
                    Year to date
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleDateRangeChange(lastYear);
                      setMonth(lastYear.to);
                    }}
                  >
                    Last year
                  </Button>
                </div>
              </div>
            </div>
            <Calendar
              mode="range"
              selected={date}
              onSelect={handleDateRangeChange}
              month={month}
              onMonthChange={setMonth}
              className="p-2"
              disabled={[
                { after: today }, // Dates after today
              ]}
              numberOfMonths={1}
              defaultMonth={month}
            />
          </div>
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            Views
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {Object.entries(chartLabels).map(([value, label]) => (
            <DropdownMenuItem
              key={value}
              onClick={() => handleVariantChange(value as ChartVariant)}
              className={cn(
                "cursor-pointer",
                selectedVariant === value && "bg-accent"
              )}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  if (headerControls) {
    return controls;
  }

  return (
    <div className={cn("h-full flex flex-col px-1 pb-1", className)}>
      {selectedVariant === 'revenue' ? (
        <PerformanceChart 
          viewMode={viewMode} 
          onViewModeChange={handleViewModeChange} 
        />
      ) : (
        <ChartComponent />
      )}
    </div>
  );
}; 