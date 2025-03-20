import React, { useEffect, useState, useRef } from 'react';
import { Treemap, Tooltip } from 'recharts';
import { Card, CardContent } from './ui/card';
import { WidgetContainer } from './WidgetContainer';
import { cn } from '@/lib/utils';
import { SAMPLE_BALANCES } from './BalancesWidget';
import { useTheme } from 'next-themes';
import { ChartContainer } from './ui/chart';

// Custom tooltip to show the asset name and percentage
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="bg-card px-3 py-2 rounded-md shadow-md border text-sm">
        <p className="font-semibold">{data.name}</p>
        <p className="text-sm opacity-80">{data.formattedPercentage}</p>
      </div>
    );
  }
  return null;
};

// Hard-coded asset colors for the sample assets
const ASSET_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  DOT: "#E6007A",
  USDT: "#26A17B",
  DOGE: "#C2A633",
  XCM: "#000000",
  SOL: "#14F195",
  ADA: "#0033AD",
  HBAR: "#00BAFF"
};

interface TreeMapData {
  name: string;
  value: number;
  size: number;
  formattedPercentage: string;
  fill: string;
}

interface TreeMapWidgetProps {
  className?: string;
  onRemove?: () => void;
}

// Custom render for treemap items
const TreeMapItem = (props: any) => {
  const { x, y, width, height, index, root } = props;
  const item = root.children?.[index];
  
  if (!item || width < 20 || height < 20) {
    return null;
  }
  
  // Dynamically adjust text size and visibility based on box size
  const showLabel = width > 50 && height > 30;
  const showPercentage = width > 60 && height > 40;
  const fontSize = Math.min(12, Math.max(8, width / 10)); // Responsive font size
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: item.fill,
          strokeWidth: 0,
        }}
      />
      {showLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - (showPercentage ? 8 : 0)}
            textAnchor="middle"
            fill="white"
            fontSize={fontSize}
            fontWeight="bold"
          >
            {item.name}
          </text>
          {showPercentage && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill="white"
              fontSize={fontSize - 1}
            >
              {item.formattedPercentage}
            </text>
          )}
        </>
      )}
    </g>
  );
};

export const TreeMapWidget: React.FC<TreeMapWidgetProps> = ({ className, onRemove }) => {
  const { theme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [treeMapData, setTreeMapData] = useState<TreeMapData[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Detect theme changes
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setCurrentTheme(isDark ? 'dark' : 'light');
  }, [theme]);
  
  // Process data for the treemap
  useEffect(() => {
    // Calculate total value in EUR
    const totalValue = Object.entries(SAMPLE_BALANCES).reduce(
      (sum, [_, balance]) => sum + parseFloat(balance.EUR),
      0
    );
    
    if (totalValue === 0) {
      console.error("Total portfolio value is 0, check SAMPLE_BALANCES data");
      return;
    }
    
    // Create data for the treemap
    const processedData = Object.entries(SAMPLE_BALANCES).map(([asset, balance]) => {
      const value = parseFloat(balance.EUR);
      const percentage = (value / totalValue) * 100;
      
      return {
        name: asset,
        value: value,
        size: value,
        formattedPercentage: `${percentage.toFixed(2)}%`,
        fill: ASSET_COLORS[asset] || '#4f46e5'
      };
    });
    
    // Only update state if we have data
    if (processedData.length > 0) {
      setTreeMapData(processedData);
    }
  }, []);

  // Set up resize observer to update when GridStack changes the component size
  useEffect(() => {
    const updateSize = () => {
      if (chartContainerRef.current) {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };
    
    // Initial size calculation
    updateSize();
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateSize);
    
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }
    
    const gridItem = chartContainerRef.current?.closest('.grid-stack-item');
    if (gridItem) {
      gridItem.addEventListener('resizestop', updateSize);
      gridItem.addEventListener('dragstop', updateSize);
    }
    
    // Clean up
    return () => {
      if (chartContainerRef.current) {
        resizeObserver.unobserve(chartContainerRef.current);
      }
      
      if (gridItem) {
        gridItem.removeEventListener('resizestop', updateSize);
        gridItem.removeEventListener('dragstop', updateSize);
      }
    };
  }, []);

  if (treeMapData.length === 0) {
    return (
      <WidgetContainer 
        title="Balance Distribution"
        onRemove={onRemove}
      >
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading balance data...</p>
        </div>
      </WidgetContainer>
    );
  }

  // Create a simple chart config for the ChartContainer
  const chartConfig = {
    balances: { 
      label: 'Asset Allocation',
      color: '#4f46e5'
    }
  };

  return (
    <WidgetContainer 
      title="Balance Distribution"
      onRemove={onRemove}
    >
      <Card className="h-full rounded-xl border shadow-sm">
        <CardContent className="p-0">
          <ChartContainer
            ref={chartContainerRef}
            config={chartConfig}
            className="h-full w-full"
          >
            <Treemap
              data={treeMapData}
              dataKey="size"
              nameKey="name"
              stroke="transparent"
              animationDuration={0}
              isAnimationActive={false}
              content={<TreeMapItem />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ChartContainer>
        </CardContent>
      </Card>
    </WidgetContainer>
  );
}; 