import React, { useState } from 'react';
import { RevenueChart } from './charts/RevenueChart';
import { SubscribersChart } from './charts/SubscribersChart';
import { MRRGrowthChart } from './charts/MRRGrowthChart';
import { RefundsChart } from './charts/RefundsChart';
import { SubscriptionsChart } from './charts/SubscriptionsChart';
import { UpgradesChart } from './charts/UpgradesChart';
import { WidgetContainer } from '../WidgetContainer';
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
  revenue: RevenueChart,
  subscribers: SubscribersChart,
  'mrr-growth': MRRGrowthChart,
  refunds: RefundsChart,
  subscriptions: SubscriptionsChart,
  upgrades: UpgradesChart,
};

const chartLabels: Record<ChartVariant, string> = {
  revenue: 'Revenue',
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
  onRemove?: () => void;
}

export const PerformanceWidget: React.FC<PerformanceWidgetProps> = ({ 
  className,
  defaultVariant = 'revenue',
  onVariantChange,
  onRemove
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ChartVariant>(defaultVariant);
  const ChartComponent = chartComponents[selectedVariant];

  const handleVariantChange = (value: ChartVariant) => {
    setSelectedVariant(value);
    onVariantChange?.(value);
  };

  const headerControls = (
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

  return (
    <WidgetContainer
      title="Performance"
      headerControls={headerControls}
      className={className}
      onRemove={onRemove}
    >
      <div className="h-full flex flex-col">
        <ChartComponent />
      </div>
    </WidgetContainer>
  );
}; 