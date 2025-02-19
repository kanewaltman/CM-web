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

// Extend GridStackWidget type to include el property
interface ExtendedGridStackWidget extends GridStackWidget {
  el?: HTMLElement;
}

// Predefined IDs for each widget type
const widgetIds: Record<string, string> = {
  'market-overview': 'market-overview',
  'order-book': 'order-book',
  'recent-trades': 'recent-trades',
  'trading-view-chart': 'trading-view-chart',
  'trade-form': 'trade-form'
};

function App() {
  const [grid, setGrid] = useState<GridStack | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
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

  const isValidLayout = (layout: GridStackWidget[]) => {
    if (!Array.isArray(layout)) return false;
    
    // For dynamic layouts, just verify minimum sizes
    return layout.every(widget => {
      return (widget.w ?? 0) >= 2 && (widget.h ?? 0) >= 2;
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
      cellHeight: mobile ? '100px' : '60px',
      margin: 4,
      column: mobile ? 1 : 12,
      animate: true,
      draggable: {
        handle: '.widget-header',
      },
      resizable: {
        handles: 'e, se, s, sw, w',
        autoHide: false
      },
      minRow: 1,
      staticGrid: false,
      disableResize: false,
      disableDrag: false
    };

    const g = GridStack.init(options, gridElement as GridStackElement);
    gridRef.current = g;

    // Temporarily disable animations during layout application
    g.setAnimation(false);

    // Get the layout to apply
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
      // First remove all gs-* attributes except gs-id
      gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
        const element = item as HTMLElement;
        Array.from(element.attributes)
          .filter(attr => attr.name.startsWith('gs-') && attr.name !== 'gs-id')
          .forEach(attr => element.removeAttribute(attr.name));
      });

      // Apply layout in exact order without sorting
      layoutToApply.forEach(node => {
        const element = gridElement.querySelector(`[gs-id="${node.id}"]`) as HTMLElement;
        if (element) {
          // Set minimum constraints first
          const defaultNode = defaultLayout.find(d => d.id === node.id);
          if (defaultNode) {
            element.setAttribute('gs-min-w', String(defaultNode.minW ?? 2));
            element.setAttribute('gs-min-h', String(defaultNode.minH ?? 2));
          }
          
          // Force exact position and size
          element.setAttribute('gs-x', String(node.x));
          element.setAttribute('gs-y', String(node.y));
          element.setAttribute('gs-w', String(node.w));
          element.setAttribute('gs-h', String(node.h));
          element.setAttribute('gs-auto-position', 'false');
          
          // Update grid engine with exact position
          g.update(element, {
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h,
            autoPosition: false
          });
        }
      });

      // Force a second pass to ensure positions
      layoutToApply.forEach(node => {
        const element = gridElement.querySelector(`[gs-id="${node.id}"]`) as HTMLElement;
        if (element) {
          const gridNode = g.engine.nodes.find(n => n.id === node.id);
          if (gridNode) {
            gridNode.x = node.x;
            gridNode.y = node.y;
            gridNode.autoPosition = false;
          }
        }
      });
    } finally {
      g.commit();
    }

    // Re-enable grid features after positions are locked in
    requestAnimationFrame(() => {
      // Remove initializing class to trigger fade in
      gridElement.classList.remove('grid-initializing');
      
      // Re-enable animations and interactive features
      setTimeout(() => {
        g.batchUpdate();
        try {
          g.setStatic(false);
          g.opts.float = false;
          g.setAnimation(true); // Re-enable animations
          g.enableMove(true);
          g.enableResize(true);
        } finally {
          g.commit();
        }
      }, 300); // Match this with the CSS transition duration
    });

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

  const handleWidgetDrop = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const widgetType = event.dataTransfer?.getData('widget/type');
    
    if (!widgetType || !gridRef.current || !widgetComponents[widgetType]) return;

    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return;

    // Get drop coordinates relative to grid
    const rect = gridElement.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / (rect.width / 12));
    const y = Math.floor((event.clientY - rect.top) / 150);

    // Use predefined widget ID
    const widgetId = widgetIds[widgetType];

    // Check if widget already exists
    if (gridElement.querySelector(`[gs-id="${widgetId}"]`)) {
      console.warn(`Widget with ID ${widgetId} already exists.`);
      return;
    }

    // Create new widget element with proper GridStack classes
    const widgetElement = document.createElement('div');
    widgetElement.className = 'grid-stack-item';
    widgetElement.setAttribute('gs-id', widgetId);
    widgetElement.setAttribute('gs-min-w', '2');
    widgetElement.setAttribute('gs-min-h', '2');
    widgetElement.setAttribute('gs-no-resize', 'false');
    widgetElement.setAttribute('gs-no-move', 'false');

    // Create the content wrapper
    const contentElement = document.createElement('div');
    contentElement.className = 'grid-stack-item-content';
    widgetElement.appendChild(contentElement);

    // Add widget content using createRoot
    const root = ReactDOM.createRoot(contentElement);
    const WidgetComponent = widgetComponents[widgetType];
    const widgetTitle = widgetTitles[widgetType];
    
    root.render(
      <WidgetContainer title={widgetTitle}>
        <WidgetComponent />
      </WidgetContainer>
    );

    // Add widget to grid with draggable and resizable enabled
    gridRef.current.batchUpdate();
    try {
      // First add the element to the DOM
      gridElement.appendChild(widgetElement);

      // Then initialize it with GridStack
      const widget = gridRef.current.makeWidget(widgetElement);

      // Update its position and size with animation
      gridRef.current.setAnimation(true);
      gridRef.current.update(widgetElement, {
        x,
        y,
        w: 3,
        h: 4,
        minW: 2,
        minH: 2,
        autoPosition: true,
        noResize: false,
        noMove: false
      });

      // Make sure grid is not in static mode
      gridRef.current.setStatic(false);

      // Explicitly enable resize and move for the new widget
      gridRef.current.movable(widgetElement, true);
      gridRef.current.resizable(widgetElement, true);

      // Force a refresh of the widget to ensure handles are properly initialized
      setTimeout(() => {
        if (gridRef.current) {
          gridRef.current.batchUpdate();
          try {
            // Re-enable resize and move
            gridRef.current.movable(widgetElement, true);
            gridRef.current.resizable(widgetElement, true);
            // Force update with animation
            gridRef.current.update(widgetElement, {
              noResize: false,
              noMove: false
            });
          } finally {
            gridRef.current.commit();
          }
        }
      }, 50);
    } finally {
      gridRef.current.commit();
    }

    // Save updated layout
    const items = gridRef.current.getGridItems();
    const serializedLayout = items
      .map(item => {
        const node = item.gridstackNode;
        if (!node || !node.id) return null;
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
  }, [gridRef]);

  const handlePasteLayout = useCallback((layoutStr: string) => {
    if (!grid || isMobile) return;
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return;
    
    try {
      const layout = JSON.parse(layoutStr) as LayoutWidget[];
      if (isValidLayout(layout)) {
        // Remove all existing widgets
        grid.removeAll();

        // Create and add widgets based on layout
        layout.forEach((node: LayoutWidget) => {
          const widgetType = node.id.split('-')[0];
          if (!widgetComponents[widgetType]) return;

          // Create widget element with the exact same structure as default widgets
          const widgetElement = document.createElement('div');
          widgetElement.className = 'grid-stack-item';
          widgetElement.setAttribute('gs-id', node.id);
          widgetElement.setAttribute('gs-min-w', '2');
          widgetElement.setAttribute('gs-min-h', '2');

          // Add widget to grid
          grid.addWidget({
            id: node.id,
            el: widgetElement,
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h,
            minW: 2,
            minH: 2,
            autoPosition: false
          } as ExtendedGridStackWidget);

          // Add widget content using createRoot
          const root = ReactDOM.createRoot(widgetElement);
          const WidgetComponent = widgetComponents[widgetType];
          const widgetTitle = widgetTitles[widgetType];
          
          root.render(
            <WidgetContainer title={widgetTitle}>
              <WidgetComponent />
            </WidgetContainer>
          );
        });

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

  useEffect(() => {
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return;

    // Add drop event handlers
    const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

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
          const rect = gridElement.getBoundingClientRect();
          const x = Math.floor((e.clientX - rect.left) / (rect.width / 12));
          const y = Math.floor((e.clientY - rect.top) / 150);
          
          gridRef.current.addWidget({
            el: previewElement as GridStackElement,
            x: x,
            y: y,
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
          const rect = gridElement.getBoundingClientRect();
          const x = Math.floor((e.clientX - rect.left) / (rect.width / 12));
          const y = Math.floor((e.clientY - rect.top) / 150);
          
          gridRef.current.update(previewElement as HTMLElement, {
            x: x,
            y: y
          });
        }
      }
    };

    const cleanupPreview = () => {
      const previewElement = document.querySelector('.widget-drag-preview');
      if (previewElement && gridRef.current) {
        gridRef.current.removeWidget(previewElement as HTMLElement, false);
        previewElement.remove(); // Ensure the element is fully removed from DOM
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Only remove if we're actually leaving the grid
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

    gridElement.addEventListener('dragover', handleDragOver as unknown as EventListener);
    gridElement.addEventListener('dragleave', handleDragLeave as unknown as EventListener);
    gridElement.addEventListener('dragend', handleDragEnd);
    gridElement.addEventListener('drop', (e) => {
      cleanupPreview();
      handleWidgetDrop(e as unknown as React.DragEvent<HTMLElement>);
    });

    return () => {
      gridElement.removeEventListener('dragover', handleDragOver as unknown as EventListener);
      gridElement.removeEventListener('dragleave', handleDragLeave as unknown as EventListener);
      gridElement.removeEventListener('dragend', handleDragEnd);
      gridElement.removeEventListener('drop', handleWidgetDrop as unknown as EventListener);
      cleanupPreview();
    };
  }, [handleWidgetDrop]);

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
        .widget-drag-preview {
          opacity: 0.7;
          pointer-events: none;
        }
        .widget-drag-preview .grid-stack-item-content {
          background: hsl(var(--color-widget-bg));
          border: 2px dashed rgba(128, 128, 128, 0.3);
          border-radius: var(--radius-xl);
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