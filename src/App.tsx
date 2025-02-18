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
  { x: 0, y: 0, w: 6, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 6, y: 0, w: 3, h: 6, id: 'orderbook', minW: 2, minH: 2 },
  { x: 9, y: 0, w: 3, h: 4, id: 'tradeform', minW: 2, minH: 2 },
  { x: 9, y: 4, w: 3, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 0, y: 6, w: 9, h: 2, id: 'trades', minW: 2, minH: 2 }
];

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

function App() {
  const [grid, setGrid] = useState<GridStack | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const resizeFrameRef = useRef<number>();
  const gridRef = useRef<GridStack | null>(null);

  const isValidLayout = (layout: GridStackWidget[]) => {
    if (!Array.isArray(layout) || layout.length !== defaultLayout.length) {
      return false;
    }
    
    // Only verify that all required widgets are present and have valid minimum sizes
    return defaultLayout.every(defaultWidget => {
      const savedWidget = layout.find(w => w.id === defaultWidget.id);
      return savedWidget && 
             (savedWidget.w ?? 0) >= (defaultWidget.minW ?? 2) && 
             (savedWidget.h ?? 0) >= (defaultWidget.minH ?? 2);
    });
  };

  const applyLayout = (layout: GridStackWidget[], gridElement: Element) => {
    if (!gridRef.current) return;
    
    // Step 1: Temporarily disable movement and remove constraints
    gridRef.current.batchUpdate();
    try {
      // First disable all movement
      gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
        const element = item as HTMLElement;
        element.setAttribute('gs-no-move', 'true');
        element.removeAttribute('gs-min-w');
        element.removeAttribute('gs-min-h');
        element.removeAttribute('gs-max-w');
        element.removeAttribute('gs-max-h');
      });
    } finally {
      gridRef.current.commit();
    }

    // Step 2: Apply minimum sizes
    gridRef.current.batchUpdate();
    try {
      gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
        const element = item as HTMLElement;
        const widgetId = element.getAttribute('gs-id');
        const defaultWidget = defaultLayout.find(w => w.id === widgetId);
        if (defaultWidget) {
          element.setAttribute('gs-min-w', String(defaultWidget.minW ?? 2));
          element.setAttribute('gs-min-h', String(defaultWidget.minH ?? 2));
        }
      });
    } finally {
      gridRef.current.commit();
    }

    // Step 3: Apply positions in sequence
    gridRef.current.batchUpdate();
    try {
      // Sort layout by position priority
      const sortedLayout = [...layout].sort((a, b) => {
        const aY = a.y ?? 0;
        const bY = b.y ?? 0;
        if (aY !== bY) return aY - bY;
        
        const aX = a.x ?? 0;
        const bX = b.x ?? 0;
        if (aX !== bX) return aX - bX;
        
        // If positions are the same, place larger widgets first
        const aSize = (a.w ?? 0) * (a.h ?? 0);
        const bSize = (b.w ?? 0) * (b.h ?? 0);
        return bSize - aSize;
      });

      // First pass: Position all widgets
      sortedLayout.forEach((node: GridStackWidget) => {
        if (node.id) {
          const item = gridElement.querySelector(`[gs-id="${node.id}"]`);
          if (item && gridRef.current) {
            const currentNode = gridRef.current.engine.nodes.find(n => n.el === item);
            if (currentNode && (currentNode.x !== node.x || currentNode.y !== node.y)) {
              gridRef.current.update(item as HTMLElement, {
                x: node.x,
                y: node.y,
                w: node.w,
                h: node.h,
                autoPosition: false
              });
            }
          }
        }
      });

      // Re-enable movement
      gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
        const element = item as HTMLElement;
        element.removeAttribute('gs-no-move');
      });

      // Second pass: Verify positions
      sortedLayout.forEach((node: GridStackWidget) => {
        if (node.id) {
          const item = gridElement.querySelector(`[gs-id="${node.id}"]`);
          if (item && gridRef.current) {
            const currentNode = gridRef.current.engine.nodes.find(n => n.el === item);
            if (currentNode && (currentNode.x !== node.x || currentNode.y !== node.y)) {
              gridRef.current.update(item as HTMLElement, {
                x: node.x,
                y: node.y,
                autoPosition: false
              });
            }
          }
        }
      });
    } finally {
      gridRef.current.commit();
    }
  };

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
      margin: 4,
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
    };

    const g = GridStack.init(options, gridElement as GridStackElement);
    gridRef.current = g;

    // Get the layout to apply first
    let layoutToApply = defaultLayout;
    if (!mobile) {
      const savedLayout = localStorage.getItem('desktop-layout');
      if (savedLayout) {
        try {
          const parsedLayout = JSON.parse(savedLayout);
          if (isValidLayout(parsedLayout)) {
            layoutToApply = parsedLayout;
          }
        } catch (error) {
          console.error('Failed to parse saved layout:', error);
        }
      }
    } else {
      layoutToApply = mobileLayout;
    }

    // Initialize all widgets with correct attributes
    g.batchUpdate();
    try {
      gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
        const element = item as HTMLElement;
        const gsId = element.getAttribute('gs-id');
        
        // Find the layout configuration for this widget
        const layoutNode = layoutToApply.find(node => node.id === gsId);
        const defaultNode = defaultLayout.find(node => node.id === gsId);
        
        if (layoutNode && defaultNode) {
          // Clear existing gs-* attributes except gs-id
          Array.from(element.attributes)
            .filter(attr => attr.name.startsWith('gs-') && attr.name !== 'gs-id')
            .forEach(attr => element.removeAttribute(attr.name));

          // Set all required attributes
          element.setAttribute('gs-x', String(layoutNode.x));
          element.setAttribute('gs-y', String(layoutNode.y));
          element.setAttribute('gs-w', String(layoutNode.w));
          element.setAttribute('gs-h', String(layoutNode.h));
          element.setAttribute('gs-min-w', String(defaultNode.minW ?? 2));
          element.setAttribute('gs-min-h', String(defaultNode.minH ?? 2));
          element.setAttribute('gs-auto-position', 'false');
        }
      });
    } finally {
      g.commit();
    }

    // Make sure the grid recognizes the layout
    g.batchUpdate();
    try {
      layoutToApply.forEach(node => {
        if (node.id) {
          const item = gridElement.querySelector(`[gs-id="${node.id}"]`);
          if (item) {
            g.update(item as HTMLElement, {
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
              autoPosition: false
            });
          }
        }
      });
      g.compact();
    } finally {
      g.commit();
    }

    // Set up layout saving with debounce
    if (!mobile) {
      let saveTimeout: NodeJS.Timeout;
      const saveLayout = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          const items = g.getGridItems();
          const serializedLayout = items
            .map(item => {
              const node = item.gridstackNode;
              if (!node || !node.id) return null;

              const defaultWidget = defaultLayout.find(w => w.id === node.id);
              if (!defaultWidget) return null;

              return {
                id: node.id,
                x: node.x ?? 0,
                y: node.y ?? 0,
                w: Math.max(node.w ?? 2, defaultWidget.minW ?? 2),
                h: Math.max(node.h ?? 2, defaultWidget.minH ?? 2),
                minW: defaultWidget.minW ?? 2,
                minH: defaultWidget.minH ?? 2
              };
            })
            .filter((item): item is LayoutWidget => item !== null);

          if (isValidLayout(serializedLayout)) {
            localStorage.setItem('desktop-layout', JSON.stringify(serializedLayout));
          }
        }, 250);
      };

      g.on('change', saveLayout);
      g.on('resizestop dragstop', saveLayout);
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
    // Save only the core widget data we need
    const items = grid.getGridItems();
    const layout = items.map(item => {
      const node = item.gridstackNode;
      if (!node || !node.id) return null;
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
    if (!grid || isMobile) return;
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return;
    
    try {
      const layout = JSON.parse(layoutStr) as LayoutWidget[];
      if (isValidLayout(layout)) {
        // Step 1: Temporarily disable movement and remove constraints
        grid.batchUpdate();
        try {
          // First disable all movement
          gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
            const element = item as HTMLElement;
            element.setAttribute('gs-no-move', 'true');
            element.removeAttribute('gs-min-w');
            element.removeAttribute('gs-min-h');
            element.removeAttribute('gs-max-w');
            element.removeAttribute('gs-max-h');
          });
        } finally {
          grid.commit();
        }

        // Step 2: Apply minimum sizes
        grid.batchUpdate();
        try {
          gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
            const element = item as HTMLElement;
            const widgetId = element.getAttribute('gs-id');
            const layoutWidget = layout.find((w: LayoutWidget) => w.id === widgetId);
            if (layoutWidget) {
              element.setAttribute('gs-min-w', String(layoutWidget.minW));
              element.setAttribute('gs-min-h', String(layoutWidget.minH));
            }
          });
        } finally {
          grid.commit();
        }

        // Step 3: Apply positions in sequence
        grid.batchUpdate();
        try {
          // Sort layout by position priority:
          // 1. Lower y positions first (top to bottom)
          // 2. For same y, lower x positions first (left to right)
          // 3. For overlapping items, larger items first
          const sortedLayout = [...layout].sort((a, b) => {
            const aY = a.y ?? 0;
            const bY = b.y ?? 0;
            if (aY !== bY) return aY - bY;
            
            const aX = a.x ?? 0;
            const bX = b.x ?? 0;
            if (aX !== bX) return aX - bX;
            
            // If positions are the same, place larger widgets first
            const aSize = (a.w ?? 0) * (a.h ?? 0);
            const bSize = (b.w ?? 0) * (b.h ?? 0);
            return bSize - aSize;
          });

          // First pass: Position all widgets at their target locations
          sortedLayout.forEach((node: LayoutWidget) => {
            if (node.id) {
              const item = gridElement.querySelector(`[gs-id="${node.id}"]`);
              if (item) {
                grid.update(item as HTMLElement, {
                  x: node.x,
                  y: node.y,
                  w: node.w,
                  h: node.h,
                  autoPosition: false
                });
              }
            }
          });

          // Re-enable movement
          gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
            const element = item as HTMLElement;
            element.removeAttribute('gs-no-move');
          });

          // Second pass: Verify positions and adjust if needed
          sortedLayout.forEach((node: LayoutWidget) => {
            if (node.id) {
              const item = gridElement.querySelector(`[gs-id="${node.id}"]`);
              if (item && gridRef.current) {
                const currentNode = gridRef.current.engine.nodes.find(n => n.el === item);
                if (currentNode && (currentNode.x !== node.x || currentNode.y !== node.y)) {
                  gridRef.current.update(item as HTMLElement, {
                    x: node.x,
                    y: node.y,
                    autoPosition: false
                  });
                }
              }
            }
          });
        } finally {
          grid.commit();
        }

        // Save the pasted layout
        localStorage.setItem('desktop-layout', layoutStr);
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
              gs-w={isMobile ? "1" : "6"} 
              gs-h="6"
              gs-min-w="2"
              gs-min-h="2">
              <WidgetContainer title="BTC/USDT">
                <TradingViewChart />
              </WidgetContainer>
            </div>
            <div className="grid-stack-item" 
              gs-id="orderbook"
              gs-x="6" 
              gs-y="0" 
              gs-w={isMobile ? "1" : "3"} 
              gs-h="6"
              gs-min-w="2"
              gs-min-h="2">
              <WidgetContainer title="Order Book">
                <OrderBook />
              </WidgetContainer>
            </div>
            <div className="grid-stack-item" 
              gs-id="tradeform"
              gs-x="9" 
              gs-y="0" 
              gs-w={isMobile ? "1" : "3"} 
              gs-h="4"
              gs-min-w="2"
              gs-min-h="2">
              <WidgetContainer title="Trade">
                <TradeForm />
              </WidgetContainer>
            </div>
            <div className="grid-stack-item" 
              gs-id="market"
              gs-x="9" 
              gs-y="4" 
              gs-w={isMobile ? "1" : "3"} 
              gs-h="4"
              gs-min-w="2"
              gs-min-h="2">
              <WidgetContainer title="Market Overview">
                <MarketOverview />
              </WidgetContainer>
            </div>
            <div className="grid-stack-item" 
              gs-id="trades"
              gs-x="0" 
              gs-y="6" 
              gs-w={isMobile ? "1" : "9"} 
              gs-h="2"
              gs-min-w="2"
              gs-min-h="2">
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