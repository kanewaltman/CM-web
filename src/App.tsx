import { useEffect, useState, useCallback, useRef } from 'react';
import { GridStack, GridStackWidget, GridStackOptions, GridStackNode, GridStackElement } from 'gridstack';
import { createRoot } from 'react-dom/client';
import 'gridstack/dist/gridstack.min.css';
import { TopBar } from './components/TopBar';
import { ControlBar } from './components/ControlBar';
import { TradingViewChart } from './components/TradingViewChart';
import { OrderBook } from './components/OrderBook';
import { TradeForm } from './components/TradeForm';
import { MarketOverview } from './components/MarketOverview';
import { RecentTrades } from './components/RecentTrades';
import { Toaster } from './components/ui/toaster';
import { WidgetRenderer } from './components/WidgetRenderer';

// Default desktop layout configuration
const defaultLayout = [
  { x: 0, y: 0, w: 6, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 6, y: 0, w: 3, h: 6, id: 'orderbook', minW: 2, minH: 2 },
  { x: 9, y: 0, w: 3, h: 4, id: 'tradeform', minW: 2, minH: 2 },
  { x: 9, y: 4, w: 3, h: 4, id: 'market', minW: 2, minH: 2 },
  { x: 0, y: 6, w: 9, h: 2, id: 'trades', minW: 2, minH: 2 }
];

// Available widgets with their configurations
const availableWidgets = [
  { id: 'chart', title: 'Chart', minW: 2, minH: 2, w: 6, h: 6 },
  { id: 'orderbook', title: 'Order Book', minW: 2, minH: 2, w: 3, h: 6 },
  { id: 'tradeform', title: 'Trade Form', minW: 2, minH: 2, w: 3, h: 4 },
  { id: 'market', title: 'Market Overview', minW: 2, minH: 2, w: 3, h: 4 },
  { id: 'trades', title: 'Recent Trades', minW: 2, minH: 2, w: 9, h: 2 },
] as const;

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

interface Widget {
  id: string;
  title: string;
  minW: number;
  minH: number;
  w: number;
  h: number;
}

