import React, { useEffect, useState, useCallback } from 'react';
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import { WidgetContainer } from './WidgetContainer';
import { SAMPLE_BALANCES } from './BalancesWidget';
import { useTheme } from 'next-themes';
import { useDataSource } from '@/lib/DataSourceContext';
import { getApiUrl } from '@/lib/api-config';
import { ASSETS, isAssetTicker, AssetTicker } from '@/assets/AssetTicker';
import { cn } from '@/lib/utils';

// Default color for assets not found in ASSETS
const DEFAULT_COLOR = '#4f46e5';

// Asset Button component to match the style in balances and performance widgets
const AssetButton = ({ 
  asset, 
  assetColor, 
  className, 
  onMouseEnter, 
  onMouseLeave, 
  style,
  fontSize = 12,
  isActive = false
}: { 
  asset: string, 
  assetColor: string, 
  className?: string,
  onMouseEnter?: React.MouseEventHandler,
  onMouseLeave?: React.MouseEventHandler,
  style?: React.CSSProperties,
  fontSize?: number,
  isActive?: boolean
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Only show the button if we have a valid asset
  if (!asset || !isAssetTicker(asset)) return null;
  
  const assetConfig = ASSETS[asset as AssetTicker];
  if (!assetConfig) return null;
  
  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovered(true);
    if (onMouseEnter) onMouseEnter(e);
  };
  
  const handleMouseLeave = (e: React.MouseEvent) => {
    setIsHovered(false);
    if (onMouseLeave) onMouseLeave(e);
  };
  
  // Either the internal hover state or external active state can trigger the hover appearance
  const showHoverState = isHovered || isActive;
  
  return (
    <div
      className={cn("font-jakarta font-bold rounded-md px-1 relative z-20", className)}
      style={{ 
        color: showHoverState ? 'hsl(var(--color-widget-bg))' : assetColor,
        backgroundColor: showHoverState ? assetColor : `${assetColor}14`,
        cursor: 'default',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'text',
        userSelect: 'text',
        fontSize: `${fontSize}px`,
        pointerEvents: 'auto',
        ...style
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {asset}
    </div>
  );
};

// The skeleton loader component with better theme integration
const TreeMapSkeleton = () => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  
  // Define opacity classes that Tailwind can recognize
  const opacityClasses = {
    high: isDarkMode ? "bg-muted/70" : "bg-muted/80",
    medium: isDarkMode ? "bg-muted/50" : "bg-muted/60",
    low: isDarkMode ? "bg-muted/30" : "bg-muted/40",
  };
  
  // Create a layout that fills the entire grid
  // Total grid: 6x6 = 36 cells
  const skeletonBlocks = [
    { colSpan: 3, rowSpan: 3, opacity: opacityClasses.high },  // 9 cells
    { colSpan: 3, rowSpan: 3, opacity: opacityClasses.high },  // 9 cells
    { colSpan: 3, rowSpan: 2, opacity: opacityClasses.medium }, // 6 cells
    { colSpan: 3, rowSpan: 1, opacity: opacityClasses.medium }, // 3 cells
    { colSpan: 2, rowSpan: 1, opacity: opacityClasses.low },   // 2 cells
    { colSpan: 1, rowSpan: 1, opacity: opacityClasses.low },   // 1 cell
    { colSpan: 3, rowSpan: 1, opacity: opacityClasses.low },   // 3 cells
    { colSpan: 3, rowSpan: 1, opacity: opacityClasses.low },   // 3 cells
  ];
  
  return (
    <div className="h-full w-full">
      <div className="grid grid-cols-6 grid-rows-6 gap-1 h-full w-full p-1">
        {skeletonBlocks.map((block, index) => {
          // Create class strings that Tailwind can properly purge
          let colSpanClass = "";
          let rowSpanClass = "";
          
          switch (block.colSpan) {
            case 1: colSpanClass = "col-span-1"; break;
            case 2: colSpanClass = "col-span-2"; break;
            case 3: colSpanClass = "col-span-3"; break;
            default: colSpanClass = "col-span-1";
          }
          
          switch (block.rowSpan) {
            case 1: rowSpanClass = "row-span-1"; break;
            case 2: rowSpanClass = "row-span-2"; break;
            case 3: rowSpanClass = "row-span-3"; break;
            default: rowSpanClass = "row-span-1";
          }
          
          return (
            <div 
              key={index}
              className={cn(
                colSpanClass, 
                rowSpanClass,
                "rounded-md overflow-hidden relative animate-pulse",
                block.opacity
              )}
            />
          );
        })}
      </div>
    </div>
  );
};

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
      
      // Only show tooltip for smaller sections where labels are hidden
      // Use same thresholds as in TreeMapItem but in reverse
      const width = data.width || 0;
      const height = data.height || 0;
      const isSmallSection = width <= 80 || height <= 50;
      
      if (!isSmallSection) {
        return null; // Don't show tooltip for larger sections that already have visible labels
      }
      
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
  // Handles rendering of both large and small treemap sections 
  // - Ensures small portions are still visible with color
  // - Only shows labels when there's enough space
  // - Uses safe dimensions to prevent rendering issues
  // - Adds 2px padding on each side to create 4px gaps between sections
  // - Applies border radius to portions at the container corners
  const TreeMapItem = (props: any) => {
    const { x, y, width, height, index, root, depth } = props;
    const [isHovered, setIsHovered] = useState(false);
    
    // Use effective theme passed down from parent
    const currentTheme = effectiveTheme;
    
    // Skip rendering the root node (depth 0)
    if (depth === 0) {
      return null;
    }
    
    const item = root.children?.[index];
    
    // If there's no item or it's the root, don't render anything
    if (!item || index === undefined) {
      return null;
    }
    
    // Update the item payload with width and height for tooltip to use
    if (item && typeof item === 'object') {
      item.width = width;
      item.height = height;
    }
    
    // Add spacing between sections (2px on each side = 4px gap between sections)
    const padding = 2;
    
    // Ensure minimum dimensions for rendering (1px minimum after padding)
    const safeWidth = Math.max(1, width - padding * 2);
    const safeHeight = Math.max(1, height - padding * 2);
    
    // Skip rendering extremely small sections that would be invisible after padding
    if (safeWidth < 1 || safeHeight < 1) {
      return null;
    }
    
    // Adjust position to add padding
    const safeX = x + padding;
    const safeY = y + padding;
    
    // Determine if this portion is at a corner of the container
    // We need to check if it's at one of the edges of the root area
    const isAtTopEdge = y <= padding * 2;
    const isAtBottomEdge = y + height >= root.height - padding * 2;
    const isAtLeftEdge = x <= padding * 2;
    const isAtRightEdge = x + width >= root.width - padding * 2;
    
    // Determine which corner (if any) this portion is at
    const isTopLeft = isAtTopEdge && isAtLeftEdge;
    const isTopRight = isAtTopEdge && isAtRightEdge;
    const isBottomLeft = isAtBottomEdge && isAtLeftEdge;
    const isBottomRight = isAtBottomEdge && isAtRightEdge;
    
    // Container corner radius (matching rounded-xl)
    const cornerRadius = 12;
    const defaultRadius = 2;
    
    // Get color directly based on asset and current theme
    let fillColor = DEFAULT_COLOR;
    if (isAssetTicker(item.name) && ASSETS[item.name]) {
      fillColor = ASSETS[item.name].theme[currentTheme];
      // Special log for XCM to debug
      if (item.name === 'XCM') {
        console.log(`XCM color for ${currentTheme} theme: ${fillColor}`);
      }
    }
    
    // Apply opacity only to the fill color, not to stroke or text
    const adjustOpacity = (color: string, opacity: number) => {
      // Parse the hex color and convert it to rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };
    
    // Get fill color with appropriate opacity based on theme
    const getOpacity = () => {
      if (currentTheme === 'dark') {
        return isHovered ? 0.32 : 0.08; // Dark theme: 8% to 32%
      } else {
        return isHovered ? 1 : 0.32; // Light theme: 32% to 100%
      }
    };
    
    const fillOpacity = getOpacity();
    const fillColorWithOpacity = adjustOpacity(fillColor, fillOpacity);
    
    // Dynamically adjust text size and visibility based on box size
    const showLabel = width > 80 && height > 50; // Increased size threshold
    const showPercentage = width > 80 && height > 50;
    const showIcon = width > 30 && height > 30; // Only show icon if there's enough space
    const fontSize = Math.min(12, Math.max(8, width / 10)); // Responsive font size
    
    // Calculate adaptive icon size based on available space
    const iconSize = Math.min(
      Math.max(24, Math.min(width, height) * 0.25), // At least 24px, at most 25% of smallest dimension
      Math.min(64, width * 0.4, height * 0.4) // Upper limit of 64px or 40% of the dimension
    );
    
    // Set specific corner radii
    const topLeftRadius = isTopLeft ? cornerRadius : defaultRadius;
    const topRightRadius = isTopRight ? cornerRadius : defaultRadius;
    const bottomLeftRadius = isBottomLeft ? cornerRadius : defaultRadius;
    const bottomRightRadius = isBottomRight ? cornerRadius : defaultRadius;
    
    // Create SVG path for rectangle with variable corner radii
    const pathData = `
      M ${safeX + topLeftRadius} ${safeY}
      H ${safeX + safeWidth - topRightRadius}
      Q ${safeX + safeWidth} ${safeY} ${safeX + safeWidth} ${safeY + topRightRadius}
      V ${safeY + safeHeight - bottomRightRadius}
      Q ${safeX + safeWidth} ${safeY + safeHeight} ${safeX + safeWidth - bottomRightRadius} ${safeY + safeHeight}
      H ${safeX + bottomLeftRadius}
      Q ${safeX} ${safeY + safeHeight} ${safeX} ${safeY + safeHeight - bottomLeftRadius}
      V ${safeY + topLeftRadius}
      Q ${safeX} ${safeY} ${safeX + topLeftRadius} ${safeY}
      Z
    `;
    
    // Create a unique id for this item to use with foreignObject
    const foreignObjectId = `asset-button-${item.id || Math.random().toString(36).substring(2, 9)}`;
    
    return (
      <g
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <path 
          d={pathData}
          fill={fillColorWithOpacity}
          stroke={fillColor}
          strokeWidth={1}
          style={{
            transition: 'fill 0.2s ease-out',
          }}
        />
        
        {/* Subtle asset icon in the top left corner with adaptive size */}
        {showIcon && isAssetTicker(item.name) && ASSETS[item.name as AssetTicker]?.icon && (
          <foreignObject
            x={safeX + 6} // Position at top left with small padding
            y={safeY + 6} 
            width={iconSize}
            height={iconSize}
            className="pointer-events-none"
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              className="w-full h-full flex items-center justify-center"
            >
              <img
                src={ASSETS[item.name as AssetTicker].icon}
                alt={item.name}
                className="w-full h-full object-contain mix-blend-overlay"
                style={{
                  opacity: isHovered ? 1 : 0.1,
                  filter: `grayscale(${isHovered ? '0%' : '50%'})`,
                  transition: 'all 0.2s ease-out',
                }}
              />
            </div>
          </foreignObject>
        )}
        
        {showLabel && (
          <foreignObject
            x={safeX + 8} // Left padding
            y={safeY + safeHeight - 36} // Position at bottom with some padding
            width={safeWidth - 16} // Allow space for padding on both sides
            height={30} // Height for the row
            className="overflow-visible pointer-events-none"
          >
            <div 
              xmlns="http://www.w3.org/1999/xhtml"
              className="flex items-center justify-between w-full h-full"
            >
              {/* Asset button at bottom left */}
              <AssetButton
                asset={item.name}
                assetColor={fillColor}
                fontSize={fontSize}
                isActive={isHovered}
              />
              
              {/* Percentage at bottom right */}
              {showPercentage && (
                <span 
                  className="text-white font-semibold"
                  style={{ 
                    fontSize: `${fontSize - 1}px`,
                    opacity: 0.9
                  }}
                >
                  {item.formattedPercentage}
                </span>
              )}
            </div>
          </foreignObject>
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
      let processedData = Object.entries(balances)
        .filter(([asset]) => asset !== 'TOTAL') // Filter out total if present
        .map(([asset, balance]: [string, any]) => {
          const value = parseFloat(balance.EUR || '0');
          const percentage = (value / totalValue) * 100;
          
          // Create a unique ID for each item to prevent naming conflicts
          return {
            id: `${asset}-${Math.random().toString(36).substring(2, 9)}`, // Add unique ID
            name: asset,
            value: value,
            // Apply a minimum size floor to ensure small values are still visible
            // This maintains the proportion for larger values while making smaller ones visible
            size: Math.max(value, totalValue * 0.002), // 0.2% minimum visual size
            originalValue: value, // Keep the original value for tooltip
            formattedPercentage: `${percentage.toFixed(2)}%`,
          };
        })
        .filter(item => !isNaN(item.value) && item.value > 0) // Filter out zero values
        // Sort by value descending to help with rendering
        .sort((a, b) => b.value - a.value);
      
      // Check for and remove any duplicates before setting the data
      const assetMap = new Map();
      processedData = processedData.filter(item => {
        if (assetMap.has(item.name)) {
          console.warn(`TreeMapWidget: Duplicate asset found and removed: ${item.name}`);
          return false;
        }
        assetMap.set(item.name, true);
        return true;
      });
      
      console.log(`TreeMapWidget: Processed ${processedData.length} items:`, processedData);
      
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
        <div className="h-full w-full rounded-xl bg-card overflow-hidden">
          <TreeMapSkeleton />
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
              idKey="id"
              stroke="transparent"
              animationDuration={0}
              isAnimationActive={false}
              content={<TreeMapItem />}
              aspectRatio={1}
              colorPanel={[]} // Disable default coloring system
            >
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={false}
                position={{ x: 'auto', y: 'auto' }}
                wrapperStyle={{ transition: 'transform 0.2s ease-out, opacity 0.2s ease-out' }}
                isAnimationActive={true}
                animationDuration={200}
                animationEasing="ease-out"
              />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </div>
    </WidgetContainer>
  );
}; 