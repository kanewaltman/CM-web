import React, { useEffect, useState, useCallback } from 'react';
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
  const [key, setKey] = useState(`referrals-${Date.now()}`);
  const [forcedTheme, setForcedTheme] = useState<'light' | 'dark' | undefined>(undefined);

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
  const widgetState = React.useMemo(() => {
    let state = widgetStateRegistry.get(props.widgetId) as ReferralsWidgetState;
    if (!state) {
      // Try to restore view mode from localStorage
      let initialViewMode: ReferralsViewMode = 'warp';
      try {
        // First, try to get the view mode from the DASHBOARD_LAYOUT_KEY
        const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
        if (savedLayout) {
          const layout = JSON.parse(savedLayout);
          const widgetData = layout.find((item: any) => item.id === props.widgetId);
          
          if (widgetData?.viewState?.viewMode && Object.keys(viewLabels).includes(widgetData.viewState.viewMode)) {
            initialViewMode = widgetData.viewState.viewMode as ReferralsViewMode;
            console.log(`Restored view mode from layout: ${initialViewMode}`);
          } else if (widgetData?.viewState?.referralViewMode && Object.keys(viewLabels).includes(widgetData.viewState.referralViewMode)) {
            initialViewMode = widgetData.viewState.referralViewMode as ReferralsViewMode;
            console.log(`Restored referral view mode from layout: ${initialViewMode}`);
          }
        }
        
        // If not found in layout, try widget-specific key
        if (initialViewMode === 'warp') {
          const storedWidgetMode = localStorage.getItem(`widget_${props.widgetId}_view_mode`);
          if (storedWidgetMode && Object.keys(viewLabels).includes(storedWidgetMode)) {
            initialViewMode = storedWidgetMode as ReferralsViewMode;
            console.log(`Restored view mode from widget-specific key: ${initialViewMode}`);
          }
        }
        
        // If still not found, try generic key as fallback
        if (initialViewMode === 'warp') {
          const storedMode = localStorage.getItem('referrals_widget_view_mode');
          if (storedMode && Object.keys(viewLabels).includes(storedMode)) {
            initialViewMode = storedMode as ReferralsViewMode;
            console.log(`Restored view mode from generic key: ${initialViewMode}`);
          }
        }
      } catch (error) {
        console.error('Error retrieving view mode from localStorage:', error);
      }
      
      state = createDefaultReferralsWidgetState(initialViewMode, props.widgetId);
      widgetStateRegistry.set(props.widgetId, state);
    }
    return state;
  }, [props.widgetId]);

  // Use state from widget state
  const [viewMode, setViewMode] = useState<ReferralsViewMode>(widgetState.viewMode);

  // Subscribe to widget state changes
  useEffect(() => {
    return widgetState.subscribe(() => {
      setViewMode(widgetState.viewMode);
    });
  }, [widgetState]);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ReferralsViewMode) => {
    console.log(`ReferralsWrapper: View mode change requested to ${mode}`);
    
    // Verify the mode is valid
    if (!Object.keys(viewLabels).includes(mode)) {
      console.error(`Invalid view mode requested: ${mode}`);
      return;
    }
    
    // Update widget state
    console.log(`ReferralsWrapper: Updating widget state to ${mode}`);
    widgetState.setViewMode(mode);
    
    // Save to widget-specific localStorage key for persistence
    try {
      console.log(`ReferralsWrapper: Saving view mode to localStorage keys`);
      localStorage.setItem(`widget_${props.widgetId}_view_mode`, mode);
      localStorage.setItem('referrals_widget_view_mode', mode);
      
      // Update view state in layout
      const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
      if (savedLayout) {
        console.log(`ReferralsWrapper: Updating layout in localStorage`);
        const layout = JSON.parse(savedLayout);
        const widgetIndex = layout.findIndex((item: any) => item.id === props.widgetId);
        
        if (widgetIndex !== -1) {
          console.log(`ReferralsWrapper: Found widget at index ${widgetIndex} in layout`);
          layout[widgetIndex] = {
            ...layout[widgetIndex],
            viewState: {
              ...(layout[widgetIndex].viewState || {}),
              viewMode: mode,
              referralViewMode: mode
            }
          };
          
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
          console.log(`ReferralsWrapper: Layout updated in localStorage`);
        } else {
          console.warn(`ReferralsWrapper: Widget not found in layout`);
        }
      } else {
        console.log(`ReferralsWrapper: No saved layout found in localStorage`);
      }
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
    
  }, [props.widgetId, props.onViewModeChange, widgetState]);

  // Pass the props and state to Referrals
  return <Referrals 
    key={key} 
    forceTheme={forcedTheme} 
    className={props.className} 
    onRemove={props.onRemove}
    viewMode={viewMode}
    onViewModeChange={handleViewModeChange}
  />;
};

// The actual implementation of Referrals
const Referrals: React.FC<{
  className?: string;
  onRemove?: () => void;
  forceTheme?: 'light' | 'dark';
  viewMode: ReferralsViewMode;
  onViewModeChange: (mode: ReferralsViewMode) => void;
}> = ({ className, onRemove, forceTheme, viewMode, onViewModeChange }) => {
  const { resolvedTheme } = useTheme();
  
  // Use forced theme if provided
  const effectiveTheme = forceTheme || (resolvedTheme === 'dark' ? 'dark' : 'light');
  
  // Debug the current viewMode and onViewModeChange handler
  useEffect(() => {
    console.log('Referrals component - current view mode:', viewMode);
    console.log('Referrals component - has view mode handler:', !!onViewModeChange);
  }, [viewMode, onViewModeChange]);
  
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
    switch (viewMode) {
      case 'warp':
        return (
          <WarpBackground className="h-full w-full border-none p-6">
            <div className="flex items-center justify-center h-full w-full">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Warp Background</h3>
                <p className="text-sm text-muted-foreground">
                  Referral program with dynamic space-warping effects
                </p>
              </div>
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
                <h3 className="text-xl font-bold mb-2">Ripple Effect</h3>
                <p className="text-sm text-muted-foreground">
                  Referral program with ripple animation effects
                </p>
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
      <div className="h-full w-full rounded-xl bg-card overflow-hidden border">
        {renderContent()}
      </div>
    </WidgetContainer>
  );
};

// Export both as named exports for consistency
export { Referrals };
export default ReferralsWrapper; 