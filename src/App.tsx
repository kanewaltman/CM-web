import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GridStack, GridStackWidget, GridStackOptions, GridStackNode, GridStackElement } from 'gridstack';
import * as ReactDOM from 'react-dom/client';
import 'gridstack/dist/gridstack.min.css';
import { TopBar } from './components/TopBar';
import { ControlBar } from './components/ControlBar';
import { TradingViewChart } from './components/TradingViewChart';
import { OrderBook } from './components/OrderBook';
import { TradeForm } from './components/TradeForm';
import { MarketOverview } from './components/MarketOverview';
import { RecentTrades } from './components/RecentTrades';
import { Toaster } from './components/ui/sonner';
import { WidgetContainer } from './components/WidgetContainer';
import { BalancesWidget } from './components/BalancesWidget';
import { PerformanceWidget } from './components/PerformanceWidget/PerformanceWidget';
import { createRoot } from 'react-dom/client';
import { ChartVariant } from './components/PerformanceWidget/PerformanceWidget';
import { DataSourceProvider, useDataSource } from './lib/DataSourceContext';
import { useThemeIntensity } from '@/contexts/ThemeContext';
import { useTheme } from 'next-themes';
import { getThemeValues } from '@/lib/utils';

// Widget Registry - Single source of truth for widget configuration
interface BaseWidgetProps {
  className?: string;
  widgetId?: string;
}

interface RemovableWidgetProps extends BaseWidgetProps {
  onRemove?: () => void;
}

interface PerformanceWidgetProps extends BaseWidgetProps {
  defaultVariant?: ChartVariant;
  defaultViewMode?: 'split' | 'cumulative';
  onVariantChange?: (variant: ChartVariant) => void;
  onViewModeChange?: (mode: 'split' | 'cumulative') => void;
  onTitleChange?: (title: string) => void;
  onRemove?: () => void;
  headerControls?: boolean;
}

interface WidgetConfig {
  id: string;
  title: string;
  component: React.FC<RemovableWidgetProps | PerformanceWidgetProps>;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
}

export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  'market-overview': {
    id: 'market',
    title: 'Market Overview',
    component: MarketOverview,
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 }
  },
  'order-book': {
    id: 'orderbook',
    title: 'Order Book',
    component: OrderBook,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 4 }
  },
  'recent-trades': {
    id: 'trades',
    title: 'Recent Trades',
    component: RecentTrades,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 4, h: 2 }
  },
  'trading-view-chart': {
    id: 'chart',
    title: 'BTC/USDT',
    component: TradingViewChart,
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 6, h: 4 }
  },
  'trade-form': {
    id: 'tradeform',
    title: 'Trade',
    component: TradeForm,
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 3, h: 4 }
  },
  'balances': {
    id: 'balances',
    title: 'Balances',
    component: BalancesWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 }
  },
  'performance': {
    id: 'performance',
    title: 'Performance',
    component: PerformanceWidget,
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 4, h: 4 }
  }
} as const;

// Derive other mappings from registry
const widgetIds: Record<string, string> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [key, config.id])
);

const widgetTypes: Record<string, string> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [config.id, key])
);

interface WidgetComponentProps {
  widgetId?: string;
  headerControls?: boolean;
  className?: string;
  onRemove?: () => void;
  defaultVariant?: ChartVariant;
  onVariantChange?: (variant: ChartVariant) => void;
}

// Update the widgetComponents type to include the widgetId prop
const widgetComponents: Record<string, React.FC<WidgetComponentProps>> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [key, config.component])
);

const widgetTitles: Record<string, string> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [key, config.title])
);

interface WidgetViewState {
  chartVariant: ChartVariant;
  viewMode: 'split' | 'cumulative';
}

interface BaseLayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

interface PerformanceLayoutItem extends BaseLayoutItem {
  viewState: WidgetViewState;
}

type LayoutItem = BaseLayoutItem | PerformanceLayoutItem;

// Helper type guard for PerformanceLayoutItem
const isPerformanceLayoutItem = (item: LayoutItem): item is PerformanceLayoutItem => {
  return 'viewState' in item && item.id.startsWith('performance-');
};

// Update the generateDefaultLayout function
const generateDefaultLayout = () => [
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
      viewMode: 'split' as const
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
      viewMode: 'cumulative' as const
    } 
  }
] as LayoutItem[];

const defaultLayout = generateDefaultLayout();

