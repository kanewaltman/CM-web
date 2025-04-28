import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { WidgetContainer } from './WidgetContainer';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Ripple } from './magicui/ripple';
import { EarnWidgetState, widgetStateRegistry, createDefaultEarnWidgetState } from '@/lib/widgetState';
import { DASHBOARD_LAYOUT_KEY } from '@/types/widgets';
import { Slider } from './ui/slider';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';
import { ChartContainer, ChartConfig } from './ui/chart';

// Define the view modes for the Earn widget
export type EarnViewMode = 'ripple' | 'cards' | 'stake';

// View mode labels for dropdown
interface ViewLabels {
  [key: string]: string;
}

const viewLabels: ViewLabels = {
  'ripple': 'Ripple View',
  'cards': 'Token Cards',
  'stake': 'Stake Assets'
};

// Define the token offerings for staking
const stakingTokens = [
  'XCM', 'LILAI', 'FLUX', 'KDA', 'THT', 'VSP', 'ADA', 
  'DOT', 'KSM', 'LTO', 'MATIC', 'XTZ', 'ETH'
];

// Mock data for staking APY
const getRandomAPY = () => {
  return (3 + Math.random() * 12).toFixed(2) + '%';
};

// Generate token data
const tokenData = stakingTokens.map(token => ({
  symbol: token,
  name: token, // In a real app, we would have the full names
  apy: getRandomAPY(),
  minStake: Math.floor(Math.random() * 100),
  lockPeriod: Math.floor(Math.random() * 30) + ' days'
}));

export interface EarnWidgetProps {
  widgetId: string;
  className?: string;
  onRemove?: () => void;
  headerControls?: boolean;
  defaultViewMode?: EarnViewMode;
  onViewModeChange?: (mode: EarnViewMode) => void;
}

// Function to synchronize the view mode to the layout
const synchronizeViewModeToLayout = (viewMode: EarnViewMode, widgetId: string) => {
  try {
    const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (savedLayout) {
      const layout = JSON.parse(savedLayout);
      const widgetIndex = layout.findIndex((item: any) => item.id === widgetId);
      
      if (widgetIndex !== -1) {
        if (!layout[widgetIndex].viewState) {
          layout[widgetIndex].viewState = {};
        }
        
        layout[widgetIndex].viewState.earnViewMode = viewMode;
        layout[widgetIndex].viewState.viewMode = 'split'; // Use standard viewMode for compatibility
        localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
      }
    }
  } catch (error) {
    console.error('Error updating layout with earn view mode:', error);
  }
};

