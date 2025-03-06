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
import { Toaster } from './components/ui/sonner';
import { WidgetContainer } from './components/WidgetContainer';
import { BalancesWidget } from './components/BalancesWidget';

// Widget Registry - Single source of truth for widget configuration
interface WidgetConfig {
  id: string;
  title: string;
  component: React.FC<any>;
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
  }
} as const;

// Derive other mappings from registry
const widgetIds: Record<string, string> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [key, config.id])
);

const widgetTypes: Record<string, string> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [config.id, key])
);

const widgetComponents: Record<string, React.FC> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [key, config.component])
);

const widgetTitles: Record<string, string> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [key, config.title])
);

// Default layout is now generated from registry
const generateDefaultLayout = () => [
  { id: 'market', x: 8, y: 0, w: 4, h: 4, minW: 2, minH: 2 },
  { id: 'trades', x: 0, y: 4, w: 12, h: 2, minW: 2, minH: 2 },
  { id: 'orderbook', x: 4, y: 0, w: 4, h: 4, minW: 2, minH: 2 },
  { id: 'balances', x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 2 }
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
  { x: 0, y: 24, w: 1, h: 4, id: 'balances', minW: 2, minH: 2 }
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

// Update ExtendedGridStackWidget interface to include el and gridstackNode properties
interface ExtendedGridStackWidget extends GridStackWidget {
  el?: HTMLElement;
  gridstackNode?: GridStackNode;
}

// Add constant for localStorage key
const DASHBOARD_LAYOUT_KEY = 'dashboard-layout';

function App() {
  console.log('App component is rendering');
  
  const [error, setError] = useState<string | null>(null);
  const [adBlockerDetected, setAdBlockerDetected] = useState<boolean>(false);
  const [grid, setGrid] = useState<GridStack | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'spot' | 'margin' | 'stake'>('dashboard');
  const resizeFrameRef = useRef<number>();
  const gridRef = useRef<GridStack | null>(null);
  const gridElementRef = useRef<HTMLDivElement>(null);
  let widgetCounter = 0; // Initialize a counter for widget IDs

  // Check for ad blocker on mount
  useEffect(() => {
    const hasAdBlocker = document.documentElement.getAttribute('data-adblocker') === 'true';
    if (hasAdBlocker) {
      console.warn('Ad blocker detected in React component');
      setAdBlockerDetected(true);
    }
  }, []);

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
      const g = GridStack.init({
        float: true,
        cellHeight: isMobile ? '100px' : 'auto',
        margin: 4,
        column: isMobile ? 1 : 12,
        animate: true,
        draggable: {
          handle: '.widget-header',
          cancel: '.widget-inset, .widget-content, table, td, th, tr, .table, .table-cell, .table-header, .table-row'
        },
        resizable: {
          handles: 'e, se, s, sw, w',
          autoHide: true
        },
        minRow: 1,
        staticGrid: currentPage !== 'dashboard', // Only allow editing on dashboard
      }, gridElementRef.current);

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
        console.log('🚮 Cleaning up grid instance');
        if (g) {
          g.destroy(false);
          if (gridElementRef.current) {
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
    <div className="min-h-screen bg-background">
      <TopBar currentPage={currentPage} onPageChange={handlePageChange} />
      <div className="main-content">
        <div className="main-content-inner">
          <ControlBar onResetLayout={handleResetLayout} onCopyLayout={handleCopyLayout} onPasteLayout={handlePasteLayout} />
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

export default App;