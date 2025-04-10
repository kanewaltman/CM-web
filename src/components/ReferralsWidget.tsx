import React, { useEffect, useState, useCallback, useRef } from 'react';
import { WidgetContainer } from './WidgetContainer';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ReferralsWidgetState, widgetStateRegistry, createDefaultReferralsWidgetState } from '@/lib/widgetState';
import { DASHBOARD_LAYOUT_KEY } from '@/types/widgets';

// Magic UI components
import { WarpBackground } from './magicui/warp-background';
import { FlickeringGrid } from './magicui/flickering-grid';
import { AnimatedGridPattern } from './magicui/animated-grid-pattern';
import { Ripple } from './magicui/ripple';
import { DotPattern } from './magicui/dot-pattern';
import { ShimmerButton } from './magicui/shimmer-button';

// Define view modes for the Referrals widget
export type ReferralsViewMode = 'warp' | 'flickering' | 'grid' | 'ripple' | 'dots';

// View mode labels for dropdown
const viewLabels: Record<ReferralsViewMode, string> = {
  'warp': 'Warp Background',
  'flickering': 'Flickering Grid',
  'grid': 'Animated Grid',
  'ripple': 'Ripple Effect',
  'dots': 'Dot Pattern'
};

export interface ReferralsWidgetProps {
  widgetId: string;
  className?: string;
  onRemove?: () => void;
  defaultViewMode?: ReferralsViewMode;
  onViewModeChange?: (mode: ReferralsViewMode) => void;
}

