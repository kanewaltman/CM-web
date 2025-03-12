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
import { cn } from '../../lib/utils';

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
  onVariantChange?: (variant: ChartVariant) => void;
  onTitleChange?: (title: string) => void;
  onRemove?: () => void;
  headerControls?: boolean;
  widgetId?: string;
}

export const PerformanceWidget: React.FC<PerformanceWidgetProps> = ({ 
  className,
  defaultVariant = 'revenue',
  onVariantChange,
  onTitleChange,
  onRemove,
  headerControls,
  widgetId
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ChartVariant>(defaultVariant);
  const ChartComponent = chartComponents[selectedVariant];

  // Update local state when defaultVariant changes
  useEffect(() => {
    if (defaultVariant !== selectedVariant) {
      setSelectedVariant(defaultVariant);
      // Update title when variant changes via prop
      onTitleChange?.(chartLabels[defaultVariant]);
    }
  }, [defaultVariant, onTitleChange]);

  const handleVariantChange = (value: ChartVariant) => {
    setSelectedVariant(value);
    onVariantChange?.(value);
    // Update title when variant changes via user interaction
    onTitleChange?.(chartLabels[value]);
  };

  const controls = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
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
  );

  if (headerControls) {
    return controls;
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <ChartComponent />
    </div>
  );
}; 