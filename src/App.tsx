import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  maxSize: { w: number; h: number };
}

export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  'market-overview': {
    id: 'market',
    title: 'Market Overview',
    component: MarketOverview,
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 6 },
    maxSize: { w: 12, h: 9 }
  },
  'order-book': {
    id: 'orderbook',
    title: 'Order Book',
    component: OrderBook,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 4, h: 6 },
    maxSize: { w: 12, h: 9 }
  },
  'recent-trades': {
    id: 'trades',
    title: 'Recent Trades',
    component: RecentTrades,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 6 },
    maxSize: { w: 12, h: 9 }
  },
  'trading-view-chart': {
    id: 'chart',
    title: 'BTC/USDT',
    component: TradingViewChart,
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 6, h: 6 },
    maxSize: { w: 12, h: 9 }
  },
  'trade-form': {
    id: 'tradeform',
    title: 'Trade',
    component: TradeForm,
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 6, h: 6 },
    maxSize: { w: 12, h: 9 }
  },
  'balances': {
    id: 'balances',
    title: 'Balances',
    component: BalancesWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 12, h: 9 }
  },
  'markets': {
    id: 'markets',
    title: 'Markets',
    component: MarketsWidget,
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 9 }
  },
  'performance': {
    id: 'performance',
    title: 'Performance',
    component: PerformanceWidget,
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 9 }
  },
  'treemap': {
    id: 'treemap',
    title: 'Breakdown',
    component: Breakdown,
    defaultSize: { w: 6, h: 6 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 12, h: 9 }
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

// Add helper functions before AppContent
const getLayoutForCurrentPage = (page: 'dashboard' | 'spot' | 'margin' | 'stake'): LayoutWidget[] => {
  if (page === 'dashboard') {
    const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        if (Array.isArray(parsedLayout) && parsedLayout.every(widget => 
          widget && typeof widget.id === 'string' && 
          typeof widget.x === 'number' && 
          typeof widget.y === 'number' && 
          typeof widget.w === 'number' && 
          typeof widget.h === 'number'
        )) {
          return parsedLayout;
        }
      } catch (error) {
        console.warn('Error parsing saved layout:', error);
      }
    }
    return defaultLayout;
  }

  switch (page) {
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

const applyLayoutToGrid = (grid: GridStack, layout: LayoutWidget[], currentPage: string, isMobile: boolean) => {
  if (!grid || !grid.el) return;

  grid.batchUpdate();
  try {
    // First remove all existing widgets
    grid.removeAll();

    // Then add new widgets from layout
    layout.forEach((node: LayoutWidget) => {
      const baseId = node.id.split('-')[0];
      const widgetType = widgetTypes[baseId];
      
      if (!widgetComponents[widgetType]) {
        console.warn('Unknown widget type:', widgetType);
        return;
      }

      const widgetElement = document.createElement('div');
      widgetElement.className = 'grid-stack-item';
      
      const contentElement = document.createElement('div');
      contentElement.className = 'grid-stack-item-content';
      widgetElement.appendChild(contentElement);

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
        noMove: isMobile || currentPage !== 'dashboard',
        noResize: isMobile || currentPage !== 'dashboard',
        locked: isMobile || currentPage !== 'dashboard'
      } as ExtendedGridStackWidget);

      // Create React root and render widget
      const root = createRoot(contentElement);
      (widgetElement as any)._reactRoot = root;

      const removeHandler = () => {
        if (grid && widgetElement) {
          grid.removeWidget(widgetElement);
          root.unmount();
          return true;
        }
        return false;
      };

      if (baseId === 'performance') {
        const widgetState = widgetStateRegistry.get(node.id) || 
          new WidgetState(
            node.viewState?.chartVariant || 'revenue',
            getPerformanceTitle(node.viewState?.chartVariant || 'revenue'),
            node.viewState?.viewMode || 'split'
          );
        
        widgetStateRegistry.set(node.id, widgetState);
        const WidgetComponent = widgetComponents[widgetType];
        
        root.render(
          <React.StrictMode>
            <DataSourceProvider>
              <WidgetContainer
                title={widgetState.title}
                onRemove={removeHandler}
              >
                <WidgetComponent
                  widgetId={node.id}
                  defaultVariant={widgetState.variant}
                  onVariantChange={(variant) => {
                    widgetState.setVariant(variant);
                    widgetState.setTitle(getPerformanceTitle(variant));
                  }}
                  defaultViewMode={widgetState.viewMode}
                  onViewModeChange={(mode) => {
                    widgetState.setViewMode(mode);
                  }}
                />
              </WidgetContainer>
            </DataSourceProvider>
          </React.StrictMode>
        );
      } else {
        const WidgetComponent = widgetComponents[widgetType];
        root.render(
          <React.StrictMode>
            <DataSourceProvider>
              <WidgetContainer
                title={widgetTitles[widgetType]}
                onRemove={removeHandler}
              >
                <WidgetComponent 
                  widgetId={node.id}
                  onRemove={removeHandler}
                />
              </WidgetContainer>
            </DataSourceProvider>
          </React.StrictMode>
        );
      }
    });

    // Force a clean render of the grid
    grid.compact();
  } finally {
    grid.commit();
  }
};

