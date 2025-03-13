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

// Widget Registry - Single source of truth for widget configuration
interface BaseWidgetProps {
  className?: string;
}

interface RemovableWidgetProps extends BaseWidgetProps {
  onRemove?: () => void;
}

interface PerformanceWidgetProps extends RemovableWidgetProps {
  headerControls?: boolean;
  defaultVariant?: 'revenue' | 'subscribers' | 'mrr-growth' | 'refunds' | 'subscriptions' | 'upgrades';
  onVariantChange?: (variant: 'revenue' | 'subscribers' | 'mrr-growth' | 'refunds' | 'subscriptions' | 'upgrades') => void;
}

interface WidgetConfig {
  id: string;
  title: string;
  component: React.FC<RemovableWidgetProps | PerformanceWidgetProps>;
  defaultSize: { w: number; h: number };
}

export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  'market-overview': {
    id: 'market',
    title: 'Market Overview',
    component: MarketOverview,
    defaultSize: { w: 12, h: 4 }
  },
  'order-book': {
    id: 'orderbook',
    title: 'Order Book',
    component: OrderBook,
    defaultSize: { w: 4, h: 6 }
  },
  'recent-trades': {
    id: 'trades',
    title: 'Recent Trades',
    component: RecentTrades,
    defaultSize: { w: 12, h: 2 }
  },
  'trading-view-chart': {
    id: 'chart',
    title: 'BTC/USDT',
    component: TradingViewChart,
    defaultSize: { w: 8, h: 6 }
  },
  'trade-form': {
    id: 'tradeform',
    title: 'Trade',
    component: TradeForm,
    defaultSize: { w: 3, h: 4 }
  },
  'balances': {
    id: 'balances',
    title: 'Balances',
    component: BalancesWidget,
    defaultSize: { w: 4, h: 4 }
  },
  'performance': {
    id: 'performance',
    title: 'Performance',
    component: PerformanceWidget,
    defaultSize: { w: 8, h: 6 }
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
  gridSize?: number;
}

// Update the widgetComponents type to include the widgetId prop
const widgetComponents: Record<string, React.FC<WidgetComponentProps>> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [key, config.component])
);

const widgetTitles: Record<string, string> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [key, config.title])
);

// Default layout is now generated from registry
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
      chartVariant: 'revenue',
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
      chartVariant: 'revenue',
      viewMode: 'cumulative'
    } 
  }
];

const defaultLayout = generateDefaultLayout();

// Default desktop layout configuration for different pages
const dashboardLayout = [
  { x: 8, y: 0, w: 4, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 0, y: 4, w: 12, h: 2, id: 'trades', minW: 2, minH: 2 },
  { x: 4, y: 0, w: 4, h: 4, id: 'orderbook', minW: 2, minH: 2 },
  { x: 0, y: 0, w: 4, h: 4, id: 'balances', minW: 2, minH: 2 }
];

const spotLayout = [
  { x: 0, y: 0, w: 6, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 6, y: 0, w: 3, h: 6, id: 'orderbook', minW: 2, minH: 2 },
  { x: 9, y: 0, w: 3, h: 4, id: 'tradeform', minW: 2, minH: 2 },
  { x: 9, y: 4, w: 3, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 0, y: 6, w: 9, h: 2, id: 'trades', minW: 2, minH: 2 },
  { x: 0, y: 8, w: 4, h: 4, id: 'balances', minW: 2, minH: 2 }
];

const marginLayout = [
  { x: 0, y: 0, w: 8, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 8, y: 0, w: 4, h: 6, id: 'orderbook', minW: 2, minH: 2 },
  { x: 0, y: 6, w: 4, h: 4, id: 'tradeform', minW: 2, minH: 2 },
  { x: 4, y: 6, w: 4, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 8, y: 6, w: 4, h: 4, id: 'trades', minW: 2, minH: 2 },
  { x: 0, y: 10, w: 4, h: 4, id: 'balances', minW: 2, minH: 2 }
];

