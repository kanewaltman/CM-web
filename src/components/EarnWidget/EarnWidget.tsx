import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { WidgetContainer } from '../WidgetContainer';
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
import { MatterStacking } from '../magicui/MatterStacking';
import { EarnWidgetState, widgetStateRegistry, createDefaultEarnWidgetState } from '@/lib/widgetState';
import { DASHBOARD_LAYOUT_KEY } from '@/types/widgets';
import { Slider } from '../ui/slider';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';
import { ChartContainer, ChartConfig } from '../ui/chart';
import { openWidgetDialog, resetDialogOpenedState, forceOpenDialog } from '@/lib/widgetDialogService';
import { ShimmerButton } from '../magicui/shimmer-button';
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
} from "@/components/ui/tabs"
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '../ui/table';
import { AssetButtonWithPrice } from '../AssetPriceTooltip';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { stakingPlansManager, StakingPlan } from '../EarnConfirmationContent';
import NumberFlow, { continuous } from '@number-flow/react';
import { AssetPriceTooltip } from '../AssetPriceTooltip';
// Import the staking options component
import { EarnWidgetStakingOptions, isStaticWidget } from './EarnWidgetStakingOptions';
// Import the extracted StakeView component
import StakeView from './StakeView';
import { ActivePlansView } from './ActivePlansView';
// Import utilities and shared components
import { 
  stakingTokens,
  tokenData,
  getRandomAPY,
  isInDialog,
  forceResetDialogState,
  updateUrlWithAsset,
  getAssetFromUrl,
  AssetIcon
} from './EarnWidgetUtils';

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

export interface EarnWidgetProps {
  widgetId: string;
  className?: string;
  onRemove?: () => void;
  headerControls?: boolean;
  defaultViewMode?: EarnViewMode;
  onViewModeChange?: (mode: EarnViewMode) => void;
  viewState?: Record<string, any>;
}

// Keep track of processed URLs to avoid duplicate processing
const processedUrls = new Set<string>();

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

// Modify the getInitialAssetFromAllSources function to add direct URL navigation support
export function getInitialAssetFromAllSources(): string {
  // First check for asset in URL hash since direct navigation should have highest priority
  const urlAsset = getAssetFromUrl();
  if (urlAsset && stakingTokens.includes(urlAsset)) {
    console.log('📱 Using asset from URL for initial load:', urlAsset);
    
    // For URL navigation, also store in session storage
    sessionStorage.setItem('selected_stake_asset', urlAsset);
    
    // When direct URL navigation is detected, remove any recent dialog closed timestamp
    if (window.location.hash.includes('widget=earn-stake')) {
      sessionStorage.removeItem('dialog_last_closed');
    }
    
    return urlAsset;
  }
  
  // Then check session storage
  if (typeof window !== 'undefined') {
    const sessionAsset = sessionStorage.getItem('selected_stake_asset');
    if (sessionAsset && stakingTokens.includes(sessionAsset)) {
      console.log('📱 Using asset from session storage for initial load:', sessionAsset);
      return sessionAsset;
    }
  }
  
  // Add more detailed logging when defaulting to XCM
  console.log('⚠️ No asset found in URL or session storage, defaulting to XCM');
  return 'XCM';
}

