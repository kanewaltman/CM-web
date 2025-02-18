import { useEffect, useState, useCallback, useRef } from 'react';
import { GridStack, GridStackWidget, GridStackOptions, GridStackNode, GridStackElement } from 'gridstack';
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

// Default desktop layout configuration
const defaultLayout = [
  { x: 0, y: 0, w: 8, h: 6, id: 'chart', noResize: false, noMove: false }, // TradingViewChart
  { x: 8, y: 0, w: 4, h: 6, id: 'orderbook', noResize: false, noMove: false }, // OrderBook
  { x: 0, y: 6, w: 4, h: 4, id: 'tradeform', noResize: false, noMove: false }, // TradeForm
  { x: 4, y: 6, w: 4, h: 4, id: 'market', noResize: false, noMove: false }, // MarketOverview
  { x: 8, y: 6, w: 4, h: 4, id: 'trades', noResize: false, noMove: false }, // RecentTrades
];

// Mobile layout configuration (single column)
const mobileLayout = [
  { x: 0, y: 0, w: 1, h: 6 },  // TradingViewChart
  { x: 0, y: 6, w: 1, h: 6 },  // OrderBook
  { x: 0, y: 12, w: 1, h: 4 }, // TradeForm
  { x: 0, y: 16, w: 1, h: 4 }, // MarketOverview
  { x: 0, y: 20, w: 1, h: 4 }  // RecentTrades
];

// Breakpoint for mobile view
const MOBILE_BREAKPOINT = 768;

