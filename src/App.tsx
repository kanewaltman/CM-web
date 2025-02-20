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

  const createWidget = (params: {
    widgetType: string,
    widgetId: string,
    x: number,
    y: number,
    w?: number,
    h?: number,
    minW?: number,
    minH?: number
  }) => {
    const { widgetType, widgetId, x, y, w = 3, h = 4, minW = 2, minH = 2 } = params;
    
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

    // Render React component into content wrapper
    const root = ReactDOM.createRoot(contentElement);
    const WidgetComponent = widgetComponents[widgetType];
    const widgetTitle = widgetTitles[widgetType];
    
    root.render(
      <WidgetContainer title={widgetTitle} onRemove={() => handleRemoveWidgetRef.current(widgetId)}>
        <WidgetComponent />
      </WidgetContainer>
    );

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

    // Clear existing content
    gridElement.innerHTML = '';

    // Add scroll behavior styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .grid-stack-item.ui-draggable-dragging {
        transition: transform 100ms ease-out;
      }
      .grid-stack {
        scroll-behavior: smooth;
        min-height: calc(100vh - 180px) !important;
        height: auto !important;
        overflow: visible !important;
      }
      .grid-stack.grid-stack-animate .grid-stack-item.ui-draggable-dragging {
        transition: transform 100ms ease-out, left 100ms ease-out, top 100ms ease-out;
      }
      body {
        min-height: 100vh;
        overflow-y: auto;
      }
      #root {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .main-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        height: auto;
        min-height: 100%;
      }
      .grid-container {
        flex: 1;
        height: auto;
        min-height: 100%;
      }
    `;
    document.head.appendChild(styleElement);

    const g = GridStack.init({
      float: true, // Enable float by default for consistent collapsing
      cellHeight: mobile ? '100px' : '60px',
      margin: 4,
      column: mobile ? 1 : 12,
      animate: true,
      draggable: {
        handle: '.widget-header',
        scroll: true,
        appendTo: 'body' // Change to body for better drag scrolling
      },
      resizable: {
        handles: 'e, se, s, sw, w',
        autoHide: true
      },
      minRow: 1,
      maxRow: 26, // Allow more rows but still prevent infinite scrolling
      staticGrid: true, // Start with static grid
    }, gridElement as GridStackElement);

    // Store the grid reference
    gridRef.current = g;

    // Add event listeners for consistent float behavior during interactions
    g.on('dragstart resizestart', () => {
      g.float(true);
      g.setAnimation(false);
    });

    g.on('dragstop resizestop', () => {
      const prevAnimate = g.opts.animate;
      
      // Temporarily disable animations
      g.setAnimation(false);
      g.float(true);
      
      // Batch update to ensure smooth transition
      g.batchUpdate();
      try {
        // First compact to fill gaps
        g.compact();
        
        // Save the layout after compaction
        const items = g.getGridItems();
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
        g.commit();
        
        // Re-enable animations with a slight delay
        requestAnimationFrame(() => {
          g.setAnimation(prevAnimate);
          g.float(true); // Keep float enabled for consistent behavior
        });
      }
    });

    // Enable widget swapping during drag
    g.on('drag', (event: Event, node: GridStackNode) => {
      const items = g.getGridItems();
      const draggedEl = items.find(item => item.gridstackNode?.id === node.id);
      if (!draggedEl || !node) return;

      items.forEach(targetEl => {
        const targetNode = targetEl.gridstackNode;
        if (!targetNode || targetNode.id === node.id) return;

        // Check if widgets are the same size
        if (node.w === targetNode.w && node.h === targetNode.h) {
          const dragRect = draggedEl.getBoundingClientRect();
          const targetRect = targetEl.getBoundingClientRect();
          
          // Check if dragged element is overlapping significantly with target
          const overlap = !(
            dragRect.right < targetRect.left || 
            dragRect.left > targetRect.right || 
            dragRect.bottom < targetRect.top || 
            dragRect.top > targetRect.bottom
          );

          if (overlap) {
            g.batchUpdate();
            try {
              // Swap positions
              const tempX = targetNode.x;
              const tempY = targetNode.y;
              
              g.update(targetEl, { 
                x: node.x,
                y: node.y,
              });
              
              g.update(draggedEl, {
                x: tempX,
                y: tempY,
              });
            } finally {
              g.commit();
            }
          }
        }
      });
    });

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

    // Apply layout in a batch update
    g.batchUpdate();
    try {
      // Create and add all widgets from the layout
      (layoutToApply as LayoutWidget[]).forEach((node: LayoutWidget) => {
        const baseWidgetId = node.id.split('-')[0]; // Handle both default and dynamic IDs
        const widgetType = widgetTypes[baseWidgetId];
        
        if (!widgetComponents[widgetType]) {
          console.warn('Unknown widget type:', widgetType);
          return;
        }

        // Create widget element
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

        // Add widget to grid
        g.addWidget({
          el: widgetElement,
          ...node,
          autoPosition: false,
          noMove: true // Prevent movement during initialization
        } as ExtendedGridStackWidget);
      });

      // Verify final positions
      layoutToApply.forEach(node => {
        const element = gridElement.querySelector(`[gs-id="${node.id}"]`) as HTMLElement;
        if (element) {
          g.update(element, {
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h,
            autoPosition: false
          });
        }
      });
    } finally {
      g.commit();
    }

    // Re-enable grid features with smooth transition
    requestAnimationFrame(() => {
      gridElement.classList.remove('grid-initializing');
      setTimeout(() => {
        g.batchUpdate();
        try {
          // Re-enable all features
          g.setStatic(false);
          g.setAnimation(true);
          
          // Re-enable widget movement
          gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
            const element = item as HTMLElement;
            element.removeAttribute('gs-no-move');
            element.removeAttribute('gs-no-resize');
            g.movable(element, true);
            g.resizable(element, true);
          });
        } finally {
          g.commit();
        }
      }, 300);
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
              if (!node || typeof node.id !== 'string') return null;
              
              const baseId = node.id.split('-')[0];
              const defaultWidget = defaultLayout.find(w => w.id === baseId);
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

    // Clean up style element on grid cleanup
    const cleanup = () => {
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
    g.on('destroy', cleanup);

    return g;
  }, []);

  const handleResetLayout = useCallback(() => {
    if (!grid || isMobile) return;
    
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return;

    // Store original grid settings
    const prevAnimate = grid.opts.animate;
    
    // Disable animations and enable float to prevent collapsing
    grid.setAnimation(false);
    grid.setStatic(true);
    grid.float(true);
    
    grid.batchUpdate();
    try {
      // Get current widget IDs
      const currentWidgets = grid.getGridItems();
      const defaultLayoutIds = defaultLayout.map(widget => widget.id);
      
      // First remove widgets that aren't in the default layout
      currentWidgets.forEach(item => {
        const id = item.gridstackNode?.id;
        if (id && !defaultLayoutIds.includes(id)) {
          console.log('Removing widget not in default layout:', id);
          // Remove widget from grid
          grid.removeWidget(item, false);
          // Also remove the DOM element
          const element = gridElement.querySelector(`[gs-id="${id}"]`);
          if (element) {
            element.remove();
          }
        }
      });

      // Create a map of existing widgets for quick lookup
      const existingWidgets = new Map(
        grid.getGridItems().map(item => [item.gridstackNode?.id, item])
      );

      // Process each widget in the default layout
      for (const node of defaultLayout) {
        const existingWidget = existingWidgets.get(node.id);
        
        if (existingWidget) {
          // Update existing widget position without triggering collapse
          console.log('Resetting position for widget:', node.id, {
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h
          });
          
          grid.update(existingWidget, {
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h,
            autoPosition: false,
            noMove: true
          });
        } else {
          // Add new widget if it doesn't exist
          console.log('Adding missing default widget:', node.id);
          const widgetType = widgetTypes[node.id];
          
          if (!widgetComponents[widgetType]) {
            console.warn('Unknown widget type:', widgetType);
            continue;
          }

          // Create new widget element
          const widgetElement = createWidget({
            widgetType,
            widgetId: node.id,
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h,
            minW: 2,
            minH: 2
          });

          // Add widget with exact position
          grid.addWidget({
            el: widgetElement,
            ...node,
            autoPosition: false,
            noMove: true
          } as ExtendedGridStackWidget);
        }
      }
      
      // Force final position updates without collapsing
      defaultLayout.forEach(node => {
        const element = gridElement.querySelector(`[gs-id="${node.id}"]`) as HTMLElement;
        if (element) {
          element.setAttribute('gs-x', String(node.x));
          element.setAttribute('gs-y', String(node.y));
          element.setAttribute('gs-w', String(node.w));
          element.setAttribute('gs-h', String(node.h));
          
          grid.update(element, {
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h,
            autoPosition: false,
            noMove: true
          });
        }
      });

      // Save the default layout
      localStorage.setItem('desktop-layout', JSON.stringify(defaultLayout));
    } finally {
      grid.commit();
      
      // Restore original grid settings
      requestAnimationFrame(() => {
        // First restore animation and static settings
        grid.setAnimation(prevAnimate);
        grid.setStatic(false);
        
        // Re-enable widget movement
        grid.getGridItems().forEach(item => {
          grid.movable(item, true);
          grid.resizable(item, true);
        });

        // Finally, restore float setting to enable collapsing
        grid.float(false);
      });
    }
  }, [grid, isMobile]);

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

  const handleWidgetDrop = useCallback((event: React.DragEvent<HTMLElement> & { _gridX?: number; _gridY?: number }) => {
    event.preventDefault();
    const widgetType = event.dataTransfer?.getData('widget/type');
    
    if (!widgetType || !gridRef.current || !widgetComponents[widgetType]) return;

    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return;

    const grid = gridRef.current;
    
    // Store original grid settings
    const prevAnimate = grid.opts.animate;
    
    // Disable animations and enable float to prevent collapsing
    grid.setAnimation(false);
    grid.setStatic(true);
    grid.float(true);

    // Get drop coordinates relative to grid
    const x = event._gridX ?? Math.floor((event.clientX - gridElement.getBoundingClientRect().left) / (gridElement.getBoundingClientRect().width / 12));
    const y = event._gridY ?? Math.floor((event.clientY - gridElement.getBoundingClientRect().top) / 150);

    // Generate a unique widget ID with timestamp
    const baseWidgetId = widgetIds[widgetType];
    const widgetId = `${baseWidgetId}-${Date.now()}`;

    // Create widget element with unique ID
    const widgetElement = createWidget({
      widgetType,
      widgetId,
      x,
      y
    });

    grid.batchUpdate();
    try {
      // Add widget with exact position
      grid.addWidget({
        el: widgetElement,
        x: x,
        y: y,
        w: 3,
        h: 4,
        minW: 2,
        minH: 2,
        id: widgetId,
        autoPosition: false
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
      
      // Restore original grid settings
      requestAnimationFrame(() => {
        // First restore animation and static settings
        grid.setAnimation(prevAnimate);
        grid.setStatic(false);
        
        // Re-enable widget movement
        grid.movable(widgetElement, true);
        grid.resizable(widgetElement, true);

        // Finally, restore float setting to enable collapsing
        grid.float(false);
      });
    }
  }, [gridRef]);

  const handlePasteLayout = useCallback((layoutStr: string) => {
    if (!grid || isMobile) {
      console.warn('Cannot paste layout:', { hasGrid: !!grid, isMobile });
      return;
    }
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) {
      console.warn('Grid element not found');
      return;
    }
    
    try {
      console.log('Attempting to parse layout:', layoutStr);
      const layout = JSON.parse(layoutStr) as LayoutWidget[];
      console.log('Parsed layout:', layout);

      if (!isValidLayout(layout)) {
        console.warn('Invalid layout structure:', layout);
        return;
      }

      // Log current state before changes
      const currentWidgets = grid.getGridItems();
      const currentIds = currentWidgets.map(item => item.gridstackNode?.id).filter(Boolean) as string[];
      console.log('Current widgets:', currentWidgets.map(item => ({
        id: item.gridstackNode?.id,
        type: item.gridstackNode?.id?.split('-')[0]
      })));

      // Get IDs from new layout
      const newLayoutIds = layout.map(widget => widget.id);
      console.log('New layout widget IDs:', newLayoutIds);

      // Store original grid settings
      const prevAnimate = grid.opts.animate;
      
      // Disable animations and enable float to prevent collapsing
      grid.setAnimation(false);
      grid.setStatic(true);
      grid.float(true);
      
      grid.batchUpdate();
      try {
        // First remove widgets that aren't in the new layout
        currentWidgets.forEach(item => {
          const id = item.gridstackNode?.id;
          if (id && !newLayoutIds.includes(id)) {
            console.log('Removing widget not in new layout:', id);
            // Remove widget from grid
            grid.removeWidget(item, false);
            // Also remove the DOM element
            const element = gridElement.querySelector(`[gs-id="${id}"]`);
            if (element) {
              element.remove();
            }
          }
        });

        // Create a map of existing widgets for quick lookup
        const existingWidgets = new Map(
          grid.getGridItems().map(item => [item.gridstackNode?.id, item])
        );

        // Process each widget in the new layout
        for (const node of layout) {
          try {
            const existingWidget = existingWidgets.get(node.id);
            
            if (existingWidget) {
              // Update existing widget position without triggering collapse
              console.log('Updating position for widget:', node.id, {
                x: node.x,
                y: node.y,
                w: node.w,
                h: node.h
              });
              
              grid.update(existingWidget, {
                x: node.x,
                y: node.y,
                w: node.w,
                h: node.h,
                autoPosition: false,
                noMove: true // Prevent movement during update
              });
            } else {
              // Add new widget
              console.log('Adding new widget:', node.id);
              const baseWidgetId = node.id.replace(/[_-]\d+$/, '');
              const widgetType = widgetTypes[baseWidgetId];
              console.log('Base widget ID:', baseWidgetId, 'Widget type:', widgetType);
              
              if (!widgetComponents[widgetType]) {
                console.warn('Unknown widget type:', widgetType);
                continue;
              }

              // Create new widget element
              const widgetElement = createWidget({
                widgetType,
                widgetId: node.id,
                x: node.x,
                y: node.y,
                w: node.w,
                h: node.h,
                minW: 2,
                minH: 2
              });

              // Add widget with exact position
              const addedWidget = grid.addWidget({
                el: widgetElement,
                ...node,
                autoPosition: false,
                noMove: false // Set noMove to false to allow movement
              } as ExtendedGridStackWidget);

              console.log('Widget added:', addedWidget);
            }
          } catch (error) {
            console.error('Error processing widget:', node.id, error);
            continue;
          }
        }
        
        // Force final position updates without collapsing
        layout.forEach(node => {
          const element = gridElement.querySelector(`[gs-id="${node.id}"]`) as HTMLElement;
          if (element) {
            element.setAttribute('gs-x', String(node.x));
            element.setAttribute('gs-y', String(node.y));
            element.setAttribute('gs-w', String(node.w));
            element.setAttribute('gs-h', String(node.h));
            
            grid.update(element, {
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
              autoPosition: false,
              noMove: true
            });
          }
        });
        
        // Log final state
        const finalWidgets = grid.getGridItems();
        console.log('Final widgets after paste:', finalWidgets.map(item => ({
          id: item.gridstackNode?.id,
          type: item.gridstackNode?.id?.split('-')[0],
          x: item.gridstackNode?.x,
          y: item.gridstackNode?.y,
          w: item.gridstackNode?.w,
          h: item.gridstackNode?.h
        })));

        // Save the pasted layout
        localStorage.setItem('desktop-layout', layoutStr);
      } finally {
        grid.commit();
        
        // Restore original grid settings
        requestAnimationFrame(() => {
          // First restore animation and static settings
          grid.setAnimation(prevAnimate);
          grid.setStatic(false);
          
          // Re-enable widget movement
          grid.getGridItems().forEach(item => {
            grid.movable(item, true);
            grid.resizable(item, true);
          });

          // Finally, restore float setting to enable collapsing
          grid.float(false);
        });
      }
    } catch (error) {
      console.error('Failed to paste layout:', error);
      if (error instanceof SyntaxError) {
        console.warn('Invalid JSON string:', layoutStr);
      }
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

    let previewX = 0;
    let previewY = 0;

    // Add drop event handlers
    const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

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
            el: previewElement as GridStackElement,
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

    const handleDrop = ((e: Event) => {
      const dragEvent = e as DragEvent;
      dragEvent.preventDefault();
      
      const widgetType = dragEvent.dataTransfer?.getData('widget/type') || '';
      if (!widgetType || !gridRef.current || !widgetComponents[widgetType]) {
        return;
      }

      const grid = gridRef.current;
      
      // Store original grid settings with default values
      const prevAnimate = grid.opts.animate ?? true;
      const prevStatic = grid.opts.staticGrid ?? false;
      
      // Disable animations temporarily
      grid.setAnimation(false);
      grid.setStatic(true);
      // Keep float enabled for consistent behavior
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
          noMove: true, // Prevent movement during addition
          float: true // Enable float for consistent behavior
        } as ExtendedGridStackWidget);

        // Save updated layout
        const items = grid.getGridItems();
        const serializedLayout = items
          .map(item => {
            const node = item.gridstackNode;
            if (!node || typeof node.id !== 'string') return null;
            const baseId = node.id.split('-')[0];
            const defaultWidget = defaultLayout.find(w => w.id === baseId);
            return {
              id: node.id,
              x: node.x ?? 0,
              y: node.y ?? 0,
              w: node.w ?? 2,
              h: node.h ?? 2,
              minW: defaultWidget?.minW ?? 2,
              minH: defaultWidget?.minH ?? 2
            };
          })
          .filter((item): item is LayoutWidget => item !== null);

        if (isValidLayout(serializedLayout)) {
          localStorage.setItem('desktop-layout', JSON.stringify(serializedLayout));
        }
      } finally {
        grid.commit();
        
        // Restore grid settings with a slight delay to ensure smooth transition
        requestAnimationFrame(() => {
          grid.batchUpdate();
          try {
            // Re-enable all features
            grid.setAnimation(prevAnimate);
            grid.setStatic(prevStatic);
            
            // Re-enable widget movement for all widgets
            grid.getGridItems().forEach(item => {
              grid.movable(item, true);
              grid.resizable(item, true);
            });
            
            // Keep float enabled for consistent behavior
            grid.float(true);
          } finally {
            grid.commit();
          }
        });
      }
    }) as unknown as EventListener;

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
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        .grid-initializing {
          opacity: 0;
          transition: none;
        }
        .grid-stack {
          opacity: 1;
          width: 100% !important;
          transition: opacity 300ms ease-in-out;
        }
        .grid-stack-item {
          transition: transform 300ms ease-in-out, opacity 300ms ease-in-out;
        }
        .widget-drag-preview {
          opacity: 0.7;
          pointer-events: none;
          transition: opacity 200ms ease-in-out, transform 200ms ease-in-out;
        }
        .widget-drag-preview.removing {
          opacity: 0;
          transform: scale(0.95);
        }
        .widget-drag-preview .grid-stack-item-content {
          background: hsl(var(--color-widget-bg));
          border: 2px dashed rgba(128, 128, 128, 0.3);
          border-radius: var(--radius-xl);
          transition: all 200ms ease-in-out;
        }
        /* Ensure GridStack's own animations work properly */
        .grid-stack-item.ui-draggable-dragging,
        .grid-stack-item.ui-resizable-resizing {
          transition: none !important;
        }
        /* Ensure grid container fills available width */
        .grid-container {
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        /* Ensure grid stack fills container width */
        .grid-stack > .grid-stack-item {
          max-width: 100%;
        }
      `}</style>
      <TopBar />
      <main className="main-container mt-16">
        <div className="grid-container w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <ControlBar 
            onResetLayout={handleResetLayout}
            onCopyLayout={handleCopyLayout}
            onPasteLayout={handlePasteLayout}
          />
          <div className="grid-stack">
            {/* Grid items will be added programmatically */}
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

export default App;