// Improved function to detect and handle asset URLs
const detectAndHandleAssetUrl = () => {
  if (typeof window === 'undefined') return;
  
  // Skip URL handling on the earn page itself since it's handled specially
  const pathname = window.location.pathname;
  if (pathname === '/earn') return;
  
  // Check if we already have an open dialog by looking at DOM
  const hasOpenDialog = isInDialog();
  if (hasOpenDialog) {
    console.log('📌 Dialog already open, skipping URL handler in EarnWidget');
    return;
  }
  
  // Don't process the URL if it's already been processed
  const currentUrl = window.location.href;
  if (processedUrls.has(currentUrl)) {
    return;
  }
  processedUrls.add(currentUrl);
  
  // Get current hash
  const hash = window.location.hash;
  if (!hash) return;
  
  // If we don't have 'asset=' in the hash, skip further processing
  if (!hash.includes('asset=')) return;
  
  // Check for both widget and asset parameters first
  if (hash && hash.includes('widget=earn-stake') && hash.includes('asset=')) {
    const assetMatch = hash.match(/asset=([^&]*)/);
    const asset = assetMatch ? assetMatch[1] : null;
    
    if (asset && stakingTokens.includes(asset)) {
      console.log('📱 Detected widget and asset in URL, opening staking dialog:', asset);
      
      // Force reset dialog state first
      forceResetDialogState();
      
      // Store the asset in sessionStorage to ensure it's used consistently
      sessionStorage.setItem('selected_stake_asset', asset);
      
      // Update URL with the correctly formatted widget and asset parameters
      window.history.replaceState(
        null, 
        '', 
        `${window.location.pathname}#widget=earn-stake&asset=${asset}`
      );
      
      // Open dialog with this asset after a short delay
      setTimeout(() => {
        openWidgetDialog('earn-stake', 'direct', asset, true);
      }, 250);
      
      return;
    }
  }
  
  // First check if we have a session storage asset
  const sessionAsset = sessionStorage.getItem('selected_stake_asset');
  if (sessionAsset && stakingTokens.includes(sessionAsset)) {
    console.log('📱 Detected asset in session storage, opening staking dialog:', sessionAsset);
    
    // Force reset dialog state first
    forceResetDialogState();
    
    // Update URL with the session asset
    window.history.replaceState(
      null, 
      '', 
      `${window.location.pathname}#widget=earn-stake&asset=${sessionAsset}`
    );
    
    // Open dialog with this asset after a short delay
    setTimeout(() => {
      openWidgetDialog('earn-stake', 'direct', sessionAsset, true);
      // Don't clear session storage until dialog is fully opened
      setTimeout(() => sessionStorage.removeItem('selected_stake_asset'), 1000);
    }, 250);
    
    return;
  }

  // Check for asset parameter without widget parameter
  if (hash && hash.includes('asset=') && !hash.includes('widget=')) {
    const assetMatch = hash.match(/asset=([^&]*)/);
    const asset = assetMatch ? assetMatch[1] : null;
    
    if (asset && stakingTokens.includes(asset)) {
      console.log('📱 Detected standalone asset in URL, opening staking dialog:', asset);
      
      // Force reset dialog state first
      forceResetDialogState();
      
      // Store the asset in sessionStorage to ensure it's used consistently
      sessionStorage.setItem('selected_stake_asset', asset);
      
      // Update URL with the correct widget and asset parameters
      window.history.replaceState(
        null, 
        '', 
        `${window.location.pathname}#widget=earn-stake&asset=${asset}`
      );
      
      // Open dialog with this asset after a short delay
      setTimeout(() => {
        openWidgetDialog('earn-stake', 'direct', asset, true);
      }, 250);
    }
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
    // First check if there's an earnViewMode in props.viewState (highest priority for static widgets)
    if (props.viewState?.earnViewMode) {
      console.log(`Using earnViewMode from props.viewState: ${props.viewState.earnViewMode} for ${props.widgetId}`);
      return props.viewState.earnViewMode as EarnViewMode;
    }
    
    // Set initial default based on widget ID
    if (props.widgetId === 'earn-assets' || props.widgetId === 'earn-assets-static') return 'cards';
    if (props.widgetId === 'earn-promo' || props.widgetId === 'earn-promo-static') return 'ripple';
    if (props.widgetId === 'earn-stake' || props.widgetId === 'earn-stake-static') return 'stake';
    
    return props.defaultViewMode || 'ripple';
  });
  
  // Listen for dialog open events with asset data
  useEffect(() => {
    const handleDialogOpen = (e: CustomEvent) => {
      console.log('📣 Dialog open event received with details:', e.detail);
      
      // Store widgetState reference for use in event handler
      const currentWidgetState = widgetStateRegistry.get(props.widgetId) as EarnWidgetState | undefined;
      
      // Use exact match only flag if provided
      const exactMatchOnly = e.detail?.exactMatchOnly === true;
      console.log('🧩 Dialog exactMatchOnly flag:', exactMatchOnly);
      
      // Check if this is a duplicate event we should ignore
      if (e.detail?.eventId) {
        const lastProcessedEvent = sessionStorage.getItem('last_processed_dialog_event');
        if (lastProcessedEvent === e.detail.eventId) {
          console.log('🔄 Ignoring duplicate dialog open event:', e.detail.eventId);
          return;
        }
        
        // Store this event ID to prevent duplicates
        sessionStorage.setItem('last_processed_dialog_event', e.detail.eventId);
      }
      
      // Special handling for direct navigation and force open events
      const isForceOpen = e.detail?.forceOpen === true || 
                         (e.detail?.eventId?.startsWith('force-open-'));
      const isDirectNavigation = e.detail?.isDirectNavigation === true || 
                                (e.detail?.eventId?.startsWith('direct-nav-'));
      const isInitialNavigation = e.detail?.isInitialNavigation === true || 
                                 (e.detail?.eventId?.startsWith('direct-nav-init-'));
      
      // For force open or direct/initial navigation, clear recently closed flag
      if (isForceOpen || isDirectNavigation || isInitialNavigation) {
        console.log('🔓 Processing special navigation event');
        sessionStorage.removeItem('dialog_last_closed');
        
        // If this is a direct navigation, skip checking for duplicates
        if (isInitialNavigation) {
          console.log('🔄 Initial navigation event, ensuring it processes');
          // Clear any duplicate protection for direct navigation
          sessionStorage.removeItem('last_processed_dialog_event');
        }
      }
      
      // Check if we just closed a dialog (skip for special events)
      if (!isForceOpen && !isDirectNavigation && !isInitialNavigation) {
        const lastCloseTime = parseInt(sessionStorage.getItem('dialog_last_closed') || '0', 10);
        const now = Date.now();
        if (now - lastCloseTime < 1000) {
          console.log('🛑 Skipping dialog open because a dialog was recently closed');
          return;
        }
      }
      
      // Process asset priority: event detail > session storage > URL
      let finalAsset: string | undefined = undefined;
      
      if (e.detail?.widgetId === props.widgetId) {
        // If there's an asset specified in the event and it's valid, use it
        if (e.detail?.asset && stakingTokens.includes(e.detail.asset)) {
          // This is the highest priority asset source
          finalAsset = e.detail.asset;
          console.log('📱 Using asset from event detail:', finalAsset);
          // Always store in session storage for consistency
          if (finalAsset) {
            sessionStorage.setItem('selected_stake_asset', finalAsset);
          }
        } 
        // If no asset in event, try session storage next
        else {
          const sessionAsset = sessionStorage.getItem('selected_stake_asset');
          if (sessionAsset && stakingTokens.includes(sessionAsset)) {
            finalAsset = sessionAsset;
            console.log('📱 Using asset from session storage:', finalAsset);
          }
          // Finally try URL as last resort
          else {
            const urlAsset = getAssetFromUrl();
            if (urlAsset) {
              finalAsset = urlAsset;
              console.log('📱 Using asset from URL:', finalAsset);
              // Store in session storage for consistency
              sessionStorage.setItem('selected_stake_asset', finalAsset);
            }
          }
        }
        
        // If we found an asset, use it and set the view mode
        if (finalAsset) {
          console.log('✅ Setting initial asset to:', finalAsset);
          setInitialAsset(finalAsset);
          setCurrentViewMode('stake');
          
          // Also update the widgetState if it exists
          if (currentWidgetState) {
            currentWidgetState.setViewMode('stake');
          }
          
          // Update URL with correct asset for direct initial navigation
          if (isInitialNavigation || isDirectNavigation) {
            if (window.location.pathname === '/earn') {
              console.log('🔄 Updating URL with proper asset during dialog open:', finalAsset);
              window.history.replaceState(
                null, 
                '', 
                `${window.location.pathname}#widget=earn-stake&asset=${finalAsset}`
              );
            }
          }
        }
      }
      
      // Force the stake view if this is the earn-stake widget regardless of asset
      if (e.detail?.widgetId === 'earn-stake' && props.widgetId === 'earn-stake') {
        setCurrentViewMode('stake');
        if (currentWidgetState) {
          currentWidgetState.setViewMode('stake');
        }
        
        // If we haven't already set an asset, try to find one
        if (!finalAsset) {
          // Try to get asset from session storage or URL if not specified in the event
          const sessionAsset = sessionStorage.getItem('selected_stake_asset');
          if (sessionAsset && stakingTokens.includes(sessionAsset)) {
            console.log('📦 Using session storage asset for earn-stake widget:', sessionAsset);
            setInitialAsset(sessionAsset);
            finalAsset = sessionAsset;
          } else {
            const assetFromUrl = getAssetFromUrl();
            if (assetFromUrl) {
              console.log('🔍 Using URL asset for earn-stake widget:', assetFromUrl);
              setInitialAsset(assetFromUrl);
              finalAsset = assetFromUrl;
            }
          }
          
          // If we found an asset, ensure URL reflects it - but only if it's a direct load or exactMatchOnly is not set
          if (finalAsset && window.location.pathname === '/earn' && (e.detail?.directLoad === true || !exactMatchOnly)) {
            console.log('🔄 Updating URL with proper asset parameter:', finalAsset);
            window.history.replaceState(
              null, 
              '', 
              `${window.location.pathname}#widget=earn-stake&asset=${finalAsset}`
            );
          }
        }
      }
    };
    
    // Listen for dialog closed events
    const handleCloseDialogs = () => {
      // Clear session storage and URL hash when dialogs are closed
      // Pass an empty object as the event argument to avoid the parameter error
      handleDialogOpen({} as CustomEvent);
      
      // Set a timestamp to prevent immediate reopening
      sessionStorage.setItem('dialog_last_closed', Date.now().toString());
    };
    
    // TypeScript doesn't recognize CustomEvent by default
    document.addEventListener('open-widget-dialog' as any, handleDialogOpen);
    
    // Add listener for close events
    document.addEventListener('close-all-widget-dialogs' as any, handleCloseDialogs);
    
    // Check for direct asset URLs when component mounts
    detectAndHandleAssetUrl();
    
    return () => {
      document.removeEventListener('open-widget-dialog' as any, handleDialogOpen);
      document.removeEventListener('close-all-widget-dialogs' as any, handleCloseDialogs);
    };
  }, [props.widgetId]);
  
  // Also add an effect to handle URL changes for asset-only URLs
  useEffect(() => {
    // Function to handle hash changes
    const handleHashChange = () => {
      console.log('🔄 Hash change detected, checking for asset parameters');
      
      // First check if this is after a dialog was closed
      const lastCloseTime = parseInt(sessionStorage.getItem('dialog_last_closed') || '0', 10);
      if (Date.now() - lastCloseTime < 500) {
        console.log('⏭️ Skipping hash change handler right after dialog close');
        return;
      }
      
      // Clear processed URLs to allow reprocessing for manual navigation
      processedUrls.clear();
      
      detectAndHandleAssetUrl();
    };
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
  
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
    
    // Force widget state based on viewState props for static widgets if provided
    if (props.viewState?.earnViewMode && (
      props.widgetId === 'earn-promo-static' || 
      props.widgetId === 'earn-assets-static' || 
      props.widgetId === 'earn-stake-static'
    )) {
      console.log(`Creating state with forced viewMode ${props.viewState.earnViewMode} for static widget ${props.widgetId}`);
      state = createDefaultEarnWidgetState(props.viewState.earnViewMode as EarnViewMode, props.widgetId);
      widgetStateRegistry.set(props.widgetId, state);
      setCurrentViewMode(props.viewState.earnViewMode as EarnViewMode);
      setIsLoading(false);
      return state as EarnWidgetState;
    }
    
    if (!state) {
      // Determine initial view mode based on widget ID for specific widget instances
      let initialViewMode: EarnViewMode;
      
      if (props.widgetId === 'earn-assets' || props.widgetId === 'earn-assets-static') {
        initialViewMode = 'cards';
      } else if (props.widgetId === 'earn-promo' || props.widgetId === 'earn-promo-static') {
        initialViewMode = 'ripple';
      } else if (props.widgetId === 'earn-stake' || props.widgetId === 'earn-stake-static') {
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
  }, [props.widgetId, props.defaultViewMode, props.viewState]);

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

  // For static widgets, ensure viewState is respected
  let effectiveViewMode = currentViewMode;
  if (props.viewState?.earnViewMode && (
    props.widgetId === 'earn-promo-static' || 
    props.widgetId === 'earn-assets-static' || 
    props.widgetId === 'earn-stake-static'
  )) {
    effectiveViewMode = props.viewState.earnViewMode as EarnViewMode;
    console.log(`Rendering ${props.widgetId} with forced view mode: ${effectiveViewMode}`);
  }

  // Determine the component to render based on the view mode
  const contentComponent = effectiveViewMode === 'ripple' ? (
    <RippleView />
  ) : effectiveViewMode === 'cards' ? (
    <EarnWidgetStakingOptions forcedTheme={forcedTheme} widgetId={props.widgetId} />
  ) : (
    <StakeView forcedTheme={forcedTheme} initialAsset={initialAsset} />
  );

  // If useContentOnly is set, render only the content without any wrapper
  if (props.viewState?.useContentOnly) {
    console.log(`Rendering ${props.widgetId} in content-only mode`);
    return contentComponent;
  }

  // Render the main widget content with wrapper
  return (
    <div className="w-full h-full flex flex-col">
      {contentComponent}
    </div>
  );
};

// Add a wrapper component to fix the import in widgetRegistry.ts
export const EarnWidgetWrapper: React.FC<EarnWidgetProps> = (props) => {
  return <EarnWidget {...props} />;
};

// Replace the entire RippleView component
const RippleView: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const [hasError, setHasError] = useState(false);
  const [featuredToken, setFeaturedToken] = useState<string>(
    stakingTokens[Math.floor(Math.random() * stakingTokens.length)]
  );
  const [showPlans, setShowPlans] = useState<boolean>(false);
  const [userPlans, setUserPlans] = useState<StakingPlan[]>([]);
  const ignoreNextHashChange = useRef(false);
  // Add refresh interval ref
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Force update of the gradient when theme changes
  const [gradientKey, setGradientKey] = useState<number>(Date.now());
  
  // Debug theme detection
  useEffect(() => {
    console.log('Current theme detection:', { 
      resolvedTheme, 
      documentClassList: typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : 'N/A',
      htmlHasDarkClass: typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : 'N/A'
    });
  }, [resolvedTheme]);
  
  useEffect(() => {
    // Update gradient key whenever theme changes to force a re-render
    setGradientKey(Date.now());
  }, [resolvedTheme]);
  
  // Function to load plans from localStorage
  const loadPlans = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Get plans from localStorage
    const loadedPlans = stakingPlansManager.getPlans();
    setUserPlans(loadedPlans);
    setShowPlans(loadedPlans.length > 0);
  }, []);
  
  // Check for user plans and set up refresh interval
  useEffect(() => {
    // Initial load
    loadPlans();
    
    // Set up refresh interval (every 15 seconds)
    refreshIntervalRef.current = setInterval(() => {
      loadPlans();
    }, 15000);
    
    // Listen for staking plan creation events
    const handlePlanCreated = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('📊 Staking plan created:', customEvent.detail);
      
      // Refresh plans
      loadPlans();
    };
    
    // Listen for staking plan termination events
    const handlePlanTerminated = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('📊 Staking plan terminated:', customEvent.detail);
      
      // Refresh plans
      loadPlans();
    };
    
    // Add event listeners
    document.addEventListener('staking-plan-created', handlePlanCreated);
    document.addEventListener('staking-plan-terminated', handlePlanTerminated);
    
    // Cleanup
    return () => {
      document.removeEventListener('staking-plan-created', handlePlanCreated);
      document.removeEventListener('staking-plan-terminated', handlePlanTerminated);
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [loadPlans]);
  
  const handleMatterError = (error: any) => {
    console.error('Error in Matter.js component:', error);
    setHasError(true);
  };

  // Use an effect to detect and respond to URL changes
  useEffect(() => {
    // Check URL hash on mount
    const urlAsset = getAssetFromUrl();
    if (urlAsset) {
      console.log('📱 RippleView updating featured token from URL:', urlAsset);
      setFeaturedToken(urlAsset);
    }
    
    // Handle URL hash changes
    const handleHashChange = () => {
      // Skip if this hash change was caused by our own URL updates
      if (ignoreNextHashChange.current) {
        console.log('⏭️ RippleView ignoring hash change as it was triggered internally');
        ignoreNextHashChange.current = false;
        return;
      }
      
      const newUrlAsset = getAssetFromUrl();
      if (newUrlAsset && newUrlAsset !== featuredToken) {
        console.log('📱 RippleView updating featured token from hash change:', newUrlAsset);
        setFeaturedToken(newUrlAsset);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [featuredToken]);

  const handleRippleGetStartedClick = () => {
    // Clear any recent closure protection
    sessionStorage.removeItem('dialog_last_closed');
    
    // Force reset dialog state
    forceResetDialogState();
    
    // Create a cleanup event
    const closeEvent = new CustomEvent('close-widget-dialogs', {
      bubbles: true
    });
    
    // Dispatch the close event
    document.dispatchEvent(closeEvent);
    
    // Flag that we're about to change the URL to avoid loops
    ignoreNextHashChange.current = true;
    
    // Use the featured token from state
    const tokenToUse = featuredToken || stakingTokens[0];
    
    // Store in session storage
    sessionStorage.setItem('selected_stake_asset', tokenToUse);
    
    // When on earn page, update URL properly
    if (window.location.pathname === '/earn') {
      // Use proper format with widget parameter
      window.history.replaceState(
        null, 
        '', 
        `${window.location.pathname}#widget=earn-stake&asset=${tokenToUse}`
      );
    } else {
      // Not on earn page, use updateUrlWithAsset
      updateUrlWithAsset(tokenToUse);
    }
    
    // Put a small delay to ensure everything is cleared
    setTimeout(() => {
      // Force open the dialog using the imported function
      forceOpenDialog('earn-stake', tokenToUse);
    }, 250);
  };

  // Handler for token clicks from the MatterStacking component
  const handleTokenClick = (tokenName: string) => {
    // Find the token data (using the imported tokenData array)
    const token = tokenData.find(t => t.symbol === tokenName);
    if (token) {
      // Update featured token
      setFeaturedToken(tokenName);
      
      // Open the dialog when a token is clicked
      // Clear any recent closure protection
      sessionStorage.removeItem('dialog_last_closed');
      
      // Force reset dialog state
      forceResetDialogState();
      
      // Create a cleanup event
      const closeEvent = new CustomEvent('close-widget-dialogs', {
        bubbles: true
      });
      
      // Dispatch the close event
      document.dispatchEvent(closeEvent);
      
      // Flag that we're about to change the URL to avoid loops
      ignoreNextHashChange.current = true;
      
      // Store in session storage
      sessionStorage.setItem('selected_stake_asset', tokenName);
      
      // When on earn page, update URL properly
      if (window.location.pathname === '/earn') {
        // Use proper format with widget parameter
        window.history.replaceState(
          null, 
          '', 
          `${window.location.pathname}#widget=earn-stake&asset=${tokenName}`
        );
      } else {
        // Not on earn page, use updateUrlWithAsset
        updateUrlWithAsset(tokenName);
      }
      
      // Put a small delay to ensure everything is cleared
      setTimeout(() => {
        // Force open the dialog using the imported function
        forceOpenDialog('earn-stake', tokenName);
      }, 250);
    }
  };

  // If user has staking plans, show them
  if (showPlans && userPlans.length > 0) {
    return <ActivePlansView plans={userPlans} onNewPlan={handleRippleGetStartedClick} />;
  }

  // Otherwise show the default ripple view
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 overflow-hidden">
      {!hasError ? (
        <MatterStacking 
          className="absolute inset-0" 
          tokens={stakingTokens}
          interval={1000}
          maxObjects={30}
          hardLimit={40}
          density={0.0008}
          restitution={0.4}
          // onTokenClick={handleTokenClick}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          Could not load physics animation
        </div>
      )}
      <div className="z-10 text-center max-w-md mx-auto relative">
        <div key={gradientKey} className="absolute inset-0 -z-10 radial-gradient-bg"></div>
        <style>{`
          .radial-gradient-bg {
            position: absolute;
            width: 400%;
            height: 400%;
            left: -150%;
            top: -150%;
            pointer-events: none;
            background: radial-gradient(circle at center, 
                        ${resolvedTheme === 'dark' ? 'rgb(15, 15, 15)' : 'rgb(250, 250, 250)'} 0%, 
                        ${resolvedTheme === 'dark' ? 'rgba(15, 15, 15, 0.85)' : 'rgba(250, 250, 250, 0.85)'} 20%, 
                        ${resolvedTheme === 'dark' ? 'rgba(15, 15, 15, 0.7)' : 'rgba(250, 250, 250, 0.7)'} 40%, 
                        ${resolvedTheme === 'dark' ? 'rgba(15, 15, 15, 0.5)' : 'rgba(250, 250, 250, 0.5)'} 60%, 
                        ${resolvedTheme === 'dark' ? 'rgba(15, 15, 15, 0.2)' : 'rgba(250, 250, 250, 0.2)'} 75%, 
                        ${resolvedTheme === 'dark' ? 'rgba(15, 15, 15, 0)' : 'rgba(250, 250, 250, 0)'} 90%);
          }
          
          /* Dark OLED theme (pure black) */
          html.dark.oled .radial-gradient-bg,
          html.dark[data-theme="dark-0led"] .radial-gradient-bg {
            background: radial-gradient(circle at center, 
                        rgb(0, 0, 0) 0%, 
                        rgba(0, 0, 0, 0.85) 20%, 
                        rgba(0, 0, 0, 0.7) 40%, 
                        rgba(0, 0, 0, 0.5) 60%, 
                        rgba(0, 0, 0, 0.2) 75%, 
                        rgba(0, 0, 0, 0) 90%);
          }
          
          /* Dark default theme */
          html.dark:not(.oled):not([data-theme="dark-backlit"]) .radial-gradient-bg,
          html.dark[data-theme="dark-default"] .radial-gradient-bg {
            background: radial-gradient(circle at center, 
                        rgb(15, 15, 15) 0%, 
                        rgba(15, 15, 15, 0.85) 20%, 
                        rgba(15, 15, 15, 0.7) 40%, 
                        rgba(15, 15, 15, 0.5) 60%, 
                        rgba(15, 15, 15, 0.2) 75%, 
                        rgba(15, 15, 15, 0) 90%);
          }
          
          /* Dark Backlit theme (slightly blueish) */
          html.dark[data-theme="dark-backlit"] .radial-gradient-bg {
            background: radial-gradient(circle at center, 
                        rgb(25, 25, 30) 0%, 
                        rgba(25, 25, 30, 0.85) 20%, 
                        rgba(25, 25, 30, 0.7) 40%, 
                        rgba(25, 25, 30, 0.5) 60%, 
                        rgba(25, 25, 30, 0.2) 75%, 
                        rgba(25, 25, 30, 0) 90%);
          }
          
          /* Light Cool theme */
          html:not(.dark)[data-theme="light-cool"] .radial-gradient-bg {
            background: radial-gradient(circle at center, 
                        rgb(240, 245, 250) 0%, 
                        rgba(240, 245, 250, 0.85) 20%, 
                        rgba(240, 245, 250, 0.7) 40%, 
                        rgba(240, 245, 250, 0.5) 60%, 
                        rgba(240, 245, 250, 0.2) 75%, 
                        rgba(240, 245, 250, 0) 90%);
          }
          
          /* Light default theme */
          html:not(.dark):not([data-theme="light-cool"]):not([data-theme="light-warm"]) .radial-gradient-bg,
          html:not(.dark)[data-theme="light-default"] .radial-gradient-bg {
            background: radial-gradient(circle at center, 
                        rgb(250, 250, 250) 0%, 
                        rgba(250, 250, 250, 0.85) 20%, 
                        rgba(250, 250, 250, 0.7) 40%, 
                        rgba(250, 250, 250, 0.5) 60%, 
                        rgba(250, 250, 250, 0.2) 75%, 
                        rgba(250, 250, 250, 0) 90%);
          }
          
          /* Light Warm theme */
          html:not(.dark)[data-theme="light-warm"] .radial-gradient-bg {
            background: radial-gradient(circle at center, 
                        rgb(250, 245, 235) 0%, 
                        rgba(250, 245, 235, 0.85) 20%, 
                        rgba(250, 245, 235, 0.7) 40%, 
                        rgba(250, 245, 235, 0.5) 60%, 
                        rgba(250, 245, 235, 0.2) 75%, 
                        rgba(250, 245, 235, 0) 90%);
          }
        `}</style>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2">Let your assets pile up</h2>
          <p className="text-muted-foreground mb-8">
            Stake to earn passive income with competitive APY rates and flexible lock periods.
          </p>
          <div className="flex flex-col space-y-2 items-center">
            <ShimmerButton
              shimmerColor="rgba(255, 255, 255, 0.5)"
              shimmerSize="0.05em"
              shimmerDuration="6s"
              borderRadius="8px"
              background="rgb(0, 0, 0)"
              className="mx-auto text-sm mb-2"
              onClick={handleRippleGetStartedClick}
            >
              Earn more {featuredToken}
            </ShimmerButton>
            <div className="p-1 pl-2 pr-2 bg-primary/10 rounded-full">
              <div className="text-emerald-500 font-medium text-sm">
                {tokenData.find(t => t.symbol === featuredToken)?.apy} APY
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add a function to force open a dialog regardless of recent closures
export function forceOpenEarnDialog(asset: string) {
  console.log('🔓 Force opening earn dialog with asset:', asset);
  
  // Clear any recently closed flags
  sessionStorage.removeItem('dialog_last_closed');
  
  // Store the asset
  sessionStorage.setItem('selected_stake_asset', asset);
  
  // Update URL
  if (window.location.pathname === '/earn') {
    window.history.replaceState(
      null, 
      '', 
      `${window.location.pathname}#widget=earn-stake&asset=${asset}`
    );
    
    // Set a flag for the dialog height constraint
    sessionStorage.setItem('earn_dialog_height_constraint', 'true');
  } else {
    updateUrlWithAsset(asset);
  }
  
  // Open dialog with a new event ID to ensure it's processed
  const eventId = `force-open-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  openWidgetDialog('earn-stake', 'direct', asset, true);
}

// Add this new function to apply the dialog height constraint styles
function applyDialogHeightConstraints() {
  // Add a MutationObserver to watch for dialog elements being added to the DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check if this is a dialog or contains a dialog
            const dialogs = [
              ...Array.from(element.querySelectorAll('[role="dialog"]')), 
              ...Array.from(element.querySelectorAll('.dialog-content')),
              ...Array.from(element.querySelectorAll('.DialogContent')),
              ...Array.from(element.querySelectorAll('.DialogOverlay'))
            ];
            
            // If we're on the earn page and the constraint flag is set
            if (window.location.pathname === '/earn' && 
                sessionStorage.getItem('earn_dialog_height_constraint') === 'true') {
              // Apply height constraint to all found dialog elements
              dialogs.forEach(dialog => {
                console.log('📏 Applying max height constraint to dialog:', dialog);
                
                // Apply the max height directly
                (dialog as HTMLElement).style.maxHeight = '900px';
                
                // Also add a class for any CSS styling
                dialog.classList.add('earn-page-dialog');
                
                // For nested content, find the primary content container
                const dialogContent = dialog.querySelector('.dialog-content') || 
                                    dialog.querySelector('.DialogContent') || 
                                    dialog;
                                  
                if (dialogContent && dialogContent !== dialog) {
                  (dialogContent as HTMLElement).style.maxHeight = 'calc(900px - 2rem)';
                  dialogContent.classList.add('earn-page-dialog-content');
                }
              });
            }
          }
        });
      }
    });
  });
  
  // Start observing the document body for dialog insertions
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Add global styles for these dialogs
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .earn-page-dialog {
      max-height: 900px !important;
      overflow: hidden !important;
    }
    
    .earn-page-dialog-content {
      max-height: calc(900px - 2rem) !important;
      overflow-y: auto !important;
    }
    
    /* Target common dialog wrappers */
    [role="dialog"].earn-page-dialog,
    .dialog-content.earn-page-dialog,
    .DialogContent.earn-page-dialog,
    .DialogOverlay.earn-page-dialog {
      max-height: 900px !important;
      overflow: hidden !important;
    }
  `;
  document.head.appendChild(styleEl);
  
  // Clean up when component is unmounted
  return () => {
    observer.disconnect();
    if (document.head.contains(styleEl)) {
      document.head.removeChild(styleEl);
    }
  };
}

// Run this function once when the module loads
if (typeof window !== 'undefined') {
  const cleanup = applyDialogHeightConstraints();
  
  // Clean up when page unloads
  window.addEventListener('beforeunload', cleanup);
} 