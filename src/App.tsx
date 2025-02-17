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

// Default desktop layout configuration
const defaultLayout = [
  { x: 0, y: 0, w: 8, h: 6, id: 'chart' }, // TradingViewChart
  { x: 8, y: 0, w: 4, h: 6, id: 'orderbook' }, // OrderBook
  { x: 0, y: 6, w: 4, h: 4, id: 'tradeform' }, // TradeForm
  { x: 4, y: 6, w: 4, h: 4, id: 'market' }, // MarketOverview
  { x: 8, y: 6, w: 4, h: 4, id: 'trades' }, // RecentTrades
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

  // Remove savedDesktopLayout state and only keep the setter
  const [, setSavedDesktopLayout] = useState<GridStackWidget[]>(() => {
    const saved = localStorage.getItem('desktop-layout');
    return saved ? JSON.parse(saved) : defaultLayout;
  });

  // Cleanup function for grid
  const cleanupGrid = useCallback(() => {
    if (grid) {
      grid.destroy(false);
      document.querySelectorAll('.grid-stack-item').forEach(item => {
        item.classList.remove('ui-draggable', 'ui-resizable', 'ui-draggable-handle');
      });
      setGrid(null);
    }
  }, [grid]);

  // Handle grid resize
  const handleGridResize = useCallback(() => {
    if (!grid) return;
    
    try {
      grid.batchUpdate();
      const items = grid.getGridItems();
      
      // Sort items by position for predictable layout
      items.sort((a, b) => {
        const nodeA = a.gridstackNode;
        const nodeB = b.gridstackNode;
        if (!nodeA || !nodeB) return 0;
        return (nodeA.y || 0) - (nodeB.y || 0) || (nodeA.x || 0) - (nodeB.x || 0);
      });
      
      // Process items sequentially
      let maxY = 0;
      items.forEach(item => {
        const node = item.gridstackNode;
        if (!node) return;
        
        // Use grid.isAreaEmpty for collision detection
        const hasCollision = !grid.isAreaEmpty(node.x || 0, node.y || 0, node.w || 1, node.h || 1);
        
        if (hasCollision) {
          node.y = maxY;
          grid.update(item, { x: node.x || 0, y: maxY });
        }
        maxY = Math.max(maxY, (node.y || 0) + (node.h || 1));
      });
      
      grid.compact();
      grid.commit();
    } catch (error) {
      console.warn('Grid resize failed:', error);
    }
  }, [grid]);

  // Modify the grid initialization to properly handle events
  const initializeGrid = useCallback((mobile: boolean) => {
    const gridElement = document.querySelector('.grid-stack');
    const gridItems = document.querySelectorAll('.grid-stack-item');
    
    if (!gridElement || !gridItems.length) {
      console.warn('Grid elements not found, retrying...');
      return null;
    }

    try {
      const latestSavedLayout = !mobile ? (() => {
        const saved = localStorage.getItem('desktop-layout');
        return saved ? JSON.parse(saved) : defaultLayout;
      })() : mobileLayout;

      const options: GridStackOptions = {
        float: false,
        cellHeight: mobile ? '100px' : 'auto',
        minRow: mobile ? 24 : 3,
        margin: 8,
        column: mobile ? 1 : 12,
        animate: true,
        draggable: {
          handle: '.widget-header',
          scroll: false,
          appendTo: 'body'
        },
        resizable: {
          handles: 'e, se, s, sw, w',
          autoHide: true
        },
        staticGrid: mobile, // Lock widgets in mobile mode
        removable: false,
        acceptWidgets: false
      };

      const g = GridStack.init(options, gridElement as HTMLElement);

      // Initialize with appropriate layout
      g.batchUpdate();
      g.removeAll(false);
      
      // Add widgets with their saved positions
      gridItems.forEach((item, index) => {
        if (latestSavedLayout[index]) {
          const config = {
            ...latestSavedLayout[index],
            autoPosition: false,
            minW: mobile ? 1 : 2,
            maxW: mobile ? 1 : 12,
            id: latestSavedLayout[index].id || `widget-${index}`,
            x: latestSavedLayout[index].x,
            y: latestSavedLayout[index].y,
            w: latestSavedLayout[index].w,
            h: latestSavedLayout[index].h
          };
          g.addWidget(item as GridStackElement, config);
        }
      });
      
      g.compact();
      g.commit();

      // Add layout change listeners for desktop mode
      if (!mobile) {
        g.on('change', (_event: Event, _items: GridStackNode[]) => {
          const currentLayout = g.save(true) as GridStackWidget[];
          if (currentLayout && Array.isArray(currentLayout) && currentLayout.length > 0) {
            localStorage.setItem('desktop-layout', JSON.stringify(currentLayout));
            setSavedDesktopLayout(currentLayout);
          }
        });

        g.on('dragstop resizestop', () => {
          saveCurrentLayout();
        });
      }

      return g;
    } catch (error) {
      console.error('Grid initialization failed:', error);
      return null;
    }
  }, []);

  // Define saveCurrentLayout first
  const saveCurrentLayout = useCallback(() => {
    if (grid && !isMobile && grid.engine && typeof grid.save === 'function') {
      try {
        const currentLayout = grid.save(true) as GridStackWidget[];
        if (currentLayout && currentLayout.length > 0) {
          localStorage.setItem('desktop-layout', JSON.stringify(currentLayout));
          setSavedDesktopLayout(currentLayout);
        }
      } catch (error) {
        console.warn('Failed to save layout:', error);
      }
    }
  }, [grid, isMobile]);

  const handleResetLayout = useCallback(() => {
    if (grid && !isMobile) {
      try {
        grid.batchUpdate();
        const items = grid.getGridItems();
        items.forEach((item, index) => {
          const defaultConfig = defaultLayout[index];
          if (defaultConfig && item.gridstackNode) {
            grid.update(item, {
              x: defaultConfig.x,
              y: defaultConfig.y,
              w: defaultConfig.w,
              h: defaultConfig.h
            });
          }
        });
        grid.compact();
        grid.commit();
        saveCurrentLayout();
      } catch (error) {
        console.error('Failed to reset layout:', error);
      }
    }
  }, [grid, isMobile, saveCurrentLayout]);

  const handleCopyLayout = useCallback(() => {
    if (grid && !isMobile) {
      try {
        const items = grid.getGridItems();
        const currentLayout = grid.save(true) as GridStackWidget[];
        
        // Ensure each layout item has an ID from the corresponding widget
        const layoutWithIds = currentLayout.map((item, index) => {
          const widgetNode = items[index]?.gridstackNode;
          return {
            ...item,
            id: widgetNode?.id || defaultLayout[index].id || `widget-${index}`
          };
        });
        
        return JSON.stringify(layoutWithIds);
      } catch (error) {
        console.error('Failed to copy layout:', error);
        return '';
      }
    }
    return '';
  }, [grid, isMobile]);

  const handlePasteLayout = useCallback((layoutStr: string) => {
    if (!grid || isMobile) {
      console.warn('Grid not initialized or in mobile mode');
      return;
    }

    try {
      console.log('Attempting to parse layout:', layoutStr);
      const layoutData = JSON.parse(layoutStr) as GridStackWidget[];
      
      if (!Array.isArray(layoutData)) {
        console.error('Invalid layout data: not an array');
        return;
      }

      if (layoutData.length === 0) {
        console.error('Empty layout data');
        return;
      }

      console.log('Parsed layout data:', layoutData);
      
      grid.batchUpdate();
      const items = grid.getGridItems();
      console.log('Current grid items:', items);

      // Create a map of current items by their IDs and positions
      const itemsById = new Map();
      const itemsByIndex = new Map();
      items.forEach((item, index) => {
        if (item.gridstackNode?.id) {
          itemsById.set(item.gridstackNode.id, item);
        }
        itemsByIndex.set(index, item);
      });

      let updatedCount = 0;
      // Apply new layout matching by ID or index as fallback
      layoutData.forEach((newConfig, index) => {
        // Try to find matching item by ID first
        let matchingItem = newConfig.id ? itemsById.get(newConfig.id) : null;
        
        // Fallback to index-based matching if no ID match
        if (!matchingItem) {
          matchingItem = itemsByIndex.get(index);
        }

        if (matchingItem && matchingItem.gridstackNode) {
          console.log('Updating item:', newConfig.id || `index ${index}`, 'with config:', newConfig);
          grid.update(matchingItem, {
            x: newConfig.x,
            y: newConfig.y,
            w: newConfig.w,
            h: newConfig.h
          });
          updatedCount++;
        } else {
          console.warn('No matching item found for:', newConfig.id || `index ${index}`);
        }
      });

      console.log('Updated', updatedCount, 'items');
      
      if (updatedCount > 0) {
        grid.compact();
        grid.commit();
        saveCurrentLayout();
      } else {
        console.warn('No items were updated');
        grid.commit();
      }
    } catch (error) {
      console.error('Failed to parse or apply layout:', error);
      grid?.commit(); // Ensure we commit even if there's an error
    }
  }, [grid, isMobile, saveCurrentLayout]);

  // Handle resize with requestAnimationFrame for smooth transitions
  const handleResize = useCallback(() => {
    if (resizeFrameRef.current) {
      cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = requestAnimationFrame(() => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      if (mobile !== isMobile) {
        // Save desktop layout before switching to mobile
        if (!mobile && grid && grid.engine) {
          saveCurrentLayout();
        }

        cleanupGrid();
        setIsMobile(mobile);
        
        // Wait for state updates to complete before initializing new grid
        setTimeout(() => {
          const newGrid = initializeGrid(mobile);
          if (newGrid) {
            newGrid.batchUpdate();
            
            // Get fresh references to grid items after initialization
            const updatedItems = newGrid.getGridItems();
            
            // Enable dragging and resizing for all valid items
            updatedItems.forEach(item => {
              if (item && item.gridstackNode) {
                newGrid.movable(item, true);
                newGrid.resizable(item, true);
              }
            });

            newGrid.commit();
            setGrid(newGrid);

            // Save initial layout after grid is set up
            if (!mobile) {
              setTimeout(() => {
                const currentLayout = newGrid.save(true) as GridStackWidget[];
                if (currentLayout && currentLayout.length > 0) {
                  localStorage.setItem('desktop-layout', JSON.stringify(currentLayout));
                  setSavedDesktopLayout(currentLayout);
                }
              }, 100);
            }
          }
        }, 100);
      }
    });
  }, [isMobile, initializeGrid, cleanupGrid, grid, saveCurrentLayout]);

  useEffect(() => {
    // Initial grid setup
    const newGrid = initializeGrid(isMobile);
    if (newGrid) {
      setGrid(newGrid);
      handleGridResize();
    }

    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Prevent dragging from content area
    document.querySelectorAll('.widget-content').forEach(content => {
      content.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
    });

    return () => {
      // Cleanup
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      cleanupGrid();
    };
  }, [initializeGrid, isMobile, handleResize, cleanupGrid, handleGridResize]);

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
            <div className="grid-stack-item" gs-x="0" gs-y="0" gs-w={isMobile ? "1" : "8"} gs-h="6">
              <div className="grid-stack-item-content">
                <TradingViewChart />
              </div>
            </div>
            <div className="grid-stack-item" gs-x={isMobile ? "0" : "8"} gs-y={isMobile ? "6" : "0"} gs-w={isMobile ? "1" : "4"} gs-h="6">
              <div className="grid-stack-item-content">
                <OrderBook />
              </div>
            </div>
            <div className="grid-stack-item" gs-x="0" gs-y={isMobile ? "12" : "6"} gs-w={isMobile ? "1" : "4"} gs-h="4">
              <div className="grid-stack-item-content">
                <TradeForm />
              </div>
            </div>
            <div className="grid-stack-item" gs-x={isMobile ? "0" : "4"} gs-y={isMobile ? "16" : "6"} gs-w={isMobile ? "1" : "4"} gs-h="4">
              <div className="grid-stack-item-content">
                <MarketOverview />
              </div>
            </div>
            <div className="grid-stack-item" gs-x={isMobile ? "0" : "8"} gs-y={isMobile ? "20" : "6"} gs-w={isMobile ? "1" : "4"} gs-h="4">
              <div className="grid-stack-item-content">
                <RecentTrades />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

export default App;