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
import { openWidgetDialog, resetDialogOpenedState } from '@/lib/widgetDialogService';

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

// Helper function to update URL with asset parameter
const updateUrlWithAsset = (asset: string) => {
  if (!asset || !stakingTokens.includes(asset)) return;
  
  try {
    const url = new URL(window.location.href);
    const currentPath = url.pathname;
    const isEarnPage = currentPath === '/earn';
    
    // Don't modify URL on the earn page
    if (isEarnPage) return;
    
    // Parse current hash parts
    const currentHash = url.hash || '#';
    const hashParts = currentHash.substring(1).split('&').filter(part => 
      part && !part.startsWith('asset=')
    );
    
    // Add asset parameter if it's valid
    hashParts.push(`asset=${asset}`);
    
    // Only add widget parameter if we're not on the earn page and it's not already present
    if (!hashParts.some(part => part.startsWith('widget='))) {
      hashParts.push('widget=earn-stake');
    }
    
    // Build new hash - ensure it doesn't start with '&'
    let newHash = '#' + hashParts.filter(part => part.length > 0).join('&');
    
    // Fix common URL formatting issues
    if (newHash === '#') newHash = '';
    if (newHash.startsWith('#&')) newHash = '#' + newHash.substring(2);
    
    // Only update if there's an actual change
    if (newHash !== url.hash) {
      history.replaceState(null, '', newHash || url.pathname);
    }
  } catch (error) {
    console.error('Error updating URL with asset parameter:', error);
  }
};

// Helper function to read asset parameter from URL
const getAssetFromUrl = (): string | undefined => {
  try {
    const url = new URL(window.location.href);
    
    // If the hash starts with just '#&', it's malformed and should be ignored
    if (url.hash.startsWith('#&')) {
      return undefined;
    }
    
    const assetParam = url.hash.match(/asset=([^&]*)/)?.[1];
    if (assetParam && stakingTokens.includes(assetParam)) {
      return assetParam;
    }
  } catch (error) {
    console.error('Error parsing URL for asset parameter:', error);
  }
  return undefined;
};

