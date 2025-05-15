import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Slider } from '../ui/slider';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';
import { ChartContainer, ChartConfig } from '../ui/chart';
import { Input } from '../ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '../ui/table';
import { AssetButtonWithPrice } from '../AssetPriceTooltip';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { stakingPlansManager, StakingPlan } from '../EarnConfirmationContent';
import NumberFlow, { continuous } from '@number-flow/react';
import { AssetPriceTooltip } from '../AssetPriceTooltip';
import { openWidgetDialog, resetDialogOpenedState, forceOpenDialog } from '@/lib/widgetDialogService';
import { AssetIcon } from '@/components/common/AssetIcon';
import { EarnWidgetStakingOptions, isStaticWidget } from './EarnWidgetStakingOptions';

// Import staking tokens and functions from EarnWidget.tsx
// These would need to be exported from EarnWidget or moved to a shared utils file
import { stakingTokens, tokenData, isInDialog, updateUrlWithAsset, forceResetDialogState, getAssetFromUrl } from './EarnWidgetUtils.ts';

// StakeView component definition
interface StakeViewProps {
  forcedTheme?: 'light' | 'dark';
  initialAsset?: string;
}

const StakeView: React.FC<StakeViewProps> = ({ forcedTheme, initialAsset }) => {
  // Track if the initial asset has been applied
  const initialAssetApplied = useRef(false);
  
  // More debug logging to track what's happening
  console.log('🏗️ StakeView rendering with initialAsset:', initialAsset);
  
  // Flag to track if change is from user vs URL
  const isUserChange = useRef(false);
  // Flag to prevent responding to our own URL changes
  const ignoreNextHashChange = useRef(false);
  
  // Use state initialization with a clear priority order
  const [selectedAsset, setSelectedAsset] = useState(() => {
    // First check if initialAsset is provided (highest priority)
    if (initialAsset && stakingTokens.includes(initialAsset)) {
      initialAssetApplied.current = true;
      console.log('📱 StakeView using initialAsset prop on mount:', initialAsset);
      
      // Also store in session storage for consistency
      sessionStorage.setItem('selected_stake_asset', initialAsset);
      
      return initialAsset;
    }
    
    // Check the URL next for direct navigations
    const urlAsset = getAssetFromUrl();
    if (urlAsset && stakingTokens.includes(urlAsset)) {
      initialAssetApplied.current = true;
      console.log('📱 StakeView using URL asset on mount:', urlAsset);
      
      // Store in session storage for consistency
      sessionStorage.setItem('selected_stake_asset', urlAsset);
      
      return urlAsset;
    }
    
    // Then check session storage
    if (typeof window !== 'undefined') {
      const sessionAsset = sessionStorage.getItem('selected_stake_asset');
      if (sessionAsset && stakingTokens.includes(sessionAsset)) {
        initialAssetApplied.current = true;
        console.log('📱 StakeView using session storage asset on mount:', sessionAsset);
        // Keep the session storage for now - will be cleared elsewhere
        return sessionAsset;
      }
    }
    
    // Finally, use the first staking token as default
    console.log('⚠️ StakeView using default token (first in list):', stakingTokens[0]);
    return stakingTokens[0];
  });
  
  const [stakeAmount, setStakeAmount] = useState(100);
  const [sliderValue, setSliderValue] = useState(25);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState("1y");
  const inDialogRef = useRef(false);
  
  // Update selected asset if initialAsset changes after first render
  // But only if it wasn't from a user selection
  useEffect(() => {
    if (!isUserChange.current && 
        initialAsset && 
        stakingTokens.includes(initialAsset) && 
        (!initialAssetApplied.current || initialAsset !== selectedAsset)) {
      console.log('📱 StakeView updating selected asset from prop change:', initialAsset);
      setSelectedAsset(initialAsset);
      initialAssetApplied.current = true;
      
      // Ensure URL reflects this asset
      if (window.location.pathname === '/earn') {
        const isInDialogNow = isInDialog();
        if (isInDialogNow) {
          console.log('🔄 StakeView updating URL from initialAsset prop change:', initialAsset);
          
          // Flag that we're about to change the URL so we should ignore the next hash change
          ignoreNextHashChange.current = true;
          
          window.history.replaceState(
            null, 
            '', 
            `${window.location.pathname}#widget=earn-stake&asset=${initialAsset}`
          );
        }
      }
    }
  }, [initialAsset, selectedAsset]);
  
  // Improved dialog detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Find all parent elements to check if we're in a dialog
    const checkIfInDialog = () => {
      let element = document.activeElement;
      let maxDepth = 10; // Prevent infinite loops
      
      while (element && maxDepth > 0) {
        if (
          element.classList?.contains('dialog-content') || 
          element.getAttribute?.('role') === 'dialog' ||
          element.classList?.contains('DialogContent')
        ) {
          return true;
        }
        element = element.parentElement;
        maxDepth--;
      }
      
      // Alternative detection method
      return !!document.querySelector('[role="dialog"]') || 
             !!document.querySelector('.dialog-content') ||
             !!document.querySelector('.DialogContent');
    };
    
    inDialogRef.current = checkIfInDialog();
    
    // Re-check periodically since dialogs can open/close
    const intervalId = setInterval(() => {
      inDialogRef.current = checkIfInDialog();
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle asset selection change from dropdown
  const handleAssetChange = (newAsset: string) => {
    console.log('🔄 User changed asset selection to:', newAsset);
    
    // Mark this as a user-initiated change
    isUserChange.current = true;
    
    // Update state
    setSelectedAsset(newAsset);
    
    // Directly update URL when asset is changed
    const isEarnPage = window.location.pathname === '/earn';
    
    if (isEarnPage) {
      // Flag that we're about to change the URL so we should ignore the next hash change
      ignoreNextHashChange.current = true;
      
      // Use proper URL format with widget parameter for dialogs
      const currentUrl = new URL(window.location.href);
      
      // Check if we're in a dialog
      if (isInDialog() || currentUrl.hash.includes('widget=')) {
        // Keep the widget parameter in the URL
        if (currentUrl.hash.includes('widget=earn-stake')) {
          // Just update the asset part
          const newHash = currentUrl.hash.replace(/asset=[^&]*/, `asset=${newAsset}`);
          if (!newHash.includes('asset=')) {
            // Add asset parameter if it doesn't exist
            console.log('🔄 Adding asset parameter to URL:', newAsset);
            history.replaceState(null, '', `${window.location.pathname}${newHash}&asset=${newAsset}`);
          } else {
            // Just update the existing asset parameter
            console.log('🔄 Updating existing asset parameter in URL:', newAsset);
            history.replaceState(null, '', `${window.location.pathname}${newHash}`);
          }
        } else {
          // Set proper URL format
          console.log('🔄 Setting full widget URL format with asset:', newAsset);
          history.replaceState(null, '', `${window.location.pathname}#widget=earn-stake&asset=${newAsset}`);
        }
      } else {
        // Outside dialog, use simple format
        console.log('🔄 Setting simple asset URL format:', newAsset);
        history.replaceState(null, '', `${window.location.pathname}#asset=${newAsset}`);
      }
    } else {
      // Not on earn page, use updateUrlWithAsset
      updateUrlWithAsset(newAsset);
    }
    
    // Also ensure this is saved to session storage to make it persistent
    sessionStorage.setItem('selected_stake_asset', newAsset);
    
    // Reset the user change flag after a delay to allow future URL-based updates
    setTimeout(() => {
      isUserChange.current = false;
    }, 500);
  };
  
  // Update URL when selected asset changes - but only when not on earn page directly or we're in a dialog
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isEarnPage = window.location.pathname === '/earn';
    const isInDialogNow = inDialogRef.current;
    
    // When on earn page and in dialog, always keep URL updated with correct asset
    if (isEarnPage && isInDialogNow) {
      // Skip URL update if this change came from URL itself to avoid loops
      if (!isUserChange.current) {
        const currentUrl = new URL(window.location.href);
        const currentUrlAsset = currentUrl.hash.match(/asset=([^&]*)/)?.[1];
        
        // Only update if the URL doesn't already have the correct asset
        if (currentUrlAsset !== selectedAsset) {
          console.log('🔄 Updating URL to match current asset state:', selectedAsset);
          
          // Flag that we're about to change the URL
          ignoreNextHashChange.current = true;
          
          // Use proper URL format with widget parameter
          window.history.replaceState(
            null, 
            '', 
            `${window.location.pathname}#widget=earn-stake&asset=${selectedAsset}`
          );
        }
      }
    } else if (!isEarnPage) {
      // Not on earn page, use updateUrlWithAsset
      updateUrlWithAsset(selectedAsset);
    }
  }, [selectedAsset]);

  // Handle asset change from URL directly - but only if not from our own URL updates
  useEffect(() => {
    const handleHashChange = () => {
      // Skip if this hash change was caused by our own URL updates
      if (ignoreNextHashChange.current) {
        console.log('⏭️ Ignoring hash change as it was triggered by us');
        ignoreNextHashChange.current = false;
        return;
      }
      
      // Skip if the user is currently changing the asset
      if (isUserChange.current) {
        console.log('⏭️ Ignoring hash change as user is currently selecting asset');
        return;
      }
      
      const assetFromUrl = getAssetFromUrl();
      if (assetFromUrl && assetFromUrl !== selectedAsset) {
        console.log('📱 StakeView detected external hash change with new asset:', assetFromUrl);
        setSelectedAsset(assetFromUrl);
        
        // Also store in session storage for persistence
        sessionStorage.setItem('selected_stake_asset', assetFromUrl);
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
  
  // Get estimated earnings and modifiers for all time frames
  const estimatedEarningsWithModifiers = useMemo(() => {
    const currentApy = apyHistoryData[apyHistoryData.length - 1].apy;
    const annual = (stakeAmount * currentApy) / 100;
    
    // Safety function to prevent extreme values
    const safeEarnings = (value: number) => {
      // Ensure returned value is a reasonable number for display
      if (!isFinite(value) || isNaN(value)) return "0.00";
      // Cap at 10,000 for display purposes
      const cappedValue = Math.min(value, 10000);
      if (cappedValue >= 100) return cappedValue.toFixed(2);
      if (cappedValue >= 10) return cappedValue.toFixed(2);
      return cappedValue.toFixed(2);
    };
    
    // Time frame modifiers (realistic multipliers that would apply for different durations)
    const modifiers = {
      "1m": { factor: 0.75, label: "-25%" },  // Lower APY for 1 month lockup
      "3m": { factor: 0.9, label: "-10%" },   // Slightly lower for 3 month lockup
      "6m": { factor: 1.0, label: "BASE" },   // Base rate for 6 month lockup
      "1y": { factor: 1.15, label: "+15%" },  // Bonus for 1 year lockup
      "2y": { factor: 1.25, label: "+25%" }   // Maximum bonus for 2 year lockup
    };
    
    // Calculate earnings for each time frame
    return {
      "1m": {
        earnings: safeEarnings((annual / 12) * modifiers["1m"].factor),
        modifier: modifiers["1m"].label
      },
      "3m": {
        earnings: safeEarnings((annual / 4) * modifiers["3m"].factor),
        modifier: modifiers["3m"].label
      },
      "6m": {
        earnings: safeEarnings((annual / 2) * modifiers["6m"].factor),
        modifier: modifiers["6m"].label
      },
      "1y": {
        earnings: safeEarnings(annual * modifiers["1y"].factor),
        modifier: modifiers["1y"].label
      },
      "2y": {
        earnings: safeEarnings(annual * 2 * modifiers["2y"].factor), // 2 years
        modifier: modifiers["2y"].label
      }
    };
  }, [stakeAmount, apyHistoryData]);
  
  // Handle time frame changes
  const handleTimeFrameChange = (value: string) => {
    setSelectedTimeFrame(value);
  };

  // Handle earn button click
  const handleEarnButtonClick = (asset: string, earnings: string, timeFrame: string) => {
    console.log('📊 Earn button clicked:', asset, earnings, timeFrame);
    
    // Check if we're already in a dialog
    if (document.body.classList.contains('widget-dialog-open')) {
      // We're already in a dialog, so we should push confirmation content
      console.log('📊 Already in dialog, pushing confirmation content');
      
      // Import the dialog content service
      import('@/lib/dialogContentService').then(({ pushDialogContent }) => {
        // Push the confirmation content
        pushDialogContent('earn-stake', 'earn-confirmation', {
          asset,
          amount: stakeAmount,
          timeFrame,
          estimatedEarnings: earnings
        });
      });
    } else {
      // We're not in a dialog, so we need to open one with the confirmation content
      console.log('📊 Not in dialog, opening dialog with confirmation content');
      
      // Create custom event to open dialog with initial confirmation content
      const event = new CustomEvent('open-widget-dialog', {
        detail: {
          widgetId: 'earn-stake',
          asset,
          forceOpen: true,
          eventId: `earn-stake-${Date.now()}`,
          initialContent: 'earn-confirmation',
          contentData: {
            asset,
            amount: stakeAmount,
            timeFrame,
            estimatedEarnings: earnings
          }
        }
      });
      
      // Dispatch the event to open the dialog
      document.dispatchEvent(event);
    }
  };

  // Add a development test helper
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('./TestStakingInit').then(({ TestStakingInit }) => {
        // Add the test component to the DOM for development
        const testContainer = document.createElement('div');
        testContainer.style.position = 'fixed';
        testContainer.style.bottom = '20px';
        testContainer.style.right = '20px';
        testContainer.style.zIndex = '9999';
        document.body.appendChild(testContainer);
        
        // Render the test component
        import('react-dom/client').then(({ createRoot }) => {
          const root = createRoot(testContainer);
          root.render(<TestStakingInit />);
        });
      }).catch(error => {
        console.error('Failed to load test helper:', error);
      });
    }
    
    // Cleanup function for development only
    return () => {
      if (process.env.NODE_ENV === 'development') {
        // Find and remove the test container
        const testContainer = document.querySelector('#staking-test-helper');
        if (testContainer) testContainer.remove();
      }
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col overflow-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        {/* Left column - Chart (order-2 makes it appear second on mobile) */}
        <Card className={cn(
          "flex flex-col order-2 lg:order-1 h-full lg:col-span-2",
          "border-[hsl(var(--color-widget-inset-border))]"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estimated Earnings on <AssetButtonWithPrice asset={selectedAsset as AssetTicker} /></CardTitle>
            <div className="text-emerald-500 text-2xl font-semibold">
              {estimatedEarningsWithModifiers[selectedTimeFrame as keyof typeof estimatedEarningsWithModifiers].earnings} <AssetIcon asset={selectedAsset as AssetTicker} iconPosition="after" iconSize="large" />
            </div>
          </CardHeader>
          <CardContent className="flex-1 h-full">
            <style>{`
              /* Chart theme compatibility styles */
              .recharts-wrapper .recharts-cartesian-axis-tick text {
                fill: hsl(var(--muted-foreground));
              }
              
              .recharts-cartesian-grid-horizontal line,
              .recharts-cartesian-grid-vertical line {
                stroke: hsl(var(--border));
              }
              
              .recharts-active-dot {
                stroke: hsl(var(--background));
              }
              
              /* Style for the highlight line */
              .recharts-line-selected path {
                stroke: hsl(142.1 76.2% 36.3%);
                stroke-width: 3;
              }
            `}</style>
            
            <ChartContainer
              config={{ earnings: { label: 'Earnings', color: 'hsl(var(--primary))' } }}
              className="h-full w-full"
            >
              <LineChart
                data={[
                  {
                    timeFrame: "1m",
                    label: "1 Month",
                    earnings: parseFloat(estimatedEarningsWithModifiers["1m"].earnings),
                    isSelected: selectedTimeFrame === "1m"
                  },
                  {
                    timeFrame: "3m",
                    label: "3 Months",
                    earnings: parseFloat(estimatedEarningsWithModifiers["3m"].earnings),
                    isSelected: selectedTimeFrame === "3m"
                  },
                  {
                    timeFrame: "6m",
                    label: "6 Months",
                    earnings: parseFloat(estimatedEarningsWithModifiers["6m"].earnings),
                    isSelected: selectedTimeFrame === "6m"
                  },
                  {
                    timeFrame: "1y",
                    label: "1 Year",
                    earnings: parseFloat(estimatedEarningsWithModifiers["1y"].earnings),
                    isSelected: selectedTimeFrame === "1y"
                  },
                  {
                    timeFrame: "2y",
                    label: "2 Years",
                    earnings: parseFloat(estimatedEarningsWithModifiers["2y"].earnings),
                    isSelected: selectedTimeFrame === "2y"
                  }
                ]}
                margin={{ left: 0, right: 20, top: 10, bottom: 0 }}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const payload = data.activePayload[0].payload;
                    if (payload && payload.timeFrame) {
                      handleTimeFrameChange(payload.timeFrame);
                    }
                  }
                }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false}
                  stroke="hsl(var(--color-border-muted))"
                />
                <XAxis 
                  dataKey="label" 
                  tickLine={false}
                  stroke="hsl(var(--color-border-muted))"
                  tick={(props) => {
                    const { x, y, payload } = props;
                    
                    // Define the order of time frames for comparison
                    const timeFrameOrder = ["1 Month", "3 Months", "6 Months", "1 Year", "2 Years"];
                    const selectedTimeLabel = selectedTimeFrame === "1m" ? "1 Month" :
                                              selectedTimeFrame === "3m" ? "3 Months" :
                                              selectedTimeFrame === "6m" ? "6 Months" :
                                              selectedTimeFrame === "1y" ? "1 Year" : "2 Years";
                    
                    // Check if this label is before or equal to the selected time frame
                    const currentIndex = timeFrameOrder.indexOf(payload.value);
                    const selectedIndex = timeFrameOrder.indexOf(selectedTimeLabel);
                    const shouldHighlight = currentIndex <= selectedIndex;
                    
                    // Apply styles directly with !important to override global CSS
                    const style = {
                      fill: shouldHighlight ? "hsl(142.1 76.2% 36.3%)" : "hsl(var(--foreground))",
                      fontWeight: shouldHighlight ? 600 : 400,
                    };
                    
                    return (
                      <g style={{ fontFamily: 'inherit' }}>
                        <text 
                          x={x} 
                          y={y + 10} 
                          textAnchor="middle" 
                          fontSize="12px"
                          style={style}
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 'auto']}
                  minTickGap={20}
                  allowDecimals={true}
                  tickCount={5}
                  tickFormatter={(value) => {
                    // Hide the bottom label (0)
                    if (value === 0 || value < 0.01) return '';
                    
                    // Ensure value is a reasonable number to display
                    if (!isFinite(value) || isNaN(value)) return '';
                    if (value > 10000) return `${Math.round(value / 1000)}k ${selectedAsset}`;
                    if (value >= 100) return `${value.toFixed(0)} ${selectedAsset}`;
                    if (value >= 10) return `${value.toFixed(1)} ${selectedAsset}`;
                    return `${value.toFixed(2)} ${selectedAsset}`;
                  }}
                />
                
                {/* Base line showing all data points */}
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="hsl(var(--color-widget-inset-border))"
                  strokeWidth={2}
                  className="recharts-line-earnings"
                  connectNulls={false}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    
                    // Don't show dots for points that will be covered by the highlighted line
                    const timeFrameOrder = ["1m", "3m", "6m", "1y", "2y"];
                    const currentIndex = timeFrameOrder.indexOf(payload.timeFrame);
                    const selectedIndex = timeFrameOrder.indexOf(selectedTimeFrame);
                    
                    if (currentIndex <= selectedIndex) {
                      return <circle cx={cx} cy={cy} r={0} fill="transparent" />;
                    }
                    
                    return (
                      <circle cx={cx} cy={cy} r={4} fill="hsl(var(--primary))" />
                    );
                  }}
                  activeDot={false}
                />
                
                {/* Highlighted line for selected timeframe */}
                <Line
                  type="monotone"
                  className="recharts-line-selected"
                  dataKey="earnings"
                  stroke="hsl(142.1 76.2% 36.3%)" // Emerald-500 color
                  strokeWidth={3}
                  isAnimationActive={false} // Avoid scale changes during animation
                  connectNulls={true}
                  dot={(props) => {
                    if (!props.cx || !props.cy) return <circle cx={0} cy={0} r={0} fill="transparent" />;
                    
                    const { cx, cy, payload } = props;
                    
                    // Handle potentially undefined data
                    if (!payload || !payload.timeFrame) {
                      return <circle cx={cx} cy={cy} r={0} fill="transparent" />;
                    }
                    
                    // Only show dots for points up to the selected timeframe
                    const timeFrameOrder = ["1m", "3m", "6m", "1y", "2y"];
                    const currentIndex = timeFrameOrder.indexOf(payload.timeFrame);
                    const selectedIndex = timeFrameOrder.indexOf(selectedTimeFrame);
                    
                    if (currentIndex > selectedIndex) {
                      return <circle cx={cx} cy={cy} r={0} fill="transparent" />;
                    }
                    
                    // Selected dot is bigger
                    if (payload.isSelected) {
                      return (
                        <circle cx={cx} cy={cy} r={6} fill="hsl(142.1 76.2% 36.3%)" />
                      );
                    }
                    
                    return (
                      <circle cx={cx} cy={cy} r={4} fill="hsl(142.1 76.2% 36.3%)" />
                    );
                  }}
                  activeDot={{
                    r: 8,
                    fill: "hsl(142.1 76.2% 36.3%)",
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2
                  }}
                  // Use clipPath to limit the rendered line up to selected timeframe
                  style={{
                    clipPath: `polygon(
                      -5% -5%, 
                      ${selectedTimeFrame === "1m" ? 0 : 
                         selectedTimeFrame === "3m" ? 25 :
                         selectedTimeFrame === "6m" ? 50 :
                         selectedTimeFrame === "1y" ? 75 : 100}% -5%,
                      ${selectedTimeFrame === "1m" ? 0 : 
                         selectedTimeFrame === "3m" ? 25 :
                         selectedTimeFrame === "6m" ? 50 :
                         selectedTimeFrame === "1y" ? 75 : 100}% 105%,
                      -5% 105%
                    )`
                  }}
                />
                
                <ChartTooltip 
                  cursor={{
                    stroke: 'hsl(142.1 76.2% 36.3%)',
                    strokeWidth: 1,
                    strokeDasharray: '3 3'
                  }}
                  content={(props) => {
                    const { active, payload, label } = props || {};
                    if (active && payload && payload.length) {
                      return (
                        <div className="p-2 rounded-md shadow-md border text-sm" 
                          style={{
                            backgroundColor: 'hsl(var(--background))', 
                            borderColor: 'hsl(var(--border))',
                            color: 'hsl(var(--foreground))'
                          }}
                        >
                          <p className="font-medium mb-1">Time Frame: {label}</p>
                          <p className="font-semibold" style={{ color: 'hsl(142.1 76.2% 36.3%)' }}>
                            {payload[0].value} {selectedAsset}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        {/* Right column - Asset selection and amount (order-1 makes it appear first on mobile) */}
        <div className="space-y-6 order-1 lg:order-2 flex flex-col">
          <div className="flex gap-4">
            <div className="w-1/3 flex flex-col gap-2">
              <label className="text-sm font-medium">Select Asset</label>
              <Select
                value={selectedAsset}
                onValueChange={handleAssetChange}
              >
                <SelectTrigger className={cn(
                  "w-full", 
                  "border-[hsl(var(--color-widget-inset-border))]"
                )}>
                  <SelectValue>{selectedAsset}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stakingTokens.map(token => (
                    <SelectItem key={token} value={token}>{token}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm font-medium">Stake Amount</label>
              <div className="relative">
                <Input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                      setStakeAmount(value);
                      setSliderValue(Math.min(100, Math.round((value / 1000) * 100)));
                    }
                  }}
                  min="0"
                  className={cn(
                    "pr-12",
                    "border-[hsl(var(--color-widget-inset-border))]"
                  )}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium">
                  {selectedAsset}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium pb-2">Adjust Amount</label>
              <span className="text-xs text-muted-foreground">{sliderValue}%</span>
            </div>
            <Slider
              value={[sliderValue]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => {
                const newValue = value[0];
                setSliderValue(newValue);
                // Update stake amount based on slider (max 1000)
                setStakeAmount(Math.round((newValue / 100) * 1000));
              }}
              className={cn("my-4", "border-[hsl(var(--color-widget-inset-border))]")}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 {selectedAsset}</span>
              <span>1000 {selectedAsset}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium pb-2">Time Frame</label>
            <Tabs value={selectedTimeFrame} onValueChange={handleTimeFrameChange} className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="1m">1M</TabsTrigger>
                <TabsTrigger value="3m">3M</TabsTrigger>
                <TabsTrigger value="6m">6M</TabsTrigger>
                <TabsTrigger value="1y">1Y</TabsTrigger>
                <TabsTrigger value="2y">2Y</TabsTrigger>
              </TabsList>
              <TabsContent value="1m" />
              <TabsContent value="3m" />
              <TabsContent value="6m" />
              <TabsContent value="1y" />
              <TabsContent value="2y" />
            </Tabs>
          </div>
          
          <Button 
            className={cn("w-full mb-4 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30")}
            variant="default"
            size="lg"
            onClick={() => handleEarnButtonClick(selectedAsset, estimatedEarningsWithModifiers[selectedTimeFrame as keyof typeof estimatedEarningsWithModifiers].earnings, selectedTimeFrame)}
          >
            <AssetIcon asset={selectedAsset as AssetTicker} iconPosition="before" showText={false} /> Earn {estimatedEarningsWithModifiers[selectedTimeFrame as keyof typeof estimatedEarningsWithModifiers].earnings} {selectedAsset} over {
              selectedTimeFrame === "1m" ? "1 Month" :
              selectedTimeFrame === "3m" ? "3 Months" :
              selectedTimeFrame === "6m" ? "6 Months" :
              selectedTimeFrame === "1y" ? "1 Year" :
              "2 Years"
            }
          </Button>

          <Card className={cn(
            "border-[hsl(var(--color-widget-inset-border))]",
            "flex-grow"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium pb-2">Estimated Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time Frame</TableHead>
                    <TableHead>Modifier</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Table rows for different time frames */}
                  <TableRow 
                    className={selectedTimeFrame === "1m" ? "bg-accent/40" : ""} 
                    onClick={() => handleTimeFrameChange("1m")}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell className="font-medium">1 Month</TableCell>
                    <TableCell className="text-muted-foreground">{estimatedEarningsWithModifiers["1m"].modifier}</TableCell>
                    <TableCell className={cn(
                      "text-right",
                      selectedTimeFrame === "1m" ? "text-emerald-500 font-medium" : ""
                    )}>
                      {estimatedEarningsWithModifiers["1m"].earnings} <AssetIcon asset={selectedAsset as AssetTicker} iconPosition="after" />
                    </TableCell>
                  </TableRow>
                  <TableRow 
                    className={selectedTimeFrame === "3m" ? "bg-accent/40" : ""} 
                    onClick={() => handleTimeFrameChange("3m")}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell className="font-medium">3 Months</TableCell>
                    <TableCell className="text-muted-foreground">{estimatedEarningsWithModifiers["3m"].modifier}</TableCell>
                    <TableCell className={cn(
                      "text-right",
                      selectedTimeFrame === "3m" ? "text-emerald-500 font-medium" : ""
                    )}>
                      {estimatedEarningsWithModifiers["3m"].earnings} <AssetIcon asset={selectedAsset as AssetTicker} iconPosition="after" />
                    </TableCell>
                  </TableRow>
                  <TableRow 
                    className={selectedTimeFrame === "6m" ? "bg-accent/40" : ""} 
                    onClick={() => handleTimeFrameChange("6m")}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell className="font-medium">6 Months</TableCell>
                    <TableCell className="text-muted-foreground">{estimatedEarningsWithModifiers["6m"].modifier}</TableCell>
                    <TableCell className={cn(
                      "text-right",
                      selectedTimeFrame === "6m" ? "text-emerald-500 font-medium" : ""
                    )}>
                      {estimatedEarningsWithModifiers["6m"].earnings} <AssetIcon asset={selectedAsset as AssetTicker} iconPosition="after" />
                    </TableCell>
                  </TableRow>
                  <TableRow 
                    className={selectedTimeFrame === "1y" ? "bg-accent/40" : ""} 
                    onClick={() => handleTimeFrameChange("1y")}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell className="font-medium">1 Year</TableCell>
                    <TableCell className="text-muted-foreground">{estimatedEarningsWithModifiers["1y"].modifier}</TableCell>
                    <TableCell className={cn(
                      "text-right",
                      selectedTimeFrame === "1y" ? "text-emerald-500 font-medium" : ""
                    )}>
                      {estimatedEarningsWithModifiers["1y"].earnings} <AssetIcon asset={selectedAsset as AssetTicker} iconPosition="after" />
                    </TableCell>
                  </TableRow>
                  <TableRow 
                    className={selectedTimeFrame === "2y" ? "bg-accent/40" : ""} 
                    onClick={() => handleTimeFrameChange("2y")}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell className="font-medium">2 Years</TableCell>
                    <TableCell className="text-muted-foreground">{estimatedEarningsWithModifiers["2y"].modifier}</TableCell>
                    <TableCell className={cn(
                      "text-right",
                      selectedTimeFrame === "2y" ? "text-emerald-500 font-medium" : ""
                    )}>
                      {estimatedEarningsWithModifiers["2y"].earnings} <AssetIcon asset={selectedAsset as AssetTicker} iconPosition="after" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StakeView; 