function AppContent() {
  console.log('🔄 AppContent rendering');
  
  const { dataSource, setDataSource } = useDataSource();
  const { resolvedTheme } = useTheme();
  const { backgroundIntensity, widgetIntensity, borderIntensity } = useThemeIntensity();
  const colors = useMemo(() => getThemeValues(resolvedTheme, backgroundIntensity, widgetIntensity, borderIntensity), 
    [resolvedTheme, backgroundIntensity, widgetIntensity, borderIntensity]);
  
  const [error, setError] = useState<string | null>(null);
  const [adBlockerDetected, setAdBlockerDetected] = useState<boolean>(false);
  const [grid, setGrid] = useState<GridStack | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'spot' | 'margin' | 'stake'>(() => {
    // Initialize page based on current URL
    const path = window.location.pathname;
    if (path === '/') return 'dashboard';
    const page = path.slice(1) as 'dashboard' | 'spot' | 'margin' | 'stake';
    return ['spot', 'margin', 'stake'].includes(page) ? page : 'dashboard';
  });
  const resizeFrameRef = useRef<number>();
  const gridRef = useRef<GridStack | null>(null);
  const gridElementRef = useRef<HTMLDivElement>(null);
  const gridInitializedRef = useRef<boolean>(false);

  // Initialize grid
  useEffect(() => {
    console.log('🔄 Grid initialization effect running', {
      hasGridElement: !!gridElementRef.current,
      isInitialized: gridInitializedRef.current,
      currentPage
    });

    // Ensure we have the grid element
    if (!gridElementRef.current) {
      console.error('❌ Grid element ref is not available');
      return;
    }

    const initGrid = () => {
      console.log('🚀 Starting grid initialization');

      try {
        // Clean up any existing grid
        if (gridRef.current) {
          console.log('🧹 Cleaning up existing grid');
          gridRef.current.destroy(true);
          gridRef.current = null;
          setGrid(null);
          gridInitializedRef.current = false;
        }

        // Prepare container
        const gridContainer = gridElementRef.current;
        if (!gridContainer) {
          console.error('❌ Grid container not found during initialization');
          return;
        }

        gridContainer.innerHTML = '';
        gridContainer.className = 'grid-stack w-full h-[calc(100%-4rem)] p-4';
        gridContainer.style.minHeight = '500px';
        console.log('📦 Grid container prepared');

        // Initialize GridStack
        const options: GridStackOptions = {
          column: 12,
          margin: 8,
          cellHeight: '50px',
          float: false,
          animate: false,
          draggable: {
            handle: '.widget-drag-handle'
          },
          resizable: {
            handles: 'e,se,s,sw,w'
          },
          staticGrid: false
        };

        // Create grid instance
        const newGrid = GridStack.init(options, gridContainer);

        if (!newGrid || !newGrid.el) {
          throw new Error('Failed to initialize GridStack');
        }

        console.log('✅ GridStack initialized successfully');
        
        // Store references
        gridRef.current = newGrid;
        setGrid(newGrid);
        gridInitializedRef.current = true;

        // Load and apply layout
        const layoutToLoad = getLayoutForCurrentPage(currentPage);
        console.log('📋 Loading layout for page:', currentPage, layoutToLoad);

        // Apply layout in a safe way
        try {
          newGrid.removeAll();
          
          // Add widgets one by one with safety checks
          layoutToLoad.forEach((node: LayoutWidget) => {
            const baseId = node.id.split('-')[0];
            const widgetType = widgetTypes[baseId];
            
            if (!widgetComponents[widgetType]) {
              console.warn('⚠️ Unknown widget type:', widgetType);
              return;
            }

            const widgetElement = document.createElement('div');
            widgetElement.className = 'grid-stack-item';
            
            const contentElement = document.createElement('div');
            contentElement.className = 'grid-stack-item-content';
            widgetElement.appendChild(contentElement);

            // Add widget with safety check
            newGrid.addWidget({
              el: widgetElement,
              id: node.id,
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
              minW: node.minW,
              minH: node.minH,
              autoPosition: false,
              noMove: isMobile || currentPage !== 'dashboard',
              noResize: isMobile || currentPage !== 'dashboard',
              locked: isMobile || currentPage !== 'dashboard'
            } as ExtendedGridStackWidget);

            const root = createRoot(contentElement);
            (widgetElement as any)._reactRoot = root;

            const removeHandler = () => {
              if (newGrid && widgetElement) {
                newGrid.removeWidget(widgetElement);
                root.unmount();
                return true;
              }
              return false;
            };

            if (baseId === 'performance') {
              const widgetState = widgetStateRegistry.get(node.id) || 
                new WidgetState(
                  node.viewState?.chartVariant || 'revenue',
                  getPerformanceTitle(node.viewState?.chartVariant || 'revenue'),
                  node.viewState?.viewMode || 'split'
                );
              
              widgetStateRegistry.set(node.id, widgetState);
              const WidgetComponent = widgetComponents[widgetType];
              
              root.render(
                <React.StrictMode>
                  <DataSourceProvider>
                    <WidgetContainer
                      title={widgetState.title}
                      onRemove={removeHandler}
                    >
                      <WidgetComponent
                        widgetId={node.id}
                        defaultVariant={widgetState.variant}
                        onVariantChange={(variant) => {
                          widgetState.setVariant(variant);
                          widgetState.setTitle(getPerformanceTitle(variant));
                        }}
                        defaultViewMode={widgetState.viewMode}
                        onViewModeChange={(mode) => {
                          widgetState.setViewMode(mode);
                        }}
                      />
                    </WidgetContainer>
                  </DataSourceProvider>
                </React.StrictMode>
              );
            } else {
              const WidgetComponent = widgetComponents[widgetType];
              root.render(
                <React.StrictMode>
                  <DataSourceProvider>
                    <WidgetContainer
                      title={widgetTitles[widgetType]}
                      onRemove={removeHandler}
                    >
                      <WidgetComponent 
                        widgetId={node.id}
                        onRemove={removeHandler}
                      />
                    </WidgetContainer>
                  </DataSourceProvider>
                </React.StrictMode>
              );
            }
          });

          console.log('✅ Layout applied successfully');
          
          // Ensure grid still exists before compacting
          newGrid.compact();

          // Enable animations after initial load with safety check
          setTimeout(() => {
            if (newGrid && newGrid.el && newGrid.el.classList) {
              newGrid.setAnimation(true);
              console.log('✨ Grid animations enabled');
            }
          }, 500);
        } catch (error) {
          console.error('Error applying layout:', error);
          throw error;
        }
      } catch (error) {
        console.error('❌ Error initializing grid:', error);
        setError('Failed to initialize grid system. Please refresh the page.');
      }
    };

    // Initialize with a small delay to ensure DOM is ready
    const initTimeout = setTimeout(initGrid, 100);

    return () => {
      clearTimeout(initTimeout);
    };
  }, [currentPage]); // Add currentPage as a dependency

  // Handle page changes
  useEffect(() => {
    if (!gridRef.current || !gridInitializedRef.current) return;

    const grid = gridRef.current;
    if (!grid.engine) return;

    try {
      const layoutToLoad = getLayoutForCurrentPage(currentPage);
      console.log('📄 Updating layout for page change:', currentPage);

      grid.removeAll();
      layoutToLoad.forEach(node => {
        // ... existing layout application code ...
      });
      grid.compact();
    } catch (error) {
      console.error('Error updating layout:', error);
    }
  }, [currentPage]);

  // Apply CSS variables in a separate effect
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(colors.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [colors]);

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

    try {
    // Get the widget config
    const widgetConfig = WIDGET_REGISTRY[widgetType];
    // Ensure we're using configuration-defined minimum and maximum sizes
    const effectiveMinW = widgetConfig ? widgetConfig.minSize.w : minW;
    const effectiveMinH = widgetConfig ? widgetConfig.minSize.h : minH;
    const effectiveMaxW = widgetConfig ? widgetConfig.maxSize.w : 12;
    const effectiveMaxH = widgetConfig ? widgetConfig.maxSize.h : 8;

      // Create widget element with proper structure
    const widgetElement = document.createElement('div');
    widgetElement.className = 'grid-stack-item';
    
    // Set grid attributes with effective minimum and maximum sizes
    widgetElement.setAttribute('gs-id', widgetId);
    widgetElement.setAttribute('gs-x', String(x));
    widgetElement.setAttribute('gs-y', String(y));
    widgetElement.setAttribute('gs-w', String(Math.min(Math.max(w, effectiveMinW), effectiveMaxW)));
    widgetElement.setAttribute('gs-h', String(Math.min(Math.max(h, effectiveMinH), effectiveMaxH)));
    widgetElement.setAttribute('gs-min-w', String(effectiveMinW));
    widgetElement.setAttribute('gs-min-h', String(effectiveMinH));
    widgetElement.setAttribute('gs-max-w', String(effectiveMaxW));
    widgetElement.setAttribute('gs-max-h', String(effectiveMaxH));

    // Create the content wrapper
    const contentElement = document.createElement('div');
    contentElement.className = 'grid-stack-item-content';
    widgetElement.appendChild(contentElement);

      // Create React root only after the element is properly structured
    const root = createRoot(contentElement);
    (widgetElement as any)._reactRoot = root;

      // Create a direct removeHandler function that will be passed to all widgets
      const removeHandler = () => {
        console.log(`Widget removal triggered for: ${widgetId} (type: ${widgetType})`);
        handleRemoveWidgetRef.current(widgetId);
        return true;
      };

      // Get the base widget type from the ID
      const baseWidgetId = widgetId.split('-')[0];

      if (baseWidgetId === 'performance') {
        // Performance widget specific code...
        // ... (keep existing performance widget code)
        } else {
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

      return widgetElement;
    } catch (error) {
      console.error('Error creating widget:', error);
      return null;
    }
  }, [grid, handleRemoveWidgetRef, widgetComponents, widgetTitles, dataSource]);

  // Memoize the grid options
  const gridOptions = useMemo<GridStackOptions>(() => ({
    column: 12,
    margin: 8,
    cellHeight: '50px',
    float: false,
    animate: false,
    draggable: {
      handle: '.widget-drag-handle'
    },
    resizable: {
      handles: 'e,se,s,sw,w'
    },
    staticGrid: false
  }), []);

  // Handle page changes
  useEffect(() => {
    if (!gridRef.current || !gridInitializedRef.current) return;

    const layoutToLoad = getLayoutForCurrentPage(currentPage);
    applyLayoutToGrid(gridRef.current, layoutToLoad, currentPage, isMobile);
  }, [currentPage, isMobile]);

  // Check for ad blocker on mount
  useEffect(() => {
    const hasAdBlocker = document.documentElement.getAttribute('data-adblocker') === 'true';
    if (hasAdBlocker) {
      console.warn('Ad blocker detected in React component');
      setAdBlockerDetected(true);
    }
  }, []);

  const pageChangeRef = useRef<(page: 'dashboard' | 'spot' | 'margin' | 'stake') => void>();

  // Define getLayoutForPage before the useEffect
  const getLayoutForPage = useCallback((page: 'dashboard' | 'spot' | 'margin' | 'stake'): LayoutWidget[] => {
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
  }, [dashboardLayout, spotLayout, marginLayout, stakeLayout]);

  // Define isValidLayout before the useEffect
  const isValidLayout = useCallback((layout: unknown): layout is LayoutWidget[] => {
    if (!Array.isArray(layout)) {
      console.warn('Layout is not an array');
      return false;
    }
    
    // Get all valid base widget IDs
    const validBaseIds = Object.values(widgetIds);
    
    // Verify each widget has valid properties and sizes
    return layout.every(widget => {
      // Get base widget type from ID (handle both default and dynamic IDs)
      const baseId = widget.id?.split('-')[0];
      const isValidBaseType = baseId && validBaseIds.includes(baseId);
      
      if (!isValidBaseType) {
        console.warn('Invalid widget type:', baseId);
        return false;
      }

      const widgetType = widgetTypes[baseId];
      const widgetConfig = WIDGET_REGISTRY[widgetType];
      
      if (!widgetConfig) {
        console.warn('Missing widget configuration for:', widgetType);
        return false;
      }

      // Check if viewState is valid for performance widgets
      const hasValidViewState = baseId === 'performance' 
        ? widget.viewState && 
          typeof widget.viewState.chartVariant === 'string' &&
          (!widget.viewState.viewMode || ['split', 'cumulative'].includes(widget.viewState.viewMode))
        : true;

      // Validate size constraints
      const hasValidSize = (
        widget.w >= widgetConfig.minSize.w &&
        widget.h >= widgetConfig.minSize.h &&
        widget.w <= widgetConfig.maxSize.w &&
        widget.h <= widgetConfig.maxSize.h
      );

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
        hasValidSize &&
        hasValidViewState
      );

      if (!isValid) {
        console.warn('Invalid widget in layout:', widget, { 
          baseId, 
          isValidBaseType, 
          hasValidViewState,
          hasValidSize,
          minSize: widgetConfig.minSize,
          maxSize: widgetConfig.maxSize,
          currentSize: { w: widget.w, h: widget.h }
        });
      }
      return isValid;
    });
  }, [widgetIds, widgetTypes]);

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
          // Get widget configuration to enforce minimum and maximum sizes
          const widgetConfig = WIDGET_REGISTRY[widgetType];
          if (!widgetConfig) {
            console.warn('❌ Missing widget configuration for:', widgetType);
            return;
          }

          // Enforce minimum and maximum sizes from registry
          const width = Math.min(Math.max(node.w, widgetConfig.minSize.w), widgetConfig.maxSize.w);
          const height = Math.min(Math.max(node.h, widgetConfig.minSize.h), widgetConfig.maxSize.h);

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
            // Add widget with enforced sizes
            grid.addWidget({
              el: widgetElement,
              id: node.id,
              x: node.x,
              y: node.y,
              w: width,
              h: height,
              minW: widgetConfig.minSize.w,
              minH: widgetConfig.minSize.h,
              maxW: widgetConfig.maxSize.w,
              maxH: widgetConfig.maxSize.h,
              autoPosition: false,
              noMove: isMobile || currentPage !== 'dashboard',
              noResize: isMobile || currentPage !== 'dashboard',
              locked: isMobile || currentPage !== 'dashboard'
            } as ExtendedGridStackWidget);
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
    
    // Save current layout if we're leaving dashboard
    if (currentPage === 'dashboard' && grid && grid.engine) {
      try {
        const items = grid.getGridItems();
        const serializedLayout = items
          .map((item): LayoutWidget | null => {
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
          .filter((item): item is LayoutWidget => item !== null);

        if (isValidLayout(serializedLayout)) {
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(serializedLayout));
          console.log('✅ Saved dashboard layout:', serializedLayout);
        }
      } catch (error) {
        console.warn('Failed to save dashboard layout:', error);
      }
    }

    // Update URL with state
    const newPath = page === 'dashboard' ? '/' : `/${page}`;
    window.history.pushState({ page }, '', newPath);
    
    // Update page - this will trigger the grid initialization effect
    setCurrentPage(page);
  }, [grid, currentPage, isValidLayout]);

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
    const handlePopState = (event: PopStateEvent) => {
      const newPage = event.state?.page || getPageFromPath(window.location.pathname);
      console.log('🔄 PopState event:', { newPage, currentPage, state: event.state });
      
      if (newPage !== currentPage) {
        // Clean up current grid before changing pages
        const currentGrid = gridRef.current;
        if (currentGrid) {
          currentGrid.batchUpdate();
          try {
            // Get all widgets and properly clean them up
            const widgets = currentGrid.getGridItems();
            widgets.forEach(widget => {
              if (widget.gridstackNode?.id) {
                // Clean up widget state
                widgetStateRegistry.delete(widget.gridstackNode.id);
                
                // Clean up React root if it exists
                const reactRoot = (widget as any)._reactRoot;
                if (reactRoot) {
                  try {
                    reactRoot.unmount();
                  } catch (error) {
                    console.warn('Error unmounting widget React root:', error);
                  }
                }
                
                // Remove from grid
                currentGrid.removeWidget(widget, false);
              }
            });

            // Additional cleanup of any remaining grid-stack-items
            const gridElement = document.querySelector('.grid-stack');
            if (gridElement) {
              const remainingWidgets = gridElement.querySelectorAll('.grid-stack-item');
              remainingWidgets.forEach(widget => {
                try {
                  widget.remove();
                } catch (error) {
                  console.warn('Error removing widget element:', error);
                }
              });
        }
      } finally {
            currentGrid.commit();
          }
        }
        
        // Update the page state which will trigger grid reinitialization
        setCurrentPage(newPage);
      }
    };

    // Initialize history state for the current page if not already set
    if (!window.history.state) {
      window.history.replaceState({ page: currentPage }, '', window.location.pathname);
    }

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
            onDataSourceChange={setDataSource}
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