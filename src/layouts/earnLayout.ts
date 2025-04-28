import { LayoutWidget } from './types';
import { EarnViewMode } from '@/components/EarnWidget';

/**
 * Default layout configuration for the earning page
 */
export const getEarnLayout = (WIDGET_REGISTRY: Record<string, any>): LayoutWidget[] => [
  // First earn widget with ripple view (promotional)
  { 
    x: 0, 
    y: 0, 
    w: Math.max(12, WIDGET_REGISTRY['earn'].minSize.w), 
    h: 6, 
    id: 'earn-promo', 
    minW: WIDGET_REGISTRY['earn'].minSize.w, 
    minH: WIDGET_REGISTRY['earn'].minSize.h,
    viewState: {
      earnViewMode: 'ripple',
      viewMode: 'split' // Use standard viewMode for compatibility
    }
  },
  // Second earn widget with cards view (showing all assets)
  { 
    x: 0, 
    y: 6, 
    w: Math.max(12, WIDGET_REGISTRY['earn'].minSize.w), 
    h: 9, 
    id: 'earn-assets', 
    minW: WIDGET_REGISTRY['earn'].minSize.w, 
    minH: WIDGET_REGISTRY['earn'].minSize.h,
    viewState: {
      earnViewMode: 'cards',
      viewMode: 'split' // Use standard viewMode for compatibility
    }
  },
  // Third earn widget with stake view (detailed staking interface)
//  { 
//    x: 0, 
//    y: 15, 
//    w: Math.max(12, WIDGET_REGISTRY['earn'].minSize.w), 
//    h: 9, 
//    id: 'earn-stake', 
//    minW: WIDGET_REGISTRY['earn'].minSize.w, 
//    minH: WIDGET_REGISTRY['earn'].minSize.h,
//    viewState: {
//      earnViewMode: 'stake',
//      viewMode: 'split' // Use standard viewMode for compatibility
//    }
//  },
]; 