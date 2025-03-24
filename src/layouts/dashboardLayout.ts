import { LayoutWidget, SerializedLayoutWidget } from '@/types/widgets';
import { ChartVariant } from '@/components/PerformanceWidget/PerformanceWidget';

/**
 * Default layout configuration for the dashboard page
 */
export const getDashboardLayout = (WIDGET_REGISTRY: Record<string, any>): LayoutWidget[] => [
  { 
    x: 8, 
    y: 0, 
    w: Math.max(4, WIDGET_REGISTRY['market-overview'].minSize.w), 
    h: Math.max(4, WIDGET_REGISTRY['market-overview'].minSize.h), 
    id: 'market', 
    minW: WIDGET_REGISTRY['market-overview'].minSize.w, 
    minH: WIDGET_REGISTRY['market-overview'].minSize.h 
  },
  { 
    x: 0, 
    y: 4, 
    w: Math.max(12, WIDGET_REGISTRY['recent-trades'].minSize.w), 
    h: Math.max(2, WIDGET_REGISTRY['recent-trades'].minSize.h), 
    id: 'trades', 
    minW: WIDGET_REGISTRY['recent-trades'].minSize.w, 
    minH: WIDGET_REGISTRY['recent-trades'].minSize.h 
  },
  { 
    x: 4, 
    y: 0, 
    w: Math.max(4, WIDGET_REGISTRY['order-book'].minSize.w), 
    h: Math.max(4, WIDGET_REGISTRY['order-book'].minSize.h), 
    id: 'orderbook', 
    minW: WIDGET_REGISTRY['order-book'].minSize.w, 
    minH: WIDGET_REGISTRY['order-book'].minSize.h 
  },
  { 
    x: 0, 
    y: 0, 
    w: Math.max(4, WIDGET_REGISTRY['balances'].minSize.w), 
    h: Math.max(4, WIDGET_REGISTRY['balances'].minSize.h), 
    id: 'balances', 
    minW: WIDGET_REGISTRY['balances'].minSize.w, 
    minH: WIDGET_REGISTRY['balances'].minSize.h 
  }
]; 

// Default layout for desktop
export const defaultLayout: LayoutWidget[] = [
  { 
    id: 'performance', 
    x: 7, 
    y: 0, 
    w: 5, 
    h: 6, 
    minW: 2, 
    minH: 2, 
    viewState: { 
      chartVariant: 'revenue' as ChartVariant,
      viewMode: 'split'
    } 
  },
  { 
    id: 'balances', 
    x: 0, 
    y: 6, 
    w: 12, 
    h: 5, 
    minW: 2, 
    minH: 2 
  },
  { 
    id: 'performance-1741826205331', 
    x: 0, 
    y: 0, 
    w: 7, 
    h: 6, 
    minW: 2, 
    minH: 2, 
    viewState: { 
      chartVariant: 'revenue' as ChartVariant,
      viewMode: 'cumulative'
    } 
  },
];

// Mobile layout configuration (single column)
export const mobileLayout: SerializedLayoutWidget[] = [
  {
    "id": "performance",
    "baseId": "performance",
    "x": 0,
    "y": 8,
    "w": 2,
    "h": 5,
    "minW": 2,
    "minH": 2,
    "viewState": {
      "chartVariant": "revenue" as ChartVariant,
      "viewMode": "split" as "split"
    }
  },
  {
    "id": "balances",
    "baseId": "balances",
    "x": 0,
    "y": 4,
    "w": 2,
    "h": 4,
    "minW": 2,
    "minH": 2
  },
  {
    "id": "performance-1741826205331",
    "baseId": "performance",
    "x": 0,
    "y": 0,
    "w": 2,
    "h": 4,
    "minW": 2,
    "minH": 2,
    "viewState": {
      "chartVariant": "revenue" as ChartVariant,
      "viewMode": "combined" as "combined"
    }
  }
];

// Function to validate layout
export const isValidLayout = (
  layout: unknown, 
  validBaseIds: string[]
): layout is LayoutWidget[] => {
  if (!Array.isArray(layout)) {
    console.warn('Layout is not an array');
    return false;
  }
  
  // Verify each widget has valid properties and sizes
  return layout.every(widget => {
    // Get base widget type from ID (handle both default and dynamic IDs)
    const baseId = widget.id?.split('-')[0];
    const isValidBaseType = baseId && validBaseIds.includes(baseId);
    
    if (!isValidBaseType) {
      console.warn('Invalid widget type:', baseId);
      return false;
    }

    // Check if viewState is valid for performance widgets
    const hasValidViewState = baseId === 'performance' 
      ? widget.viewState && 
        typeof widget.viewState.chartVariant === 'string' &&
        (!widget.viewState.viewMode || ['split', 'cumulative'].includes(widget.viewState.viewMode))
      : true;

    const isValid = (
      typeof widget === 'object' &&
      widget !== null &&
      typeof widget.id === 'string' &&
      typeof widget.x === 'number' &&
      typeof widget.y === 'number' &&
      typeof widget.w === 'number' &&
      typeof widget.h === 'number' &&
      (!widget.minW || typeof widget.minW === 'number') &&
      (!widget.minH || typeof widget.minH === 'number') &&
      hasValidViewState
    );

    if (!isValid) {
      console.warn('Invalid widget in layout:', widget);
    }
    return isValid;
  });
}; 