export const EarnWidget: React.FC<EarnWidgetProps> = (props) => {
  const { resolvedTheme } = useTheme();
  const [forcedTheme, setForcedTheme] = useState<'light' | 'dark' | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  // Track current view mode for immediate updates without waiting for state system
  const [currentViewMode, setCurrentViewMode] = useState<EarnViewMode>(() => {
    // Set initial default based on widget ID
    if (props.widgetId === 'earn-assets') return 'cards';
    if (props.widgetId === 'earn-promo') return 'ripple';
    return props.defaultViewMode || 'ripple';
  });
  
  // Add a safety timeout to prevent loading state from getting stuck
  useEffect(() => {
    // Always reset loading state after max 2 seconds no matter what
    const safetyTimer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 2000);
    
    return () => clearTimeout(safetyTimer);
  }, [isLoading]);

  // Function to check and update the theme
  const checkTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
    setForcedTheme(newTheme);
  }, [resolvedTheme]);

  // Update theme when component mounts or theme changes
  useEffect(() => {
    checkTheme();
  }, [checkTheme, resolvedTheme]);

  // Listen for theme changes
  useEffect(() => {
    window.addEventListener('theme-change', checkTheme);
    return () => {
      window.removeEventListener('theme-change', checkTheme);
    };
  }, [checkTheme]);

  // Get or create widget state
  const widgetState = useMemo(() => {
    let state = widgetStateRegistry.get(props.widgetId);
    
    // Check if the state is an EarnWidgetState
    if (state && !(state instanceof EarnWidgetState)) {
      // If it's not, we'll remove it and create a new one
      widgetStateRegistry.delete(props.widgetId);
      state = undefined;
    }
    
    if (!state) {
      // Determine initial view mode based on widget ID for specific widget instances
      let initialViewMode: EarnViewMode;
      
      if (props.widgetId === 'earn-assets') {
        initialViewMode = 'cards';
      } else if (props.widgetId === 'earn-promo') {
        initialViewMode = 'ripple';
      } else {
        // For other widget IDs, try to restore from localStorage or use default
        initialViewMode = props.defaultViewMode || 'ripple';
        
        try {
          // First check widget-specific localStorage key
          const storedWidgetMode = localStorage.getItem(`widget_${props.widgetId}_view_mode`);
          if (storedWidgetMode && Object.keys(viewLabels).includes(storedWidgetMode)) {
            initialViewMode = storedWidgetMode as EarnViewMode;
          } else {
            // Check layout if widget-specific key is not found
            const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
            if (savedLayout) {
              const layout = JSON.parse(savedLayout);
              const widgetData = layout.find((item: any) => item.id === props.widgetId);
              
              // Valid earn view modes
              const validModes = Object.keys(viewLabels);
              
              // Check for earn-specific view mode
              if (widgetData?.viewState?.earnViewMode && validModes.includes(widgetData.viewState.earnViewMode)) {
                initialViewMode = widgetData.viewState.earnViewMode as EarnViewMode;
              }
              // Also check generic viewMode if earnViewMode is not found
              else if (widgetData?.viewState?.viewMode && validModes.includes(widgetData.viewState.viewMode)) {
                initialViewMode = widgetData.viewState.viewMode as EarnViewMode;
              }
            }
          }
        } catch (error) {
          console.error('Error retrieving view mode from localStorage:', error);
        }
      }
      
      // Create and set the widget state
      state = createDefaultEarnWidgetState(initialViewMode, props.widgetId);
      widgetStateRegistry.set(props.widgetId, state);
      
      // Set initial view mode
      setCurrentViewMode(initialViewMode);
      
      // Sync the widget's view mode to layout
      setTimeout(() => {
        if (state) {
          synchronizeViewModeToLayout((state as EarnWidgetState).viewMode, props.widgetId);
          setIsLoading(false);
        }
      }, 100);
    } else {
      // Use the state's view mode
      setCurrentViewMode((state as EarnWidgetState).viewMode);
      setIsLoading(false);
    }
    
    return state as EarnWidgetState;
  }, [props.widgetId, props.defaultViewMode]);

  // Subscribe to widget state changes
  useEffect(() => {
    if (!widgetState) return;
    
    const unsubscribe = widgetState.subscribe(() => {
      setCurrentViewMode(widgetState.viewMode);
    });
    
    return unsubscribe;
  }, [widgetState]);

  // Handle view mode change
  const handleViewModeChange = useCallback((newMode: EarnViewMode) => {
    if (!widgetState || newMode === widgetState.viewMode) return;
    
    // Set current view mode immediately for a responsive UI
    setCurrentViewMode(newMode);
    
    // Update widget state
    widgetState.setViewMode(newMode);
    
    // Save to widget-specific localStorage key
    localStorage.setItem(`widget_${props.widgetId}_view_mode`, newMode);
    
    // Update layout
    synchronizeViewModeToLayout(newMode, props.widgetId);
    
    // Call props callback if provided
    if (props.onViewModeChange) {
      props.onViewModeChange(newMode);
    }
  }, [widgetState, props.widgetId, props.onViewModeChange]);

  // If this is being rendered for header controls only, return just the controls
  if (props.headerControls) {
    // Keep the dropdown for all earn widgets for UI consistency
    return (
      <div className="flex items-center">
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
                onClick={() => handleViewModeChange(key as EarnViewMode)}
                className={cn(
                  "text-xs",
                  currentViewMode === key ? "font-medium bg-accent" : ""
                )}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Show loading state if still loading
  if (isLoading) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  }

  // Render the main widget content
  return (
    <div className="w-full h-full flex flex-col">
      {currentViewMode === 'ripple' ? (
        <RippleView />
      ) : currentViewMode === 'cards' ? (
        <CardGridView forcedTheme={forcedTheme} />
      ) : (
        <StakeView forcedTheme={forcedTheme} />
      )}
    </div>
  );
};