export const ReferralsWrapper: React.FC<ReferralsWidgetProps> = (props) => {
  const { resolvedTheme } = useTheme();
  const [forcedTheme, setForcedTheme] = useState<'light' | 'dark' | undefined>(undefined);
  
  // Track initialization to prevent unnecessary resets
  const isInitialized = useRef(false);
  // Add a loading state to prevent premature synchronization
  const [isLoading, setIsLoading] = useState(true);

  // Add a safety timeout to prevent loading state from getting stuck
  useEffect(() => {
    // Always reset loading state after max 2 seconds no matter what
    const safetyTimer = setTimeout(() => {
      if (isLoading) {
        console.log("⚠️ Safety timeout triggered - forcing loading state to false");
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

  // Validate an incoming view mode to ensure it's a valid referrals mode
  const validateReferralsViewMode = useCallback((mode: string): ReferralsViewMode => {
    const validModes = Object.keys(viewLabels);
    
    if (validModes.includes(mode)) {
      return mode as ReferralsViewMode;
    }
    
    // Handle performance widget modes that can cause invalid states
    if (mode === 'split' || mode === 'cumulative' || mode === 'combined') {
      console.warn(`Invalid performance view mode "${mode}" rejected for referrals widget - using default`);
      return props.defaultViewMode || 'warp';
    }
    
    // For any other invalid mode
    console.warn(`Unknown view mode "${mode}" rejected for referrals widget - using default`);
    return props.defaultViewMode || 'warp';
  }, [props.defaultViewMode]);

  // Get or create widget state
  const widgetState = React.useMemo(() => {
    // If we're already initialized, just return the existing state to prevent refresh issues
    let state = widgetStateRegistry.get(props.widgetId) as ReferralsWidgetState;
    
    if (!state) {
      console.log(`Creating new ReferralsWidgetState for ${props.widgetId}`);
      // Try to restore view mode from localStorage
      let initialViewMode: ReferralsViewMode = props.defaultViewMode || 'warp';
      
      try {
        // PRIORITY 1: First check widget-specific key (highest priority)
        const storedWidgetMode = localStorage.getItem(`widget_${props.widgetId}_view_mode`);
        if (storedWidgetMode && Object.keys(viewLabels).includes(storedWidgetMode)) {
          initialViewMode = storedWidgetMode as ReferralsViewMode;
          console.log(`Priority 1: Using view mode from widget-specific key: ${initialViewMode}`);
        } 
        // PRIORITY 2: Check generic key if widget-specific not found
        else {
          const storedMode = localStorage.getItem('referrals_widget_view_mode');
          if (storedMode && Object.keys(viewLabels).includes(storedMode)) {
            initialViewMode = storedMode as ReferralsViewMode;
            console.log(`Priority 2: Using view mode from generic key: ${initialViewMode}`);
          }
          // PRIORITY 3: Only use layout if no localStorage keys found
          else {
            const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
            if (savedLayout) {
              const layout = JSON.parse(savedLayout);
              const widgetData = layout.find((item: any) => item.id === props.widgetId);
              
              // Valid referral view modes
              const validModes = Object.keys(viewLabels);
              
              // Check for the referral-specific view mode first
              if (widgetData?.viewState?.referralViewMode && validModes.includes(widgetData.viewState.referralViewMode)) {
                initialViewMode = widgetData.viewState.referralViewMode as ReferralsViewMode;
                console.log(`Priority 3: Using referral-specific view mode from layout: ${initialViewMode}`);
              } 
              // Then check the generic viewMode if it's valid for referrals
              else if (widgetData?.viewState?.viewMode && validModes.includes(widgetData.viewState.viewMode)) {
                initialViewMode = widgetData.viewState.viewMode as ReferralsViewMode;
                console.log(`Priority 3: Using generic view mode from layout: ${initialViewMode}`);
              }
              // Handle performance widget view modes gracefully
              else if (widgetData?.viewState?.viewMode === 'split' || 
                      widgetData?.viewState?.viewMode === 'cumulative' || 
                      widgetData?.viewState?.viewMode === 'combined') {
                console.warn(`Ignoring performance widget view mode "${widgetData.viewState.viewMode}" for referral widget`);
                // Keep default view mode
              }
            }
          }
        }
        
        // Final validation to ensure we have a valid view mode
        if (!Object.keys(viewLabels).includes(initialViewMode)) {
          console.warn(`Invalid view mode detected: ${initialViewMode}, using default 'warp' instead`);
          initialViewMode = 'warp';
        }
      } catch (error) {
        console.error('Error retrieving view mode from localStorage:', error);
      }
      
      state = createDefaultReferralsWidgetState(initialViewMode, props.widgetId);
      widgetStateRegistry.set(props.widgetId, state);
      
      // Always sync the widget's true view mode back to layout to ensure consistency
      setTimeout(() => {
        if (state && state.viewMode) {
          console.log(`Ensuring layout consistency with actual widget mode: ${state.viewMode}`);
          setIsLoading(false); // Mark loading as complete before synchronizing
          synchronizeViewModeToLayout(state.viewMode, props.widgetId);
        }
      }, 100);
    } else {
      // State exists, check if we should update it from localStorage
      try {
        // First check widget-specific localStorage key (highest priority)
        const storedWidgetMode = localStorage.getItem(`widget_${props.widgetId}_view_mode`);
        if (storedWidgetMode && Object.keys(viewLabels).includes(storedWidgetMode)) {
          const savedMode = storedWidgetMode as ReferralsViewMode;
          if (savedMode !== state.viewMode) {
            console.log(`Updating existing widget state with stored view mode (priority source): ${savedMode}`);
            state.setViewMode(savedMode);
          }
        }
        // Then check layout only if widget-specific key wasn't found
        else {
          const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
          if (savedLayout) {
            const layout = JSON.parse(savedLayout);
            const widgetData = layout.find((item: any) => item.id === props.widgetId);
            const validModes = Object.keys(viewLabels);
            let viewModeFound = false;
            
            // Check for referral-specific view mode first
            if (widgetData?.viewState?.referralViewMode && validModes.includes(widgetData.viewState.referralViewMode)) {
              const layoutMode = widgetData.viewState.referralViewMode as ReferralsViewMode;
              if (layoutMode !== state.viewMode) {
                console.log(`Updating widget state with layout referralViewMode (secondary source): ${layoutMode}`);
                state.setViewMode(layoutMode);
                viewModeFound = true;
              }
            }
            // Then check generic viewMode
            else if (!viewModeFound && widgetData?.viewState?.viewMode && validModes.includes(widgetData.viewState.viewMode)) {
              const layoutMode = widgetData.viewState.viewMode as ReferralsViewMode;
              if (layoutMode !== state.viewMode) {
                console.log(`Updating widget state with layout viewMode (tertiary source): ${layoutMode}`);
                state.setViewMode(layoutMode);
              }
            }
          }
        }
        
        // Final validation to ensure the widget state has a valid view mode
        if (!Object.keys(viewLabels).includes(state.viewMode)) {
          console.warn(`Invalid view mode detected in existing widget state: ${state.viewMode}, resetting to last known good mode`);
          // Try to find the last known good mode from widget-specific key
          const storedWidgetMode = localStorage.getItem(`widget_${props.widgetId}_view_mode`);
          if (storedWidgetMode && Object.keys(viewLabels).includes(storedWidgetMode)) {
            state.setViewMode(storedWidgetMode as ReferralsViewMode);
          } else {
            state.setViewMode('warp');
          }
        }
        
        // Always sync the widget's true view mode back to layout to ensure consistency
        setTimeout(() => {
          if (state && state.viewMode) {
            console.log(`Ensuring layout consistency with actual widget mode: ${state.viewMode}`);
            setIsLoading(false); // Mark loading as complete before synchronizing
            synchronizeViewModeToLayout(state.viewMode, props.widgetId);
          }
        }, 100);
      } catch (error) {
        console.error('Error checking stored view mode for existing state:', error);
        setIsLoading(false); // Ensure we mark loading as complete even if there's an error
      }
    }
    
    isInitialized.current = true;
    return state;
  }, [props.widgetId, props.defaultViewMode, validateReferralsViewMode]);

  // Ensure loading state is properly reset after initialization
  useEffect(() => {
    // If widgetState is available, ensure we're not stuck in loading state
    if (widgetState) {
      console.log("🔄 Ensuring loading state is reset");
      // Short timeout to allow other initialization processes to complete
      setTimeout(() => {
        if (isLoading) {
          console.log("🔄 Forcing loading state to false");
          setIsLoading(false);
        }
      }, 300);
    }
  }, [widgetState, isLoading]);

  // Use state from widget state
  const [viewMode, setViewMode] = useState<ReferralsViewMode>(() => {
    // Validate the initial view mode to prevent invalid states
    return validateReferralsViewMode(widgetState.viewMode);
  });

  // Subscribe to widget state changes
  useEffect(() => {
    return widgetState.subscribe(() => {
      // Validate view mode before updating component state
      const validatedMode = validateReferralsViewMode(widgetState.viewMode);
      setViewMode(validatedMode);
    });
  }, [widgetState, validateReferralsViewMode]);
  
  // Fix for refresh issue - explicitly check localStorage at mount time
  useEffect(() => {
    // This effect runs only once when component mounts
    const storedWidgetMode = localStorage.getItem(`widget_${props.widgetId}_view_mode`);
    
    if (storedWidgetMode && Object.keys(viewLabels).includes(storedWidgetMode) && 
        storedWidgetMode !== widgetState.viewMode) {
      console.log(`📌 REFRESH FIX: Found mismatch between localStorage (${storedWidgetMode}) and state (${widgetState.viewMode})`);
      console.log(`📌 REFRESH FIX: Forcing update to localStorage value: ${storedWidgetMode}`);
      
      // Force update to the localStorage value
      widgetState.setViewMode(storedWidgetMode as ReferralsViewMode);
      
      // Also ensure registry is updated
      if (widgetStateRegistry.has(props.widgetId)) {
        const registryState = widgetStateRegistry.get(props.widgetId) as ReferralsWidgetState;
        registryState.setViewMode(storedWidgetMode as ReferralsViewMode);
      }
      
      // Update component state
      setViewMode(storedWidgetMode as ReferralsViewMode);
      
      // Wait for loading to complete, then synchronize
      setTimeout(() => {
        setIsLoading(false);
        synchronizeViewModeToLayout(storedWidgetMode as ReferralsViewMode, props.widgetId);
      }, 100);
    }
  }, [props.widgetId]);

  // Validate view mode when component mounts
  useEffect(() => {
    // Safety check to ensure viewMode is valid on mount
    if (!Object.keys(viewLabels).includes(viewMode)) {
      console.warn(`Invalid view mode detected on mount: ${viewMode}, resetting to 'warp'`);
      handleViewModeChange('warp');
    }
  }, []);
  
  // Helper function to synchronize the current view mode to the layout
  const synchronizeViewModeToLayout = useCallback((viewMode: ReferralsViewMode, widgetId: string = props.widgetId) => {
    console.log(`ReferralsWrapper: Synchronizing ${viewMode} to layout`);
    try {
      const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
      if (savedLayout) {
        console.log(`ReferralsWrapper: Updating layout in localStorage`);
        const layout = JSON.parse(savedLayout);
        const widgetIndex = layout.findIndex((item: any) => item.id === widgetId);
        
        if (widgetIndex !== -1) {
          console.log(`ReferralsWrapper: Found widget at index ${widgetIndex} in layout`);
          
          // Create or update the viewState property to include our view mode
          const currentViewState = layout[widgetIndex].viewState || {};
          layout[widgetIndex] = {
            ...layout[widgetIndex],
            viewState: {
              ...currentViewState,
              // Save both for maximum compatibility and persistence
              referralViewMode: viewMode,
              viewMode: viewMode
            }
          };
          
          // Save the updated layout back to localStorage
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
          console.log(`ReferralsWrapper: Layout updated with view mode ${viewMode}`);
          
          // Also update the widget-specific storage to ensure consistency
          localStorage.setItem(`widget_${widgetId}_view_mode`, viewMode);
        } else {
          console.warn(`ReferralsWrapper: Widget not found in layout`);
        }
      } else {
        console.log(`ReferralsWrapper: No saved layout found in localStorage`);
        
        // Fallback - ensure widget-specific localStorage key is at least set
        localStorage.setItem(`widget_${widgetId}_view_mode`, viewMode);
      }
    } catch (error) {
      console.error('Failed to synchronize view mode to layout:', error);
      // Fallback - ensure widget-specific localStorage key is at least set
      localStorage.setItem(`widget_${widgetId}_view_mode`, viewMode);
    }
  }, [props.widgetId]);

  // Listen for widget resize events and sync the state to layout
  useEffect(() => {
    const syncLayoutAfterResize = () => {
      // Ensure view mode is saved to layout after resize stops
      if (widgetState && widgetState.viewMode) {
        // Force update both the layout and widget-specific localStorage key
        localStorage.setItem(`widget_${props.widgetId}_view_mode`, widgetState.viewMode);
        synchronizeViewModeToLayout(widgetState.viewMode, props.widgetId);
        
        // Also update GridStack's internal widget state registry for consistency
        if (widgetStateRegistry.has(props.widgetId)) {
          const registryState = widgetStateRegistry.get(props.widgetId) as ReferralsWidgetState;
          if (registryState && registryState.viewMode !== widgetState.viewMode) {
            console.log(`Ensuring widget registry state is up to date: ${widgetState.viewMode}`);
            registryState.setViewMode(widgetState.viewMode);
          }
        }
      }
    };

    // Debounced resize handler
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      // Use a longer timeout for better stability
      resizeTimer = setTimeout(syncLayoutAfterResize, 300);
    };

    // Track GridStack resize events specifically for widget resizing
    const handleGridStackResize = (event: Event) => {
      if (event.target && (event.target as Element).closest('.grid-stack-item')) {
        handleResize();
      }
    };

    window.addEventListener('resize', handleResize);
    // Add specific listener for GridStack resize events
    document.addEventListener('resize', handleGridStackResize, true);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('resize', handleGridStackResize, true);
      clearTimeout(resizeTimer);
    };
  }, [props.widgetId, widgetState, synchronizeViewModeToLayout]);
  
  // Ensure the view mode is synchronized with layout when component mounts
  useEffect(() => {
    // Sync current mode to layout when component is fully initialized and not loading
    if (isInitialized.current && !isLoading && widgetState && widgetState.viewMode) {
      console.log(`ReferralsWrapper: Component mounted, syncing mode ${widgetState.viewMode} to layout`);
      synchronizeViewModeToLayout(widgetState.viewMode, props.widgetId);
    }
  }, [synchronizeViewModeToLayout, widgetState, props.widgetId, isLoading]);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ReferralsViewMode) => {
    // Skip processing during very initial render only
    // Don't block on isLoading which might get stuck
    if (!isInitialized.current) {
      console.log(`Skipping view mode change to ${mode} during initialization`);
      return;
    }
    
    // If we're loading but it's a user-initiated change, allow it to proceed
    if (isLoading) {
      console.log(`View mode change requested while loading, but will proceed anyway: ${mode}`);
      // Force loading state to false since user is clearly interacting
      setIsLoading(false);
    } else {
      console.log(`ReferralsWrapper: View mode change requested to ${mode}`);
    }
    
    // Verify the mode is valid
    if (!Object.keys(viewLabels).includes(mode)) {
      console.error(`Invalid view mode requested: ${mode}`);
      return;
    }
    
    // Update widget state
    console.log(`ReferralsWrapper: Updating widget state to ${mode}`);
    widgetState.setViewMode(mode);
    
    // Explicitly ensure the registry is immediately updated
    if (widgetStateRegistry.has(props.widgetId)) {
      const registryState = widgetStateRegistry.get(props.widgetId) as ReferralsWidgetState;
      if (registryState && 'setViewMode' in registryState) {
        registryState.setViewMode(mode);
        console.log(`ReferralsWrapper: Explicitly updated registry state to ${mode}`);
      }
    }
    
    // Save to widget-specific localStorage key for persistence
    try {
      console.log(`ReferralsWrapper: Saving view mode to localStorage keys`);
      localStorage.setItem(`widget_${props.widgetId}_view_mode`, mode);
      localStorage.setItem('referrals_widget_view_mode', mode);
      
      // Update view state in layout
      synchronizeViewModeToLayout(mode, props.widgetId);
      
      // Also schedule a delayed update in case there are other state updates in progress
      setTimeout(() => {
        synchronizeViewModeToLayout(mode, props.widgetId);
      }, 100);
    } catch (error) {
      console.error('Failed to save view mode to localStorage:', error);
    }
    
    // Notify parent of view mode change if callback is provided
    if (props.onViewModeChange) {
      console.log(`ReferralsWrapper: Calling parent onViewModeChange callback`);
      props.onViewModeChange(mode);
    } else {
      console.log(`ReferralsWrapper: No parent onViewModeChange callback provided`);
    }
    
    // Force a re-render by updating state directly
    console.log(`ReferralsWrapper: Directly updating component state`);
    setViewMode(mode);
    
  }, [props.widgetId, props.onViewModeChange, widgetState, synchronizeViewModeToLayout]);

  // Pass the props and state to Referrals
  return <Referrals 
    forceTheme={forcedTheme} 
    className={props.className} 
    onRemove={props.onRemove}
    viewMode={viewMode}
    onViewModeChange={handleViewModeChange}
    widgetId={props.widgetId}
  />;
};

// The actual implementation of Referrals
const Referrals: React.FC<{
  className?: string;
  onRemove?: () => void;
  forceTheme?: 'light' | 'dark';
  viewMode: ReferralsViewMode;
  onViewModeChange: (mode: ReferralsViewMode) => void;
  widgetId: string;
}> = ({ className, onRemove, forceTheme, viewMode, onViewModeChange, widgetId }) => {
  const { resolvedTheme, theme: specificTheme } = useTheme();
  
  // Use forced theme if provided
  const effectiveTheme = forceTheme || (resolvedTheme === 'dark' ? 'dark' : 'light');
  
  // Track first mount to prevent unnecessary view mode changes during initialization
  const isFirstMount = useRef(true);
  
  // Debug the current viewMode and onViewModeChange handler
  useEffect(() => {
    console.log('Referrals component - current view mode:', viewMode);
    console.log('Referrals component - has view mode handler:', !!onViewModeChange);
    
    // Safety check - if received an invalid view mode, set it to warp
    // But only if this isn't the first time (to prevent loops during initialization)
    const validModes = Object.keys(viewLabels);
    if (!validModes.includes(viewMode)) {
      // Only log during the first mount to avoid log spam
      if (isFirstMount.current) {
        console.warn(`Referrals received invalid view mode during initialization: ${viewMode}, will change to 'warp'`);
      } else {
        console.warn(`Referrals received invalid view mode after initialization: ${viewMode}, changing to 'warp'`);
      }
      
      // Try to get the stored view mode first before defaulting to warp
      const storedMode = localStorage.getItem(`widget_${widgetId}_view_mode`);
      
      // Check if storedMode exists and is valid
      if (storedMode && validModes.includes(storedMode)) {
        console.log(`Referrals component - Using stored view mode from localStorage: ${storedMode}`);
        const fallbackMode = storedMode as ReferralsViewMode;
        
        // Use a timeout to break potential render loops during initialization
        if (!isFirstMount.current) {
          // Only process view mode changes after the component is fully mounted
          onViewModeChange(fallbackMode);
        } else {
          // During first mount, schedule the change for the next tick after initialization completes
          setTimeout(() => {
            onViewModeChange(fallbackMode);
          }, 0);
        }
      } else {
        // No valid stored mode, fall back to 'warp'
        const fallbackMode = 'warp' as ReferralsViewMode;
        
        // Use a timeout to break potential render loops
        if (!isFirstMount.current) {
          onViewModeChange(fallbackMode);
        } else {
          setTimeout(() => {
            onViewModeChange(fallbackMode);
          }, 0);
        }
      }
    }
    
    // No longer first mount
    isFirstMount.current = false;
  }, [viewMode, onViewModeChange, widgetId]);
  
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
            onClick={() => {
              console.log('Dropdown item clicked, changing to:', key);
              // Direct update to localStorage as a backup
              try {
                localStorage.setItem(`widget_${widgetId}_view_mode`, key);
                // Add a direct log about the localStorage update
                console.log(`Direct localStorage update for widget ${widgetId}: ${key}`);
              } catch (e) {
                console.error('Failed to update localStorage directly:', e);
              }
              // Normal handler call
              onViewModeChange(key as ReferralsViewMode);
            }}
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

  // Render the appropriate view based on current viewMode
  const renderContent = () => {
    // Ensure we have a valid view mode before rendering
    const validViewMode = Object.keys(viewLabels).includes(viewMode) ? viewMode : 'warp';
    
    if (validViewMode !== viewMode) {
      console.warn(`Rendering with corrected view mode: ${validViewMode} instead of ${viewMode}`);
      // Don't trigger state changes during render, defer to next tick
      // But only if this isn't the first render to avoid loop
      if (!isFirstMount.current) {
        setTimeout(() => onViewModeChange(validViewMode as ReferralsViewMode), 0);
      }
    }
    
    switch (validViewMode) {
      case 'warp':
        return (
          <WarpBackground 
            className="flex-1 w-full border-none flex items-center justify-center"
            themeVariant={specificTheme}
            beamsPerSide={3}
          >
            <div className="text-center px-6">
              <h3 className="text-xl font-bold mb-2">Trade like you have a time machine</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Insights for the future, provided by Coinmetro.
              </p>
              <ShimmerButton 
                shimmerColor="#fff"
                shimmerSize="0.05em"
                shimmerDuration="6s"
                borderRadius="8px"
                background={effectiveTheme === 'dark' ? "rgba(20, 20, 20, 1)" : "rgba(0, 0, 0, 1)"}
                className="mx-auto text-sm"
              >
                Get Started
              </ShimmerButton>
            </div>
          </WarpBackground>
        );
      case 'flickering':
        return (
          <div className="h-full w-full">
            <FlickeringGrid 
              className="h-full w-full p-6"
            >
              <div className="flex items-center justify-center h-full w-full">
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Flickering Grid</h3>
                  <p className="text-sm text-muted-foreground">
                    Referral program with dynamic flickering grid effects
                  </p>
                </div>
              </div>
            </FlickeringGrid>
          </div>
        );
      case 'grid':
        return (
          <div className="h-full w-full relative flex items-center justify-center">
            <AnimatedGridPattern
              className="absolute inset-0 h-full w-full"
              numSquares={60}
              duration={3}
            />
            <div className="text-center relative z-10">
              <h3 className="text-xl font-bold mb-2">Animated Grid</h3>
              <p className="text-sm text-muted-foreground">
                Referral program with animated grid pattern
              </p>
            </div>
          </div>
        );
      case 'ripple':
        return (
          <div className="h-full w-full relative">
            <Ripple
              className="absolute inset-0"
              mainCircleSize={620}
              mainCircleOpacity={0.14}
              numCircles={4}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center relative z-10 px-6 py-4">
                <h3 className="text-xl font-bold mb-2">Give a friend the gift of Pro Trading</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Earn when they trade.
                </p>
                <ShimmerButton 
                  shimmerColor="#8b5cf6" 
                  shimmerSize="0.05em"
                  shimmerDuration="4s"
                  borderRadius="8px"
                  background={effectiveTheme === 'dark' ? "rgba(20, 20, 20, 1)" : "rgba(0, 0, 0, 1)"}
                  className="mx-auto text-sm"
                >
                  Join Now
                </ShimmerButton>
              </div>
            </div>
          </div>
        );
      case 'dots':
        return (
          <div className="h-full w-full relative flex items-center justify-center">
            <DotPattern
              className="absolute inset-0"
              width={24}
              height={24}
              cx={1.5}
              cy={1.5}
              cr={1.5}
              glow={true}
            />
            <div className="text-center relative z-10">
              <h3 className="text-xl font-bold mb-2">Dot Pattern</h3>
              <p className="text-sm text-muted-foreground">
                Referral program with glowing dot pattern
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full w-full">
            <p className="text-muted-foreground">Unknown view mode: {viewMode}</p>
          </div>
        );
    }
  };

  return (
    <WidgetContainer 
      title="Referrals"
      onRemove={onRemove}
      extraControls={viewController}
    >
      <div className="h-full w-full rounded-xl bg-card overflow-hidden border flex">
        {renderContent()}
      </div>
    </WidgetContainer>
  );
};

// Export both as named exports for consistency
export { Referrals };
export default ReferralsWrapper; 