import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';
import { cn } from '@/lib/utils';

export function TradingViewChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Setup resize observer
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    resizeObserverRef.current = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ 
          width, 
          height: Math.max(400, height - 60)
        });
      }
    });

    resizeObserverRef.current.observe(container);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Handle chart creation and updates
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !containerSize.width || !containerSize.height) return;

    // Clean up existing chart before creating a new one
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        console.warn('Chart cleanup failed:', e);
      }
      chartRef.current = null;
    }

    // Create new chart
    const chart = createChart(container, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#D9D9D9',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      width: containerSize.width,
      height: containerSize.height,
      handleScale: {
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00C26E',
      downColor: '#FF4F4F',
      borderVisible: false,
      wickUpColor: '#00C26E',
      wickDownColor: '#FF4F4F',
    });

    const data = [
      { time: '2024-01-01', open: 50000, high: 51000, low: 49000, close: 50500 },
      { time: '2024-01-02', open: 50500, high: 52000, low: 50000, close: 51500 },
      { time: '2024-01-03', open: 51500, high: 53000, low: 51000, close: 52500 },
      { time: '2024-01-04', open: 52500, high: 54000, low: 52000, close: 53500 },
      { time: '2024-01-05', open: 53500, high: 55000, low: 53000, close: 54500 },
    ];

    candlestickSeries.setData(data);

    // Cleanup function
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.remove();
          chartRef.current = null;
        } catch (e) {
          console.warn('Chart cleanup failed:', e);
        }
      }
    };
  }, [containerSize.width, containerSize.height]);

  return (
    <div className={cn(
      "h-full overflow-auto scrollbar-thin rounded-lg p-3",
      "border border-[hsl(var(--color-widget-inset-border))] widget-inset"
    )}>
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}