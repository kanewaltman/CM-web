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
import { Breakdown } from './components/Breakdown';
import MarketsWidget from './components/MarketsWidget';

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
  minSize: { w: number; h: number };
}

export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  'market-overview': {
    id: 'market',
    title: 'Market Overview',
    component: MarketOverview,
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 6 }
  },
  'order-book': {
    id: 'orderbook',
    title: 'Order Book',
    component: OrderBook,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 4, h: 6 }
  },
  'recent-trades': {
    id: 'trades',
    title: 'Recent Trades',
    component: RecentTrades,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 6 }
  },
  'trading-view-chart': {
    id: 'chart',
    title: 'BTC/USDT',
    component: TradingViewChart,
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 6, h: 6 }
  },
  'trade-form': {
    id: 'tradeform',
    title: 'Trade',
    component: TradeForm,
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 6, h: 6 }
  },
  'balances': {
    id: 'balances',
    title: 'Balances',
    component: BalancesWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 }
  },
  'markets': {
    id: 'markets',
    title: 'Markets',
    component: MarketsWidget,
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 4, h: 3 }
  },
  'performance': {
    id: 'performance',
    title: 'Performance',
    component: PerformanceWidget,
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 4, h: 4 }
  },
  'treemap': {
    id: 'treemap',
    title: 'Breakdown',
    component: Breakdown,
    defaultSize: { w: 6, h: 6 },
    minSize: { w: 4, h: 4 }
  }
};

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
  defaultViewMode?: 'split' | 'cumulative';
  onViewModeChange?: (mode: 'split' | 'cumulative') => void;
  onTitleChange?: (title: string) => void;
  onDateRangeChange?: (dateRange: { from: Date; to: Date } | undefined) => void;
  dateRange?: { from: Date; to: Date };
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
  },
  { 
    id: 'treemap', 
    x: 8, 
    y: 6, 
    w: 4, 
    h: 4, 
    minW: 2, 
    minH: 2 
  }
];

