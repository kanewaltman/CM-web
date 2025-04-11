import { GridStack, GridStackWidget, GridStackNode, GridStackElement } from 'gridstack';
import React from 'react';
import { ChartVariant } from '@/components/PerformanceWidget/PerformanceWidget';
import { ReferralsViewMode } from '@/components/ReferralsWidget';

export interface BaseWidgetProps {
  className?: string;
}

export interface RemovableWidgetProps extends BaseWidgetProps {
  widgetId: string;
  onRemove?: () => void;
}

export interface PerformanceWidgetProps extends RemovableWidgetProps {
  widgetId: string;
  headerControls?: boolean;
  defaultVariant?: ChartVariant;
  defaultViewMode?: 'split' | 'cumulative' | 'combined';
  onVariantChange?: (variant: ChartVariant) => void;
  onViewModeChange?: (mode: 'split' | 'cumulative' | 'combined') => void;
  onTitleChange?: (title: string) => void;
  onDateRangeChange?: (dateRange: { from: Date; to: Date } | undefined) => void;
  dateRange?: { from: Date; to: Date };
}

export interface ReferralsWidgetProps extends RemovableWidgetProps {
  widgetId: string;
  defaultViewMode?: ReferralsViewMode;
  onViewModeChange?: (mode: ReferralsViewMode) => void;
}

export interface WidgetConfig {
  id: string;
  title: string;
  component: React.FC<RemovableWidgetProps | PerformanceWidgetProps | ReferralsWidgetProps>;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
}

export interface WidgetComponentProps {
  widgetId: string;
  headerControls?: boolean;
  className?: string;
  onRemove?: () => void;
  defaultVariant?: ChartVariant;
  onVariantChange?: (variant: ChartVariant) => void;
  defaultViewMode?: 'split' | 'cumulative' | 'combined' | ReferralsViewMode;
  onViewModeChange?: (mode: 'split' | 'cumulative' | 'combined' | ReferralsViewMode) => void;
  onTitleChange?: (title: string) => void;
  onDateRangeChange?: (dateRange: { from: Date; to: Date } | undefined) => void;
  dateRange?: { from: Date; to: Date };
}

export interface LayoutWidget {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  viewState?: {
    chartVariant?: ChartVariant;
    viewMode?: 'split' | 'cumulative' | 'combined';
    referralViewMode?: ReferralsViewMode;
  };
}

export interface SerializedLayoutWidget extends LayoutWidget {
  baseId: string;
}

// Update ExtendedGridStackWidget interface to include el and gridstackNode properties
export interface ExtendedGridStackWidget extends GridStackWidget {
  el?: HTMLElement;
  gridstackNode?: GridStackNode;
  id?: string;
  autoPosition?: boolean;
  noMove?: boolean;
  noResize?: boolean;
  locked?: boolean;
}

export interface CreateWidgetParams {
  widgetType: string;
  widgetId: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  minW?: number;
  minH?: number;
}

// Useful constants
export const MOBILE_BREAKPOINT = 768;
export const DASHBOARD_LAYOUT_KEY = 'dashboard-layout'; 