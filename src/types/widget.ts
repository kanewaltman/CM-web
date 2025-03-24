import React from 'react';
import { ChartVariant } from '@/components/PerformanceWidget/PerformanceWidget';

export interface BaseWidgetProps {
  className?: string;
}

export interface RemovableWidgetProps extends BaseWidgetProps {
  onRemove?: () => void;
}

export interface PerformanceWidgetProps extends RemovableWidgetProps {
  headerControls?: boolean;
  defaultVariant?: ChartVariant;
  onVariantChange?: (variant: ChartVariant) => void;
}

export interface WidgetConfig {
  id: string;
  title: string;
  component: React.FC<RemovableWidgetProps | PerformanceWidgetProps>;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
} 