function App() {
  const [grid, setGrid] = useState<GridStack | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const resizeFrameRef = useRef<number>();
  const gridRef = useRef<GridStack | null>(null);

  const initializeGrid = useCallback((mobile: boolean) => {
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return null;

    // Clean up existing instance but preserve the items
    if (gridRef.current) {
      gridRef.current.destroy(false);
    }

    const options: GridStackOptions = {
      float: false,
      cellHeight: mobile ? '100px' : 'auto',
      margin: 8,
      column: mobile ? 1 : 12,
      animate: true,
      draggable: {
        handle: '.widget-header',
      },
      resizable: {
        handles: 'e, se, s, sw, w',
        autoHide: true
      },
      staticGrid: mobile,
      disableOneColumnMode: true, // Prevent automatic column reduction
    };

    const g = GridStack.init(options, gridElement as GridStackElement);
    
    // Set minimum widget size constraints
    g.opts.minW = 2;
    gridRef.current = g;

    // Function to safely apply layout
    const applyLayout = (layout: GridStackWidget[]) => {
      g.batchUpdate();
      try {
        // First, ensure all widgets have their minimum sizes set
        gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
          const element = item as HTMLElement;
          const widgetId = element.getAttribute('gs-id');
          const defaultWidget = defaultLayout.find(w => w.id === widgetId);
          if (defaultWidget) {
            element.setAttribute('gs-min-w', String(Math.min(2, defaultWidget.w)));
            element.setAttribute('gs-min-h', String(Math.min(2, defaultWidget.h)));
          }
        });

        // Apply the layout with size constraints
        layout.forEach((node: GridStackWidget) => {
          if (node.id) {
            const item = gridElement.querySelector(`[gs-id="${node.id}"]`);
            if (item) {
              const defaultWidget = defaultLayout.find(w => w.id === node.id);
              g.update(item as HTMLElement, {
                x: node.x,
                y: node.y,
                w: Math.max(node.w || 0, defaultWidget?.w || 2), // Ensure minimum width
                h: Math.max(node.h || 0, defaultWidget?.h || 2), // Ensure minimum height
                autoPosition: false
              });
            }
          }
        });

        // Ensure proper sizing after layout is applied
        setTimeout(() => {
          g.batchUpdate();
          try {
            layout.forEach((node: GridStackWidget) => {
              if (node.id) {
                const item = gridElement.querySelector(`[gs-id="${node.id}"]`);
                if (item) {
                  const defaultWidget = defaultLayout.find(w => w.id === node.id);
                  if (defaultWidget) {
                    g.update(item as HTMLElement, {
                      w: Math.max(node.w || 0, defaultWidget.w),
                      h: Math.max(node.h || 0, defaultWidget.h)
                    });
                  }
                }
              }
            });
          } finally {
            g.commit();
          }
        }, 0);

      } finally {
        g.commit();
      }
    };

    if (!mobile) {
      // Try to load saved layout first
      const savedLayout = localStorage.getItem('desktop-layout');
      if (savedLayout) {
        try {
          const layoutData = JSON.parse(savedLayout);
          if (Array.isArray(layoutData) && layoutData.length === defaultLayout.length) {
            // Verify all required widgets are present and have valid sizes
            const hasAllWidgets = defaultLayout.every(defaultWidget => {
              const savedWidget = layoutData.find(w => w.id === defaultWidget.id);
              return savedWidget && 
                     (savedWidget.w ?? 0) >= Math.min(2, defaultWidget.w) && 
                     (savedWidget.h ?? 0) >= Math.min(2, defaultWidget.h);
            });
            if (hasAllWidgets) {
              applyLayout(layoutData);
            } else {
              applyLayout(defaultLayout);
            }
          } else {
            applyLayout(defaultLayout);
          }
        } catch (error) {
          console.error('Failed to load saved layout:', error);
          applyLayout(defaultLayout);
        }
      } else {
        applyLayout(defaultLayout);
      }

      // Set up layout saving with size validation
      let saveTimeout: NodeJS.Timeout;
      const saveLayout = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          const serializedLayout = g.save(false);
          if (Array.isArray(serializedLayout) && serializedLayout.length === defaultLayout.length) {
            // Verify all widgets have valid sizes before saving
            const hasValidSizes = defaultLayout.every(defaultWidget => {
              const savedWidget = serializedLayout.find(w => w.id === defaultWidget.id);
              return savedWidget && 
                     (savedWidget.w ?? 0) >= Math.min(2, defaultWidget.w) && 
                     (savedWidget.h ?? 0) >= Math.min(2, defaultWidget.h);
            });
            if (hasValidSizes) {
              localStorage.setItem('desktop-layout', JSON.stringify(serializedLayout));
            }
          }
        }, 100);
      };

      g.on('change', saveLayout);
      g.on('resizestop dragstop', saveLayout);
    } else {
      applyLayout(mobileLayout);
    }

    return g;
  }, []);

  const handleResetLayout = useCallback(() => {
    if (!grid || isMobile) return;
    
    grid.batchUpdate();
    try {
      // Only update positions, don't recreate widgets
      grid.load(defaultLayout, false);
      grid.compact();
    } finally {
      grid.commit();
    }
  }, [grid, isMobile]);

  const handleCopyLayout = useCallback(() => {
    if (!grid || isMobile) return '';
    // Only save positions, not content
    const layout = grid.save(false);
    return JSON.stringify(layout);
  }, [grid, isMobile]);

  const handlePasteLayout = useCallback((layoutStr: string) => {
    if (!grid || isMobile) return;
    try {
      const layout = JSON.parse(layoutStr);
      grid.batchUpdate();
      try {
        // Only update positions, don't recreate widgets
        grid.load(layout, false);
        grid.compact();
      } finally {
        grid.commit();
      }
    } catch (error) {
      console.error('Failed to paste layout:', error);
    }
  }, [grid, isMobile]);

  // Handle resize with debouncing
  const handleResize = useCallback(() => {
    if (resizeFrameRef.current) {
      cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = requestAnimationFrame(() => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      if (mobile !== isMobile) {
        setIsMobile(mobile);
        const newGrid = initializeGrid(mobile);
        if (newGrid) {
          setGrid(newGrid);
        }
      }
    });
  }, [isMobile, initializeGrid]);

  useEffect(() => {
    const newGrid = initializeGrid(isMobile);
    if (newGrid) {
      setGrid(newGrid);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (gridRef.current) {
        gridRef.current.destroy(false);
      }
    };
  }, [initializeGrid, isMobile, handleResize]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="h-[calc(100vh-64px)] mt-16 overflow-y-auto scrollbar-main">
        <div className="max-w-[1920px] mx-auto px-4">
          <ControlBar 
            onResetLayout={handleResetLayout}
            onCopyLayout={handleCopyLayout}
            onPasteLayout={handlePasteLayout}
          />
          <div className="grid-stack">
            <div className="grid-stack-item" 
              gs-id="chart"
              gs-x="0" 
              gs-y="0" 
              gs-w={isMobile ? "1" : "8"} 
              gs-h="6">
              <WidgetContainer title="BTC/USDT">
                <TradingViewChart />
              </WidgetContainer>
            </div>
            <div className="grid-stack-item" 
              gs-id="orderbook"
              gs-x={isMobile ? "0" : "8"} 
              gs-y={isMobile ? "6" : "0"} 
              gs-w={isMobile ? "1" : "4"} 
              gs-h="6">
              <WidgetContainer title="Order Book">
                <OrderBook />
              </WidgetContainer>
            </div>
            <div className="grid-stack-item" 
              gs-id="tradeform"
              gs-x="0" 
              gs-y={isMobile ? "12" : "6"} 
              gs-w={isMobile ? "1" : "4"} 
              gs-h="4">
              <WidgetContainer title="Trade">
                <TradeForm />
              </WidgetContainer>
            </div>
            <div className="grid-stack-item" 
              gs-id="market"
              gs-x={isMobile ? "0" : "4"} 
              gs-y={isMobile ? "16" : "6"} 
              gs-w={isMobile ? "1" : "4"} 
              gs-h="4">
              <WidgetContainer title="Market Overview">
                <MarketOverview />
              </WidgetContainer>
            </div>
            <div className="grid-stack-item" 
              gs-id="trades"
              gs-x={isMobile ? "0" : "8"} 
              gs-y={isMobile ? "20" : "6"} 
              gs-w={isMobile ? "1" : "4"} 
              gs-h="4">
              <WidgetContainer title="Recent Trades">
                <RecentTrades />
              </WidgetContainer>
            </div>
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

export default App;