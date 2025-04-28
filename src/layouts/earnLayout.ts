import { LayoutWidget } from './types';

/**
 * Default layout configuration for the earning page
 */
export const getEarnLayout = (WIDGET_REGISTRY: Record<string, any>): LayoutWidget[] => [
  { 
    x: 0, 
    y: 0, 
    w: Math.max(12, WIDGET_REGISTRY['trading-view-chart'].minSize.w), 
    h: Math.max(6, WIDGET_REGISTRY['trading-view-chart'].minSize.h), 
    id: 'chart', 
    minW: WIDGET_REGISTRY['trading-view-chart'].minSize.w, 
    minH: WIDGET_REGISTRY['trading-view-chart'].minSize.h 
  },
  { 
    x: 0, 
    y: 6, 
    w: Math.max(4, WIDGET_REGISTRY['order-book'].minSize.w), 
    h: Math.max(4, WIDGET_REGISTRY['order-book'].minSize.h), 
    id: 'orderbook', 
    minW: WIDGET_REGISTRY['order-book'].minSize.w, 
    minH: WIDGET_REGISTRY['order-book'].minSize.h 
  },
  { 
    x: 4, 
    y: 6, 
    w: Math.max(4, WIDGET_REGISTRY['trade-form'].minSize.w), 
    h: Math.max(4, WIDGET_REGISTRY['trade-form'].minSize.h), 
    id: 'tradeform', 
    minW: WIDGET_REGISTRY['trade-form'].minSize.w, 
    minH: WIDGET_REGISTRY['trade-form'].minSize.h 
  },
  { 
    x: 8, 
    y: 6, 
    w: Math.max(4, WIDGET_REGISTRY['market-overview'].minSize.w), 
    h: Math.max(4, WIDGET_REGISTRY['market-overview'].minSize.h), 
    id: 'market', 
    minW: WIDGET_REGISTRY['market-overview'].minSize.w, 
    minH: WIDGET_REGISTRY['market-overview'].minSize.h 
  },
  { 
    x: 0, 
    y: 10, 
    w: Math.max(12, WIDGET_REGISTRY['recent-trades'].minSize.w), 
    h: Math.max(2, WIDGET_REGISTRY['recent-trades'].minSize.h), 
    id: 'trades', 
    minW: WIDGET_REGISTRY['recent-trades'].minSize.w, 
    minH: WIDGET_REGISTRY['recent-trades'].minSize.h 
  },
  { 
    x: 0, 
    y: 12, 
    w: Math.max(4, WIDGET_REGISTRY['balances'].minSize.w), 
    h: Math.max(4, WIDGET_REGISTRY['balances'].minSize.h), 
    id: 'balances', 
    minW: WIDGET_REGISTRY['balances'].minSize.w, 
    minH: WIDGET_REGISTRY['balances'].minSize.h 
  }
]; 