const stakeLayout = [
  { x: 0, y: 0, w: 12, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 0, y: 6, w: 4, h: 4, id: 'orderbook', minW: 2, minH: 2 },
  { x: 4, y: 6, w: 4, h: 4, id: 'tradeform', minW: 2, minH: 2 },
  { x: 8, y: 6, w: 4, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 0, y: 10, w: 12, h: 2, id: 'trades', minW: 2, minH: 2 },
  { x: 0, y: 12, w: 4, h: 4, id: 'balances', minW: 2, minH: 2 }
];

// Mobile layout configuration (single column)
const mobileLayout = [
  { x: 0, y: 0, w: 1, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 0, y: 6, w: 1, h: 6, id: 'orderbook', minW: 2, minH: 2 },
  { x: 0, y: 12, w: 1, h: 4, id: 'tradeform', minW: 2, minH: 2 },
  { x: 0, y: 16, w: 1, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 0, y: 20, w: 1, h: 4, id: 'trades', minW: 2, minH: 2 },
  { x: 0, y: 24, w: 1, h: 4, id: 'balances', minW: 2, minH: 2 },
  { x: 0, y: 28, w: 1, h: 6, id: 'performance', minW: 2, minH: 2 }
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

// Add a map to track widget grid sizes
const widgetGridSizes = new Map<string, number>();

function AppContent() {
  const { dataSource, setDataSource } = useDataSource();
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
  const createWidget = useCallback(({ widgetType, widgetId, x, y, w = 3, h = 4, minW = 2, minH = 2 }: CreateWidgetParams) => {
    if (!widgetType || !widgetId) {
      console.error('Invalid widget parameters:', { widgetType, widgetId });
      return null;
    }

    const WidgetComponent = widgetComponents[widgetType];
    if (!WidgetComponent) {
      console.error('Unknown widget type:', widgetType);
      return null;
    }

    const baseWidgetId = widgetId.split('-')[0];
    const widgetElement = document.createElement('div');
    widgetElement.className = 'grid-stack-item';
    
    // Set grid attributes
    widgetElement.setAttribute('gs-id', widgetId);
    widgetElement.setAttribute('gs-x', String(x));
    widgetElement.setAttribute('gs-y', String(y));
    widgetElement.setAttribute('gs-w', String(w));
    widgetElement.setAttribute('gs-h', String(h));
    widgetElement.setAttribute('gs-min-w', String(minW));
    widgetElement.setAttribute('gs-min-h', String(minH));

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

        const PerformanceWidgetWrapper = ({ isHeader }: { isHeader?: boolean }) => {
          const WidgetComponent = widgetComponents[baseWidgetId];
          return (
            <WidgetComponent
              key={`${widgetId}-${isHeader}`}
              widgetId={widgetId}
              headerControls={isHeader}
              defaultVariant={widgetState.variant}
              defaultViewMode={widgetState.viewMode}
              onVariantChange={(variant) => {
                widgetState.setVariant(variant);
                widgetState.setTitle(getPerformanceTitle(variant));
              }}
              onViewModeChange={(mode) => {
                widgetState.setViewMode(mode);
              }}
            />
          );
        };

        root.render(
          <React.StrictMode>
            <DataSourceProvider>
              <WidgetContainer
                key={`${widgetState.title}-${dataSource}`}
                title={widgetState.title}
                onRemove={() => {
                  if (gridRef.current) {
                    const widget = gridRef.current.getGridItems().find(w => w.gridstackNode?.id === widgetId);
                    if (widget) {
                      const reactRoot = (widget as any)._reactRoot;
                      if (reactRoot) {
                        reactRoot.unmount();
                      }
                      // Clean up widget state
                      widgetStateRegistry.delete(widgetId);
                      gridRef.current.removeWidget(widget, false);
                      widget.remove();
                    }
                  }
                }}
                headerControls={<PerformanceWidgetWrapper isHeader />}
              >
                <PerformanceWidgetWrapper />
              </WidgetContainer>
            </DataSourceProvider>
          </React.StrictMode>
        );
      } else {
        // Regular widget rendering
        root.render(
          <React.StrictMode>
            <DataSourceProvider>
              <WidgetContainer
                title={widgetTitles[widgetType]}
                onRemove={() => {
                  if (gridRef.current) {
                    const widget = gridRef.current.getGridItems().find(w => w.gridstackNode?.id === widgetId);
                    if (widget) {
                      const reactRoot = (widget as any)._reactRoot;
                      if (reactRoot) {
                        reactRoot.unmount();
                      }
                      gridRef.current.removeWidget(widget, false);
                      widget.remove();
                    }
                  }
                }}
              >
                <WidgetComponent widgetId={widgetId} />
              </WidgetContainer>
            </DataSourceProvider>
          </React.StrictMode>
        );
      }

      return widgetElement;
    } catch (error) {
      console.error('Error creating widget:', error);
      // Clean up on error
      root.unmount();
      widgetElement.remove();
      return null;
    }
  }, []);

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
      // Use the default layout directly since it already includes view states
      localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(defaultLayout));
      
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
      
      // Now add all widgets from default layout
      defaultLayout.forEach(node => {
        const widgetType = widgetTypes[node.id.split('-')[0]];
        
        if (!widgetComponents[widgetType]) {
          console.warn('❌ Unknown widget type:', widgetType);
          return;
        }

        try {
          const widgetElement = createWidget({
            widgetType,
            widgetId: node.id,
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h,
            minW: node.minW,
            minH: node.minH
          });

          if (widgetElement) {
            grid.addWidget({
              el: widgetElement,
              id: node.id,
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
              minW: node.minW,
              minH: node.minH,
              autoPosition: false,
              noMove: false,
              noResize: false,
              locked: false
            } as ExtendedGridStackWidget);

            // Update widget state if it exists
            if (node.viewState) {
              const widgetState = widgetStateRegistry.get(node.id);
              if (widgetState) {
                widgetState.setVariant(node.viewState.chartVariant as ChartVariant);
              }
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
            // Verify final positions
            defaultLayout.forEach(node => {
              const widget = grid.getGridItems().find(w => w.gridstackNode?.id === node.id);
              if (widget) {
                grid.update(widget, {
                  x: node.x,
                  y: node.y,
                  autoPosition: false
                });
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
  }, [grid, createWidget]);

  const handleCopyLayout = useCallback(() => {
    if (!grid) return '';
    
    const items = grid.getGridItems();
    const serializedLayout = items
      .map<SerializedLayoutWidget | null>(item => {
        const node = item.gridstackNode;
        if (!node || !node.id) return null;
        
        // Get the base widget type from the ID
        const baseId = node.id.split('-')[0];
        const defaultWidget = defaultLayout.find(w => w.id === baseId);
        if (!defaultWidget) return null;

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
          w: Math.max(node.w ?? 2, defaultWidget.minW ?? 2),
          h: Math.max(node.h ?? 2, defaultWidget.minH ?? 2),
          minW: defaultWidget.minW ?? 2,
          minH: defaultWidget.minH ?? 2,
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
        return defaultLayout.some(defaultWidget => defaultWidget.id === baseId);
      });

      if (!validLayout) {
        throw new Error('Layout contains invalid widgets');
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
          const existingWidgets = currentWidgetsMap.get(baseId) || [];
          const existingWidget = existingWidgets.find((w: ExtendedGridStackWidget) => w.gridstackNode?.id === node.id) || existingWidgets[0];
          
          if (existingWidget) {
            // Update position and size of existing widget
            grid.update(existingWidget, {
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
              minW: node.minW,
              minH: node.minH,
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
            const widgetType = widgetTypes[baseId];
            
            if (!widgetComponents[widgetType]) {
              console.warn('❌ Unknown widget type:', widgetType);
              return;
            }

            try {
              const widgetElement = createWidget({
                widgetType,
                widgetId: node.id,
                x: node.x,
                y: node.y,
                w: node.w,
                h: node.h,
                minW: node.minW,
                minH: node.minH
              });

              if (widgetElement) {
                grid.addWidget({
                  el: widgetElement,
                  id: node.id,
                  x: node.x,
                  y: node.y,
                  w: node.w,
                  h: node.h,
                  minW: node.minW,
                  minH: node.minH,
                  autoPosition: false,
                  noMove: false,
                  noResize: false,
                  locked: false
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
      } finally {
        grid.commit();
        console.log('✅ Paste layout completed');
      }
    } catch (error) {
      console.error('Failed to paste layout:', error);
    }
  }, [grid]);

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
          appendTo: 'body'
        },
        resizable: {
          handles: 'e, se, s, sw, w',
          autoHide: true
        },
        minRow: 1,
        staticGrid: currentPage !== 'dashboard',
        alwaysShowResizeHandle: false,
        float: false,
        acceptWidgets: true,
        removable: false,
        // @ts-ignore - GridStack types are incomplete
        swap: true,
        swapScroll: true
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

      if (gridElementRef.current) {
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
            // Create widget element with the exact ID from the layout
            const widgetElement = createWidget({
              widgetType,
              widgetId: node.id,
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
              minW: node.minW,
              minH: node.minH
            });

            // Add widget to grid with exact position
            g.addWidget({
              el: widgetElement,
              id: node.id,
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
              minW: node.minW,
              minH: node.minH,
              autoPosition: false,
              noMove: currentPage !== 'dashboard',
              noResize: currentPage !== 'dashboard',
              locked: currentPage !== 'dashboard'
            } as ExtendedGridStackWidget);
          } catch (error) {
            console.error('Failed to create widget:', node.id, error);
          }
        });
      } finally {
        g.commit();
      }

      gridRef.current = g;
      setGrid(g);

      // Add event listener for grid changes to update the gridSize prop
      g.on('change', (event, items) => {
        // Update the grid size for any balances widgets
        items.forEach(item => {
          if (item.el) {
            const widgetId = item.id?.toString() || '';
            const widgetType = widgetId.split('-')[0];
            
            // Only update BalancesWidget grid size
            if (widgetType === 'balances') {
              const w = item.w || 0;
              const h = item.h || 0;
              const widgetGridSize = w * h;
              
              console.log(`Widget ${widgetId} resized: ${w}x${h} = ${widgetGridSize}`);
              
              // Get the widget element directly from the GridStack item
              const widgetElement = item.el;
              if (!widgetElement) return;
              
              // Find the component container
              const componentContainer = widgetElement.querySelector('.widget-content');
              if (!componentContainer) return;
              
              // Get the React component instance
              const reactRoot = (componentContainer as any)._reactRootContainer;
              if (!reactRoot) return;
              
              try {
                // Re-render the widget with the updated gridSize
                reactRoot.render(
                  <React.StrictMode>
                    <DataSourceProvider>
                      <WidgetContainer 
                        title={widgetTitles['balances']}
                        onRemove={() => handleRemoveWidget(widgetId)}
                      >
                        <BalancesWidget 
                          widgetId={widgetId} 
                          gridSize={widgetGridSize} 
                        />
                      </WidgetContainer>
                    </DataSourceProvider>
                  </React.StrictMode>
                );
              } catch (error) {
                console.error('Error updating balances widget after resize:', error);
              }
            }
          }
        });
      });

      // Add a change listener to update grid sizes
      if (grid) {
        grid.on('change', (event, items) => {
          items.forEach(item => {
            const id = item.id?.toString();
            if (id) {
              const w = item.w || 0;
              const h = item.h || 0;
              widgetGridSizes.set(id, w * h);
              console.log(`Updated grid size for ${id}: ${w}x${h} = ${w * h}`);
            }
          });
        });
      }

      return () => {
        console.log('🚮 Cleaning up grid instance');
        if (g) {
          g.destroy(false);
          if (gridElementRef.current) {
            gridElementRef.current.removeEventListener('mousedown', handleMouseDown);
          }
        }
        g.off('change');
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

  const isValidLayout = (layout: unknown): layout is LayoutWidget[] => {
    if (!Array.isArray(layout)) {
      console.warn('Layout is not an array');
      return false;
    }
    
    // Get all valid base widget IDs
    const validBaseIds = Object.values(widgetIds);
    
    // Verify each widget has valid properties and minimum sizes
    return layout.every(widget => {
      // Get base widget type from ID (handle both default and dynamic IDs)
      const baseId = widget.id?.split('-')[0];
      const isValidBaseType = baseId && validBaseIds.includes(baseId);
      
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
        widget.w >= (widget.minW ?? 2) &&
        widget.h >= (widget.minH ?? 2) &&
        isValidBaseType &&
        hasValidViewState
      );

      if (!isValid) {
        console.warn('Invalid widget in layout:', widget, { baseId, isValidBaseType, hasValidViewState });
      }
      return isValid;
    });
  };

  useEffect(() => {
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return;

    let previewX = 0;
    let previewY = 0;

    // Add drop event handlers with proper types
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';

      // Check if we're over the dropdown menu
      const dropdownMenu = document.querySelector('[role="menu"]');
      if (dropdownMenu && dropdownMenu.contains(e.target as Node)) {
        cleanupPreview();
        return;
      }

      // Calculate grid position
      const rect = gridElement.getBoundingClientRect();
      previewX = Math.floor((e.clientX - rect.left) / (rect.width / 12));
      previewY = Math.floor((e.clientY - rect.top) / 150);

      // Create or update preview element
      let previewElement = document.querySelector('.widget-drag-preview');
      if (!previewElement) {
        previewElement = document.createElement('div');
        previewElement.className = 'widget-drag-preview grid-stack-item';
        previewElement.setAttribute('gs-w', '3');
        previewElement.setAttribute('gs-h', '4');
        previewElement.setAttribute('gs-no-resize', 'true');
        previewElement.setAttribute('gs-no-move', 'true');
        
        const content = document.createElement('div');
        content.className = 'grid-stack-item-content';
        previewElement.appendChild(content);
        
        // Add the preview to the grid
        gridElement.appendChild(previewElement);
        
        // Initialize it as a grid item with specific coordinates
        if (gridRef.current) {
          gridRef.current.addWidget({
            el: previewElement as HTMLElement,
            x: previewX,
            y: previewY,
            w: 3,
            h: 4,
            autoPosition: false,
            noResize: true,
            noMove: true
          } as ExtendedGridStackWidget);
        }
      } else {
        // Update position through GridStack
        if (gridRef.current) {
          gridRef.current.update(previewElement as HTMLElement, {
            x: previewX,
            y: previewY
          });
        }
      }
    };

    const cleanupPreview = () => {
      const previewElement = document.querySelector('.widget-drag-preview');
      if (previewElement && gridRef.current) {
        // Add removing class to trigger transition
        previewElement.classList.add('removing');
        
        // Remove from grid immediately to prevent layout issues
        gridRef.current.removeWidget(previewElement as HTMLElement, false);
        
        // Wait for transition to complete before removing from DOM
        setTimeout(() => {
          if (previewElement.parentNode) {
            previewElement.remove();
          }
          // Ensure grid is properly updated
          gridRef.current?.compact();
        }, 200); // Match this with the CSS transition duration
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Check if we're entering the dropdown menu
      const dropdownMenu = document.querySelector('[role="menu"]');
      if (dropdownMenu && dropdownMenu.contains(e.relatedTarget as Node)) {
        cleanupPreview();
        return;
      }

      // Only remove if we're actually leaving the grid area
      const rect = gridElement.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        cleanupPreview();
      }
    };

    const handleDragEnd = () => {
      cleanupPreview();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      
      const widgetType = e.dataTransfer?.getData('widget/type') || '';
      if (!widgetType || !gridRef.current || !widgetComponents[widgetType]) {
        return;
      }

      const grid = gridRef.current;
      
      // Store original grid settings
      const prevAnimate = grid.opts.animate;
      
      // Disable animations temporarily
      grid.setAnimation(false);
      grid.setStatic(true);
      grid.float(true);
      
      grid.batchUpdate();
      try {
        // Clean up preview first, but keep its position
        const previewElement = document.querySelector('.widget-drag-preview');
        const previewX = previewElement ? parseInt(previewElement.getAttribute('gs-x') || '0') : 0;
        const previewY = previewElement ? parseInt(previewElement.getAttribute('gs-y') || '0') : 0;
        
        if (previewElement) {
          grid.removeWidget(previewElement as HTMLElement, false);
          previewElement.remove();
        }

        const baseWidgetId = widgetIds[widgetType];
        const widgetId = `${baseWidgetId}-${Date.now()}`;
        
        const widgetElement = createWidget({
          widgetType,
          widgetId,
          x: previewX,
          y: previewY
        });

        // Add widget with consistent settings
        grid.addWidget({
          el: widgetElement,
          x: previewX,
          y: previewY,
          w: 3,
          h: 4,
          minW: 2,
          minH: 2,
          id: widgetId,
          autoPosition: false,
          noMove: false,
          float: true
        } as ExtendedGridStackWidget);

        // Save updated layout
        const items = grid.getGridItems();
        const serializedLayout = items
          .map(item => {
            const node = item.gridstackNode;
            if (!node || typeof node.id !== 'string') return null;
            return {
              id: node.id,
              x: node.x ?? 0,
              y: node.y ?? 0,
              w: node.w ?? 2,
              h: node.h ?? 2,
              minW: node.minW ?? 2,
              minH: node.minH ?? 2
            };
          })
          .filter((item): item is LayoutWidget => item !== null);

        if (isValidLayout(serializedLayout)) {
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(serializedLayout));
          console.log('✅ Saved layout after drop:', serializedLayout);
        }
      } finally {
        grid.commit();
        
        // Restore grid settings with a slight delay
        requestAnimationFrame(() => {
          grid.setAnimation(prevAnimate);
          grid.setStatic(false);
          grid.float(false); // Ensure float is disabled after drop
          grid.compact(); // Force compaction after drop
        });
      }
    };

    // Add event listeners with proper type casting
    gridElement.addEventListener('dragover', handleDragOver as unknown as EventListener);
    gridElement.addEventListener('dragleave', handleDragLeave as unknown as EventListener);
    gridElement.addEventListener('dragend', handleDragEnd);
    gridElement.addEventListener('drop', handleDrop as unknown as EventListener);

    return () => {
      gridElement.removeEventListener('dragover', handleDragOver as unknown as EventListener);
      gridElement.removeEventListener('dragleave', handleDragLeave as unknown as EventListener);
      gridElement.removeEventListener('dragend', handleDragEnd);
      gridElement.removeEventListener('drop', handleDrop as unknown as EventListener);
      cleanupPreview();
    };
  }, []);

  // Add handleAddWidget function
  const handleAddWidget = useCallback((widgetType: string) => {
    if (!grid) return;
    
    const widgetId = `${widgetType}-${Date.now()}`;
    const widgetConfig = WIDGET_REGISTRY[widgetType];
    
    if (!widgetConfig) {
      console.error('Unknown widget type:', widgetType);
      return;
    }

    // Initialize widget state if it's a performance widget
    if (widgetType === 'performance') {
      const initialVariant: ChartVariant = 'revenue';
      const initialTitle = getPerformanceTitle(initialVariant);
      const initialViewMode: 'split' | 'cumulative' = 'split';
      const widgetState = new WidgetState(initialVariant, initialTitle, initialViewMode);
      widgetStateRegistry.set(widgetId, widgetState);
    }

    // Create widget at the front (top-left)
    const newWidget = createWidget({
      widgetType,
      widgetId,
      x: 0,
      y: 0,
      w: widgetConfig.defaultSize.w,
      h: widgetConfig.defaultSize.h,
      minW: 2,
      minH: 2
    });

    if (newWidget) {
      // Add to grid
      grid.addWidget(newWidget);
      
      // Compact the grid to fill gaps
      grid.compact();
      
      // Save the updated layout
      const items = grid.getGridItems();
      const serializedLayout = items
        .map(item => {
          const node = item.gridstackNode;
          if (!node?.id) return null;
          
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
      }
    }
  }, [grid]);

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
      <div className="main-content">
        <div className="main-content-inner">
          <ControlBar 
            onResetLayout={handleResetLayout}
            onCopyLayout={handleCopyLayout}
            onPasteLayout={handlePasteLayout}
            onAddWidget={handleAddWidget}
            dataSource={dataSource}
            onDataSourceChange={(source) => {
              // First update the context
              setDataSource(source);
              
              // Force re-render of all widgets by unmounting and remounting
              if (grid) {
                const items = grid.getGridItems();
                items.forEach(item => {
                  const node = item.gridstackNode;
                  if (!node?.id) return;
                  
                  const widgetContainer = document.querySelector(`[gs-id="${node.id}"]`);
                  if (widgetContainer) {
                    const root = (widgetContainer as any)._reactRoot;
                    if (root) {
                      // Unmount first to clear any cached state
                      root.unmount();
                      
                      // Create a new root to force a fresh mount
                      const newRoot = createRoot(widgetContainer);
                      (widgetContainer as any)._reactRoot = newRoot;
                      
                      if (node.id.split('-')[0] === 'performance') {
                        const widgetState = widgetStateRegistry.get(node.id);
                        if (widgetState) {
                          const PerformanceWidgetWrapper = ({ isHeader }: { isHeader?: boolean }) => {
                            const WidgetComponent = widgetComponents[node.id.split('-')[0]];
                            return (
                              <WidgetComponent
                                key={`${node.id}-${source}`}
                                widgetId={node.id}
                                headerControls={isHeader}
                                defaultVariant={widgetState.variant}
                                defaultViewMode={widgetState.viewMode}
                                onVariantChange={(variant) => {
                                  widgetState.setVariant(variant);
                                  widgetState.setTitle(getPerformanceTitle(variant));
                                }}
                                onViewModeChange={(mode) => {
                                  widgetState.setViewMode(mode);
                                }}
                              />
                            );
                          };

                          newRoot.render(
                            <React.StrictMode>
                              <DataSourceProvider>
                                <WidgetContainer
                                  key={`${widgetState.title}-${source}`}
                                  title={widgetState.title}
                                  onRemove={() => handleRemoveWidget(node.id)}
                                  headerControls={<PerformanceWidgetWrapper isHeader />}
                                >
                                  <PerformanceWidgetWrapper />
                                </WidgetContainer>
                              </DataSourceProvider>
                            </React.StrictMode>
                          );
                        }
                      } else {
                        // Get the current grid size (or use initial if not set)
                        const currentGridSize = widgetGridSizes.get(node.id) || (node.w * node.h);
                        
                        newRoot.render(
                          <React.StrictMode>
                            <DataSourceProvider>
                              <WidgetContainer
                                key={`${node.id}-${source}`}
                                title={widgetTitles[node.id.split('-')[0]]}
                                onRemove={() => handleRemoveWidget(node.id)}
                              >
                                {(() => {
                                  const WidgetComponent = widgetComponents[node.id.split('-')[0]];
                                  return node.id.split('-')[0] === 'balances' ? (
                                    <WidgetComponent 
                                      key={`${node.id}-${source}`} 
                                      widgetId={node.id} 
                                      gridSize={currentGridSize} 
                                    />
                                  ) : (
                                    <WidgetComponent key={`${node.id}-${source}`} widgetId={node.id} />
                                  );
                                })()}
                              </WidgetContainer>
                            </DataSourceProvider>
                          </React.StrictMode>
                        );
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