const defaultLayout: LayoutWidget[] = [
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
  }
];

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
    chartVariant: ChartVariant;
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
  private _dateRange: { from: Date; to: Date };

  constructor(
    initialVariant: ChartVariant = 'revenue', 
    initialTitle: string = 'Performance', 
    initialViewMode: 'split' | 'cumulative' = 'split',
    initialDateRange?: { from: Date; to: Date }
  ) {
    this._variant = initialVariant;
    this._title = initialTitle;
    this._viewMode = initialViewMode;
    
    // Set default date range to last 7 days if not provided
    const today = new Date();
    this._dateRange = initialDateRange || {
      from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
      to: today
    };
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
  
  get dateRange(): { from: Date; to: Date } {
    return { 
      from: new Date(this._dateRange.from),
      to: new Date(this._dateRange.to)
    };
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
  
  setDateRange(newRange: { from: Date; to: Date }) {
    if (!newRange?.from || !newRange?.to) return;
    this._dateRange = {
      from: new Date(newRange.from),
      to: new Date(newRange.to)
    };
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
    if (!grid) {
      console.error('Cannot remove widget: no grid instance');
      return;
    }
    
    console.log('handleRemoveWidget called for widgetId:', widgetId, 'grid exists:', !!grid);
    
    const widget = grid.getGridItems().find(w => w.gridstackNode?.id === widgetId);
    if (!widget) {
      console.error('Widget not found for removal:', widgetId);
      return;
    }

    // Store the previous grid state for animations and float
    const prevAnimate = grid.opts.animate;
    const prevFloat = grid.opts.float;
    
    // Temporarily disable animations and float for reliable compaction
    grid.batchUpdate();
    try {
      // Disable animations during removal for smoother operation
      grid.setAnimation(false);
      grid.float(false);
      
      // Remove the specific widget
      grid.removeWidget(widget, false);
      
      // Unmount React component if it exists
      const reactRoot = (widget as any)._reactRoot;
      if (reactRoot) {
        reactRoot.unmount();
      }
      
      // Clean up widget state for performance widgets
      widgetStateRegistry.delete(widgetId);
      
      // Remove the DOM element to ensure clean removal
      (widget as unknown as HTMLElement).remove();
      
      // Compact the grid to fill gaps
      grid.compact();
      
      // Save the updated layout
      const items = grid.getGridItems();
      const serializedLayout = items
        .map((item): LayoutWidget | null => {
          const node = item.gridstackNode;
          if (!node?.id) return null;
          
          const baseId = node.id.split('-')[0];
          const widgetType = widgetTypes[baseId];
          const widgetConfig = WIDGET_REGISTRY[widgetType];
          const viewState = widgetStateRegistry.get(node.id) ? {
            chartVariant: widgetStateRegistry.get(node.id)!.variant,
            viewMode: widgetStateRegistry.get(node.id)!.viewMode
          } : undefined;

          return {
            id: node.id,
            x: node.x ?? 0,
            y: node.y ?? 0,
            w: Math.max(node.w ?? 2, widgetConfig?.minSize.w || 2),
            h: Math.max(node.h ?? 2, widgetConfig?.minSize.h || 2),
            minW: widgetConfig?.minSize.w || 2,
            minH: widgetConfig?.minSize.h || 2,
            viewState
          } as LayoutWidget;
        })
        .filter((item): item is LayoutWidget => item !== null);

      if (isValidLayout(serializedLayout)) {
        localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(serializedLayout));
        console.log('✅ Saved layout after widget removal:', serializedLayout);
      }
    } finally {
      grid.commit();
      
      // Re-enable animations and restore float settings with a slight delay for smooth transition
      setTimeout(() => {
        grid.setAnimation(prevAnimate);
        grid.float(prevFloat === undefined ? false : prevFloat);
        
        // Compact the grid to fill any gaps cleanly
        grid.compact();
      }, 50);
    }
  }, [grid, widgetStateRegistry, widgetTypes]);

  // Create ref after the function is defined
  const handleRemoveWidgetRef = useRef(handleRemoveWidget);

  // Keep the ref up to date
  useEffect(() => {
    handleRemoveWidgetRef.current = handleRemoveWidget;
  }, [handleRemoveWidget]);

  // Define renderWidgetComponent first before createWidget
  const renderWidgetComponent = useCallback((el: HTMLElement, widgetId: string, widgetType: string, options?: { forHeader?: boolean }) => {
    const baseId = widgetId.split('-')[0]; 
    let WidgetComponent = widgetComponents[widgetType];
    if (!WidgetComponent) return;
    
    // Add specific debug for treemap widgets
    if (widgetType === 'treemap') {
      console.log('Rendering treemap widget with ID:', widgetId, 'and onRemove handler:', !!handleRemoveWidget);
    }
    
    const root = createRoot(el);
    (el.closest('.grid-stack-item') as any)._reactRoot = root;

    console.log(`[App] Rendering widget: ${widgetId} (type: ${widgetType}) with dataSource: ${dataSource}`);
    
    // Create a consistent removeHandler for all widget types
    const removeHandler = () => {
      console.log('Widget remove triggered for:', widgetId, 'type:', widgetType);
      if (widgetType === 'treemap') {
        console.log('Removing treemap widget with ID:', widgetId);
      }
      handleRemoveWidgetRef.current(widgetId);
      return true; // Always return true to indicate success
    };
      
    if (baseId === 'performance') {
      const widgetState = widgetStateRegistry.get(widgetId) || 
        new WidgetState(
          'revenue', 
          getPerformanceTitle('revenue'), 
          'split',
          { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() }
        );
      
      widgetStateRegistry.set(widgetId, widgetState);
      
      const PerformanceWidgetWrapper = ({ isHeader }: { isHeader?: boolean }) => (
        <WidgetComponent
          key={`${widgetId}-${dataSource}`}
          widgetId={widgetId}
          headerControls={isHeader}
          defaultVariant={widgetState.variant}
          onVariantChange={(variant) => {
            widgetState.setVariant(variant);
            widgetState.setTitle(getPerformanceTitle(variant));
          }}
          defaultViewMode={widgetState.viewMode}
          onViewModeChange={(mode: 'split' | 'cumulative') => {
            widgetState.setViewMode(mode);
          }}
          onTitleChange={(newTitle) => {
            widgetState.setTitle(newTitle);
          }}
          dateRange={widgetState.dateRange}
          onDateRangeChange={(newRange) => {
            if (newRange) widgetState.setDateRange(newRange);
          }}
        />
      );
      
      root.render(
        <React.StrictMode>
          <DataSourceProvider>
            <WidgetContainer
              key={`${widgetState.title}-${dataSource}`}
              title={widgetState.title}
              onRemove={removeHandler}
              headerControls={options?.forHeader ? <PerformanceWidgetWrapper isHeader /> : undefined}
            >
              <PerformanceWidgetWrapper />
            </WidgetContainer>
          </DataSourceProvider>
        </React.StrictMode>
      );
    } else {
      // Normal widget rendering
      root.render(
        <React.StrictMode>
          <DataSourceProvider>
            <WidgetContainer
              key={`${widgetType}-${dataSource}`}
              title={widgetTitles[widgetType]}
              onRemove={removeHandler}
            >
              <WidgetComponent 
                key={`${widgetId}-${dataSource}`} 
                widgetId={widgetId}
                onRemove={removeHandler} 
              />
            </WidgetContainer>
          </DataSourceProvider>
        </React.StrictMode>
      );
    }
  }, [dataSource, widgetComponents, widgetTitles, handleRemoveWidget, widgetStateRegistry]);

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

    // Get the widget config
    const widgetConfig = WIDGET_REGISTRY[widgetType];
    // Ensure we're using configuration-defined minimum sizes
    const effectiveMinW = widgetConfig ? widgetConfig.minSize.w : minW;
    const effectiveMinH = widgetConfig ? widgetConfig.minSize.h : minH;

    // Debug logging for the treemap widget
    if (widgetType === 'treemap') {
      console.log('Creating treemap widget:', { 
        id: widgetId, 
        size: { w, h }, 
        minSize: { w: effectiveMinW, h: effectiveMinH },
        configMinSize: widgetConfig ? widgetConfig.minSize : 'not found'
      });
    }

    const baseWidgetId = widgetId.split('-')[0];
    const widgetElement = document.createElement('div');
    widgetElement.className = 'grid-stack-item';
    
    // Set grid attributes with effective minimum sizes
    widgetElement.setAttribute('gs-id', widgetId);
    widgetElement.setAttribute('gs-x', String(x));
    widgetElement.setAttribute('gs-y', String(y));
    widgetElement.setAttribute('gs-w', String(w));
    widgetElement.setAttribute('gs-h', String(h));
    widgetElement.setAttribute('gs-min-w', String(effectiveMinW));
    widgetElement.setAttribute('gs-min-h', String(effectiveMinH));

    // Create the content wrapper
    const contentElement = document.createElement('div');
    contentElement.className = 'grid-stack-item-content';
    widgetElement.appendChild(contentElement);

    const root = createRoot(contentElement);
    (widgetElement as any)._reactRoot = root;

    try {
      // Create a direct removeHandler function that will be passed to all widgets
      const removeHandler = () => {
        console.log(`Widget removal triggered for: ${widgetId} (type: ${widgetType})`);
        handleRemoveWidgetRef.current(widgetId);
        return true; // Always return true to indicate success
      };

      if (baseWidgetId === 'performance') {
        // Try to load initial variant from layout data or existing state
        let initialVariant: ChartVariant = 'revenue';
        let initialTitle = getPerformanceTitle('revenue');
        let initialViewMode: 'split' | 'cumulative' = 'split';
        
        // Default date range (last 7 days)
        const today = new Date();
        let initialDateRange = {
          from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
          to: today
        };
        
        const existingState = widgetStateRegistry.get(widgetId);
        
        if (existingState) {
          initialVariant = existingState.variant;
          initialTitle = existingState.title;
          initialViewMode = existingState.viewMode;
          initialDateRange = existingState.dateRange; // Get dateRange from existing state
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
                // Try to load date range from saved layout
                if (widgetData.viewState.dateRange) {
                  try {
                    initialDateRange = {
                      from: new Date(widgetData.viewState.dateRange.from),
                      to: new Date(widgetData.viewState.dateRange.to)
                    };
                    console.log(`Loaded date range from layout for ${widgetId}:`, {
                      from: initialDateRange.from.toISOString(),
                      to: initialDateRange.to.toISOString()
                    });
                  } catch (error) {
                    console.error('Failed to parse date range from layout:', error);
                  }
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
          widgetState = new WidgetState(initialVariant, initialTitle, initialViewMode, initialDateRange);
          widgetStateRegistry.set(widgetId, widgetState);
        } else {
          widgetState.setVariant(initialVariant);
          widgetState.setViewMode(initialViewMode);
        }

        const PerformanceWidgetWrapper: React.FC<{ isHeader?: boolean }> = ({ isHeader }) => {
          const [variant, setVariant] = useState<ChartVariant>(widgetState.variant);
          const [title, setTitle] = useState(widgetState.title);
          const [viewMode, setViewMode] = useState<'split' | 'cumulative'>(widgetState.viewMode);
          const [dateRange, setDateRange] = useState(widgetState.dateRange);

          useEffect(() => {
            // Initial state sync
            setVariant(widgetState.variant);
            setTitle(widgetState.title);
            setViewMode(widgetState.viewMode);
            setDateRange(widgetState.dateRange);

            // Subscribe to state changes
            const unsubscribe = widgetState.subscribe(() => {
              setVariant(widgetState.variant);
              setTitle(widgetState.title);
              setViewMode(widgetState.viewMode);
              setDateRange(widgetState.dateRange);
            });

            return unsubscribe;
          }, []);

          const handleVariantChange = useCallback((newVariant: ChartVariant) => {
            if (!newVariant) return;
            
            // Get new title first
            const newTitle = getPerformanceTitle(newVariant);
    
            // Force immediate re-render of the container by updating state first
            setVariant(newVariant);
            setTitle(newTitle);

            // Update shared state
            widgetState.setVariant(newVariant);
            widgetState.setTitle(newTitle);
      
            // Force a re-render of the widget container
            const widgetContainer = document.querySelector(`[gs-id="${widgetId}"]`);
            if (widgetContainer) {
              const root = (widgetContainer as any)._reactRoot;
              if (root) {
                root.render(
                  <React.StrictMode>
                    <DataSourceProvider>
                      <WidgetContainer
                        key={newTitle} // Force re-render with new title
                        title={newTitle}
                        onRemove={removeHandler}
                        headerControls={<PerformanceWidgetWrapper isHeader />}
                      >
                        <PerformanceWidgetWrapper />
                      </WidgetContainer>
                    </DataSourceProvider>
                  </React.StrictMode>
                );
              }
            }

            // Save to layout data
            const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
            if (savedLayout) {
              try {
                const layout = JSON.parse(savedLayout);
                const widgetIndex = layout.findIndex((item: any) => item.id === widgetId);
                if (widgetIndex !== -1) {
                  layout[widgetIndex] = {
                    ...layout[widgetIndex],
                    viewState: {
                      ...layout[widgetIndex].viewState,
                      chartVariant: newVariant
                    }
                  };
                  localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
                }
              } catch (error) {
                console.error('Failed to save widget view state:', error);
              }
            }
          }, []);

          const handleViewModeChange = useCallback((newViewMode: 'split' | 'cumulative') => {
            widgetState.setViewMode(newViewMode);

            // Save to layout data
            const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
            if (savedLayout) {
              try {
                const layout = JSON.parse(savedLayout);
                const widgetIndex = layout.findIndex((item: any) => item.id === widgetId);
                if (widgetIndex !== -1) {
                  layout[widgetIndex] = {
                    ...layout[widgetIndex],
                    viewState: {
                      ...layout[widgetIndex].viewState,
                      chartVariant: widgetState.variant,
                      viewMode: newViewMode
                    }
                  };
                  localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
                }
              } catch (error) {
                console.error('Failed to save widget view state:', error);
              }
            }
          }, []);

          const handleDateRangeChange = useCallback((newDateRange: { from: Date; to: Date } | undefined) => {
            if (!newDateRange?.from || !newDateRange?.to) return;
            
            console.log(`PerformanceWidgetWrapper: Date range changed to:`, {
              from: newDateRange.from.toISOString(),
              to: newDateRange.to.toISOString(),
              widgetId,
              isHeader
            });
            
            // Update local state first for immediate UI update
            setDateRange(newDateRange);
      
            // Update shared state
            widgetState.setDateRange(newDateRange);
            
            // Save to layout data
            const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
            if (savedLayout) {
              try {
                const layout = JSON.parse(savedLayout);
                const widgetIndex = layout.findIndex((item: any) => item.id === widgetId);
                if (widgetIndex !== -1) {
                  layout[widgetIndex] = {
                    ...layout[widgetIndex],
                    viewState: {
                      ...layout[widgetIndex].viewState,
                      chartVariant: widgetState.variant,
                      viewMode: widgetState.viewMode,
                      dateRange: {
                        from: newDateRange.from.toISOString(),
                        to: newDateRange.to.toISOString()
                      }
                    }
                  };
                  localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
                }
              } catch (error) {
                console.error('Failed to save widget date range state:', error);
              }
            }
          }, [isHeader, widgetId]);
      
          return (
            <WidgetComponent 
              widgetId={widgetId} 
              headerControls={isHeader}
              defaultVariant={variant}
              defaultViewMode={viewMode}
              onVariantChange={handleVariantChange}
              onViewModeChange={handleViewModeChange}
              onDateRangeChange={handleDateRangeChange}
              dateRange={dateRange}
              onTitleChange={(newTitle) => {
                widgetState.setTitle(newTitle);
              }}
            />
          );
        };
      
        root.render(
          <React.StrictMode>
            <DataSourceProvider>
              <WidgetContainer
                key={widgetState.title}
                title={widgetState.title}
                onRemove={removeHandler}
                headerControls={<PerformanceWidgetWrapper isHeader />}
              >
                <PerformanceWidgetWrapper />
              </WidgetContainer>
            </DataSourceProvider>
          </React.StrictMode>
        );
      } else {
        // Additional logging for treemap widget
        if (widgetType === 'treemap') {
          console.log(`Treemap widget ${widgetId} being created with onRemove:`, !!removeHandler);
        }
      
        // Render component with onRemove passed correctly
        root.render(
          <React.StrictMode>
            <DataSourceProvider>
              <WidgetContainer
                title={widgetTitles[widgetType]}
                onRemove={removeHandler}
              >
                <WidgetComponent 
                  widgetId={widgetId} 
                  onRemove={removeHandler}
                />
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
  }, [grid, handleRemoveWidgetRef, widgetComponents, widgetTitles]);

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
      .map((item): SerializedLayoutWidget | null => {
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
          .map((item): LayoutWidget | null => {
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
        float: false, // Ensure float is false for proper compaction
        acceptWidgets: !isMobile,
        removable: false,
        swap: !isMobile,
        swapScroll: !isMobile,
        minWidth: 2,
        minHeight: 2
      } as GridStackOptions, gridElementRef.current);

      // Add a dedicated resize handler to enforce minimum sizes
      g.on('resize', (event: Event, el: GridStackNode) => {
        if (el.id && el.el) {
          const baseId = el.id.split('-')[0];
          const widgetType = widgetTypes[baseId];
          const config = WIDGET_REGISTRY[widgetType];
          
          if (config) {
            const minW = config.minSize.w;
            const minH = config.minSize.h;
            
            // Special logging for treemap widget
            if (widgetType === 'treemap') {
              console.log('Resizing treemap widget:', {
                id: el.id,
                currentSize: { w: el.w, h: el.h },
                minSize: { w: minW, h: minH }
              });
            }
            
            // Enforce minimum sizes
            if ((el.w && el.w < minW) || (el.h && el.h < minH)) {
              console.log(`Enforcing minimum size for ${widgetType} widget:`, { 
                id: el.id, 
                newSize: { w: Math.max(el.w || minW, minW), h: Math.max(el.h || minH, minH) } 
              });
              
              g.update(el.el, {
                w: Math.max(el.w || minW, minW),
                h: Math.max(el.h || minH, minH),
                autoPosition: false
              });
            }
            
            // Add visual feedback
            const isAtMinSize = (el.w && el.w <= minW) || (el.h && el.h <= minH);
            if (isAtMinSize) {
              el.el.classList.add('min-size');
            } else {
              el.el.classList.remove('min-size');
            }
          }
        }
      });

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
            .map((item): LayoutWidget | null => {
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
                  
                  // Default date range (last 7 days)
                  const today = new Date();
                  let initialDateRange = {
                    from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
                    to: today
                  };
                  
                  // Create or update widget state
                  let widgetState = widgetStateRegistry.get(node.id);
                  if (!widgetState) {
                    widgetState = new WidgetState(initialVariant, initialTitle, initialViewMode, initialDateRange);
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
                  const widgetType = widgetTypes[baseId];
                  const config = WIDGET_REGISTRY[widgetType];
                  
                  if (config) {
                    const minW = config.minSize.w;
                    const minH = config.minSize.h;
                    
                    // Special logging for treemap widget
                    if (widgetType === 'treemap') {
                      console.log('Resizing treemap widget:', {
                        id: el.id,
                        currentSize: { w: el.w, h: el.h },
                        minSize: { w: minW, h: minH }
                      });
                    }
                    
                    // Update visual feedback
                    const isAtMinSize = (el.w && el.w <= minW) || (el.h && el.h <= minH);
                    if (isAtMinSize) {
                      el.el.classList.add('min-size');
                    } else {
                      el.el.classList.remove('min-size');
                    }

                    // Enforce minimum sizes
                    if ((el.w && el.w < minW) || (el.h && el.h < minH)) {
                      g.update(el.el, {
                        w: Math.max(el.w || minW, minW),
                        h: Math.max(el.h || minH, minH),
                        autoPosition: false
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
        (!widget.minW || typeof widget.minW === 'number') &&
        (!widget.minH || typeof widget.minH === 'number') &&
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
          noMove: isMobile || currentPage !== 'dashboard',
          noResize: isMobile || currentPage !== 'dashboard',
          locked: isMobile || currentPage !== 'dashboard'
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
            } as LayoutWidget;
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
      
      // Default date range (last 7 days)
      const today = new Date();
      const initialDateRange = {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
        to: today
      };
      
      const widgetState = new WidgetState(initialVariant, initialTitle, initialViewMode, initialDateRange);
      widgetStateRegistry.set(widgetId, widgetState);
    }

    // Log for debugging treemap widget
    if (widgetType === 'treemap') {
      console.log('Adding treemap widget with config:', widgetConfig);
    }

    // Create widget at the front (top-left)
    const newWidget = createWidget({
      widgetType,
      widgetId,
      x: 0,
      y: 0,
      w: widgetConfig.defaultSize.w,
      h: widgetConfig.defaultSize.h,
      minW: widgetConfig.minSize.w,
      minH: widgetConfig.minSize.h
    });

    if (newWidget) {
      // Temporarily disable animations for smoother addition
      const prevAnimate = grid.opts.animate;
      const prevFloat = grid.opts.float;
      
      // Disable both animation and float for proper compaction
      grid.setAnimation(false);
      grid.float(false);
      
      grid.batchUpdate();
      try {
        // Add to grid with proper size constraints
        grid.addWidget({
          el: newWidget,
          x: 0,
          y: 0,
          w: widgetConfig.defaultSize.w,
          h: widgetConfig.defaultSize.h,
          minW: widgetConfig.minSize.w,
          minH: widgetConfig.minSize.h,
          autoPosition: true
        } as ExtendedGridStackWidget);
        
        // Force compact immediately while in batch mode
        grid.compact();
      } finally {
        grid.commit();
      }
      
      // Restore previous settings with a delay to ensure UI is updated
      setTimeout(() => {
        grid.setAnimation(prevAnimate);
        grid.float(prevFloat === undefined ? false : prevFloat);
        
        // Save the updated layout
        const items = grid.getGridItems();
        const serializedLayout = items
          .map((item): LayoutWidget | null => {
            const node = item.gridstackNode;
            if (!node?.id) return null;
            
            // Get widget state if it's a performance widget
            const baseId = node.id.split('-')[0];
            const widgetType = widgetTypes[baseId];
            const widgetConfig = WIDGET_REGISTRY[widgetType];
            
            const widgetState = baseId === 'performance' ? widgetStateRegistry.get(node.id) : undefined;
            const viewState = widgetState ? { 
              chartVariant: widgetState.variant,
              viewMode: widgetState.viewMode
            } : undefined;

            return {
              id: node.id,
              x: node.x ?? 0,
              y: node.y ?? 0,
              w: Math.max(node.w ?? 2, widgetConfig?.minSize.w || 2),
              h: Math.max(node.h ?? 2, widgetConfig?.minSize.h || 2),
              minW: widgetConfig?.minSize.w || 2,
              minH: widgetConfig?.minSize.h || 2,
              viewState
            };
          })
          .filter((item): item is LayoutWidget => item !== null);

        if (isValidLayout(serializedLayout)) {
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(serializedLayout));
          console.log('✅ Saved layout after adding widget:', serializedLayout);
        }
        
        // Double-check that all widgets respect minimum sizes
        items.forEach(item => {
          const node = item.gridstackNode;
          if (!node?.id || !node.el) return;
          
          const baseId = node.id.split('-')[0];
          const widgetType = widgetTypes[baseId];
          const config = WIDGET_REGISTRY[widgetType];
          
          if (config) {
            const minW = config.minSize.w;
            const minH = config.minSize.h;
            
            if ((node.w && node.w < minW) || (node.h && node.h < minH)) {
              grid.update(node.el, {
                w: Math.max(node.w || minW, minW),
                h: Math.max(node.h || minH, minH)
              });
            }
          }
        });
      }, 100);
    }
  }, [grid, createWidget, widgetStateRegistry, widgetTypes, isValidLayout]);

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
      <div className="main-content h-[calc(100vh-4rem)] overflow-y-auto bg-[hsl(var(--color-bg-base))]">
        <div className="main-content-inner h-full relative">
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
                    const contentElement = widgetContainer.querySelector('.grid-stack-item-content');
                    if (contentElement) {
                      const prevReactRoot = (widgetContainer as any)._reactRoot;
                      
                      if (prevReactRoot) {
                        prevReactRoot.unmount();
                      }
                      
                      const baseId = node.id.split('-')[0];
                      const widgetType = widgetTypes[baseId];
                      
                      if (widgetType) {
                        const newRoot = createRoot(contentElement);
                        (widgetContainer as any)._reactRoot = newRoot;
                        
                        // Create a consistent removeHandler for all widgets
                        const removeHandler = () => {
                          console.log('Widget remove triggered on data source change for:', node.id, 'type:', widgetType);
                          if (node.id) {
                            handleRemoveWidget(node.id);
                          }
                          return true; // Always return true to indicate success
                        };
                        
                        if (baseId === 'performance') {
                          const widgetState = widgetStateRegistry.get(node.id) || 
                            new WidgetState(
                              'revenue',
                              getPerformanceTitle('revenue'),
                              'split',
                              { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() }
                            );
                          
                          widgetStateRegistry.set(node.id, widgetState);
                          const WidgetComponent = widgetComponents[widgetType];
                          
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
                              defaultViewMode={widgetState.viewMode}
                              onViewModeChange={(mode: 'split' | 'cumulative') => {
                                widgetState.setViewMode(mode);
                              }}
                              onTitleChange={(newTitle) => {
                                widgetState.setTitle(newTitle);
                              }}
                              dateRange={widgetState.dateRange}
                              onDateRangeChange={(newRange) => {
                                if (newRange) widgetState.setDateRange(newRange);
                              }}
                            />
                          );
                          
                          newRoot.render(
                            <React.StrictMode>
                              <DataSourceProvider>
                                <WidgetContainer
                                  key={`${widgetState.title}-${source}`}
                                  title={widgetState.title}
                                  onRemove={removeHandler}
                                  headerControls={<PerformanceWidgetWrapper isHeader />}
                                >
                                  <PerformanceWidgetWrapper />
                                </WidgetContainer>
                              </DataSourceProvider>
                            </React.StrictMode>
                          );
                        } else {
                          // Render all other widget types consistently
                          const WidgetComponent = widgetComponents[widgetType];
                          newRoot.render(
                            <React.StrictMode>
                              <DataSourceProvider>
                                <WidgetContainer
                                  key={`${widgetType}-${source}`}
                                  title={widgetTitles[widgetType]}
                                  onRemove={removeHandler}
                                >
                                  <WidgetComponent 
                                    key={`${node.id}-${source}`} 
                                    widgetId={node.id}
                                    onRemove={removeHandler}
                                  />
                                </WidgetContainer>
                              </DataSourceProvider>
                            </React.StrictMode>
                          );
                        }
                      }
                    }
                  }
                });
              }
            }}
          />
          <div 
            ref={gridElementRef} 
            className="grid-stack w-full h-[calc(100%-4rem)] p-4 bg-[hsl(var(--color-bg-base))] overflow-hidden"
            style={{ 
              minHeight: '500px',
              position: 'relative',
              '--grid-columns': '12',
              '--grid-row-height': '50px'
            } as React.CSSProperties}
          />
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