import { useEffect, useState, useCallback, useRef } from 'react';
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
import { Toaster } from './components/ui/toaster';
import { WidgetContainer } from './components/WidgetContainer';

// Default desktop layout configuration for different pages
const dashboardLayout = [
  { x: 0, y: 0, w: 12, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 0, y: 4, w: 8, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 8, y: 4, w: 4, h: 6, id: 'orderbook', minW: 2, minH: 2 },
  { x: 0, y: 10, w: 12, h: 2, id: 'trades', minW: 2, minH: 2 }
];

const spotLayout = [
  { x: 0, y: 0, w: 6, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 6, y: 0, w: 3, h: 6, id: 'orderbook', minW: 2, minH: 2 },
  { x: 9, y: 0, w: 3, h: 4, id: 'tradeform', minW: 2, minH: 2 },
  { x: 9, y: 4, w: 3, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 0, y: 6, w: 9, h: 2, id: 'trades', minW: 2, minH: 2 }
];

const marginLayout = [
  { x: 0, y: 0, w: 8, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 8, y: 0, w: 4, h: 6, id: 'orderbook', minW: 2, minH: 2 },
  { x: 0, y: 6, w: 4, h: 4, id: 'tradeform', minW: 2, minH: 2 },
  { x: 4, y: 6, w: 4, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 8, y: 6, w: 4, h: 4, id: 'trades', minW: 2, minH: 2 }
];

const stakeLayout = [
  { x: 0, y: 0, w: 12, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 0, y: 6, w: 4, h: 4, id: 'orderbook', minW: 2, minH: 2 },
  { x: 4, y: 6, w: 4, h: 4, id: 'tradeform', minW: 2, minH: 2 },
  { x: 8, y: 6, w: 4, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 0, y: 10, w: 12, h: 2, id: 'trades', minW: 2, minH: 2 }
];

// Default layout is now dashboard layout
const defaultLayout = dashboardLayout;

// Mobile layout configuration (single column)
const mobileLayout = [
  { x: 0, y: 0, w: 1, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 0, y: 6, w: 1, h: 6, id: 'orderbook', minW: 2, minH: 2 },
  { x: 0, y: 12, w: 1, h: 4, id: 'tradeform', minW: 2, minH: 2 },
  { x: 0, y: 16, w: 1, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 0, y: 20, w: 1, h: 4, id: 'trades', minW: 2, minH: 2 }
];

// Breakpoint for mobile view
const MOBILE_BREAKPOINT = 768;

interface LayoutWidget {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
}

// Extend GridStackWidget type to include el property
interface ExtendedGridStackWidget extends GridStackWidget {
  el?: HTMLElement;
}

// Predefined IDs for each widget type
const widgetIds: Record<string, string> = {
  'market-overview': 'market',
  'order-book': 'orderbook',
  'recent-trades': 'trades',
  'trading-view-chart': 'chart',
  'trade-form': 'tradeform'
};

// Reverse mapping for widget types
const widgetTypes: Record<string, string> = {
  'market': 'market-overview',
  'orderbook': 'order-book',
  'trades': 'recent-trades',
  'chart': 'trading-view-chart',
  'tradeform': 'trade-form'
};

