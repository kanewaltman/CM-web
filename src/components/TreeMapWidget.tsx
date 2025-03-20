import React, { useEffect, useState, useCallback } from 'react';
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import { WidgetContainer } from './WidgetContainer';
import { SAMPLE_BALANCES } from './BalancesWidget';
import { useTheme } from 'next-themes';
import { useDataSource } from '@/lib/DataSourceContext';
import { getApiUrl } from '@/lib/api-config';
import { ASSETS, isAssetTicker, AssetTicker } from '@/assets/AssetTicker';

// Default color for assets not found in ASSETS
const DEFAULT_COLOR = '#4f46e5';

// Wrapper component that forces a remount when theme changes
export const TreeMapWidgetWrapper: React.FC<{
  className?: string;
  onRemove?: () => void;
}> = (props) => {
  const { resolvedTheme } = useTheme();
  const [key, setKey] = useState(Date.now());
  const [forcedTheme, setForcedTheme] = useState<'light' | 'dark'>('light');
  
  // Check theme directly from DOM
  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      const newTheme = isDarkMode ? 'dark' : 'light';
      
      // If theme detection methods don't match, log it
      if ((resolvedTheme === 'dark') !== isDarkMode) {
        console.log(`Theme detection mismatch:
          - DOM check: ${newTheme}
          - useTheme hook: ${resolvedTheme || 'undefined'}`);
      }
      
      setForcedTheme(newTheme);
      return newTheme;
    };
    
    // Check theme immediately
    const currentTheme = checkTheme();
    
    console.log(`TreeMapWidgetWrapper: Current theme is ${currentTheme}, setting new key: ${Date.now()}`);
    setKey(Date.now());
    
    // Also listen for theme changes via class changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && 
            mutation.target === document.documentElement) {
          const newTheme = checkTheme();
          console.log(`TreeMapWidgetWrapper: DOM class changed, theme is now ${newTheme}`);
          setKey(Date.now());
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, [resolvedTheme]);
  
  console.log(`TreeMapWidgetWrapper rendering with key: ${key}, forced theme: ${forcedTheme}`);
  
  return <TreeMapWidget key={key} forceTheme={forcedTheme} {...props} />;
};