// Function to synchronize the view mode to the layout
const synchronizeViewModeToLayout = (viewMode: EarnViewMode, widgetId: string) => {
  // Do not override specific widget types that have fixed views
  if (widgetId === 'earn-promo' && viewMode !== 'ripple') {
    return;
  }
  if (widgetId === 'earn-assets' && viewMode !== 'cards') {
    return;
  }
  if (widgetId === 'earn-stake' && viewMode !== 'stake') {
    return;
  }

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
  const [initialAsset, setInitialAsset] = useState<string | undefined>(() => {
    // Try to get asset from URL if this is the earn-stake widget
    if (props.widgetId === 'earn-stake') {
      return getAssetFromUrl();
    }
    return undefined;
  });

  // Clean up URL if we're on the earn page and have malformed hash parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isEarnPage = window.location.pathname === '/earn';
    if (isEarnPage) {
      const hash = window.location.hash;
      
      // Check for malformed or unnecessary hash on earn page
      if (hash && (hash.startsWith('#&') || hash === '#asset=undefined')) {
        // Clear the hash without reloading page
        history.replaceState(null, '', window.location.pathname);
        console.log('Cleaned up unnecessary hash parameters on earn page');
      }
    }
  }, []);

  // Track current view mode for immediate updates without waiting for state system
  const [currentViewMode, setCurrentViewMode] = useState<EarnViewMode>(() => {
    // Set initial default based on widget ID
    if (props.widgetId === 'earn-assets') return 'cards';
    if (props.widgetId === 'earn-promo') return 'ripple';
    if (props.widgetId === 'earn-stake') return 'stake';
    return props.defaultViewMode || 'ripple';
  });
  
  // Listen for dialog open events with asset data
  useEffect(() => {
    const handleDialogOpen = (e: CustomEvent) => {
      // Store widgetState reference for use in event handler
      const currentWidgetState = widgetStateRegistry.get(props.widgetId) as EarnWidgetState | undefined;
      
      if (e.detail?.widgetId === props.widgetId && e.detail?.asset) {
        // If there's an asset specified and it's valid
        if (stakingTokens.includes(e.detail.asset)) {
          setInitialAsset(e.detail.asset);
          // If we have an asset specified, switch to stake view
          setCurrentViewMode('stake');
          
          // Also update the widgetState if it exists
          if (currentWidgetState) {
            currentWidgetState.setViewMode('stake');
          }
          
          // Update URL with the asset parameter
          updateUrlWithAsset(e.detail.asset);
        }
      }
      
      // Force the stake view if this is the earn-stake widget regardless of asset
      if (e.detail?.widgetId === 'earn-stake' && props.widgetId === 'earn-stake') {
        setCurrentViewMode('stake');
        if (currentWidgetState) {
          currentWidgetState.setViewMode('stake');
        }
        
        // Try to get asset from URL if not specified in the event
        if (!e.detail?.asset) {
          const assetFromUrl = getAssetFromUrl();
          if (assetFromUrl) {
            setInitialAsset(assetFromUrl);
          }
        }
      }
    };
    
    // TypeScript doesn't recognize CustomEvent by default
    document.addEventListener('open-widget-dialog' as any, handleDialogOpen);
    
    return () => {
      document.removeEventListener('open-widget-dialog' as any, handleDialogOpen);
    };
  }, [props.widgetId]);
  
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
      } else if (props.widgetId === 'earn-stake') {
        initialViewMode = 'stake';
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
    
    // Respect fixed view modes for specific widget IDs
    if (props.widgetId === 'earn-promo' && newMode !== 'ripple') {
      return;
    }
    if (props.widgetId === 'earn-assets' && newMode !== 'cards') {
      return;
    }
    if (props.widgetId === 'earn-stake' && newMode !== 'stake') {
      return;
    }
    
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
    // For fixed view widgets, don't show a dropdown
    if (props.widgetId === 'earn-promo' || props.widgetId === 'earn-assets' || props.widgetId === 'earn-stake') {
      return <div className="flex items-center"></div>;
    }
    
    // Keep the dropdown for all other earn widgets for UI consistency
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
        <StakeView forcedTheme={forcedTheme} initialAsset={initialAsset} />
      )}
    </div>
  );
};