function App() {
  const [grid, setGrid] = useState<GridStack | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [activeWidgets, setActiveWidgets] = useState<Set<string>>(new Set(['chart', 'orderbook', 'tradeform', 'market', 'trades']));
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
    const grid = gridRef.current;
    if (!grid) return;
    
    // Step 1: Sort layout by vertical position first, then horizontal
    const sortedLayout = [...layout].sort((a, b) => {
      const aY = a.y ?? 0;
      const bY = b.y ?? 0;
      if (aY !== bY) return aY - bY;
      return (a.x ?? 0) - (b.x ?? 0);
    });

    // Step 2: Disable all movement and compaction temporarily
    grid.batchUpdate();
    try {
      // First remove all gs-* attributes except gs-id
      gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
        const element = item as HTMLElement;
        Array.from(element.attributes)
          .filter(attr => attr.name.startsWith('gs-') && attr.name !== 'gs-id')
          .forEach(attr => element.removeAttribute(attr.name));
        
        // Temporarily disable movement
        element.setAttribute('gs-no-move', 'true');
      });

      // Apply layout in sequence
      sortedLayout.forEach(node => {
        if (node.id) {
          const element = gridElement.querySelector(`[gs-id="${node.id}"]`) as HTMLElement;
          if (element) {
            // Set minimum constraints first
            const defaultNode = defaultLayout.find(d => d.id === node.id);
            if (defaultNode) {
              element.setAttribute('gs-min-w', String(defaultNode.minW ?? 2));
              element.setAttribute('gs-min-h', String(defaultNode.minH ?? 2));
            }
            
            // Force position and size
            element.setAttribute('gs-x', String(node.x));
            element.setAttribute('gs-y', String(node.y));
            element.setAttribute('gs-w', String(node.w));
            element.setAttribute('gs-h', String(node.h));
            
            // Update grid engine
            grid.update(element, {
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
              autoPosition: false
            });
          }
        }
      });

      // Re-enable movement and verify positions
      gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
        const element = item as HTMLElement;
        element.removeAttribute('gs-no-move');
      });

      // Final position verification
      let needsCompaction = false;
      sortedLayout.forEach(node => {
        if (node.id) {
          const element = gridElement.querySelector(`[gs-id="${node.id}"]`);
          if (element) {
            const currentNode = grid.engine.nodes.find(n => n.el === element);
            if (currentNode && (currentNode.x !== node.x || currentNode.y !== node.y)) {
              grid.update(element as HTMLElement, {
                x: node.x,
                y: node.y,
                autoPosition: false
              });
              needsCompaction = true;
            }
          }
        }
      });

      // Only compact if absolutely necessary
      if (needsCompaction) {
        grid.compact();
      }
    } finally {
      grid.commit();
    }
  };

  const handleRemoveWidget = useCallback((widgetId: string) => {
    if (!gridRef.current) return;
    
    const element = document.querySelector(`[gs-id="${widgetId}"]`);
    if (element) {
      // First remove from GridStack (true to detach DOM element)
      gridRef.current.removeWidget(element as HTMLElement, true);
      
      // Update active widgets state
      setActiveWidgets(prev => {
        const newSet = new Set(prev);
        newSet.delete(widgetId);
        return newSet;
      });

      // Clean up any remaining DOM elements with this gs-id
      document.querySelectorAll(`[gs-id="${widgetId}"]`).forEach(el => {
        el.remove();
      });
    }
  }, []);

  const handleAddWidget = useCallback((widgetData: Widget) => {
    if (!gridRef.current) return;
    
    const element = document.createElement('div');
    element.className = 'grid-stack-item';
    element.setAttribute('gs-id', widgetData.id);
    element.setAttribute('gs-w', String(widgetData.w));
    element.setAttribute('gs-h', String(widgetData.h));
    element.setAttribute('gs-min-w', String(widgetData.minW));
    element.setAttribute('gs-min-h', String(widgetData.minH));

    const root = createRoot(element);
    root.render(
      <WidgetRenderer
        id={widgetData.id}
        title={widgetData.title}
        onRemove={() => handleRemoveWidget(widgetData.id)}
      />
    );

    gridRef.current.addWidget(element);
    setActiveWidgets(prev => new Set([...prev, widgetData.id]));
  }, [handleRemoveWidget]);

  const initializeGrid = useCallback((mobile: boolean) => {
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return null;

    // Add initial opacity style to grid element
    gridElement.classList.add('grid-initializing');

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
        appendTo: 'body',
        scroll: true,
        helper: 'clone'
      },
      resizable: {
        handles: 'e, se, s, sw, w',
        autoHide: true
      },
      removable: true,
      minRow: 1,
      staticGrid: false,
      acceptWidgets: true,
    };

    const g = GridStack.init(options, gridElement as GridStackElement);
    gridRef.current = g;
    setGrid(g);

    // Handle dropping new widgets
    g.on('dropped', (event: Event, previousWidget: GridStackNode, newWidget: GridStackNode) => {
      try {
        const widgetData = JSON.parse((event as DragEvent).dataTransfer?.getData('application/json') || '{}');
        if (widgetData.id) {
          handleAddWidget(widgetData);
        }
      } catch (error) {
        console.error('Failed to add widget:', error);
      }
    });

    // Initialize all widgets with correct attributes
    g.batchUpdate();
    try {
      // Get the layout to apply
      let layoutToApply = mobile ? mobileLayout : defaultLayout;
      let activeWidgetIds = new Set(['chart', 'orderbook', 'tradeform', 'market', 'trades']);
      
      if (!mobile) {
        const savedLayout = localStorage.getItem('desktop-layout');
        const savedWidgets = localStorage.getItem('active-widgets');
        
        if (savedLayout && savedWidgets) {
          try {
            const parsedLayout = JSON.parse(savedLayout);
            const parsedWidgets = JSON.parse(savedWidgets);
            
            if (Array.isArray(parsedWidgets)) {
              activeWidgetIds = new Set(parsedWidgets);
            }
            
            if (isValidLayout(parsedLayout)) {
              layoutToApply = parsedLayout;
            }
          } catch (error) {
            console.error('Failed to parse saved layout:', error);
          }
        }
      }

      // Update active widgets state
      setActiveWidgets(activeWidgetIds);

      // First remove all gs-* attributes except gs-id
      gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
        const element = item as HTMLElement;
        Array.from(element.attributes)
          .filter(attr => attr.name.startsWith('gs-') && attr.name !== 'gs-id')
          .forEach(attr => element.removeAttribute(attr.name));
      });

      // Apply layout in sequence
      layoutToApply.forEach(node => {
        if (!activeWidgetIds.has(node.id)) return; // Skip inactive widgets
        
        const element = gridElement.querySelector(`[gs-id="${node.id}"]`) as HTMLElement;
        if (element) {
          element.setAttribute('gs-x', String(node.x));
          element.setAttribute('gs-y', String(node.y));
          element.setAttribute('gs-w', mobile ? "1" : String(node.w));
          element.setAttribute('gs-h', String(node.h));
          element.setAttribute('gs-min-w', String(node.minW));
          element.setAttribute('gs-min-h', String(node.minH));
          
          g.update(element, {
            x: node.x,
            y: node.y,
            w: mobile ? 1 : node.w,
            h: node.h,
            autoPosition: false
          });
        }
      });
    } finally {
      g.commit();
    }

    // Re-enable grid features after positions are locked in
    requestAnimationFrame(() => {
      gridElement.classList.remove('grid-initializing');
      
      // Re-enable animations and interactive features
      setTimeout(() => {
        if (gridRef.current) {
          gridRef.current.batchUpdate();
          try {
            gridRef.current.setStatic(false);
            gridRef.current.opts.float = false;
            gridRef.current.setAnimation(true);
            gridRef.current.enableMove(true);
            gridRef.current.enableResize(true);
          } finally {
            gridRef.current.commit();
          }
        }
      }, 300);
    });

    // Set up layout saving with debounce
    if (!mobile) {
      let saveTimeout: NodeJS.Timeout;
      const saveLayout = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          if (!gridRef.current) return;
          
          const items = gridRef.current.getGridItems();
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
            localStorage.setItem('active-widgets', JSON.stringify([...activeWidgets]));
          }
        }, 250);
      };

      g.on('change', saveLayout);
      g.on('resizestop dragstop', saveLayout);
    }

    return g;
  }, [handleAddWidget]);

  const handleResetLayout = useCallback(() => {
    if (!gridRef.current || isMobile) return;
    
    // First, restore all default widgets that were removed
    defaultLayout.forEach(widget => {
      if (!activeWidgets.has(widget.id)) {
        const widgetConfig = availableWidgets.find(w => w.id === widget.id);
        if (widgetConfig) {
          handleAddWidget(widgetConfig);
        }
      }
    });

    // Then reset the layout
    gridRef.current.batchUpdate();
    try {
      gridRef.current.load(defaultLayout, false);
      gridRef.current.compact();
    } finally {
      gridRef.current.commit();
    }

    // Save the reset state
    localStorage.setItem('desktop-layout', JSON.stringify(defaultLayout));
    localStorage.setItem('active-widgets', JSON.stringify(defaultLayout.map(w => w.id)));
  }, [isMobile, activeWidgets, handleAddWidget]);

  const handleCopyLayout = useCallback(() => {
    if (!gridRef.current || isMobile) return '';
    
    const items = gridRef.current.getGridItems();
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

    const state = {
      layout,
      activeWidgets: [...activeWidgets]
    };

    return JSON.stringify(state);
  }, [gridRef, isMobile, activeWidgets]);

  const handlePasteLayout = useCallback((layoutStr: string) => {
    if (!gridRef.current || isMobile) return;
    
    try {
      const state = JSON.parse(layoutStr);
      if (!state.layout || !Array.isArray(state.layout) || !Array.isArray(state.activeWidgets)) {
        throw new Error('Invalid layout format');
      }

      // First, remove all widgets
      gridRef.current.removeAll();
      setActiveWidgets(new Set());

      // Add all widgets from the pasted state
      state.activeWidgets.forEach((widgetId: string) => {
        const widgetConfig = availableWidgets.find(w => w.id === widgetId);
        if (widgetConfig) {
          handleAddWidget(widgetConfig);
        }
      });

      // Apply the layout
      gridRef.current.batchUpdate();
      try {
        gridRef.current.load(state.layout, false);
        gridRef.current.compact();
      } finally {
        gridRef.current.commit();
      }

      // Save the pasted state
      localStorage.setItem('desktop-layout', JSON.stringify(state.layout));
      localStorage.setItem('active-widgets', JSON.stringify(state.activeWidgets));
    } catch (error) {
      console.error('Failed to paste layout:', error);
    }
  }, [gridRef, isMobile, handleAddWidget]);

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
      <style>{`
        .grid-initializing {
          opacity: 0;
          transition: none;
        }
        .grid-stack {
          opacity: 1;
          transition: opacity 300ms ease-in-out;
        }
        .grid-stack-item {
          transition: transform 300ms ease-in-out, opacity 300ms ease-in-out;
        }
        /* Ensure GridStack's own animations work properly */
        .grid-stack-item.ui-draggable-dragging,
        .grid-stack-item.ui-resizable-resizing {
          transition: none !important;
        }
      `}</style>
      <TopBar />
      <main className="h-[calc(100vh-64px)] mt-16 overflow-y-auto scrollbar-main">
        <div className="max-w-[1920px] mx-auto px-4">
          <ControlBar 
            onResetLayout={handleResetLayout}
            onCopyLayout={handleCopyLayout}
            onPasteLayout={handlePasteLayout}
            grid={grid}
            activeWidgets={activeWidgets}
          />
          <div className="grid-stack">
            {defaultLayout.map(widget => (
              <div
                key={widget.id}
                className="grid-stack-item"
                gs-id={widget.id}
                gs-x={widget.x}
                gs-y={widget.y}
                gs-w={isMobile ? "1" : String(widget.w)}
                gs-h={String(widget.h)}
                gs-min-w={String(widget.minW)}
                gs-min-h={String(widget.minH)}
              >
                <WidgetRenderer
                  id={widget.id}
                  title={availableWidgets.find(w => w.id === widget.id)?.title || ''}
                  onRemove={() => handleRemoveWidget(widget.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

export default App;