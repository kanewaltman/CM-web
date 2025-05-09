import React, { useEffect, useState, useCallback } from 'react';
import { Treemap, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { WidgetContainer } from './WidgetContainer';
import { SAMPLE_BALANCES } from './BalancesWidget';
import { useTheme } from 'next-themes';
import { useDataSource } from '@/lib/DataSourceContext';
import { getApiUrl } from '@/lib/api-config';
import { ASSETS, isAssetTicker, AssetTicker } from '@/assets/AssetTicker';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { AssetPriceTooltip } from './AssetPriceTooltip';

// Default color for assets not found in ASSETS
const DEFAULT_COLOR = '#4f46e5';

// Add keyframes for the pulse animation
const pulseKeyframes = `
@keyframes pulse-border {
  0% {
    stroke-opacity: 0.6;
  }
  50% {
    stroke-opacity: 1;
  }
  100% {
    stroke-opacity: 0.6;
  }
}
`;

// Inject the keyframes into the document head
if (typeof document !== 'undefined') {
  // Only run in browser environment
  const style = document.createElement('style');
  style.innerHTML = pulseKeyframes;
  document.head.appendChild(style);
}

// View modes for the Breakdown widget
export type BreakdownViewMode = 'treemap' | 'donut';

// View mode labels
const viewLabels: Record<BreakdownViewMode, string> = {
  'treemap': 'Tree Map',
  'donut': 'Donut Chart'
};

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
    <AssetPriceTooltip asset={asset as AssetTicker} inTableCell={false}>
      <div
        className={cn("font-jakarta font-bold rounded-md px-1 relative z-20 asset-button-container asset-badge", className)}
        style={{ 
          color: showHoverState ? 'hsl(var(--color-widget-bg))' : assetColor,
          backgroundColor: showHoverState ? assetColor : `${assetColor}14`,
          cursor: 'pointer !important',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          fontSize: `${fontSize}px`,
          pointerEvents: 'auto',
          ...style
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {asset}
      </div>
    </AssetPriceTooltip>
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
export const BreakdownWrapper: React.FC<{
  className?: string;
  onRemove?: () => void;
  onViewModeChange?: (mode: BreakdownViewMode) => void;
  widgetId?: string;
}> = (props) => {
  const { resolvedTheme } = useTheme();
  const [key, setKey] = useState(Date.now());
  const [forcedTheme, setForcedTheme] = useState<'light' | 'dark'>('light');
  
  // Debug onRemove prop with more details
  console.log('BreakdownWrapper received props:', { 
    hasOnRemove: !!props.onRemove,
    onRemoveType: typeof props.onRemove, 
    className: props.className,
    widgetId: props.widgetId
  });
  
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
    
    console.log(`BreakdownWrapper: Current theme is ${currentTheme}, setting new key: ${Date.now()}`);
    setKey(Date.now());
    
    // Also listen for theme changes via class changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && 
            mutation.target === document.documentElement) {
          const newTheme = checkTheme();
          console.log(`BreakdownWrapper: DOM class changed, theme is now ${newTheme}`);
          setKey(Date.now());
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, [resolvedTheme]);
  
  console.log(`BreakdownWrapper rendering with key: ${key}, forced theme: ${forcedTheme}, onRemove available: ${!!props.onRemove}`);
  
  // Pass all props including widgetId to Breakdown
  return <Breakdown 
    key={key} 
    forceTheme={forcedTheme} 
    className={props.className} 
    onRemove={props.onRemove}
    onViewModeChange={props.onViewModeChange}
    widgetId={props.widgetId}
  />;
};

// The actual implementation of Breakdown stays focused on data
const Breakdown: React.FC<{
  className?: string;
  onRemove?: () => void;
  forceTheme?: 'light' | 'dark';
  onViewModeChange?: (mode: BreakdownViewMode) => void;
  widgetId?: string;
}> = ({ className, onRemove, forceTheme, onViewModeChange, widgetId }) => {
  // Add debug logging
  console.log('Breakdown component received props:', {
    hasOnRemove: !!onRemove,
    onRemoveType: typeof onRemove,
    forceTheme
  });
  
  const { resolvedTheme } = useTheme(); 
  const { dataSource } = useDataSource();
  const [treeMapData, setTreeMapData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balances, setBalances] = useState<any>(SAMPLE_BALANCES());
  const [error, setError] = useState<string | null>(null);
  const [clickedItemId, setClickedItemId] = useState<string | null>(null);
  // Track whether treemap tooltips should be shown
  const [showTreemapTooltips, setShowTreemapTooltips] = useState(false);
  // Track current view mode
  const [viewMode, setViewMode] = useState<BreakdownViewMode>('treemap');
  // Track hovered donut segment
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  
  // Use forced theme if provided
  const effectiveTheme = forceTheme || (resolvedTheme === 'dark' ? 'dark' : 'light');
  
  // Custom tooltip to show the asset name and percentage
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      
      // Show tooltip for small sections or when tooltips are enabled globally
      const width = data.width || 0;
      const height = data.height || 0;
      const isSmallSection = width <= 80 || height <= 50;
      
      // Always show tooltip if:
      // 1. It's a small section
      // 2. Global tooltips are enabled
      if (!isSmallSection && !showTreemapTooltips) {
        return null;
      }
      
      // Get asset-specific color for styling accents
      let assetColor = DEFAULT_COLOR;
      if (isAssetTicker(data.name) && ASSETS[data.name as AssetTicker]) {
        assetColor = ASSETS[data.name as AssetTicker].theme[effectiveTheme];
      }
      
      // Check if we have a valid balance
      const hasValidBalance = data.balance > 0;
      
      return (
        <div className="bg-card px-4 py-3 rounded-md shadow-md border text-sm backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {isAssetTicker(data.name) && ASSETS[data.name as AssetTicker]?.icon && (
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: `${assetColor}22`,
                    border: `1px solid ${assetColor}` 
                  }}
                >
                  <img 
                    src={ASSETS[data.name as AssetTicker].icon} 
                    alt={data.name} 
                    className="w-4 h-4 object-contain"
                  />
                </div>
              )}
              <p className="font-semibold text-base" style={{ color: assetColor }}>{data.name}</p>
            </div>
            
            <div className="text-muted-foreground space-y-1.5 pt-0.5">
              <div className="flex justify-between gap-4">
                <span>Allocation:</span>
                <span className="font-medium text-foreground">{data.formattedPercentage}</span>
              </div>
              
              <div className="flex justify-between gap-4">
                <span>Balance:</span>
                <span className="font-medium text-foreground">
                  {hasValidBalance 
                    ? data.formattedBalance 
                    : <span className="italic opacity-60">Not available</span>}
                </span>
              </div>
              
              <hr className="border-t border-border my-1.5 opacity-60" />
              
              <div className="flex justify-between gap-4 pt-0.5">
                <span>Value:</span>
                <span className="font-medium text-foreground">{data.formattedValue}</span>
              </div>
            </div>
          </div>
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
    
    // Determine if this is a small section
    const isSmallSection = width <= 80 || height <= 50;
    
    // Determine if this section should show tooltip
    const shouldShowTooltip = isSmallSection || showTreemapTooltips || isHovered;
    
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
    
    // Container corner radius - check for grid style to apply different values
    // Get current grid style from root element
    const gridStyle = document.documentElement.getAttribute('data-grid-style') || 'dense';
    const cornerRadius = gridStyle === 'rounded' ? 22 : 12; // 22px for rounded, 12px for dense
    const defaultRadius = 2;
    
    // Get color directly based on asset and current theme
    let fillColor = DEFAULT_COLOR;
    if (isAssetTicker(item.name) && item.name in ASSETS) {
      const asset = ASSETS[item.name as keyof typeof ASSETS];
      fillColor = asset.theme[currentTheme];
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
    
    // Calculate fill color with opacity
    const fillColorWithOpacity = adjustOpacity(fillColor, getOpacity());
    
    // Determine if we should show the label and icon based on section size
    const showLabel = safeWidth >= 80 && safeHeight >= 50;
    const showIcon = safeWidth >= 40 && safeHeight >= 40;
    const showPercentage = safeWidth >= 100;
    
    // Calculate font size based on section size
    const fontSize = Math.min(12, Math.max(10, Math.floor(Math.min(safeWidth, safeHeight) / 8)));
    
    // Calculate icon size based on section size (max 24px, min 16px)
    const iconSize = Math.min(24, Math.max(16, Math.floor(Math.min(safeWidth, safeHeight) / 4)));
    
    // Create path data for rounded corners where needed
    const pathData = `
      M ${safeX + (isTopLeft ? cornerRadius : defaultRadius)} ${safeY}
      H ${safeX + safeWidth - (isTopRight ? cornerRadius : defaultRadius)}
      Q ${safeX + safeWidth} ${safeY} ${safeX + safeWidth} ${safeY + (isTopRight ? cornerRadius : defaultRadius)}
      V ${safeY + safeHeight - (isBottomRight ? cornerRadius : defaultRadius)}
      Q ${safeX + safeWidth} ${safeY + safeHeight} ${safeX + safeWidth - (isBottomRight ? cornerRadius : defaultRadius)} ${safeY + safeHeight}
      H ${safeX + (isBottomLeft ? cornerRadius : defaultRadius)}
      Q ${safeX} ${safeY + safeHeight} ${safeX} ${safeY + safeHeight - (isBottomLeft ? cornerRadius : defaultRadius)}
      V ${safeY + (isTopLeft ? cornerRadius : defaultRadius)}
      Q ${safeX} ${safeY} ${safeX + (isTopLeft ? cornerRadius : defaultRadius)} ${safeY}
    `;
    
    return (
      <g
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        onClick={(e) => {
          e.stopPropagation(); // Prevent container click from triggering
          // Toggle global tooltip visibility
          setShowTreemapTooltips(!showTreemapTooltips);
        }}
        style={{ cursor: 'pointer' }}
        className="group"
      >
        <path 
          d={pathData}
          fill={fillColorWithOpacity}
          stroke={fillColor}
          strokeWidth={1}
          strokeOpacity={0.8}
          style={{
            transition: 'fill 0.2s ease-out',
            pointerEvents: 'all',
          }}
        />
        
        {/* Subtle asset icon in the top left corner with adaptive size */}
        {showIcon && isAssetTicker(item.name) && ASSETS[item.name as AssetTicker]?.icon && (
          <foreignObject
            x={safeX + 6}
            y={safeY + 6} 
            width={iconSize}
            height={iconSize}
            style={{ pointerEvents: 'none' }}
          >
            <div
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
                  pointerEvents: 'none',
                }}
              />
            </div>
          </foreignObject>
        )}
        
        {showLabel && (
          <foreignObject
            x={safeX + 8}
            y={safeY + safeHeight - 36}
            width={safeWidth - 16}
            height={30}
            style={{ pointerEvents: 'none' }}
          >
            <div 
              className="flex items-center justify-between w-full h-full"
              style={{ pointerEvents: 'none' }}
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
                    opacity: 0.9,
                    pointerEvents: 'none'
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
    console.log('Breakdown: Fetching balances with data source:', dataSource);
    setIsLoading(true);
    
    try {
      if (dataSource === 'sample') {
        // Use sample data
        console.log('Breakdown: Using sample data');
        setBalances(SAMPLE_BALANCES());
        setError(null);
      } else {
        // Get a demo token first
        console.log('Breakdown: Fetching demo token');
        const tokenResponse = await fetch(getApiUrl('open/demo/temp'));
        if (!tokenResponse.ok) {
          throw new Error(`Token request failed with status ${tokenResponse.status}`);
        }
        
        const tokenData = await tokenResponse.json();
        if (!tokenData.token) {
          throw new Error('Failed to get demo token');
        }
        
        console.log('Breakdown: Token received, fetching balances');
        
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
        console.log('Breakdown: Balances data received:', data);
        
        if (data && typeof data === 'object') {
          setBalances(data);
          setError(null);
        } else {
          throw new Error('Invalid balance data format');
        }
      }
    } catch (err) {
      console.error('Breakdown: Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      // Fallback to sample data
      setBalances(SAMPLE_BALANCES());
    } finally {
      setIsLoading(false);
    }
  }, [dataSource]);
  
  // Fetch balances when data source changes
  useEffect(() => {
    console.log('Breakdown: Data source changed to:', dataSource);
    fetchBalances();
  }, [dataSource, fetchBalances]);
  
  // Process data for the treemap
  useEffect(() => {
    if (isLoading) return;
    
    console.log('Breakdown: Processing balances data');
    
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
        console.error("Breakdown: Total portfolio value is 0, check balance data");
        setError("No balance data with value available");
        return;
      }
      
      // Log a sample of the balances format to help with debugging
      // const sampleAssets = Object.entries(balances).slice(0, 1);
      // if (sampleAssets.length > 0) {
      //   console.log('Breakdown: Balance data structure sample:', {
      //     asset: sampleAssets[0][0],
      //     balanceObj: sampleAssets[0][1],
      //     keys: Object.keys(sampleAssets[0][1]),
      //   });
      // }
      
      // Create data for the treemap without including fill color
      let processedData = Object.entries(balances)
        .filter(([asset]) => asset !== 'TOTAL') // Filter out total if present
        .map(([asset, balance]: [string, any]) => {
          const value = parseFloat(balance.EUR || '0');
          const percentage = (value / totalValue) * 100;
          
          // Get the actual balance amount (quantity of the asset)
          // In our data structure, each asset has a property with its own ticker containing the balance
          let assetBalance = 0;
          
          // The primary way to get balance - asset has its own ticker as a property
          // Example: BTC: { BTC: "1.23456789", EUR: "45678.90" }
          if (balance[asset] !== undefined) {
            assetBalance = parseFloat(balance[asset]);
          } 
          // Fallbacks if the primary method doesn't work
          else if (balance.amount !== undefined) {
            assetBalance = typeof balance.amount === 'string' ? parseFloat(balance.amount) : balance.amount;
          } else if (balance.balance !== undefined) {
            assetBalance = typeof balance.balance === 'string' ? parseFloat(balance.balance) : balance.balance;
          } else if (balance.quantity !== undefined) {
            assetBalance = typeof balance.quantity === 'string' ? parseFloat(balance.quantity) : balance.quantity;
          } else if (typeof balance === 'object') {
            // The balance might be directly in the object with keys being currencies
            const keys = Object.keys(balance).filter(k => k !== 'EUR' && k !== 'USD' && k !== 'price');
            if (keys.length === 1) {
              // If there's only one non-currency key, it might be the asset quantity
              const possibleAmount = balance[keys[0]];
              if (typeof possibleAmount === 'string') {
                assetBalance = parseFloat(possibleAmount);
              } else if (typeof possibleAmount === 'number') {
                assetBalance = possibleAmount;
              }
            }
          }
          // If we still don't have a balance but we have EUR value and price, calculate it
          if (assetBalance === 0 && value > 0) {
            if (balance.price && balance.price.EUR) {
              // Calculate from price
              const price = parseFloat(balance.price?.EUR || '0');
              assetBalance = price > 0 ? value / price : 0;
            }
          }
          
          // If balance is extremely small or NaN, set to 0
          if (isNaN(assetBalance) || !isFinite(assetBalance)) {
            assetBalance = 0;
          }
          
          // Asset-specific formatting for the balance
          const getFormattedBalance = () => {
            if (assetBalance === 0) return '0.00';
            
            // For large balances, use fewer decimal places
            if (assetBalance >= 1000) {
              return assetBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              });
            } else if (assetBalance >= 1) {
              return assetBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
              });
            } else {
              // For very small balances, use scientific notation for extremely small values
              if (assetBalance < 0.00001 && assetBalance > 0) {
                return assetBalance.toExponential(4);
              }
              // Otherwise show up to 8 decimal places for small balances
              return assetBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 8
              });
            }
          };
          
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
            balance: assetBalance, // Store the balance amount
            formattedBalance: getFormattedBalance(),
            formattedValue: value.toLocaleString(undefined, {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          };
        })
        .filter(item => !isNaN(item.value) && item.value > 0) // Filter out zero values
        // Sort by value descending to help with rendering
        .sort((a, b) => b.value - a.value);
      
      // Check for and remove any duplicates before setting the data
      const assetMap = new Map();
      processedData = processedData.filter(item => {
        if (assetMap.has(item.name)) {
          console.warn(`Breakdown: Duplicate asset found and removed: ${item.name}`);
          return false;
        }
        assetMap.set(item.name, true);
        return true;
      });
      
      console.log(`Breakdown: Processed ${processedData.length} items:`, processedData);
      
      // Only update state if we have data
      if (processedData.length > 0) {
        setTreeMapData(processedData);
        setError(null);
      } else {
        setError("No valid balance data for visualization");
      }
    } catch (err) {
      console.error('Breakdown: Error processing data:', err);
      setError("Error processing balance data");
    }
  }, [balances, isLoading]);

  // Memoize view mode change handler
  const handleViewModeChange = useCallback((mode: BreakdownViewMode) => {
    console.log(`Breakdown: view mode changed to ${mode}`);
    
    // Update local state
    setViewMode(mode);
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('breakdown_widget_view_mode', mode);
    } catch (error) {
      console.error('Failed to save view mode to localStorage:', error);
    }
    
    // Notify parent of view mode change if callback is provided
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  }, [onViewModeChange]);

  // Initialize view mode from localStorage on mount
  useEffect(() => {
    try {
      const storedMode = localStorage.getItem('breakdown_widget_view_mode');
      if (storedMode && (storedMode === 'treemap' || storedMode === 'donut')) {
        console.log('Breakdown: Restoring view mode from localStorage:', storedMode);
        setViewMode(storedMode as BreakdownViewMode);
      }
    } catch (error) {
      console.error('Error retrieving view mode from localStorage:', error);
    }
  }, []);

  // Function to adjust color opacity based on theme and hover state - moved to component level
  const adjustOpacity = (color: string, opacity: number) => {
    // Parse the hex color and convert it to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  
  // Get opacity based on theme - moved to component level
  const getOpacity = (isHovered: boolean) => {
    if (effectiveTheme === 'dark') {
      return isHovered ? 0.32 : 0.08; // Dark theme: 8% to 32%
    } else {
      return isHovered ? 1 : 0.32; // Light theme: 32% to 100%
    }
  };

  // Render donut chart with styling that matches the treemap
  const renderDonutChart = () => {
    // Custom cursor component that updates the hovered segment state
    const CustomCursor = ({ active, payload }: any) => {
      if (active && payload && payload.length > 0) {
        const currentSegment = payload[0].payload;
        
        // Update the hovered segment if needed
        if (hoveredSegmentId !== currentSegment.id) {
          setHoveredSegmentId(currentSegment.id);
        }
        
        return null;
      }
      
      // Clear hovered state when not hovering any segment
      if (!active && hoveredSegmentId !== null) {
        setHoveredSegmentId(null);
      }
      
      return null;
    };

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={treeMapData}
            dataKey="size"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="25%"
            outerRadius="85%"
            paddingAngle={0}
            stroke="#111111"
            strokeWidth={2}
            animationDuration={0}
            isAnimationActive={false}
          >
            {treeMapData.map((entry, index) => {
              // Get color based on asset
              let fillColor = DEFAULT_COLOR;
              if (isAssetTicker(entry.name) && entry.name in ASSETS) {
                fillColor = ASSETS[entry.name as keyof typeof ASSETS].theme[effectiveTheme];
              }
              
              // Check if this segment is currently hovered
              const isHovered = hoveredSegmentId === entry.id;
              
              // Apply opacity based on theme and hover
              const fillOpacity = getOpacity(isHovered);
              const fillColorWithOpacity = adjustOpacity(fillColor, fillOpacity);
              
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={fillColorWithOpacity}
                  stroke={fillColor}
                  strokeWidth={2}
                  strokeOpacity={0.8}
                  style={{ transition: 'fill 0.2s ease-out' }}
                  onMouseEnter={() => setHoveredSegmentId(entry.id)}
                  onMouseLeave={() => setHoveredSegmentId(null)}
                />
              );
            })}
          </Pie>
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={<CustomCursor />}
            wrapperStyle={{ transition: 'transform 0.2s ease-out, opacity 0.2s ease-out' }}
            isAnimationActive={true}
            animationDuration={200}
            animationEasing="ease-out"
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Create the view controller dropdown
  const viewController = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs whitespace-nowrap ml-1">
          Views
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(viewLabels).map(([key, label]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => handleViewModeChange(key as BreakdownViewMode)}
            className={cn(
              "text-xs",
              viewMode === key ? "font-medium bg-accent" : ""
            )}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Handle removal with grid integration
  const handleRemove = useCallback(() => {
    console.log('Breakdown: onRemove called directly');
    
    // First try the onRemove prop
    if (onRemove) {
      const result = onRemove();
      console.log('Breakdown: onRemove result:', result);
    }
    
    // Then dispatch the widget-remove event
    if (widgetId) {
      console.log('Breakdown: Dispatching widget-remove event for:', widgetId);
      const event = new CustomEvent('widget-remove', {
        detail: { widgetId, id: widgetId },
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
      return true;
    }
    
    return false;
  }, [onRemove, widgetId]);

  if (isLoading) {
    return (
      <WidgetContainer 
        title="Breakdown"
        onRemove={handleRemove}
        extraControls={viewController}
        className={className}
        id={widgetId}
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
        title="Breakdown"
        onRemove={handleRemove}
        extraControls={viewController}
        className={className}
        id={widgetId}
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
      title="Breakdown"
      onRemove={handleRemove}
      extraControls={viewController}
      className={className}
      id={widgetId}
    >
      <div 
        className="h-full w-full rounded-xl bg-card overflow-hidden border"
        onClick={(e) => {
          // Only toggle treemap tooltips when in treemap view and
          // only if the click is not on an asset button
          const target = e.target as HTMLElement;
          const isAssetButtonClick = target.closest('.asset-button-container') !== null;
          
          if (viewMode === 'treemap' && !isAssetButtonClick) {
            setShowTreemapTooltips(!showTreemapTooltips);
          }
        }}
      >
        <div className="h-full w-full">
          {/* Render different charts based on view mode */}
          {viewMode === 'treemap' && (
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treeMapData}
                dataKey="size"
                nameKey="name"
                key="id"
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
                  wrapperStyle={{ transition: 'transform 0.2s ease-out, opacity 0.2s ease-out' }}
                  isAnimationActive={true}
                  animationDuration={200}
                  animationEasing="ease-out"
                />
              </Treemap>
            </ResponsiveContainer>
          )}
          
          {viewMode === 'donut' && renderDonutChart()}
        </div>
      </div>
    </WidgetContainer>
  );
};

// Export both as named exports for consistency
export { Breakdown };
export default BreakdownWrapper; 