// Ripple View component
const RippleView: React.FC = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-background/50 p-6">
      <div className="relative z-10 text-center">
        <h2 className="text-2xl font-bold mb-4">Start Earning Rewards</h2>
        <p className="text-muted-foreground mb-6">
          Stake your assets to earn passive income with competitive APY rates
        </p>
        <Button size="lg" className="font-semibold">
          Explore Staking Options
        </Button>
      </div>
      <div className="absolute inset-0">
        <Ripple 
          className="w-full h-full" 
          mainCircleSize={280} 
          mainCircleOpacity={0.15}
          numCircles={10}
        />
      </div>
    </div>
  );
};

// Card Grid View component
const CardGridView: React.FC<{ forcedTheme?: 'light' | 'dark' }> = ({ forcedTheme }) => {
  return (
    <div className="w-full h-full overflow-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-auto">
        {tokenData.map((token) => (
          <Card key={token.symbol} className={cn(
            "flex flex-col h-full",
            forcedTheme === 'dark' ? "border-slate-800" : "border-slate-100"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>{token.symbol}</span>
                <span className="text-sm font-normal text-emerald-500">{token.apy} APY</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between mb-1">
                  <span>Min Stake:</span>
                  <span>{token.minStake} {token.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lock Period:</span>
                  <span>{token.lockPeriod}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="mt-auto pt-2">
              <Button variant="outline" size="sm" className="w-full">
                Stake {token.symbol}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Stake View component for detailed staking options
const StakeView: React.FC<{ forcedTheme?: 'light' | 'dark' }> = ({ forcedTheme }) => {
  const [selectedAsset, setSelectedAsset] = useState(stakingTokens[0]);
  const [stakeAmount, setStakeAmount] = useState(100);
  const [sliderValue, setSliderValue] = useState(25);
  
  // Generate random APY history data for the selected asset
  const apyHistoryData = useMemo(() => {
    const numDataPoints = 30; // 30 days of data
    const data = [];
    let currentApy = 3 + Math.random() * 6; // Starting APY between 3% and 9%
    
    for (let i = 0; i < numDataPoints; i++) {
      // Small random change each day
      currentApy += (Math.random() - 0.5) * 0.2;
      // Keep APY within reasonable bounds
      currentApy = Math.max(2, Math.min(12, currentApy));
      
      // Add data point
      data.push({
        day: i,
        apy: parseFloat(currentApy.toFixed(2)),
        timestamp: new Date(Date.now() - (numDataPoints - i) * 86400000).toISOString().split('T')[0]
      });
    }
    
    return data;
  }, [selectedAsset]);
  
  // Get estimated earnings based on stake amount and current APY
  const estimatedEarnings = useMemo(() => {
    const currentApy = apyHistoryData[apyHistoryData.length - 1].apy;
    const annual = (stakeAmount * currentApy) / 100;
    return {
      daily: (annual / 365).toFixed(2),
      weekly: (annual / 52).toFixed(2),
      monthly: (annual / 12).toFixed(2),
      annual: annual.toFixed(2)
    };
  }, [stakeAmount, apyHistoryData]);
  
  // Handle input changes
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setStakeAmount(value);
      // Update slider to match proportion of max amount (1000)
      setSliderValue(Math.min(100, Math.round((value / 1000) * 100)));
    }
  };
  
  // Handle slider changes
  const handleSliderChange = (value: number[]) => {
    const newValue = value[0];
    setSliderValue(newValue);
    // Update stake amount based on slider (max 1000)
    setStakeAmount(Math.round((newValue / 100) * 1000));
  };
  
  return (
    <div className="w-full h-full overflow-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - Asset selection and amount */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Asset</label>
            <select 
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className={cn(
                "w-full h-10 px-3 py-2 rounded-md border text-sm",
                forcedTheme === 'dark' ? "bg-background border-slate-100" : "bg-background border-slate-100"
              )}
            >
              {stakingTokens.map(token => (
                <option key={token} value={token}>{token}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Stake Amount</label>
            <div className="relative">
              <input
                type="number"
                value={stakeAmount}
                onChange={handleAmountChange}
                min="0"
                className={cn(
                  "w-full h-10 px-3 py-2 rounded-md border text-sm",
                  forcedTheme === 'dark' ? "bg-background border-slate-100" : "bg-background border-slate-100"
                )}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium">
                {selectedAsset}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Adjust Amount</label>
              <span className="text-xs text-muted-foreground">{sliderValue}%</span>
            </div>
            <Slider
              value={[sliderValue]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleSliderChange}
              className="my-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 {selectedAsset}</span>
              <span>1000 {selectedAsset}</span>
            </div>
          </div>
          
          <div className={cn(
            "rounded-md border p-4",
            forcedTheme === 'dark' ? "border-slate-800" : "border-slate-100"
          )}>
            <h3 className="text-sm font-medium mb-3">Estimated Earnings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily</span>
                <span>{estimatedEarnings.daily} {selectedAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weekly</span>
                <span>{estimatedEarnings.weekly} {selectedAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly</span>
                <span>{estimatedEarnings.monthly} {selectedAsset}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Annual</span>
                <span>{estimatedEarnings.annual} {selectedAsset}</span>
              </div>
            </div>
          </div>
          
          <Button className="w-full">Continue to Stake</Button>
        </div>
        
        {/* Right column - APY Chart */}
        <div className={cn(
          "rounded-md border p-4 flex flex-col",
          forcedTheme === 'dark' ? "border-slate-800" : "border-slate-100"
        )}>
          <h3 className="text-sm font-medium mb-2">APY History ({selectedAsset})</h3>
          <div className="text-emerald-500 text-2xl font-semibold mb-4">
            {apyHistoryData[apyHistoryData.length - 1].apy}%
          </div>
          <div className="flex-1 min-h-[300px]">
            <ChartContainer
              config={{ apy: { label: 'APY %', color: 'hsl(var(--primary))' } }}
              className="h-full w-full"
            >
              <LineChart
                data={apyHistoryData}
                margin={{ left: 0, right: 20, top: 10, bottom: 0 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false}
                  stroke="hsl(var(--color-border-muted))"
                />
                <XAxis 
                  dataKey="timestamp" 
                  tickLine={false}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                  stroke="hsl(var(--color-border-muted))"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(value) => `${value}%`}
                />
                <Line
                  type="monotone"
                  dataKey="apy"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <ChartTooltip
                  labelFormatter={(value) => `Date: ${value}`}
                  formatter={(value: number) => [`${value}%`, 'APY']}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// The exported wrapper component that includes the widget container
export const EarnWidgetWrapper: React.FC<EarnWidgetProps> = (props) => {
  // Set appropriate title based on widget ID
  let title = 'Earn';
  if (props.widgetId === 'earn-promo') {
    title = 'Earn Rewards';
  } else if (props.widgetId === 'earn-assets') {
    title = 'Staking Assets';
  } else if (props.widgetId === 'earn-stake') {
    title = 'Stake Assets';
  }
  
  return (
    <WidgetContainer
      title={title}
      onRemove={props.onRemove}
      headerControls={
        <EarnWidget
          headerControls
          widgetId={props.widgetId}
          defaultViewMode={props.defaultViewMode}
          onViewModeChange={props.onViewModeChange}
        />
      }
    >
      <EarnWidget
        widgetId={props.widgetId}
        defaultViewMode={props.defaultViewMode}
        onViewModeChange={props.onViewModeChange}
      />
    </WidgetContainer>
  );
}; 