// Default desktop layout configuration for different pages
const dashboardLayout = [
  { x: 8, y: 0, w: Math.max(4, WIDGET_REGISTRY['market-overview'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['market-overview'].minSize.h), id: 'market', minW: WIDGET_REGISTRY['market-overview'].minSize.w, minH: WIDGET_REGISTRY['market-overview'].minSize.h },
  { x: 0, y: 4, w: Math.max(12, WIDGET_REGISTRY['recent-trades'].minSize.w), h: Math.max(2, WIDGET_REGISTRY['recent-trades'].minSize.h), id: 'trades', minW: WIDGET_REGISTRY['recent-trades'].minSize.w, minH: WIDGET_REGISTRY['recent-trades'].minSize.h },
  { x: 4, y: 0, w: Math.max(4, WIDGET_REGISTRY['order-book'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['order-book'].minSize.h), id: 'orderbook', minW: WIDGET_REGISTRY['order-book'].minSize.w, minH: WIDGET_REGISTRY['order-book'].minSize.h },
  { x: 0, y: 0, w: Math.max(4, WIDGET_REGISTRY['balances'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['balances'].minSize.h), id: 'balances', minW: WIDGET_REGISTRY['balances'].minSize.w, minH: WIDGET_REGISTRY['balances'].minSize.h }
];

const spotLayout = [
  { x: 0, y: 0, w: Math.max(6, WIDGET_REGISTRY['trading-view-chart'].minSize.w), h: Math.max(6, WIDGET_REGISTRY['trading-view-chart'].minSize.h), id: 'chart', minW: WIDGET_REGISTRY['trading-view-chart'].minSize.w, minH: WIDGET_REGISTRY['trading-view-chart'].minSize.h },
  { x: 6, y: 0, w: Math.max(3, WIDGET_REGISTRY['order-book'].minSize.w), h: Math.max(6, WIDGET_REGISTRY['order-book'].minSize.h), id: 'orderbook', minW: WIDGET_REGISTRY['order-book'].minSize.w, minH: WIDGET_REGISTRY['order-book'].minSize.h },
  { x: 9, y: 0, w: Math.max(3, WIDGET_REGISTRY['trade-form'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['trade-form'].minSize.h), id: 'tradeform', minW: WIDGET_REGISTRY['trade-form'].minSize.w, minH: WIDGET_REGISTRY['trade-form'].minSize.h },
  { x: 9, y: 4, w: Math.max(3, WIDGET_REGISTRY['market-overview'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['market-overview'].minSize.h), id: 'market', minW: WIDGET_REGISTRY['market-overview'].minSize.w, minH: WIDGET_REGISTRY['market-overview'].minSize.h },
  { x: 0, y: 6, w: Math.max(9, WIDGET_REGISTRY['recent-trades'].minSize.w), h: Math.max(2, WIDGET_REGISTRY['recent-trades'].minSize.h), id: 'trades', minW: WIDGET_REGISTRY['recent-trades'].minSize.w, minH: WIDGET_REGISTRY['recent-trades'].minSize.h },
  { x: 0, y: 8, w: Math.max(4, WIDGET_REGISTRY['balances'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['balances'].minSize.h), id: 'balances', minW: WIDGET_REGISTRY['balances'].minSize.w, minH: WIDGET_REGISTRY['balances'].minSize.h }
];

const marginLayout = [
  { x: 0, y: 0, w: Math.max(8, WIDGET_REGISTRY['trading-view-chart'].minSize.w), h: Math.max(6, WIDGET_REGISTRY['trading-view-chart'].minSize.h), id: 'chart', minW: WIDGET_REGISTRY['trading-view-chart'].minSize.w, minH: WIDGET_REGISTRY['trading-view-chart'].minSize.h },
  { x: 8, y: 0, w: Math.max(4, WIDGET_REGISTRY['order-book'].minSize.w), h: Math.max(6, WIDGET_REGISTRY['order-book'].minSize.h), id: 'orderbook', minW: WIDGET_REGISTRY['order-book'].minSize.w, minH: WIDGET_REGISTRY['order-book'].minSize.h },
  { x: 0, y: 6, w: Math.max(4, WIDGET_REGISTRY['trade-form'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['trade-form'].minSize.h), id: 'tradeform', minW: WIDGET_REGISTRY['trade-form'].minSize.w, minH: WIDGET_REGISTRY['trade-form'].minSize.h },
  { x: 4, y: 6, w: Math.max(4, WIDGET_REGISTRY['market-overview'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['market-overview'].minSize.h), id: 'market', minW: WIDGET_REGISTRY['market-overview'].minSize.w, minH: WIDGET_REGISTRY['market-overview'].minSize.h },
  { x: 8, y: 6, w: Math.max(4, WIDGET_REGISTRY['recent-trades'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['recent-trades'].minSize.h), id: 'trades', minW: WIDGET_REGISTRY['recent-trades'].minSize.w, minH: WIDGET_REGISTRY['recent-trades'].minSize.h },
  { x: 0, y: 10, w: Math.max(4, WIDGET_REGISTRY['balances'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['balances'].minSize.h), id: 'balances', minW: WIDGET_REGISTRY['balances'].minSize.w, minH: WIDGET_REGISTRY['balances'].minSize.h }
];

const stakeLayout = [
  { x: 0, y: 0, w: Math.max(12, WIDGET_REGISTRY['trading-view-chart'].minSize.w), h: Math.max(6, WIDGET_REGISTRY['trading-view-chart'].minSize.h), id: 'chart', minW: WIDGET_REGISTRY['trading-view-chart'].minSize.w, minH: WIDGET_REGISTRY['trading-view-chart'].minSize.h },
  { x: 0, y: 6, w: Math.max(4, WIDGET_REGISTRY['order-book'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['order-book'].minSize.h), id: 'orderbook', minW: WIDGET_REGISTRY['order-book'].minSize.w, minH: WIDGET_REGISTRY['order-book'].minSize.h },
  { x: 4, y: 6, w: Math.max(4, WIDGET_REGISTRY['trade-form'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['trade-form'].minSize.h), id: 'tradeform', minW: WIDGET_REGISTRY['trade-form'].minSize.w, minH: WIDGET_REGISTRY['trade-form'].minSize.h },
  { x: 8, y: 6, w: Math.max(4, WIDGET_REGISTRY['market-overview'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['market-overview'].minSize.h), id: 'market', minW: WIDGET_REGISTRY['market-overview'].minSize.w, minH: WIDGET_REGISTRY['market-overview'].minSize.h },
  { x: 0, y: 10, w: Math.max(12, WIDGET_REGISTRY['recent-trades'].minSize.w), h: Math.max(2, WIDGET_REGISTRY['recent-trades'].minSize.h), id: 'trades', minW: WIDGET_REGISTRY['recent-trades'].minSize.w, minH: WIDGET_REGISTRY['recent-trades'].minSize.h },
  { x: 0, y: 12, w: Math.max(4, WIDGET_REGISTRY['balances'].minSize.w), h: Math.max(4, WIDGET_REGISTRY['balances'].minSize.h), id: 'balances', minW: WIDGET_REGISTRY['balances'].minSize.w, minH: WIDGET_REGISTRY['balances'].minSize.h }
];

// Mobile layout configuration (single column)
const mobileLayout: SerializedLayoutWidget[] = [
  {"id":"performance","baseId":"performance","x":0,"y":8,"w":2,"h":5,"minW":2,"minH":2,"viewState":{"chartVariant":"revenue" as ChartVariant,"viewMode":"split" as "split"}},
  {"id":"balances","baseId":"balances","x":0,"y":4,"w":2,"h":4,"minW":2,"minH":2},
  {"id":"performance-1741826205331","baseId":"performance","x":0,"y":0,"w":2,"h":4,"minW":2,"minH":2,"viewState":{"chartVariant":"revenue" as ChartVariant,"viewMode":"cumulative" as "cumulative"}}
];

// Breakpoint for mobile view
const MOBILE_BREAKPOINT = 768;

interface LayoutWidget {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  viewState?: {
    chartVariant?: ChartVariant;
    viewMode?: 'split' | 'cumulative';
  };
}

interface SerializedLayoutWidget extends LayoutWidget {
  baseId: string;
  viewState?: {
    chartVariant: ChartVariant;
    viewMode?: 'split' | 'cumulative';
  };
}

// Update ExtendedGridStackWidget interface to include el and gridstackNode properties
interface ExtendedGridStackWidget extends GridStackWidget {
  el?: HTMLElement;
  gridstackNode?: GridStackNode;
}

// Add constant for localStorage key
const DASHBOARD_LAYOUT_KEY = 'dashboard-layout';

interface CreateWidgetParams {
  widgetType: string;
  widgetId: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  minW?: number;
  minH?: number;
}

// Update the WidgetState class to be more robust
class WidgetState {
  private listeners: Set<() => void> = new Set();
  private _variant: ChartVariant;
  private _title: string;
  private _viewMode: 'split' | 'cumulative';

  constructor(initialVariant: ChartVariant = 'revenue', initialTitle: string = 'Performance', initialViewMode: 'split' | 'cumulative' = 'split') {
    this._variant = initialVariant;
    this._title = initialTitle;
    this._viewMode = initialViewMode;
  }

  get variant(): ChartVariant {
    return this._variant;
  }

  get title(): string {
    return this._title;
  }

  get viewMode(): 'split' | 'cumulative' {
    return this._viewMode;
  }

  setVariant(newVariant: ChartVariant) {
    if (!newVariant) return;
    this._variant = newVariant;
    this.notifyListeners();
  }

  setTitle(newTitle: string) {
    if (!newTitle) return;
    this._title = newTitle;
    this.notifyListeners();
  }

  setViewMode(newViewMode: 'split' | 'cumulative') {
    if (!newViewMode) return;
    this._viewMode = newViewMode;
    this.notifyListeners();
  }

  subscribe(listener: () => void) {
    if (!listener) return () => {};
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in widget state listener:', error);
      }
    });
  }
}

// Update the widget state registry to be more robust
const widgetStateRegistry = new Map<string, WidgetState>();

// Add helper function for performance titles
const getPerformanceTitle = (variant: ChartVariant): string => {
  switch (variant) {
    case 'revenue':
      return 'Performance';
    case 'subscribers':
      return 'Subscribers';
    case 'mrr-growth':
      return 'MRR Growth';
    case 'refunds':
      return 'Refunds';
    case 'subscriptions':
      return 'Subscriptions';
    case 'upgrades':
      return 'Upgrades';
    default:
      return 'Performance';
  }
};

function AppContent() {
  const { dataSource, setDataSource } = useDataSource();
  const { resolvedTheme } = useTheme();
  const { backgroundIntensity, widgetIntensity, borderIntensity } = useThemeIntensity();
  const colors = getThemeValues(resolvedTheme, backgroundIntensity, widgetIntensity, borderIntensity);
  
  console.log('App component is rendering');
  
  const [error, setError] = useState<string | null>(null);
  const [adBlockerDetected, setAdBlockerDetected] = useState<boolean>(false);
  const [grid, setGrid] = useState<GridStack | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'spot' | 'margin' | 'stake'>('dashboard');
  const resizeFrameRef = useRef<number>();
  const gridRef = useRef<GridStack | null>(null);
  const gridElementRef = useRef<HTMLDivElement>(null);
  let widgetCounter = 0;

  // Apply CSS variables when theme or intensities change
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(colors.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [resolvedTheme, backgroundIntensity, widgetIntensity, borderIntensity]);

  // Define handleRemoveWidget first
  const handleRemoveWidget = useCallback((widgetId: string) => {
    if (!grid) return;
    
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return;

    // Store original grid settings
    const prevAnimate = grid.opts.animate;
    
    // Temporarily disable animations and enable float for smooth removal
    grid.setAnimation(false);
    grid.float(true);
    
    grid.batchUpdate();
    try {
      // Find the widget element with proper typing for both GridStack and DOM operations
      const widgetElement = gridElement.querySelector(`[gs-id="${widgetId}"]`) as HTMLElement;
      if (!widgetElement) return;

      // Unmount React component first
      const reactRoot = (widgetElement as any)._reactRoot;
      if (reactRoot) {
        reactRoot.unmount();
      }

      // Remove widget from grid
      grid.removeWidget(widgetElement as GridStackElement, false);
      // Remove the DOM element
      widgetElement.remove();

      // Save updated layout after removal
      const items = grid.getGridItems();
      const serializedLayout = items
        .map(item => {
          const node = item.gridstackNode;
          if (!node?.id) return null;
          
          // Get widget state if it's a performance widget
          const baseId = node.id.split('-')[0];
          const widgetState = baseId === 'performance' ? widgetStateRegistry.get(node.id) : undefined;
          const viewState = widgetState ? { chartVariant: widgetState.variant } : undefined;

          return {
            id: node.id,
            x: node.x ?? 0,
            y: node.y ?? 0,
            w: node.w ?? 2,
            h: node.h ?? 2,
            minW: node.minW ?? 2,
            minH: node.minH ?? 2,
            viewState
          };
        })
        .filter((item): item is LayoutWidget => item !== null);

      if (isValidLayout(serializedLayout)) {
        localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(serializedLayout));
        console.log('✅ Saved layout after widget removal:', serializedLayout);
      }
    } finally {
      grid.commit();
      
      // Re-enable animations and compact with a slight delay for smooth transition
      requestAnimationFrame(() => {
        grid.setAnimation(prevAnimate);
        
        // Compact the grid to fill gaps
        grid.compact();
        
        // Keep float enabled for consistent behavior
        grid.float(true);
      });
    }
  }, [grid]);

  // Create ref after the function is defined
  const handleRemoveWidgetRef = useRef(handleRemoveWidget);

  // Keep the ref up to date
  useEffect(() => {
    handleRemoveWidgetRef.current = handleRemoveWidget;
  }, [handleRemoveWidget]);

  // Now define createWidget which uses handleRemoveWidgetRef
  const createWidget = useCallback(({ widgetType, widgetId, x, y, w, h }: CreateWidgetParams) => {
    if (!widgetType || !widgetId) {
      console.error('Invalid widget parameters:', { widgetType, widgetId });
      return null;
    }

    const widgetConfig = WIDGET_REGISTRY[widgetType];
    if (!widgetConfig) {
      console.error('Unknown widget type:', widgetType);
      return null;
    }

    const baseWidgetId = widgetId.split('-')[0];
    const widgetElement = document.createElement('div');
    widgetElement.className = 'grid-stack-item';
    
    // Set grid attributes with minimum sizes from registry
    widgetElement.setAttribute('gs-id', widgetId);
    widgetElement.setAttribute('gs-x', String(x));
    widgetElement.setAttribute('gs-y', String(y));
    widgetElement.setAttribute('gs-w', String(w ?? widgetConfig.defaultSize.w));
    widgetElement.setAttribute('gs-h', String(h ?? widgetConfig.defaultSize.h));
    widgetElement.setAttribute('gs-min-w', String(widgetConfig.minSize.w));
    widgetElement.setAttribute('gs-min-h', String(widgetConfig.minSize.h));

    // Create the content wrapper
    const contentElement = document.createElement('div');
    contentElement.className = 'grid-stack-item-content';
    widgetElement.appendChild(contentElement);

    const root = createRoot(contentElement);
    (widgetElement as any)._reactRoot = root;

    try {
      // For Performance widget, create a shared state
      if (baseWidgetId === 'performance') {
        // Try to load initial variant from layout data or existing state
        let initialVariant: ChartVariant = 'revenue';
        let initialTitle = getPerformanceTitle('revenue');
        let initialViewMode: 'split' | 'cumulative' = 'split';
        const existingState = widgetStateRegistry.get(widgetId);
        
        if (existingState) {
          initialVariant = existingState.variant;
          initialTitle = existingState.title;
          initialViewMode = existingState.viewMode;
        } else {
          const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
          if (savedLayout) {
            try {
              const layout = JSON.parse(savedLayout);
              const widgetData = layout.find((item: any) => item.id === widgetId);
              if (widgetData?.viewState) {
                if (widgetData.viewState.chartVariant) {
                  initialVariant = widgetData.viewState.chartVariant;
                  initialTitle = getPerformanceTitle(widgetData.viewState.chartVariant);
                }
                if (widgetData.viewState.viewMode) {
                  initialViewMode = widgetData.viewState.viewMode;
                }
              }
            } catch (error) {
              console.error('Failed to load widget view state:', error);
            }
          }
        }

        // Create or get shared state
        let widgetState = widgetStateRegistry.get(widgetId);
        if (!widgetState) {
          widgetState = new WidgetState(initialVariant, initialTitle, initialViewMode);
          widgetStateRegistry.set(widgetId, widgetState);
        }

        root.render(
          <React.StrictMode>
            <DataSourceProvider>
              <WidgetContainer
                title={widgetState.title}
                onRemove={() => handleRemoveWidget(widgetId)}
                headerControls={true}
              >
                <widgetConfig.component
                  key={widgetId}
                  widgetId={widgetId}
                  defaultVariant={widgetState.variant}
                  defaultViewMode={widgetState.viewMode}
                  onVariantChange={(variant) => {
                    widgetState?.setVariant(variant);
                    widgetState?.setTitle(getPerformanceTitle(variant));
                  }}
                  onViewModeChange={(mode) => {
                    widgetState?.setViewMode(mode);
                  }}
                  onTitleChange={(title) => {
                    widgetState?.setTitle(title);
                  }}
                />
              </WidgetContainer>
            </DataSourceProvider>
          </React.StrictMode>
        );
      } else {
        root.render(
          <React.StrictMode>
            <DataSourceProvider>
              <WidgetContainer
                title={widgetTitles[widgetType]}
                onRemove={() => handleRemoveWidget(widgetId)}
              >
                <widgetConfig.component key={widgetId} widgetId={widgetId} />
              </WidgetContainer>
            </DataSourceProvider>
          </React.StrictMode>
        );
      }

      return widgetElement;
    } catch (error) {
      console.error('Failed to render widget:', error);
      root.unmount();
      return null;
    }
  }, [handleRemoveWidget]);

  // Check for ad blocker on mount
  useEffect(() => {
    const hasAdBlocker = document.documentElement.getAttribute('data-adblocker') === 'true';
    if (hasAdBlocker) {
      console.warn('Ad blocker detected in React component');
      setAdBlockerDetected(true);
    }
  }, []);

  const pageChangeRef = useRef<(page: 'dashboard' | 'spot' | 'margin' | 'stake') => void>();

  const getLayoutForPage = (page: 'dashboard' | 'spot' | 'margin' | 'stake') => {
    switch (page) {
      case 'dashboard':
        return dashboardLayout;
      case 'spot':
        return spotLayout;
      case 'margin':
        return marginLayout;
      case 'stake':
        return stakeLayout;
      default:
        return dashboardLayout;
    }
  };

  const handleResize = useCallback(() => {
    if (resizeFrameRef.current) {
      cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = requestAnimationFrame(() => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      if (mobile !== isMobile) {
        setIsMobile(mobile);
        if (pageChangeRef.current) {
          pageChangeRef.current(currentPage); // Re-initialize with current page
        }
      }
    });
  }, [isMobile, currentPage]);

  const handleResetLayout = useCallback(() => {
    if (!grid) return;
    
    grid.batchUpdate();
    try {
      // Use the appropriate layout based on device type
      const layoutToApply = isMobile ? mobileLayout : defaultLayout;
      localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layoutToApply));
      
      // First, remove all existing widgets and their DOM elements
      const currentWidgets = grid.getGridItems();
      currentWidgets.forEach(widget => {
        if (widget.gridstackNode?.id) {
          // Clean up widget state
          widgetStateRegistry.delete(widget.gridstackNode.id);
          // Remove the widget from GridStack
          grid.removeWidget(widget, false);
          // Also remove the DOM element
          widget.remove();
        }
      });
      
      // Clear any remaining grid-stack-item elements
      const gridElement = document.querySelector('.grid-stack');
      if (gridElement) {
        const remainingWidgets = gridElement.querySelectorAll('.grid-stack-item');
        remainingWidgets.forEach(widget => widget.remove());
      }
      
      // Now add all widgets from the appropriate layout
      layoutToApply.forEach(node => {
        const baseWidgetId = node.id.split('-')[0];
        const widgetType = widgetTypes[baseWidgetId];
        
        if (!widgetComponents[widgetType]) {
          console.warn('❌ Unknown widget type:', widgetType);
          return;
        }

        try {
          // Get widget configuration to enforce minimum sizes
          const widgetConfig = WIDGET_REGISTRY[widgetType];
          if (!widgetConfig) {
            console.warn('❌ Missing widget configuration for:', widgetType);
            return;
          }

          // Enforce minimum sizes from registry
          const width = Math.max(node.w, widgetConfig.minSize.w);
          const height = Math.max(node.h, widgetConfig.minSize.h);

          const widgetElement = createWidget({
            widgetType,
            widgetId: node.id,
            x: node.x,
            y: node.y,
            w: width,
            h: height,
            minW: widgetConfig.minSize.w,
            minH: widgetConfig.minSize.h
          });

          if (widgetElement) {
            // Add widget with enforced minimum sizes
            grid.addWidget({
              el: widgetElement,
              id: node.id,
              x: node.x,
              y: node.y,
              w: width,
              h: height,
              minW: widgetConfig.minSize.w,
              minH: widgetConfig.minSize.h,
              autoPosition: false,
              noMove: isMobile || currentPage !== 'dashboard',
              noResize: isMobile || currentPage !== 'dashboard',
              locked: isMobile || currentPage !== 'dashboard'
            } as ExtendedGridStackWidget);

            // Add resize event listener to enforce minimum sizes
            if (!isMobile && currentPage === 'dashboard') {
              const resizeHandler = (event: Event, el: GridStackNode) => {
                if (el.id === node.id && el.el) {
                  const config = WIDGET_REGISTRY[widgetType];
                  if (config) {
                    const minW = config.minSize.w;
                    const minH = config.minSize.h;
                    
                    // Enforce minimum sizes during resize
                    if ((el.w && el.w < minW) || (el.h && el.h < minH)) {
                      grid.update(el.el, {
                        w: Math.max(el.w || minW, minW),
                        h: Math.max(el.h || minH, minH),
                        autoPosition: false
                      });
                    }

                    // Update visual feedback
                    const isAtMinSize = (el.w && el.w <= minW) || (el.h && el.h <= minH);
                    if (isAtMinSize) {
                      el.el.classList.add('min-size');
                    } else {
                      el.el.classList.remove('min-size');
                    }
                  }
                }
              };

              // Remove any existing resize handler and add the new one
              grid.off('resize').on('resize', resizeHandler);
            }
          }
        } catch (error) {
          console.error('Failed to create widget:', node.id, error);
        }
      });

      // Force a complete layout recalculation
      grid.setStatic(true);
      setTimeout(() => {
        grid.setStatic(false);
        // Force compaction after a brief delay to ensure all widgets are properly positioned
        setTimeout(() => {
          grid.batchUpdate();
          try {
            grid.compact();
            // Verify final positions and sizes
            layoutToApply.forEach(node => {
              const widget = grid.getGridItems().find(w => w.gridstackNode?.id === node.id);
              if (widget && widget.gridstackNode) {
                const baseWidgetId = node.id.split('-')[0];
                const widgetType = widgetTypes[baseWidgetId];
                const widgetConfig = WIDGET_REGISTRY[widgetType];
                
                if (widgetConfig) {
                  grid.update(widget, {
                    x: node.x,
                    y: node.y,
                    w: Math.max(node.w, widgetConfig.minSize.w),
                    h: Math.max(node.h, widgetConfig.minSize.h),
                    minW: widgetConfig.minSize.w,
                    minH: widgetConfig.minSize.h,
                    autoPosition: false
                  });
                }
              }
            });
          } finally {
            grid.commit();
          }
        }, 50);
      }, 0);
    } finally {
      grid.commit();
    }
    console.log('✅ Reset layout completed');
  }, [grid, createWidget, isMobile, currentPage]);

  const handleCopyLayout = useCallback(() => {
    if (!grid) return '';
    
    const items = grid.getGridItems();
    const serializedLayout = items
      .map<SerializedLayoutWidget | null>(item => {
        const node = item.gridstackNode;
        if (!node || !node.id) return null;
        
        // Get the base widget type from the ID
        const baseId = node.id.split('-')[0];
        const widgetType = widgetTypes[baseId];
        const widgetConfig = WIDGET_REGISTRY[widgetType];
        if (!widgetConfig) return null;

        // Get widget state if it exists
        const widgetState = widgetStateRegistry.get(node.id);
        const viewState = widgetState ? { 
          chartVariant: widgetState.variant,
          viewMode: widgetState.viewMode 
        } : undefined;

        return {
          id: node.id,
          baseId,
          x: node.x ?? 0,
          y: node.y ?? 0,
          w: Math.max(node.w ?? 2, widgetConfig.minSize.w),
          h: Math.max(node.h ?? 2, widgetConfig.minSize.h),
          minW: widgetConfig.minSize.w,
          minH: widgetConfig.minSize.h,
          viewState
        };
      })
      .filter((item): item is SerializedLayoutWidget => item !== null);

    return JSON.stringify(serializedLayout);
  }, [grid]);

  const handlePasteLayout = useCallback((layoutStr: string) => {
    if (!grid) {
      console.warn('Cannot paste layout: no grid instance');
      return;
    }

    try {
      const layout = JSON.parse(layoutStr) as SerializedLayoutWidget[];
      
      // Validate layout structure
      if (!Array.isArray(layout)) {
        throw new Error('Invalid layout format');
      }

      // Ensure all widgets in the layout exist in defaultLayout
      const validLayout = layout.every(widget => {
        const baseId = widget.baseId || widget.id.split('-')[0];
        const widgetType = widgetTypes[baseId];
        const widgetConfig = WIDGET_REGISTRY[widgetType];
        if (!widgetConfig) return false;

        // Validate minimum sizes
        return widget.w >= widgetConfig.minSize.w && widget.h >= widgetConfig.minSize.h;
      });

      if (!validLayout) {
        throw new Error('Layout contains invalid widgets or sizes');
      }

      grid.batchUpdate();
      try {
        // Store the new layout
        localStorage.setItem(DASHBOARD_LAYOUT_KEY, layoutStr);
        
        // Get current widgets
        const currentWidgets = grid.getGridItems();
        const currentWidgetsMap = new Map();
        
        // Group widgets by their base ID (without timestamp)
        currentWidgets.forEach(widget => {
          const widgetId = widget.gridstackNode?.id;
          if (widgetId) {
            const baseId = widgetId.split('-')[0];
            if (!currentWidgetsMap.has(baseId)) {
              currentWidgetsMap.set(baseId, []);
            }
            currentWidgetsMap.get(baseId).push(widget);
          }
        });
        
        // Track which widgets we've updated
        const updatedWidgets = new Set<string>();
        
        // First update existing widgets
        layout.forEach(node => {
          const baseId = node.baseId || node.id.split('-')[0];
          const widgetType = widgetTypes[baseId];
          const widgetConfig = WIDGET_REGISTRY[widgetType];
          
          if (!widgetConfig) {
            console.warn('❌ Unknown widget type:', widgetType);
            return;
          }

          const existingWidgets = currentWidgetsMap.get(baseId) || [];
          const existingWidget = existingWidgets.find((w: ExtendedGridStackWidget) => w.gridstackNode?.id === node.id) || existingWidgets[0];
          
          if (existingWidget) {
            // Update position and size of existing widget, enforcing minimum sizes
            grid.update(existingWidget, {
              x: node.x,
              y: node.y,
              w: Math.max(node.w, widgetConfig.minSize.w),
              h: Math.max(node.h, widgetConfig.minSize.h),
              minW: widgetConfig.minSize.w,
              minH: widgetConfig.minSize.h,
              autoPosition: false
            });

            // Update widget state if it exists
            if (node.viewState) {
              const widgetState = widgetStateRegistry.get(node.id);
              if (widgetState) {
                widgetState.setVariant(node.viewState.chartVariant as ChartVariant);
                if (node.viewState.viewMode) {
                  widgetState.setViewMode(node.viewState.viewMode);
                }
              }
            }

            updatedWidgets.add(existingWidget.gridstackNode?.id || '');
            
            // Remove this widget from the map to track usage
            const widgetIndex = existingWidgets.indexOf(existingWidget);
            if (widgetIndex > -1) {
              existingWidgets.splice(widgetIndex, 1);
            }
          } else {
            // Create new widget if it doesn't exist
            try {
              const widgetElement = createWidget({
                widgetType,
                widgetId: node.id,
                x: node.x,
                y: node.y,
                w: Math.max(node.w, widgetConfig.minSize.w),
                h: Math.max(node.h, widgetConfig.minSize.h),
                minW: widgetConfig.minSize.w,
                minH: widgetConfig.minSize.h
              });

              if (widgetElement) {
                grid.addWidget({
                  el: widgetElement,
                  id: node.id,
                  x: node.x,
                  y: node.y,
                  w: Math.max(node.w, widgetConfig.minSize.w),
                  h: Math.max(node.h, widgetConfig.minSize.h),
                  minW: widgetConfig.minSize.w,
                  minH: widgetConfig.minSize.h,
                  autoPosition: false,
                  noMove: isMobile || currentPage !== 'dashboard',
                  noResize: isMobile || currentPage !== 'dashboard',
                  locked: isMobile || currentPage !== 'dashboard'
                } as ExtendedGridStackWidget);

                // Update widget state if it exists
                if (node.viewState) {
                  const widgetState = widgetStateRegistry.get(node.id);
                  if (widgetState) {
                    widgetState.setVariant(node.viewState.chartVariant as ChartVariant);
                    if (node.viewState.viewMode) {
                      widgetState.setViewMode(node.viewState.viewMode);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Failed to create widget:', node.id, error);
            }
          }
        });

        // Remove any widgets that aren't in the pasted layout
        currentWidgets.forEach(widget => {
          const widgetId = widget.gridstackNode?.id;
          if (widgetId && !updatedWidgets.has(widgetId)) {
            // Clean up widget state before removing
            widgetStateRegistry.delete(widgetId);
            grid.removeWidget(widget, false);
          }
        });

        // Add resize event listeners to enforce minimum sizes
        if (!isMobile && currentPage === 'dashboard') {
          grid.off('resize').on('resize', (event: Event, el: GridStackNode) => {
            if (el.id && el.el) {
              const baseId = el.id.split('-')[0];
              const widgetType = widgetTypes[baseId];
              const config = WIDGET_REGISTRY[widgetType];
              if (config) {
                const minW = config.minSize.w;
                const minH = config.minSize.h;
                
                // Enforce minimum sizes during resize
                if ((el.w && el.w < minW) || (el.h && el.h < minH)) {
                  grid.update(el.el, {
                    w: Math.max(el.w || minW, minW),
                    h: Math.max(el.h || minH, minH),
                    autoPosition: false
                  });
                }

                // Update visual feedback
                const isAtMinSize = (el.w && el.w <= minW) || (el.h && el.h <= minH);
                if (isAtMinSize) {
                  el.el.classList.add('min-size');
                } else {
                  el.el.classList.remove('min-size');
                }
              }
            }
          });
        }
      } finally {
        grid.commit();
        console.log('✅ Paste layout completed');
      }
    } catch (error) {
      console.error('Failed to paste layout:', error);
    }
  }, [grid, createWidget, isMobile, currentPage]);

  const handlePageChange = useCallback((page: 'dashboard' | 'spot' | 'margin' | 'stake') => {
    console.log('🔄 Page change requested:', { from: currentPage, to: page, hasGrid: !!grid, isMobile });
    
    // Update URL without page reload
    const newPath = page === 'dashboard' ? '/' : `/${page}`;
    window.history.pushState({}, '', newPath);
    
    // Save current layout if we're leaving dashboard
    if (currentPage === 'dashboard' && grid && grid.engine && grid.engine.nodes.length > 0) {
      try {
        const items = grid.getGridItems();
        const serializedLayout = items
          .map(item => {
            const node = item.gridstackNode;
            if (!node || !node.id) return null;
            
            // Get widget state if it's a performance widget
            const baseId = node.id.split('-')[0];
            const widgetState = baseId === 'performance' ? widgetStateRegistry.get(node.id) : undefined;
            const viewState = widgetState ? { 
              chartVariant: widgetState.variant,
              viewMode: widgetState.viewMode 
            } : undefined;

            return {
              id: node.id,
              x: node.x ?? 0,
              y: node.y ?? 0,
              w: node.w ?? 2,
              h: node.h ?? 2,
              minW: node.minW ?? 2,
              minH: node.minH ?? 2,
              viewState
            };
          })
          .filter((item): item is LayoutWidget => item !== null);

        if (isValidLayout(serializedLayout)) {
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(serializedLayout));
          console.log('✅ Saved dashboard layout:', serializedLayout);
        }
      } catch (error) {
        console.warn('Failed to save dashboard layout:', error);
      }
    }

    setCurrentPage(page);
  }, [grid, currentPage]);

  // Initialize grid when page changes
  useEffect(() => {
    try {
      if (!gridElementRef.current) {
        console.error('❌ Grid element not found');
        setError('Grid element not found. Please refresh the page.');
        return;
      }

      // Clear any existing grid
      console.log('🧹 Clearing existing grid');
      gridElementRef.current.innerHTML = '';

      // Initialize grid with options
      console.log('⚙️ Creating new grid instance');
      const computedStyle = getComputedStyle(document.documentElement);
      // Read the margin from CSS variables - default to 8px which matches our rounded style
      const margin = parseInt(computedStyle.getPropertyValue('--grid-margin') || '8', 10);
      
      const g = GridStack.init({
        cellHeight: '100px',
        margin: margin,
        column: isMobile ? 1 : 12,
        animate: true,
        draggable: {
          handle: '.widget-header',
          scroll: true,
          appendTo: 'body',
          enabled: !isMobile
        },
        resizable: {
          handles: 'e, se, s, sw, w',
          autoHide: true,
          enabled: !isMobile
        },
        disableDrag: isMobile,
        disableResize: isMobile,
        staticGrid: isMobile || currentPage !== 'dashboard',
        minRow: 1,
        alwaysShowResizeHandle: false,
        float: false,
        acceptWidgets: !isMobile,
        removable: false,
        swap: !isMobile,
        swapScroll: !isMobile,
        minWidth: 2,
        minHeight: 2
      } as GridStackOptions, gridElementRef.current);

      // Track drag state and original positions
      let isDragging = false;
      let draggedNode: GridStackNode | null = null;
      let originalPositions: Map<string, { x: number; y: number }> = new Map();

      g.on('dragstart', (event: Event, el: GridStackNode) => {
        isDragging = true;
        draggedNode = el;
        
        // Store original positions of all widgets
        originalPositions.clear();
        g.engine.nodes.forEach(node => {
          if (node.id) {
            originalPositions.set(node.id, { x: node.x || 0, y: node.y || 0 });
          }
        });
      });

      g.on('drag', (event: Event, el: GridStackNode) => {
        if (!isDragging || !draggedNode || !draggedNode.id) return;

        const draggedId = draggedNode.id;
        const draggedPos = originalPositions.get(draggedId);
        if (!draggedPos) return;

        // Find potential swap target
        const currentX = el.x || 0;
        const currentY = el.y || 0;
        const draggedW = el.w || 1;
        const draggedH = el.h || 1;

        g.engine.nodes.forEach(targetNode => {
          if (!targetNode.id || targetNode.id === draggedId) return;

          const targetPos = originalPositions.get(targetNode.id);
          if (!targetPos) return;

          // Check if widgets are the same size (for swapping)
          const sameSize = (targetNode.w === draggedW && targetNode.h === draggedH);
          
          if (sameSize) {
            const targetX = targetNode.x || 0;
            const targetY = targetNode.y || 0;

            // Calculate if we should swap
            const isOverlapping = !(currentX + draggedW <= targetX || 
                                  currentX >= targetX + (targetNode.w || 1) ||
                                  currentY + draggedH <= targetY ||
                                  currentY >= targetY + (targetNode.h || 1));

            if (isOverlapping && targetNode.el) {
              // Swap positions
              g.update(targetNode.el, {
                x: draggedPos.x,
                y: draggedPos.y,
                autoPosition: false
              });
              
              // Update stored position
              originalPositions.set(targetNode.id, { x: draggedPos.x, y: draggedPos.y });
              originalPositions.set(draggedId, { x: targetPos.x, y: targetPos.y });
            }
          }
        });
      });

      g.on('dragstop', () => {
        isDragging = false;
        draggedNode = null;
        originalPositions.clear();
        
        requestAnimationFrame(() => {
          // Only compact vertically after drag
          compactGrid(true);
        });
      });

      // Add change event handler to save layout
      g.on('change', () => {
        if (currentPage === 'dashboard') {
          const items = g.getGridItems();
          const serializedLayout = items
            .map(item => {
              const node = item.gridstackNode;
              if (!node || !node.id) return null;
              
              // Get widget state if it's a performance widget
              const baseId = node.id.split('-')[0];
              const widgetState = baseId === 'performance' ? widgetStateRegistry.get(node.id) : undefined;
              const viewState = widgetState ? { 
                chartVariant: widgetState.variant,
                viewMode: widgetState.viewMode 
              } : undefined;

              return {
                id: node.id,
                x: node.x ?? 0,
                y: node.y ?? 0,
                w: node.w ?? 2,
                h: node.h ?? 2,
                minW: node.minW ?? 2,
                minH: node.minH ?? 2,
                viewState
              };
            })
            .filter((item): item is LayoutWidget => item !== null);

          if (isValidLayout(serializedLayout)) {
            localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(serializedLayout));
            console.log('✅ Saved layout after change:', serializedLayout);
          }
        }
      });

      // Custom compaction that allows both horizontal and vertical movement
      const compactGrid = (verticalOnly: boolean = false) => {
        if (!g.engine?.nodes) return;
        
        const nodes = [...g.engine.nodes];
        if (nodes.length === 0) return;

        g.batchUpdate();
        try {
          // Sort nodes by position (top to bottom, left to right)
          nodes.sort((a, b) => {
            const aY = a.y || 0;
            const bY = b.y || 0;
            if (aY !== bY) return aY - bY;
            return (a.x || 0) - (b.x || 0);
          });
          
          nodes.forEach(node => {
            if (!node.el) return;
            
            // Try to move the widget up and optionally to the left
            let newY = node.y || 0;
            let newX = node.x || 0;
            let moved;

            do {
              moved = false;
              
              // Try moving up
              if (newY > 0) {
                const testNodeUp = { ...node, y: newY - 1, x: newX };
                const hasCollisionUp = nodes.some(other => 
                  other !== node && 
                  other.el && 
                  g.engine.collide(testNodeUp, other)
                );
                
                if (!hasCollisionUp) {
                  newY--;
                  moved = true;
                }
              }
              
              // Try moving left only if not verticalOnly mode
              if (!verticalOnly && newX > 0) {
                const testNodeLeft = { ...node, y: newY, x: newX - 1 };
                const hasCollisionLeft = nodes.some(other => 
                  other !== node && 
                  other.el && 
                  g.engine.collide(testNodeLeft, other)
                );
                
                if (!hasCollisionLeft) {
                  newX--;
                  moved = true;
                }
              }
            } while (moved);

            // Update position if changed
            if (newY !== node.y || (newX !== node.x && !verticalOnly)) {
              g.update(node.el, {
                y: newY,
                x: verticalOnly ? node.x : newX, // Preserve x position if verticalOnly
                w: node.w,
                h: node.h,
                autoPosition: false
              });
            }
          });
        } finally {
          g.commit();
        }
      };

      // Add mousedown handler to prevent dragging when text is selected
      const handleMouseDown = (e: MouseEvent) => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          // Check if we're clicking on or within selected text
          const target = e.target as HTMLElement;
          const range = selection.getRangeAt(0);
          const isSelectedText = range.intersectsNode(target);
          
          // If clicking on selected text, prevent dragging
          if (isSelectedText) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      };

      // Add touch event handlers for mobile
      const handleTouchStart = (e: TouchEvent) => {
        if (isMobile) {
          // Only prevent touch events on widget headers
          const target = e.target as HTMLElement;
          if (target.closest('.widget-header')) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      };

      if (gridElementRef.current) {
        gridElementRef.current.addEventListener('touchstart', handleTouchStart as EventListener, { passive: false });
        gridElementRef.current.addEventListener('mousedown', handleMouseDown);
      }

      // Only handle non-drag changes
      g.on('change', () => {
        if (!isDragging) {
          requestAnimationFrame(() => {
            // Only compact vertically for layout changes
            compactGrid(true);
          });
        }
      });

      // Get layout to apply based on page type
      let layoutToApply: LayoutWidget[];
      if (currentPage === 'dashboard' && !isMobile) {
        // For dashboard, try to load saved layout
        const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
        if (savedLayout) {
          try {
            const parsedLayout = JSON.parse(savedLayout);
            if (isValidLayout(parsedLayout)) {
              // Before applying the saved layout, ensure all widget states are initialized
              parsedLayout.forEach((node: LayoutWidget) => {
                const baseId = node.id.split('-')[0];
                if (baseId === 'performance') {
                  // Initialize widget state with both variant and viewMode
                  const initialVariant = node.viewState?.chartVariant || 'revenue';
                  const initialTitle = getPerformanceTitle(initialVariant);
                  const initialViewMode = node.viewState?.viewMode || 'split';
                  
                  // Create or update widget state
                  let widgetState = widgetStateRegistry.get(node.id);
                  if (!widgetState) {
                    widgetState = new WidgetState(initialVariant, initialTitle, initialViewMode);
                    widgetStateRegistry.set(node.id, widgetState);
                  } else {
                    widgetState.setVariant(initialVariant);
                    widgetState.setViewMode(initialViewMode);
                  }
                }
              });
              
              // Use the saved layout directly, preserving all widgets
              layoutToApply = parsedLayout;
              console.log('✅ Using saved dashboard layout:', layoutToApply);
            } else {
              console.warn('❌ Saved dashboard layout invalid, using default');
              layoutToApply = defaultLayout;
            }
          } catch (error) {
            console.error('Failed to parse saved dashboard layout:', error);
            layoutToApply = defaultLayout;
          }
        } else {
          // Only use default layout if no saved layout exists (first visit)
          console.log('📋 First visit - using default layout');
          layoutToApply = defaultLayout;
          // Save the default layout for future visits
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(defaultLayout));
        }
      } else if (isMobile) {
        console.log('📱 Using mobile layout');
        layoutToApply = mobileLayout;
      } else {
        // For other pages, always use their static layout
        layoutToApply = getLayoutForPage(currentPage);
        console.log(`📋 Using static layout for ${currentPage} page`);
      }

      // Apply layout
      g.batchUpdate();
      try {
        // Create and add all widgets from the layout
        layoutToApply.forEach((node: LayoutWidget) => {
          // Get the base widget type from the ID (handle both default and dynamic IDs)
          const baseWidgetId = node.id.split('-')[0];
          const widgetType = widgetTypes[baseWidgetId];
          
          if (!widgetComponents[widgetType]) {
            console.warn('❌ Unknown widget type:', widgetType);
            return;
          }

          try {
            // Get widget configuration to enforce minimum sizes
            const widgetConfig = WIDGET_REGISTRY[widgetType];
            if (!widgetConfig) {
              console.warn('❌ Missing widget configuration for:', widgetType);
              return;
            }

            // Enforce minimum sizes from registry
            const width = Math.max(node.w, widgetConfig.minSize.w);
            const height = Math.max(node.h, widgetConfig.minSize.h);

            // Create widget element with the exact ID from the layout
            const widgetElement = createWidget({
              widgetType,
              widgetId: node.id,
              x: node.x,
              y: node.y,
              w: width,
              h: height,
              minW: widgetConfig.minSize.w,
              minH: widgetConfig.minSize.h
            });

            // Add widget to grid with exact position and enforced minimum sizes
            g.addWidget({
              el: widgetElement,
              id: node.id,
              x: node.x,
              y: node.y,
              w: width,
              h: height,
              minW: widgetConfig.minSize.w,
              minH: widgetConfig.minSize.h,
              autoPosition: false,
              noMove: isMobile || currentPage !== 'dashboard',
              noResize: isMobile || currentPage !== 'dashboard',
              locked: isMobile || currentPage !== 'dashboard'
            } as ExtendedGridStackWidget);

            // Add resize event listener to enforce minimum sizes
            if (!isMobile && currentPage === 'dashboard') {
              g.on('resize', (event: Event, el: GridStackNode) => {
                if (el.id && el.el) {
                  const baseId = el.id.split('-')[0];
                  const config = WIDGET_REGISTRY[widgetTypes[baseId]];
                  if (config) {
                    const minW = config.minSize.w;
                    const minH = config.minSize.h;
                    const isAtMinSize = (el.w && el.w <= minW) || (el.h && el.h <= minH);
                    
                    // Add or remove min-size class based on current size
                    if (isAtMinSize) {
                      el.el.classList.add('min-size');
                    } else {
                      el.el.classList.remove('min-size');
                    }

                    // Enforce minimum sizes
                    if ((el.w && el.w < minW) || (el.h && el.h < minH)) {
                      g.update(el.el, {
                        w: Math.max(el.w || minW, minW),
                        h: Math.max(el.h || minH, minH)
                      });
                    }
                  }
                }
              });
            }
          } catch (error) {
            console.error('Failed to create widget:', node.id, error);
          }
        });
      } finally {
        g.commit();
      }

      gridRef.current = g;
      setGrid(g);

      return () => {
        console.log('🚮 Cleaning up grid instance');
        if (g) {
          g.destroy(false);
          if (gridElementRef.current) {
            gridElementRef.current.removeEventListener('touchstart', handleTouchStart as EventListener);
            gridElementRef.current.removeEventListener('mousedown', handleMouseDown);
          }
        }
      };
    } catch (err) {
      console.error('Failed to initialize grid:', err);
      const errorMessage = adBlockerDetected
        ? 'Ad blocker detected, which may be blocking the dashboard functionality. Please disable your ad blocker and refresh the page.'
        : 'Failed to initialize the dashboard. Please try refreshing the page.';
      setError(errorMessage);
    }
  }, [currentPage, isMobile, adBlockerDetected]);

  // Initialize pageChangeRef
  useEffect(() => {
    pageChangeRef.current = handlePageChange;
  }, [handlePageChange]);

  useEffect(() => {
    const getPageFromPath = (path: string): 'dashboard' | 'spot' | 'margin' | 'stake' => {
      const pageName = path === '/' ? 'dashboard' : path.slice(1);
      return ['dashboard', 'spot', 'margin', 'stake'].includes(pageName) 
        ? pageName as 'dashboard' | 'spot' | 'margin' | 'stake'
        : 'dashboard';
    };

    // Set initial page and initialize grid based on URL
    const initialPage = getPageFromPath(window.location.pathname);
    if (pageChangeRef.current) {
      pageChangeRef.current(initialPage);
    }

    window.addEventListener('resize', handleResize);

    // Handle browser back/forward navigation
    const handlePopState = () => {
      const newPage = getPageFromPath(window.location.pathname);
      if (newPage !== currentPage && pageChangeRef.current) {
        pageChangeRef.current(newPage);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('popstate', handlePopState);
      if (gridRef.current) {
        gridRef.current.destroy(false);
      }
    };
  }, [isMobile, currentPage, handleResize]);

  // Update the type guard function
  const isValidLayout = (layout: (LayoutItem | null)[]): layout is LayoutItem[] => {
    if (!Array.isArray(layout)) {
      return false;
    }
    
    // Filter out null values and verify all required widgets are present with valid sizes
    return layout.every(item => {
      if (!item) return false;
      
      const widgetType = widgetTypes[item.id.split('-')[0]];
      if (!widgetType) return false;
      
      const widgetConfig = WIDGET_REGISTRY[widgetType];
      if (!widgetConfig) return false;

      return (item.w ?? 0) >= widgetConfig.minSize.w && 
             (item.h ?? 0) >= widgetConfig.minSize.h;
    });
  };

  const saveLayout = () => {
    if (!grid) return;
    
    const items = grid.getGridItems();
    const serializedLayout = items
      .map(item => {
        const node = item.gridstackNode;
        if (!node?.id) return null;
        
        const baseId = node.id.split('-')[0];
        const widgetState = baseId === 'performance' ? widgetStateRegistry.get(node.id) : undefined;
        const viewState = widgetState ? { 
          chartVariant: widgetState.variant,
          viewMode: widgetState.viewMode 
        } : undefined;

        const layoutItem: BaseLayoutItem = {
          id: node.id,
          x: node.x ?? 0,
          y: node.y ?? 0,
          w: node.w ?? 2,
          h: node.h ?? 2,
          minW: node.minW,
          minH: node.minH
        };

        if (widgetState) {
          return {
            ...layoutItem,
            viewState: {
              chartVariant: widgetState.variant,
              viewMode: widgetState.viewMode
            }
          } as PerformanceLayoutItem;
        }

        return layoutItem;
      })
      .filter((item): item is LayoutItem => item !== null);

    if (isValidLayout(serializedLayout)) {
      localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(serializedLayout));
    }
  };

  const applyLayout = (layout: LayoutItem[]) => {
    if (!grid) return;
    
    grid.batchUpdate();
    try {
      layout.forEach(item => {
        const widgetType = widgetTypes[item.id.split('-')[0]];
        if (!widgetType) return;

        const widgetConfig = WIDGET_REGISTRY[widgetType];
        if (!widgetConfig) return;

        // Initialize widget state for performance widgets
        if (isPerformanceLayoutItem(item) && widgetType === 'performance') {
          const widgetState = new WidgetState(
            item.viewState.chartVariant,
            getPerformanceTitle(item.viewState.chartVariant),
            item.viewState.viewMode
          );
          widgetStateRegistry.set(item.id, widgetState);
        }

        const widgetElement = createWidget({
          widgetType,
          widgetId: item.id,
          x: item.x,
          y: item.y,
          w: Math.max(item.w, widgetConfig.minSize.w),
          h: Math.max(item.h, widgetConfig.minSize.h),
          minW: item.minW,
          minH: item.minH
        });

        if (widgetElement && grid) {
          grid.addWidget({
            el: widgetElement,
            x: item.x,
            y: item.y,
            w: Math.max(item.w, widgetConfig.minSize.w),
            h: Math.max(item.h, widgetConfig.minSize.h),
            id: item.id,
            autoPosition: false,
            noMove: isMobile || currentPage !== 'dashboard',
            noResize: isMobile || currentPage !== 'dashboard',
            locked: isMobile || currentPage !== 'dashboard'
          } as ExtendedGridStackWidget);
        }
      });
    } finally {
      if (grid) {
        grid.commit();
      }
    }
  };

  const handleAddWidget = useCallback((widgetType: string) => {
    console.log('handleAddWidget called with:', widgetType);
    if (!grid || !widgetType) {
      console.error('No grid or widget type:', { grid: !!grid, widgetType });
      return;
    }

    const widgetConfig = WIDGET_REGISTRY[widgetType];
    if (!widgetConfig) {
      console.error('Unknown widget type:', widgetType);
      return;
    }

    // Generate a unique ID for the new widget
    const timestamp = Date.now();
    const widgetId = `${widgetConfig.id}-${timestamp}`;
    console.log('Creating widget with ID:', widgetId);

    // Create the widget element
    const widgetElement = createWidget({
      widgetType,
      widgetId,
      x: 0,
      y: 0,
      w: widgetConfig.defaultSize.w,
      h: widgetConfig.defaultSize.h,
      minW: widgetConfig.minSize.w,
      minH: widgetConfig.minSize.h
    });

    if (widgetElement) {
      console.log('Widget element created, adding to grid');
      // Add the widget to the grid with auto-positioning
      grid.addWidget({
        el: widgetElement,
        id: widgetId,
        w: Math.max(widgetConfig.defaultSize.w, widgetConfig.minSize.w),
        h: Math.max(widgetConfig.defaultSize.h, widgetConfig.minSize.h),
        minW: widgetConfig.minSize.w,
        minH: widgetConfig.minSize.h,
        autoPosition: true,
        noMove: isMobile || currentPage !== 'dashboard',
        noResize: isMobile || currentPage !== 'dashboard',
        locked: isMobile || currentPage !== 'dashboard'
      } as ExtendedGridStackWidget);

      // Initialize widget state for performance widgets
      if (widgetType === 'performance') {
        const widgetState = new WidgetState();
        widgetStateRegistry.set(widgetId, widgetState);
      }

      // Save the updated layout
      const items = grid.getGridItems();
      const serializedLayout = items
        .map(item => {
          const node = item.gridstackNode;
          if (!node?.id) return null;
          
          const baseId = node.id.split('-')[0];
          const widgetState = baseId === 'performance' ? widgetStateRegistry.get(node.id) : undefined;
          const viewState = widgetState ? { 
            chartVariant: widgetState.variant,
            viewMode: widgetState.viewMode 
          } : undefined;

          return {
            id: node.id,
            x: node.x ?? 0,
            y: node.y ?? 0,
            w: node.w ?? 2,
            h: node.h ?? 2,
            minW: node.minW ?? 2,
            minH: node.minH ?? 2,
            viewState
          };
        })
        .filter((item): item is LayoutItem => item !== null);

      if (isValidLayout(serializedLayout)) {
        localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(serializedLayout));
        console.log('✅ Saved layout after adding widget:', serializedLayout);
      }
    } else {
      console.error('Failed to create widget element');
    }
  }, [grid, isMobile, currentPage, createWidget]);

  // Render error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 max-w-md">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg-base))]">
      <TopBar currentPage={currentPage} onPageChange={handlePageChange} />
      <div className="main-content h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="main-content-inner">
          <ControlBar 
            onResetLayout={handleResetLayout}
            onCopyLayout={handleCopyLayout}
            onPasteLayout={handlePasteLayout}
            onAddWidget={handleAddWidget}
            dataSource={dataSource}
            onDataSourceChange={(source) => {
              setDataSource(source);
              if (grid) {
                const items = grid.getGridItems();
                items.forEach(item => {
                  const node = item.gridstackNode;
                  if (!node?.id) return;
                  
                  const widgetContainer = document.querySelector(`[gs-id="${node.id}"]`);
                  if (widgetContainer) {
                    const root = (widgetContainer as any)._reactRoot;
                    if (root) {
                      const content = widgetContainer.querySelector('.grid-stack-item-content');
                      if (content) {
                        const baseId = node.id.split('-')[0];
                        const widgetType = widgetTypes[baseId];
                        const WidgetComponent = widgetComponents[widgetType];
                        
                        if (baseId === 'performance' || baseId === 'tradingview' || baseId === 'orderbook') {
                          root.unmount();
                          const newRoot = createRoot(content);
                          (widgetContainer as any)._reactRoot = newRoot;
                          
                          if (baseId === 'performance') {
                            const widgetState = widgetStateRegistry.get(node.id);
                            if (widgetState) {
                              const PerformanceWidgetWrapper = ({ isHeader }: { isHeader?: boolean }) => (
                                <WidgetComponent
                                  key={`${node.id}-${source}`}
                                  widgetId={node.id}
                                  headerControls={isHeader}
                                  defaultVariant={widgetState.variant}
                                  onVariantChange={(variant) => {
                                    widgetState.setVariant(variant);
                                    widgetState.setTitle(getPerformanceTitle(variant));
                                  }}
                                  onViewModeChange={(mode: 'split' | 'cumulative') => {
                                    widgetState.setViewMode(mode);
                                  }}
                                />
                              );

                              newRoot.render(
                                <React.StrictMode>
                                  <DataSourceProvider>
                                    <WidgetContainer
                                      key={`${widgetState.title}-${source}`}
                                      title={widgetState.title}
                                      onRemove={() => node.id && handleRemoveWidget(node.id)}
                                      headerControls={<PerformanceWidgetWrapper isHeader />}
                                    >
                                      <PerformanceWidgetWrapper />
                                    </WidgetContainer>
                                  </DataSourceProvider>
                                </React.StrictMode>
                              );
                            }
                          } else {
                            newRoot.render(
                              <React.StrictMode>
                                <DataSourceProvider>
                                  <WidgetContainer
                                    key={`${widgetType}-${source}`}
                                    title={widgetTitles[widgetType]}
                                    onRemove={() => node.id && handleRemoveWidget(node.id)}
                                  >
                                    <WidgetComponent key={`${node.id}-${source}`} widgetId={node.id} />
                                  </WidgetContainer>
                                </DataSourceProvider>
                              </React.StrictMode>
                            );
                          }
                        }
                      }
                    }
                  }
                });
              }
            }}
          />
          <div ref={gridElementRef} className="grid-stack" />
        </div>
      </div>
      <Toaster 
        position="bottom-right"
        expand={false}
        visibleToasts={16}
      />
    </div>
  );
}

function App() {
  return (
    <DataSourceProvider>
      <AppContent />
    </DataSourceProvider>
  );
}

export default App;