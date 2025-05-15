import { ChartVariant } from '@/components/PerformanceWidget/PerformanceWidget';
import { ReferralsViewMode } from '@/components/ReferralsWidget';
import { EarnViewMode } from '@/components/EarnWidget/EarnWidget';

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
    chartVariant?: ChartVariant;
    viewMode?: 'split' | 'cumulative' | 'combined';
    referralViewMode?: ReferralsViewMode;
    earnViewMode?: EarnViewMode;
    useContentOnly?: boolean;
  };
}

export interface SerializedLayoutWidget extends LayoutWidget {
  baseId?: string;
}

export type PageType = 'dashboard' | 'spot' | 'margin' | 'earn'; 