import { useEffect, useState, useCallback, useRef } from 'react';
import { GridStack } from 'gridstack';
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
  { x: 0, y: 0, w: 8, h: 6 }, // TradingViewChart
  { x: 8, y: 0, w: 4, h: 6 }, // OrderBook
  { x: 0, y: 6, w: 4, h: 4 }, // TradeForm
  { x: 4, y: 6, w: 4, h: 4 }, // MarketOverview
  { x: 8, y: 6, w: 4, h: 4 }, // RecentTrades
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

  // Initialize grid with current mode
  const initializeGrid = useCallback((mobile: boolean) => {
    const gridElement = document.querySelector('.grid-stack');
    const gridItems = document.querySelectorAll('.grid-stack-item');
    
    if (!gridElement || !gridItems.length) {
      console.warn('Grid elements not found, retrying...');
      return null;
    }

    const g = GridStack.init({
      float: true,
      cellHeight: mobile ? '100px' : 'auto',
      minRow: mobile ? 24 : 3,
      margin: 8,
      column: mobile ? 1 : 12,
      disableOneColumnMode: true,
      animate: true,
      draggable: {
        handle: '.widget-header',
      },
      resizable: {
        handles: 'e, se, s, sw, w',
        autoHide: true,
        start: (event) => {
          const grid = event.target.gridstackNode.grid;
          grid.batchUpdate();
        },
        resize: (event) => {
          const grid = event.target.gridstackNode.grid;
          const node = event.target.gridstackNode;
          
          // Get all nodes except current one
          const otherNodes = grid.engine.nodes.filter(n => n !== node);
          
          // Find nodes that need to be moved
          const affectedNodes = otherNodes.filter(n => {
            const collision = grid.collide(node, n);
            return collision && (
              (node.x <= n.x && node.x + node.w > n.x) || // Collision from left
              (node.y <= n.y && node.y + node.h > n.y)    // Collision from top
            );
          });

          if (affectedNodes.length) {
            // Try to maintain relative positions when possible
            affectedNodes.forEach(affected => {
              let newX = affected.x;
              let newY = affected.y;

              // If horizontal collision, try to move right
              if (node.x + node.w > affected.x) {
                newX = Math.min(node.x + node.w, grid.column - affected.w);
              }

              // If vertical collision or can't move horizontally, move down
              if (node.y + node.h > affected.y || newX === affected.x) {
                newY = node.y + node.h;
              }

              // Check if new position is valid
              const canMove = !otherNodes.some(other => 
                other !== affected && 
                grid.collide({...affected, x: newX, y: newY}, other)
              );

              if (canMove) {
                grid.move(affected.el, newX, newY);
              } else {
                // Find next available position
                const nextPos = grid.findEmptyPosition(affected.w, affected.h, newX, newY);
                if (nextPos) {
                  grid.move(affected.el, nextPos.x, nextPos.y);
                }
              }
            });
          }

          grid._updateContainerHeight();
        },
        stop: (event) => {
          const grid = event.target.gridstackNode.grid;
          grid.batchUpdate();
          grid.compact();
          grid.commit();
        }
      },
      // Allow widgets to float freely
      float: true,
      // Disable strict positioning
      strictCellPositioning: false,
      // Enable collision detection but with more flexible handling
      collision: {
        wait: false,
        reposition: true
      }
    });

    // Add window resize handler for the grid
    const handleGridResize = () => {
      if (!grid) return;
      
      grid.batchUpdate();
      const items = grid.getGridItems();
      
      // Sort items by position for predictable layout
      items.sort((a, b) => {
        const nodeA = a.gridstackNode;
        const nodeB = b.gridstackNode;
        return nodeA.y - nodeB.y || nodeA.x - nodeB.x;
      });
      
      // Process items sequentially
      let maxY = 0;
      items.forEach(item => {
        const node = item.gridstackNode;
        const collisions = grid.collide(node);
        
        if (collisions) {
          node.y = maxY;
          grid.update(item, node.x, node.y);
        }
        maxY = Math.max(maxY, node.y + node.h);
      });
      
      grid.compact();
      grid._updateContainerHeight();
      grid.commit();
    };

    // Debounce the resize handler
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = window.setTimeout(handleGridResize, 100);
    });

    // Initialize layout
    g.batchUpdate();
    const layout = mobile ? mobileLayout : defaultLayout;
    
    gridItems.forEach((item, index) => {
      if (layout[index]) {
        const config = {
          ...layout[index],
          autoPosition: false,
          minWidth: 2,
          maxWidth: 12
        };
        g.addWidget(item, config);
      }
    });
    
    g.compact();
    g.commit();

    return g;
  }, []);

  const resetLayout = useCallback(() => {
    if (grid) {
      const layout = isMobile ? mobileLayout : defaultLayout;
      grid.batchUpdate();
      grid.removeAll();
      
      const items = document.querySelectorAll('.grid-stack-item');
      items.forEach((item, index) => {
        const config = layout[index];
        grid.addWidget(item, config);
      });
      
      grid.commit();
    }
  }, [grid, isMobile]);

  // Cleanup function for grid
  const cleanupGrid = useCallback(() => {
    if (grid) {
      // Save current positions if needed
      // const positions = grid.save();
      
      // Properly destroy grid instance
      grid.destroy(false); // false = don't remove DOM elements
      
      // Remove any leftover gridstack-specific classes
      document.querySelectorAll('.grid-stack-item').forEach(item => {
        item.classList.remove('ui-draggable', 'ui-resizable', 'ui-draggable-handle');
      });
      
      setGrid(null);
    }
  }, [grid]);

  // Handle resize with requestAnimationFrame for smooth transitions
  const handleResize = useCallback(() => {
    if (resizeFrameRef.current) {
      cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = requestAnimationFrame(() => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      if (mobile !== isMobile) {
        cleanupGrid();
        setIsMobile(mobile);
        
        // Add setTimeout to delay grid initialization
        setTimeout(() => {
          const newGrid = initializeGrid(mobile);
          if (newGrid) {
            setGrid(newGrid);
          }
        }, 100); // Small delay to ensure DOM elements are ready
      }
    });
  }, [isMobile, initializeGrid, cleanupGrid]);

  useEffect(() => {
    // Initial grid setup
    const newGrid = initializeGrid(isMobile);
    if (newGrid) {
      setGrid(newGrid);
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
  }, [initializeGrid, isMobile, handleResize, cleanupGrid]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="h-[calc(100vh-64px)] mt-16 overflow-y-auto scrollbar-main">
        <div className="max-w-[1920px] mx-auto px-4">
          <ControlBar onResetLayout={resetLayout} />
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