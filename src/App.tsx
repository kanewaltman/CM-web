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

// Update ExtendedGridStackWidget interface to include el property
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

// Add constant for localStorage key
const DASHBOARD_LAYOUT_KEY = 'dashboard-layout';

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

      // Remove widget from grid
      grid.removeWidget(widgetElement as GridStackElement, false);
      // Also remove the DOM element
      widgetElement.remove();

      // Save updated layout after removal
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
            minW: node.minW ?? 2,
            minH: node.minH ?? 2
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
    if (!grid) return;
    
    grid.batchUpdate();
    try {
      // Store the default layout
      localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(defaultLayout));
      
      // Get current widgets
      const currentWidgets = grid.getGridItems();
      const currentWidgetsMap = new Map();
      
      // Group widgets by their base ID (without timestamp)
      currentWidgets.forEach(widget => {
        const widgetId = widget.gridstackNode?.id;
        if (widgetId) {
          const baseId = widgetId.split('-')[0];
          currentWidgetsMap.set(baseId, widget);
        }
      });
      
      // Track which widgets we've updated
      const updatedWidgets = new Set<string>();
      
      // First update existing widgets
      defaultLayout.forEach((node: LayoutWidget) => {
        const baseId = node.id.split('-')[0];
        const existingWidget = currentWidgetsMap.get(baseId);
        
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
          updatedWidgets.add(existingWidget.gridstackNode?.id || '');
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
          } catch (error) {
            console.error('Failed to create widget:', node.id, error);
          }
        }
      });

      // Remove any widgets that aren't in the default layout
      currentWidgets.forEach(widget => {
        const widgetId = widget.gridstackNode?.id;
        if (widgetId && !updatedWidgets.has(widgetId)) {
          grid.removeWidget(widget, false);
        }
      });
    } finally {
      grid.commit();
      console.log('✅ Reset layout completed');
    }
  }, [grid]);

  const handleCopyLayout = useCallback(() => {
    if (!grid) return '';
    
    const items = grid.getGridItems();
    const serializedLayout = items
      .map(item => {
        const node = item.gridstackNode;
        if (!node || !node.id) return null;
        
        // Get the base widget type from the ID
        const baseId = node.id.split('-')[0];
        const defaultWidget = defaultLayout.find(w => w.id === baseId);
        if (!defaultWidget) return null;

        return {
          id: node.id, // Keep the full dynamic ID
          baseId, // Add baseId for validation
          x: node.x ?? 0,
          y: node.y ?? 0,
          w: Math.max(node.w ?? 2, defaultWidget.minW ?? 2),
          h: Math.max(node.h ?? 2, defaultWidget.minH ?? 2),
          minW: defaultWidget.minW ?? 2,
          minH: defaultWidget.minH ?? 2
        };
      })
      .filter((item): item is (LayoutWidget & { baseId: string }) => item !== null);

    return JSON.stringify(serializedLayout);
  }, [grid]);

  const handlePasteLayout = useCallback((layoutStr: string) => {
    if (!grid) {
      console.warn('Cannot paste layout: no grid instance');
      return;
    }

    try {
      const layout = JSON.parse(layoutStr) as (LayoutWidget & { baseId: string })[];
      
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
        layout.forEach((node: LayoutWidget & { baseId: string }) => {
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
            } catch (error) {
              console.error('Failed to create widget:', node.id, error);
            }
          }
        });

        // Remove any widgets that aren't in the pasted layout
        currentWidgets.forEach(widget => {
          const widgetId = widget.gridstackNode?.id;
          if (widgetId && !updatedWidgets.has(widgetId)) {
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
        const currentLayout = grid.save(false);
        if (isValidLayout(currentLayout)) {
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(currentLayout));
          console.log('✅ Saved dashboard layout:', currentLayout);
        }
      } catch (error) {
        console.warn('Failed to save dashboard layout:', error);
      }
    }

    setCurrentPage(page);
  }, [grid, currentPage]);

  // Initialize grid when page changes
  useEffect(() => {
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
      float: true,
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
      staticGrid: currentPage !== 'dashboard', // Only allow editing on dashboard
    }, gridElement);

    // Add change event listener to save layout changes
    g.on('change', (event: Event, items: GridStackNode[]) => {
      if (currentPage === 'dashboard') {
        const serializedLayout = items
          .map(node => {
            if (!node?.id) return null;
            const baseId = node.id.split('-')[0];
            return {
              id: node.id,
              baseId,
              x: node.x ?? 0,
              y: node.y ?? 0,
              w: node.w ?? 2,
              h: node.h ?? 2,
              minW: node.minW ?? 2,
              minH: node.minH ?? 2
            };
          })
          .filter((item): item is (LayoutWidget & { baseId: string }) => item !== null);

        // Get existing layout to merge with changes
        const existingLayoutStr = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
        let finalLayout = serializedLayout;
        
        if (existingLayoutStr) {
          try {
            const existingLayout = JSON.parse(existingLayoutStr);
            if (Array.isArray(existingLayout)) {
              // Create a map of current widgets by ID
              const currentWidgets = new Map(serializedLayout.map(w => [w.id, w]));
              
              // Include widgets from existing layout that aren't in the current layout
              existingLayout.forEach((widget: LayoutWidget) => {
                if (!currentWidgets.has(widget.id)) {
                  finalLayout.push({
                    ...widget,
                    baseId: widget.id.split('-')[0]
                  });
                }
              });
            }
          } catch (error) {
            console.warn('Failed to parse existing layout:', error);
          }
        }

        if (isValidLayout(finalLayout)) {
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(finalLayout));
          console.log('✅ Saved layout after change:', finalLayout);
        }
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
            widgetId: node.id, // Use the full ID from the layout
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
            id: node.id, // Use the full ID from the layout
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
      console.log('✅ Layout change completed for page:', currentPage);
    }

    gridRef.current = g;
    setGrid(g);

    return () => {
      if (g) {
        g.destroy(false);
      }
    };
  }, [currentPage, isMobile]);

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
        isValidBaseType
      );

      if (!isValid) {
        console.warn('Invalid widget in layout:', widget, { baseId, isValidBaseType });
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
          grid.float(true);
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