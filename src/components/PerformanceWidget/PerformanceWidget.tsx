import React, { useState } from 'react';
import { RevenueChart } from './charts/RevenueChart';
import { SubscribersChart } from './charts/SubscribersChart';
import { MRRGrowthChart } from './charts/MRRGrowthChart';
import { RefundsChart } from './charts/RefundsChart';
import { SubscriptionsChart } from './charts/SubscriptionsChart';
import { UpgradesChart } from './charts/UpgradesChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

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
}

export const PerformanceWidget: React.FC<PerformanceWidgetProps> = ({ 
  className,
  defaultVariant = 'revenue',
  onVariantChange
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ChartVariant>(defaultVariant);
  const ChartComponent = chartComponents[selectedVariant];

  const handleVariantChange = (value: string) => {
    const newVariant = value as ChartVariant;
    setSelectedVariant(newVariant);
    onVariantChange?.(newVariant);
  };

  const headerControls = (
    <Select value={selectedVariant} onValueChange={handleVariantChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select chart" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(chartLabels).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className={className}>
      <ChartComponent />
    </div>
  );
}; 