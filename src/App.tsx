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
  { x: 0, y: 0, w: 1, h: 6 }, // TradingViewChart
  { x: 0, y: 6, w: 1, h: 6 }, // OrderBook
  { x: 0, y: 12, w: 1, h: 4 }, // TradeForm
  { x: 0, y: 16, w: 1, h: 4 }, // MarketOverview
  { x: 0, y: 20, w: 1, h: 4 }, // RecentTrades
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
    if (!gridElement) return null;

    const g = GridStack.init({
      float: true,
      cellHeight: mobile ? '100px' : 'auto',
      minRow: 3,
      margin: 8,
      column: mobile ? 1 : 12,
      acceptWidgets: true,
      removable: '#trash',
      draggable: {
        handle: '.widget-header',
      },
    });

    // Apply layout
    const items = document.querySelectorAll('.grid-stack-item');
    const layout = mobile ? mobileLayout : defaultLayout;
    
    g.batchUpdate();
    items.forEach((item, index) => {
      const config = layout[index];
      g.addWidget(item, config);
    });
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
      grid.destroy(false); // false = don't remove DOM elements
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
        const newGrid = initializeGrid(mobile);
        if (newGrid) {
          setGrid(newGrid);
        }
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