function App() {
  const [grid, setGrid] = useState<GridStack | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'spot' | 'margin' | 'stake'>('dashboard');
  const resizeFrameRef = useRef<number>();
  const gridRef = useRef<GridStack | null>(null);
  let widgetCounter = 0; // Initialize a counter for widget IDs

  // Add widget mapping
  const widgetComponents: Record<string, React.FC> = {
    'market-overview': MarketOverview,
    'order-book': OrderBook,
    'recent-trades': RecentTrades,
    'trading-view-chart': TradingViewChart,
    'trade-form': TradeForm
  };

  // Add widget titles mapping
  const widgetTitles: Record<string, string> = {
    'market-overview': 'Market Overview',
    'order-book': 'Order Book',
    'recent-trades': 'Recent Trades',
    'trading-view-chart': 'BTC/USDT',
    'trade-form': 'Trade'
  };

  const handleRemoveWidget = useCallback((widgetId: string) => {
    if (!grid) return;
    
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return;

    // Find the widget element with proper typing for both GridStack and DOM operations
    const widgetElement = gridElement.querySelector(`[gs-id="${widgetId}"]`) as HTMLElement;
    if (!widgetElement) return;

    // Store original grid settings
    const prevAnimate = grid.opts.animate;
    
    // Temporarily disable animations and enable float for smooth removal
    grid.setAnimation(false);
    grid.float(true);
    
    grid.batchUpdate();
    try {
      // Remove widget from grid
      grid.removeWidget(widgetElement as GridStackElement, false);
      // Also remove the DOM element
      widgetElement.remove();

      // Save updated layout
      const items = grid.getGridItems();
      const serializedLayout = items
        .map(item => {
          const node = item.gridstackNode;
          if (!node?.id) return null;
          return {
            id: node.id,
            x: node.x ?? 0,
            y: node.y ?? 0,
            w: node.w ?? 2,
            h: node.h ?? 2,
            minW: 2,
            minH: 2
          };
        })
        .filter((item): item is LayoutWidget => item !== null);

      if (isValidLayout(serializedLayout)) {
        localStorage.setItem('desktop-layout', JSON.stringify(serializedLayout));
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

  const handleRemoveWidgetRef = useRef(handleRemoveWidget);

  // Keep the ref up to date
  useEffect(() => {
    handleRemoveWidgetRef.current = handleRemoveWidget;
  }, [handleRemoveWidget]);

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
    if (!grid || isMobile || !pageChangeRef.current) return;
    const defaultLayoutForPage = getLayoutForPage(currentPage);
    pageChangeRef.current(currentPage); // Re-initialize with default layout
  }, [grid, isMobile, currentPage]);

  const handleCopyLayout = useCallback(() => {
    if (!grid || isMobile) return '';
    // Save only the core widget data we need
    const items = grid.getGridItems();
    const layout = items.map(item => {
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
    }).filter((item): item is LayoutWidget => item !== null);
    return JSON.stringify(layout);
  }, [grid, isMobile]);

  const handlePasteLayout = useCallback((layoutStr: string) => {
    if (!grid || isMobile || !pageChangeRef.current) {
      console.warn('Cannot paste layout:', { hasGrid: !!grid, isMobile });
      return;
    }
    try {
      const layout = JSON.parse(layoutStr) as LayoutWidget[];
      if (isValidLayout(layout)) {
        localStorage.setItem(`${currentPage}-layout`, layoutStr);
        pageChangeRef.current(currentPage); // Re-initialize with pasted layout
      }
    } catch (error) {
      console.error('Failed to paste layout:', error);
    }
  }, [grid, isMobile, currentPage]);

  const handlePageChange = useCallback((page: 'dashboard' | 'spot' | 'margin' | 'stake') => {
    console.log('🔄 Page change requested:', { from: currentPage, to: page, hasGrid: !!grid, isMobile });
    
    // Update URL without page reload
    const newPath = page === 'dashboard' ? '/' : `/${page}`;
    window.history.pushState({}, '', newPath);
    
    // Only save layout for dashboard page if grid exists and has items
    if (currentPage === 'dashboard' && grid && grid.engine && grid.engine.nodes.length > 0) {
      try {
        const currentItems = grid.getGridItems();
        const currentLayout = currentItems
          .map(item => {
            const node = item.gridstackNode;
            if (!node?.id) return null;
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

        if (isValidLayout(currentLayout)) {
          localStorage.setItem('dashboard-layout', JSON.stringify(currentLayout));
          console.log('✅ Saved dashboard layout');
        }
      } catch (error) {
        console.warn('Failed to save dashboard layout:', error);
      }
    }

    // Clean up existing grid before creating a new one
    if (grid) {
      try {
        grid.destroy(false);
        gridRef.current = null;
        setGrid(null);
      } catch (error) {
        console.warn('Failed to destroy grid:', error);
      }
    }

    setCurrentPage(page);

    // Initialize or reinitialize grid with new layout
    const gridElement = document.querySelector('.grid-stack') as HTMLElement;
    if (!gridElement) {
      console.error('❌ Grid element not found');
      return;
    }

    // Clear any existing grid
    console.log('🧹 Clearing existing grid');
    gridElement.innerHTML = '';

    // Initialize grid with options
    console.log('⚙️ Creating new grid instance');
    const g = GridStack.init({
      float: false,
      cellHeight: isMobile ? '100px' : 'auto',
      margin: 4,
      column: isMobile ? 1 : 12,
      animate: true,
      draggable: {
        handle: '.widget-header',
      },
      resizable: {
        handles: 'e, se, s, sw, w',
        autoHide: true
      },
      minRow: 1,
      staticGrid: false,
    }, gridElement);

    // Get layout to apply based on page type
    let layoutToApply: LayoutWidget[];
    if (page === 'dashboard' && !isMobile) {
      // For dashboard, try to load saved layout
      const savedLayout = localStorage.getItem('dashboard-layout');
      if (savedLayout) {
        try {
          const parsedLayout = JSON.parse(savedLayout);
          if (isValidLayout(parsedLayout)) {
            layoutToApply = parsedLayout;
            console.log('✅ Using saved dashboard layout');
          } else {
            console.warn('❌ Saved dashboard layout invalid, using default');
            layoutToApply = dashboardLayout;
          }
        } catch (error) {
          console.error('Failed to parse saved dashboard layout:', error);
          layoutToApply = dashboardLayout;
        }
      } else {
        console.log('📋 No saved dashboard layout, using default');
        layoutToApply = dashboardLayout;
      }
    } else if (isMobile) {
      console.log('📱 Using mobile layout');
      layoutToApply = mobileLayout;
    } else {
      // For other pages, always use their static layout
      layoutToApply = getLayoutForPage(page);
      console.log(`📋 Using static layout for ${page} page`);
    }

    // Apply layout
    g.batchUpdate();
    try {
      // Create and add all widgets from the layout
      layoutToApply.forEach((node: LayoutWidget) => {
        const baseWidgetId = node.id;
        const widgetType = widgetTypes[baseWidgetId];
        
        if (!widgetComponents[widgetType]) {
          console.warn('❌ Unknown widget type:', widgetType);
          return;
        }

        try {
          // Create widget element with consistent ID
          const widgetElement = createWidget({
            widgetType,
            widgetId: baseWidgetId,
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h,
            minW: node.minW,
            minH: node.minH
          });

          // Add widget to grid with all properties
          g.addWidget({
            el: widgetElement,
            id: baseWidgetId,
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h,
            minW: node.minW,
            minH: node.minH,
            autoPosition: false,
            // Only allow movement on dashboard page
            noMove: page !== 'dashboard',
            noResize: page !== 'dashboard',
            locked: page !== 'dashboard'
          } as ExtendedGridStackWidget);
        } catch (error) {
          console.error('Failed to create widget:', baseWidgetId, error);
        }
      });
    } finally {
      g.commit();
      console.log('✅ Layout change completed for page:', page);
    }

    gridRef.current = g;
    setGrid(g);

    // Smoothly scroll to top of content
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [grid, isMobile, currentPage]);

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

  const createWidget = (params: {
    widgetType: string,
    widgetId: string,
    x: number,
    y: number,
    w?: number,
    h?: number,
    minW?: number,
    minH?: number
  }): HTMLElement => {
    const { widgetType, widgetId, x, y, w = 3, h = 4, minW = 2, minH = 2 } = params;
    console.log('Creating widget:', { widgetType, widgetId, x, y, w, h });
    
    // Create widget element
    const widgetElement = document.createElement('div');
    widgetElement.className = 'grid-stack-item';
    widgetElement.setAttribute('gs-id', widgetId);
    widgetElement.setAttribute('gs-x', String(x));
    widgetElement.setAttribute('gs-y', String(y));
    widgetElement.setAttribute('gs-w', String(w));
    widgetElement.setAttribute('gs-h', String(h));
    widgetElement.setAttribute('gs-min-w', String(minW));
    widgetElement.setAttribute('gs-min-h', String(minH));

    // Create content wrapper
    const contentElement = document.createElement('div');
    contentElement.className = 'grid-stack-item-content';
    widgetElement.appendChild(contentElement);

    // Create widget container div
    const containerElement = document.createElement('div');
    containerElement.className = 'widget-container';
    contentElement.appendChild(containerElement);

    // Render React component into container
    const root = ReactDOM.createRoot(containerElement);
    const WidgetComponent = widgetComponents[widgetType];
    const widgetTitle = widgetTitles[widgetType];
    
    if (!WidgetComponent) {
      console.error('Widget component not found:', widgetType);
      throw new Error(`Widget component not found: ${widgetType}`);
    }
    
    root.render(
      <WidgetContainer title={widgetTitle} onRemove={() => handleRemoveWidgetRef.current(widgetId)}>
        <WidgetComponent />
      </WidgetContainer>
    );

    console.log('Widget element created:', widgetElement);
    return widgetElement;
  };

  const isValidLayout = (layout: unknown): layout is LayoutWidget[] => {
    if (!Array.isArray(layout)) {
      return false;
    }
    
    // Verify each widget has valid properties and minimum sizes
    return layout.every(widget => {
      return (
        typeof widget === 'object' &&
        widget !== null &&
        typeof widget.id === 'string' &&
        typeof widget.x === 'number' &&
        typeof widget.y === 'number' &&
        typeof widget.w === 'number' &&
        typeof widget.h === 'number' &&
        widget.w >= (widget.minW ?? 2) &&
        widget.h >= (widget.minH ?? 2)
      );
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar currentPage={currentPage} onPageChange={handlePageChange} />
      <main className="flex-1 overflow-auto pt-16">
        <div className="grid-container w-full h-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <ControlBar 
            onResetLayout={handleResetLayout}
            onCopyLayout={handleCopyLayout}
            onPasteLayout={handlePasteLayout}
          />
          <div className="grid-stack mt-4">
            {/* Grid items will be added programmatically */}
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

export default App;