// The actual implementation of TreeMapWidget stays focused on data
const TreeMapWidget: React.FC<{
  className?: string;
  onRemove?: () => void;
  forceTheme?: 'light' | 'dark';
}> = ({ className, onRemove, forceTheme }) => {
  const { resolvedTheme } = useTheme(); 
  const { dataSource } = useDataSource();
  const [treeMapData, setTreeMapData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balances, setBalances] = useState<any>(SAMPLE_BALANCES);
  const [error, setError] = useState<string | null>(null);
  
  // Use forced theme if provided
  const effectiveTheme = forceTheme || (resolvedTheme === 'dark' ? 'dark' : 'light');
  
  console.log(`TreeMapWidget: Using effective theme: ${effectiveTheme}`);
  
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
  
  // Custom render for treemap items with direct theme handling
  const TreeMapItem = (props: any) => {
    const { x, y, width, height, index, root } = props;
    
    // Use effective theme passed down from parent
    const currentTheme = effectiveTheme;
    
    const item = root.children?.[index];
    
    if (!item || width < 20 || height < 20) {
      return null;
    }
    
    // Dynamically adjust text size and visibility based on box size
    const showLabel = width > 50 && height > 30;
    const showPercentage = width > 60 && height > 40;
    const fontSize = Math.min(12, Math.max(8, width / 10)); // Responsive font size
    
    // Get color directly based on asset and current theme
    let fillColor = DEFAULT_COLOR;
    if (isAssetTicker(item.name) && ASSETS[item.name]) {
      fillColor = ASSETS[item.name].theme[currentTheme];
      // Special log for XCM to debug
      if (item.name === 'XCM') {
        console.log(`XCM color for ${currentTheme} theme: ${fillColor}`);
      }
    }
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: fillColor,
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
  
  // Create a fetch function that can be called when needed
  const fetchBalances = useCallback(async () => {
    console.log('TreeMapWidget: Fetching balances with data source:', dataSource);
    setIsLoading(true);
    
    try {
      if (dataSource === 'sample') {
        // Use sample data
        console.log('TreeMapWidget: Using sample data');
        setBalances(SAMPLE_BALANCES);
        setError(null);
      } else {
        // Get a demo token first
        console.log('TreeMapWidget: Fetching demo token');
        const tokenResponse = await fetch(getApiUrl('open/demo/temp'));
        if (!tokenResponse.ok) {
          throw new Error(`Token request failed with status ${tokenResponse.status}`);
        }
        
        const tokenData = await tokenResponse.json();
        if (!tokenData.token) {
          throw new Error('Failed to get demo token');
        }
        
        console.log('TreeMapWidget: Token received, fetching balances');
        
        // Now fetch balances with the token
        const balancesResponse = await fetch(getApiUrl('open/users/balances'), {
          headers: {
            'Authorization': `Bearer ${tokenData.token}`
          }
        });
        
        if (!balancesResponse.ok) {
          throw new Error(`Balances request failed with status ${balancesResponse.status}`);
        }
        
        const data = await balancesResponse.json();
        console.log('TreeMapWidget: Balances data received:', data);
        
        if (data && typeof data === 'object') {
          setBalances(data);
          setError(null);
        } else {
          throw new Error('Invalid balance data format');
        }
      }
    } catch (err) {
      console.error('TreeMapWidget: Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      // Fallback to sample data
      setBalances(SAMPLE_BALANCES);
    } finally {
      setIsLoading(false);
    }
  }, [dataSource]);
  
  // Fetch balances when data source changes
  useEffect(() => {
    console.log('TreeMapWidget: Data source changed to:', dataSource);
    fetchBalances();
  }, [dataSource, fetchBalances]);
  
  // Process data for the treemap
  useEffect(() => {
    if (isLoading) return;
    
    console.log('TreeMapWidget: Processing balances data');
    
    try {
      // Calculate total value in EUR
      const totalValue = Object.entries(balances).reduce(
        (sum, [_, balance]: [string, any]) => {
          const euroValue = parseFloat(balance.EUR || '0');
          return sum + (isNaN(euroValue) ? 0 : euroValue);
        },
        0
      );
      
      if (totalValue === 0) {
        console.error("TreeMapWidget: Total portfolio value is 0, check balance data");
        setError("No balance data with value available");
        return;
      }
      
      // Create data for the treemap without including fill color
      const processedData = Object.entries(balances)
        .filter(([asset]) => asset !== 'TOTAL') // Filter out total if present
        .map(([asset, balance]: [string, any]) => {
          const value = parseFloat(balance.EUR || '0');
          const percentage = (value / totalValue) * 100;
          
          return {
            name: asset,
            value: value,
            size: value,
            formattedPercentage: `${percentage.toFixed(2)}%`,
          };
        })
        .filter(item => !isNaN(item.value) && item.value > 0); // Filter out zero values
      
      console.log(`TreeMapWidget: Processed ${processedData.length} items`);
      
      // Only update state if we have data
      if (processedData.length > 0) {
        setTreeMapData(processedData);
        setError(null);
      } else {
        setError("No valid balance data for visualization");
      }
    } catch (err) {
      console.error('TreeMapWidget: Error processing data:', err);
      setError("Error processing balance data");
    }
  }, [balances, isLoading]);

  if (isLoading) {
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
  
  if (error || treeMapData.length === 0) {
    return (
      <WidgetContainer 
        title="Balance Distribution"
        onRemove={onRemove}
      >
        <div className="flex items-center justify-center h-full flex-col">
          <p className="text-muted-foreground">{error || "No balance data available"}</p>
          <button 
            onClick={fetchBalances}
            className="mt-2 px-3 py-1 text-xs bg-muted rounded-md hover:bg-muted/80"
          >
            Refresh
          </button>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer 
      title="Balance Distribution"
      onRemove={onRemove}
    >
      <div className="h-full w-full rounded-xl bg-card overflow-hidden">
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
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
          </ResponsiveContainer>
        </div>
      </div>
    </WidgetContainer>
  );
}; 