import { ChartVariant } from '@/components/PerformanceWidget/PerformanceWidget';

// Layout widget type definitions
export interface LayoutWidget {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  viewState?: {
    chartVariant: ChartVariant;
    viewMode?: 'split' | 'cumulative';
  };
}

export interface SerializedLayoutWidget extends LayoutWidget {
  baseId?: string;
}

export type PageType = 'dashboard' | 'spot' | 'margin' | 'stake'; 