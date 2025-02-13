import { useEffect, useState, useCallback } from 'react';
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

// Default grid layout configuration
const defaultLayout = [
  { x: 0, y: 0, w: 8, h: 6 }, // TradingViewChart
  { x: 8, y: 0, w: 4, h: 6 }, // OrderBook
  { x: 0, y: 6, w: 4, h: 4 }, // TradeForm
  { x: 4, y: 6, w: 4, h: 4 }, // MarketOverview
  { x: 8, y: 6, w: 4, h: 4 }, // RecentTrades
];

function App() {
  const [grid, setGrid] = useState<GridStack | null>(null);

  const resetLayout = useCallback(() => {
    if (grid) {
      grid.batchUpdate();
      grid.removeAll();
      
      // Re-add all widgets with default positions
      const items = document.querySelectorAll('.grid-stack-item');
      items.forEach((item, index) => {
        const layout = defaultLayout[index];
        grid.addWidget(item, layout);
      });
      
      grid.commit();
    }
  }, [grid]);

  useEffect(() => {
    // Wait for DOM to be ready
    const initTimeout = setTimeout(() => {
      const gridElement = document.querySelector('.grid-stack');
      if (!gridElement) return;

      const g = GridStack.init({
        float: true,
        cellHeight: 'auto',
        minRow: 3,
        margin: 8,
        column: 12,
        acceptWidgets: true,
        removable: '#trash',
        removeTimeout: 100,
        draggable: {
          handle: '.widget-header', // Only allow dragging from header
        },
      });

      setGrid(g);

      // Apply initial layout
      const items = document.querySelectorAll('.grid-stack-item');
      items.forEach((item, index) => {
        const layout = defaultLayout[index];
        g.addWidget(item, layout);
      });

      // Prevent dragging from content area
      document.querySelectorAll('.widget-content').forEach(content => {
        content.addEventListener('mousedown', (e) => {
          e.stopPropagation();
        });
      });
    }, 0);

    return () => {
      clearTimeout(initTimeout);
      if (grid) {
        grid.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="h-[calc(100vh-64px)] mt-16 overflow-y-auto scrollbar-main">
        <div className="max-w-[1920px] mx-auto px-4">
          <ControlBar onResetLayout={resetLayout} />
          <div className="grid-stack">
            <div className="grid-stack-item" gs-x="0" gs-y="0" gs-w="8" gs-h="6">
              <div className="grid-stack-item-content">
                <TradingViewChart />
              </div>
            </div>
            <div className="grid-stack-item" gs-x="8" gs-y="0" gs-w="4" gs-h="6">
              <div className="grid-stack-item-content">
                <OrderBook />
              </div>
            </div>
            <div className="grid-stack-item" gs-x="0" gs-y="6" gs-w="4" gs-h="4">
              <div className="grid-stack-item-content">
                <TradeForm />
              </div>
            </div>
            <div className="grid-stack-item" gs-x="4" gs-y="6" gs-w="4" gs-h="4">
              <div className="grid-stack-item-content">
                <MarketOverview />
              </div>
            </div>
            <div className="grid-stack-item" gs-x="8" gs-y="6" gs-w="4" gs-h="4">
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