// Ripple View component
const RippleView: React.FC = () => {
  // Choose a featured token (this could be dynamic based on promotion, highest APY, etc.)
  const featuredToken = 'XCM';

  const handleGetStartedClick = () => {
    // Check if we're on the earn page
    const isEarnPage = window.location.pathname === '/earn';
    
    // Close any existing dialogs first to prevent multiple dialogs
    const closeEvent = new CustomEvent('close-widget-dialogs', {
      bubbles: true
    });
    document.dispatchEvent(closeEvent);
    
    // Reset dialog state to ensure clean handling
    resetDialogOpenedState();
    
    // Update URL with the asset parameter
    updateUrlWithAsset(featuredToken);
    
    // Wait a small delay to ensure dialogs are closed
    setTimeout(() => {
      // Use the updated openWidgetDialog function with exactMatchOnly parameter
      openWidgetDialog('earn-stake', 'direct', featuredToken, true);
    }, 150);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 overflow-hidden">
      <Ripple 
        className="absolute inset-0" 
        mainCircleSize={280}
        mainCircleOpacity={0.15}
        numCircles={10}
      />
      <div className="z-10 text-center max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-2">Earn Rewards</h2>
        <p className="text-muted-foreground mb-6">
          Stake your assets and earn passive income with competitive APY rates and flexible lock periods.
        </p>
        <div className="flex flex-col space-y-2 items-center">
          <div className="p-3 bg-primary/10 rounded-full mb-2">
            <div className="text-xl font-bold">{featuredToken}</div>
            <div className="text-emerald-500 font-medium text-sm">
              {tokenData.find(t => t.symbol === featuredToken)?.apy} APY
            </div>
          </div>
          <Button onClick={handleGetStartedClick}>
            Get Started with {featuredToken}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Card Grid View component for token browsing
const CardGridView: React.FC<{ forcedTheme?: 'light' | 'dark' }> = ({ forcedTheme }) => {
  // Function to open stake view with a specific asset
  const handleStakeClick = (token: string) => {
    // Check if we're on the earn page
    const isEarnPage = window.location.pathname === '/earn';
    
    // Close any existing dialogs first to prevent multiple dialogs
    const closeEvent = new CustomEvent('close-widget-dialogs', {
      bubbles: true
    });
    document.dispatchEvent(closeEvent);
    
    // Reset dialog state to ensure clean handling
    resetDialogOpenedState();
    
    // Update URL with the asset parameter
    updateUrlWithAsset(token);
    
    // Wait a small delay to ensure dialogs are closed
    setTimeout(() => {
      // Use the updated openWidgetDialog function with exactMatchOnly parameter
      openWidgetDialog('earn-stake', 'direct', token, true);
    }, 150);
  };
  
  return (
    <div className="w-full h-full overflow-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokenData.map((token) => (
          <Card 
            key={token.symbol} 
            className={cn(
              "overflow-hidden hover:shadow-md transition-shadow",
              forcedTheme === 'dark' ? "border-slate-800" : "border-slate-100"
            )}
          >
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-lg">{token.symbol}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 pb-2">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">APY</span>
                  <span className="text-sm text-emerald-500 font-medium">{token.apy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Min Stake</span>
                  <span className="text-sm">{token.minStake} {token.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Lock Period</span>
                  <span className="text-sm">{token.lockPeriod}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-2">
              <Button 
                className="w-full" 
                size="sm"
                onClick={() => handleStakeClick(token.symbol)}
              >
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
const StakeView: React.FC<{ forcedTheme?: 'light' | 'dark'; initialAsset?: string }> = ({ forcedTheme, initialAsset }) => {
  const [selectedAsset, setSelectedAsset] = useState(() => {
    // Use initialAsset if provided, otherwise default to first token
    return initialAsset && stakingTokens.includes(initialAsset) 
      ? initialAsset 
      : stakingTokens[0];
  });
  const [stakeAmount, setStakeAmount] = useState(100);
  const [sliderValue, setSliderValue] = useState(25);
  
  // Update URL when selected asset changes - but only when not on earn page directly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Don't update URL when on the earn page directly
    const isEarnPage = window.location.pathname === '/earn';
    if (isEarnPage) return;
    
    updateUrlWithAsset(selectedAsset);
  }, [selectedAsset]);

  // Handle asset change from URL
  useEffect(() => {
    const handleHashChange = () => {
      const assetFromUrl = getAssetFromUrl();
      if (assetFromUrl && assetFromUrl !== selectedAsset) {
        setSelectedAsset(assetFromUrl);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [selectedAsset]);

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

// Function to open earn widget with a specific asset
export function openEarnWidgetWithAsset(asset: string) {
  if (!stakingTokens.includes(asset)) {
    console.warn('Invalid asset selected:', asset);
    return;
  }
  
  // Check if we're on the earn page
  const isEarnPage = window.location.pathname === '/earn';
  
  // Close any existing dialogs first to prevent multiple dialogs
  const closeEvent = new CustomEvent('close-widget-dialogs', {
    bubbles: true
  });
  document.dispatchEvent(closeEvent);
  
  // Reset dialog state to ensure clean handling
  resetDialogOpenedState();
  
  // Update URL with the asset parameter
  updateUrlWithAsset(asset);
  
  // Wait a small delay to ensure dialogs are closed
  setTimeout(() => {
    // Use the updated openWidgetDialog function with exactMatchOnly parameter
    openWidgetDialog('earn-stake', 'direct', asset, true);
  }, 150);
} 