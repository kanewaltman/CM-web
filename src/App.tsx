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

  // Create widget creation utility function with access to component mappings
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
      <WidgetContainer title={widgetTitle} onRemove={() => handleRemoveWidget(widgetId)}>
        <WidgetComponent />
      </WidgetContainer>
    );

    return widgetElement;
  };

  const isValidLayout = (layout: LayoutWidget[]) => {
    if (!Array.isArray(layout)) {
      return false;
    }
    
    // Verify each widget has valid properties and minimum sizes
    return layout.every(widget => {
      return (
        widget.id &&
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

  const initializeGrid = useCallback(() => {
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return null;

    // Clear any existing content
    gridElement.innerHTML = '';

    // Create grid instance with movement enabled from start
    const g = GridStack.init({
      float: false,
      cellHeight: isMobile ? '100px' : '60px',
      margin: 4,
      column: isMobile ? 1 : 12,
      animate: true,
      staticGrid: false, // Ensure grid is not static
      disableResize: false,
      disableDrag: false,
      draggable: {
        handle: '.widget-header',
      },
      resizable: {
        handles: 'e, se, s, sw, w',
        autoHide: false
      },
      minRow: 1
    }, gridElement);

    gridRef.current = g;
    setGrid(g);

    // Determine which layout to apply
    let layoutToApply = defaultLayout;
    if (isMobile) {
      layoutToApply = mobileLayout;
    }

    // Initialize all widgets
    g.batchUpdate();
    try {
      layoutToApply.forEach(node => {
        const baseWidgetId = node.id.split('-')[0];
        const widgetType = widgetTypes[baseWidgetId];
        
        if (!widgetComponents[widgetType]) return;

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

        // Add widget with movement enabled
        g.addWidget({
          el: widgetElement,
          ...node,
          autoPosition: false,
          noMove: false, // Ensure movement is enabled
          noResize: false // Ensure resize is enabled
        } as ExtendedGridStackWidget);
      });

      // Explicitly enable movement and resize for all widgets
      g.enableMove(true);
      g.enableResize(true);
      
      // Remove any leftover movement restrictions
      gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
        const domElement = item as HTMLElement;
        domElement.removeAttribute('gs-no-move');
        domElement.removeAttribute('gs-no-resize');
        g.movable(item as GridStackElement, true);
        g.resizable(item as GridStackElement, true);
      });
    } finally {
      g.commit();
    }

    return g;
  }, [isMobile]);

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

  const handleRemoveWidget = useCallback((widgetId: string) => {
    if (!grid) return;
    
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return;

    // Find the widget element with proper typing for both GridStack and DOM operations
    const widgetElement = gridElement.querySelector(`[gs-id="${widgetId}"]`) as HTMLElement;
    if (!widgetElement) return;

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
    } finally {
      grid.commit();
    }
  }, [grid]);

  // Handle resize with debouncing
  const handleResize = useCallback(() => {
    if (resizeFrameRef.current) {
      cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = requestAnimationFrame(() => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      if (mobile !== isMobile) {
        setIsMobile(mobile);
        const newGrid = initializeGrid();
        if (newGrid) {
          setGrid(newGrid);
        }
      }
    });
  }, [isMobile, initializeGrid]);

  useEffect(() => {
    const newGrid = initializeGrid();
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
        
        // Wait for transition to complete before removing
        setTimeout(() => {
          gridRef.current?.removeWidget(previewElement as HTMLElement, false);
          previewElement.remove(); // Ensure the element is fully removed from DOM
          gridRef.current?.compact(); // Re-enable compaction
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

    const handleDrop = ((e: Event) => {
      const dragEvent = e as DragEvent;
      dragEvent.preventDefault();
      
      const widgetType = dragEvent.dataTransfer?.getData('widget/type') || '';
      if (!widgetType || !gridRef.current || !widgetComponents[widgetType]) {
        cleanupPreview();
        return;
      }

      const grid = gridRef.current;
      grid.batchUpdate();
      
      try {
        const baseWidgetId = widgetIds[widgetType];
        const widgetId = `${baseWidgetId}-${Date.now()}`;
        
        const widgetElement = createWidget({
          widgetType,
          widgetId,
          x: previewX,
          y: previewY
        });

        grid.addWidget({
          el: widgetElement,
          x: previewX,
          y: previewY,
          w: 3,
          h: 4,
          minW: 2,
          minH: 2,
          id: widgetId,
          autoPosition: false
        } as ExtendedGridStackWidget);

        // Rest of the handler remains the same...
      } finally {
        grid.commit();
        
        // Re-enable all features after widget is added
        requestAnimationFrame(() => {
          grid.batchUpdate();
          try {
            // First restore animation
            grid.setAnimation(prevAnimate);
            
            // Enable movement and resizing for ALL widgets
            grid.enableMove(true);
            grid.enableResize(true);
            
            const items = grid.getGridItems();
            items.forEach(item => {
              // Remove any movement restrictions
              item.removeAttribute('gs-no-move');
              item.removeAttribute('gs-no-resize');
              grid.movable(item, true);
              grid.resizable(item, true);
            });
            
            // Restore grid settings
            grid.float(prevFloat);
          } finally {
            grid.commit();
          }
        });
      }
    }) as unknown as EventListener;

    gridElement.addEventListener('dragover', handleDragOver as EventListener);
    gridElement.addEventListener('dragleave', handleDragLeave as EventListener);
    gridElement.addEventListener('dragend', handleDragEnd);
    gridElement.addEventListener('drop', handleDrop as EventListener);

    return () => {
      gridElement.removeEventListener('dragover', handleDragOver as EventListener);
      gridElement.removeEventListener('dragleave', handleDragLeave as EventListener);
      gridElement.removeEventListener('dragend', handleDragEnd);
      gridElement.removeEventListener('drop', handleDrop as EventListener);
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
            {/* Grid items will be added programmatically */}
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

export default App;