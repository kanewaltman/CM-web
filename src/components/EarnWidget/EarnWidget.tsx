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

// ActivePlansView component
const ActivePlansView: React.FC<{ plans: StakingPlan[], onNewPlan: () => void }> = ({ plans, onNewPlan }) => {
  const { resolvedTheme } = useTheme();
  const [gradientKey, setGradientKey] = useState<number>(Date.now());
  const [showHistoric, setShowHistoric] = useState<boolean>(false);
  // Change from continuous updates to interval-based updates with a key for forcing refresh
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [lastClaimTime, setLastClaimTime] = useState<number>(0);
  // Track if we have active plans to show
  const [showPlans, setShowPlans] = useState<boolean>(plans.length > 0);
  // Keep a local copy of plans for direct updates
  const [userPlans, setUserPlans] = useState<StakingPlan[]>(plans);
  // Add pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const plansPerPage = 3; // Number of plans to show per page
  // Track component visibility
  const isVisible = useRef(true);
  // Track interval ID for cleanup
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Add this state at the beginning of the ActivePlansView component (around line ~2746)
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null);
  
  // Memoize active and historic plans to prevent recalculation on each render
  const { activePlans, historicPlans } = useMemo(() => {
    return {
      activePlans: plans.filter(plan => plan.isActive),
      historicPlans: plans.filter(plan => !plan.isActive)
    };
  }, [plans]);
  
  // Memoize current plans based on pagination
  const currentPlans = useMemo(() => {
    const plansToShow = showHistoric ? historicPlans : activePlans;
    const indexOfLastPlan = currentPage * plansPerPage;
    const indexOfFirstPlan = indexOfLastPlan - plansPerPage;
    return plansToShow.slice(indexOfFirstPlan, indexOfLastPlan);
  }, [activePlans, historicPlans, showHistoric, currentPage, plansPerPage]);
  
  // Calculate pagination information
  const totalPlans = useMemo(() => 
    showHistoric ? historicPlans.length : activePlans.length, 
    [showHistoric, historicPlans.length, activePlans.length]
  );
  
  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(totalPlans / plansPerPage)),
    [totalPlans, plansPerPage]
  );
  
  // Reset to first page when switching between active/historic
  useEffect(() => {
    setCurrentPage(1);
  }, [showHistoric]);
  
  // Force update of the gradient when theme changes
  useEffect(() => {
    setGradientKey(Date.now());
  }, [resolvedTheme]);
  
  // Set up visibility observer to pause updates when component not visible
  useEffect(() => {
    // Use IntersectionObserver if available
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isVisible.current = entry.isIntersecting;
        });
      }, { threshold: 0.1 });
      
      // Find container element
      const container = document.querySelector('#earn-plans-container');
      if (container) {
        observer.observe(container);
      }
      
      return () => {
        if (container) {
          observer.unobserve(container);
        }
        observer.disconnect();
      };
    }
    
    // Fallback to document visibility
    const handleVisibilityChange = () => {
      isVisible.current = document.visibilityState === 'visible';
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Use interval instead of requestAnimationFrame for time updates
  useEffect(() => {
    // Update time every second instead of every 2 seconds for smoother countdown
    const updateTime = () => {
      // Only update if visible
      if (isVisible.current) {
        setCurrentTime(Date.now());
      }
    };
    
    // Initial update
    updateTime();
    
    // Set interval - reduced to 1000ms (1 second) for more responsive countdown
    timeIntervalRef.current = setInterval(updateTime, 1000);
    
    // Clean up
    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
    };
  }, []);
  
  // Force refresh when a claim happens
  useEffect(() => {
    if (lastClaimTime > 0) {
      // Immediately refresh and then after a short delay to ensure UI catches up
      setCurrentTime(Date.now());
      
      // Force a UI refresh with a minimal delay
      const refreshTimer = setTimeout(() => {
        setCurrentTime(Date.now());
      }, 100);
      
      return () => clearTimeout(refreshTimer);
    }
  }, [lastClaimTime]);
  
  // Cleanup button refs when component unmounts
  useEffect(() => {
    return () => {
      if (claimButtonRefs.current) {
        claimButtonRefs.current.clear();
      }
    };
  }, []);
  
  // Calculate current earnings for a plan with optimized method
  const calculateCurrentEarnings = useCallback((plan: StakingPlan): number => {
    if (!plan.isActive) {
      // For terminated plans, return the actual earnings or a calculated amount
      return plan.actualEarnings || 0;
    }
    
    const startDate = new Date(plan.startDate).getTime();
    const endDate = new Date(plan.endDate).getTime();
    const now = currentTime; // Use the state time for consistent updates
    
    // Calculate progress as a percentage (capped at 100%)
    const progress = Math.min(1, (now - startDate) / (endDate - startDate));
    
    // Calculate the total duration in milliseconds
    const totalDuration = endDate - startDate;
    
    // Calculate milliseconds elapsed
    const elapsedMs = now - startDate;
    
    // Calculate earnings per millisecond
    const msEarningRate = plan.estimatedEarnings / totalDuration;
    
    // Calculate current earnings precisely based on exact time elapsed
    return msEarningRate * elapsedMs;
  }, [currentTime]);
  
  // Calculate remaining time for a plan - memoized to avoid recalculation
  const formatRemainingTime = useCallback((plan: StakingPlan): string => {
    if (!plan.isActive) {
      return "Completed";
    }
    
    const endDate = new Date(plan.endDate).getTime();
    const now = currentTime; // Use the state time for consistent updates
    
    // If plan has ended
    if (now >= endDate) {
      return "Ready to claim";
    }
    
    const remainingMs = endDate - now;
    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  }, [currentTime]);
  
  // Check if a plan has earnings available to claim and is not on cooldown
  const isPlanReadyToClaim = useCallback((plan: StakingPlan): boolean => {
    if (!plan.isActive) return false;
    
    // Check if the plan is on cooldown
    if (plan.claimCooldownUntil) {
      const cooldownUntil = new Date(plan.claimCooldownUntil).getTime();
      if (currentTime < cooldownUntil) {
        return false; // Still on cooldown
      }
    }
    
    // Check if there are any earnings to claim based on what would actually display
    const currentEarnings = calculateCurrentEarnings(plan);
    
    // Format the earnings as they would appear in the UI
    const formattedEarnings = currentEarnings < 1 
      ? currentEarnings.toFixed(8)
      : currentEarnings.toFixed(6);
    
    // Parse back to number and check if it's greater than zero
    // This ensures we only enable claiming if at least one non-zero digit would show in the UI
    const displayValue = parseFloat(formattedEarnings);
    
    return displayValue > 0;
  }, [currentTime, calculateCurrentEarnings, lastClaimTime]);
  
  // Calculate termination fee for a plan
  const calculateTerminationFee = useCallback((plan: StakingPlan): number => {
    const startDate = new Date(plan.startDate).getTime();
    const endDate = new Date(plan.endDate).getTime();
    const now = Date.now();
    
    // Calculate progress as a percentage
    const progress = (now - startDate) / (endDate - startDate);
    
    // The earlier the termination, the higher the fee
    // Fee ranges from 50% (at the beginning) to 5% (near the end)
    const feePercentage = Math.max(5, 50 - (progress * 45));
    
    // Calculate fee
    return (plan.amount * feePercentage) / 100;
  }, []);
  
  // Handle plan termination
  const handleTerminatePlan = useCallback((plan: StakingPlan, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!plan.isActive) return;
    
    // Calculate the fee
    const fee = calculateTerminationFee(plan);
    
    // Calculate actual earnings at termination time
    const actualEarnings = calculateCurrentEarnings(plan);
    
    // Confirm with user
    const earningsDisplay = actualEarnings < 1 ? actualEarnings.toFixed(8) : actualEarnings.toFixed(6);
    if (confirm(`Are you sure you want to terminate this staking plan?\n\nTermination fee: ${fee.toFixed(4)} ${plan.asset}\nCurrent earnings: ${earningsDisplay} ${plan.asset}`)) {
      // Update the plan with termination details
      const updatedPlan = {
        ...plan,
        isActive: false,
        terminationDate: new Date().toISOString(),
        terminationFee: fee,
        actualEarnings: actualEarnings
      };
      
      // Save the updated plan
      stakingPlansManager.updatePlan(updatedPlan);
      
      // Notify about plan termination
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('staking-plan-terminated', { 
          detail: { plan: updatedPlan }
        });
        document.dispatchEvent(event);
      }
      
      // Refresh the view
      window.location.reload();
    }
  }, [calculateTerminationFee, calculateCurrentEarnings]);
  
  // Format date string
  const formatDate = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }, []);
  
  // Format countdown time in HH:MM:SS format for more responsive feedback
  const formatCooldownTime = useCallback((targetDateStr: string): string => {
    const targetDate = new Date(targetDateStr).getTime();
    const now = currentTime;
    
    // Calculate time remaining in milliseconds
    let timeRemaining = Math.max(0, targetDate - now);
    
    // Convert to hours, minutes and seconds
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    timeRemaining -= hoursRemaining * 1000 * 60 * 60;
    
    const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
    timeRemaining -= minutesRemaining * 1000 * 60;
    
    const secondsRemaining = Math.floor(timeRemaining / 1000);
    
    // Format as 00:00:00 with consistent width using monospace font
    return `${String(hoursRemaining).padStart(2, '0')}:${String(minutesRemaining).padStart(2, '0')}:${String(secondsRemaining).padStart(2, '0')}`;
  }, [currentTime]);
  
  // Render total claimed with immediate updates - desktop version
  const renderTotalClaimedValue = useCallback((plan: StakingPlan) => {
    if (plan.totalClaimed && plan.totalClaimed > 0) {
      return (
        <div className="flex-shrink-0 mr-6">
          <div className="flex flex-col">
            <div className="text-sm text-muted-foreground text-right">Claimed</div>
            <div className="font-medium tabular-nums">
              {plan.totalClaimed.toFixed(4)} {plan.asset}
            </div>
          </div>
        </div>
      );
    }
    return null;
  }, [currentTime, lastClaimTime]); // Use existing state dependencies instead
  
  // Render total claimed for mobile view
  const renderMobileTotalClaimedValue = useCallback((plan: StakingPlan) => {
    if (plan.totalClaimed && plan.totalClaimed > 0) {
      return (
        <div>
          <div className="text-xs text-muted-foreground text-right">Total Claimed</div>
          <div className="text-sm font-medium tabular-nums">
            {plan.totalClaimed.toFixed(4)} {plan.asset}
          </div>
        </div>
      );
    }
    return null;
  }, [currentTime, lastClaimTime]); // Use existing state dependencies instead
  
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  // Handle toggle between active and historic plans
  const handleTogglePlansView = useCallback(() => {
    setShowHistoric(!showHistoric);
  }, [showHistoric]);
  
  // Add a ref to track button elements
  const claimButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  
  // Handle claim rewards button click with immediate UI feedback
  const handleClaimRewards = useCallback((plan: StakingPlan, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isPlanReadyToClaim(plan)) return;
    
    // Get the button element that was clicked
    const buttonElement = e.currentTarget;
    
    // Store button reference for immediate updates
    claimButtonRefs.current.set(plan.id, buttonElement);
    
    // Calculate current earnings
    const currentEarnings = calculateCurrentEarnings(plan);
    
    // Create a snapshot of the current plan before updating
    const previousPlan = { ...plan };
    
    // Track the claimed amount for notifications
    const claimedAmount = currentEarnings;
    
    // Calculate cooldown end time (24 hours from now)
    const now = new Date();
    const cooldownEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Update the plan with a lastClaimed timestamp and set cooldown, but keep it active
    const updatedPlan = {
      ...plan,
      lastClaimedDate: now.toISOString(),
      lastClaimedAmount: currentEarnings,
      totalClaimed: (plan.totalClaimed || 0) + currentEarnings,
      claimCooldownUntil: cooldownEndTime.toISOString(),
    };
    
    // *** IMMEDIATE UI UPDATE ***
    // 1. Immediately disable the button
    buttonElement.disabled = true;
    
    // 2. Apply immediate visual update to the button
    buttonElement.classList.remove("bg-[#FF4D15]/10", "text-[#FF4D15]", "hover:bg-[#FF4D15]/90", "hover:text-white");
    buttonElement.classList.add("bg-muted/30", "text-muted-foreground", "cursor-not-allowed");
    
         // 3. Update button text immediately with cooldown timer
     const startTime = cooldownEndTime.getTime();
     
     // Function to update the countdown text
     const updateCountdown = () => {
       // Get the latest reference to the button
       const button = claimButtonRefs.current.get(plan.id);
       if (!button) return;
       
       const timeRemaining = Math.max(0, startTime - Date.now());
       
       // If countdown finished, reset button
       if (timeRemaining <= 0) {
         return;
       }
       
       // Calculate hours, minutes, seconds
       const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
       const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
       const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
       
               // Update button text - ensure it stays monospace
        button.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Ensure the button stays monospaced
        button.classList.add('font-mono');
       
       // Schedule next update
       if (timeRemaining > 0) {
         // Update more frequently for a more responsive countdown
         setTimeout(updateCountdown, 500);
       }
     };
     
     // Start countdown immediately
     updateCountdown();
         
    // 4. Update the React state for future renders
    setUserPlans(prevPlans => prevPlans.map(p => p.id === plan.id ? updatedPlan : p));
    // Update both time states to force immediate refresh of the total claimed display
    setCurrentTime(Date.now());
    setLastClaimTime(Date.now());
    
    // Save the updated plan
    stakingPlansManager.updatePlan(updatedPlan);
    
    // Notify about rewards claimed
    if (typeof window !== 'undefined') {
      // First send the claiming event
      const claimEvent = new CustomEvent('staking-rewards-claimed', { 
        detail: { 
          plan: updatedPlan, 
          claimedAmount: claimedAmount,
          previousPlan: previousPlan
        }
      });
      document.dispatchEvent(claimEvent);
      
      // Import and trigger sonner notifications like when creating a plan
      import('sonner').then(({ toast }) => {
        // Confirmation toast similar to when creating a plan
        toast.success(
          `Successfully claimed ${claimedAmount.toFixed(6)} ${plan.asset}`, 
          {
            description: "Your rewards have been added to your wallet.",
            duration: 4000,
            className: "reward-toast"
          }
        );
        
        // Points toast, styled and delayed like ConfirmationDialogContent
        setTimeout(() => {
          toast(
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div>
                <p className="font-medium text-base">Points Earned!</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-orange-500">+50</p>
                  <p className="text-sm text-muted-foreground">for claiming rewards</p>
                </div>
              </div>
            </div>,
            {
              className: "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800/30",
              duration: 3500
            }
          );
        }, 1200);
      }).catch(err => console.error('Error showing toast notifications:', err));
    }
  }, [isPlanReadyToClaim, calculateCurrentEarnings]);
  
  // Render current earnings with optimized NumberFlow
  const renderCurrentEarnings = useCallback((plan: StakingPlan) => {
    if (!plan.isActive) {
      return (
        <div className="font-medium text-emerald-500 flex justify-end tabular-nums">
          <span className="flex items-center">
            {plan.actualEarnings ? (plan.actualEarnings < 1 ? plan.actualEarnings.toFixed(8) : plan.actualEarnings.toFixed(6)) : '0.00'} 
            <AssetPriceTooltip asset={plan.asset as AssetTicker}>
              <span className="ml-1">{plan.asset}</span>
            </AssetPriceTooltip>
          </span>
        </div>
      );
    }
    
    // Calculate actual current earnings considering last claim time
    const calculateEffectiveEarnings = () => {
      const fullEarnings = calculateCurrentEarnings(plan);
      
      // If the plan has a lastClaimedDate, calculate earnings since that date
      if (plan.lastClaimedDate) {
        const lastClaimTime = new Date(plan.lastClaimedDate).getTime();
        const startTime = new Date(plan.startDate).getTime();
        const endTime = new Date(plan.endDate).getTime();
        const now = currentTime;
        
        // Calculate earnings rate per millisecond
        const totalDuration = endTime - startTime;
        const msEarningRate = plan.estimatedEarnings / totalDuration;
        
        // Calculate time since last claim
        const timeSinceClaim = now - lastClaimTime;
        
        // Calculate earnings since last claim
        return msEarningRate * timeSinceClaim;
      }
      
      // Otherwise return the full calculated earnings
      return fullEarnings;
    };
    
    const effectiveEarnings = calculateEffectiveEarnings();
    
    // Only use animated NumberFlow for active plans that are visible
    if (isVisible.current) {
      return (
                  <div className="font-semibold text-emerald-500 flex justify-end items-center">
          <div className="flex items-center tabular-nums">
            <NumberFlow
              key={`earnings-${plan.id}-${plan.lastClaimedDate || 'initial'}`}
              value={effectiveEarnings}
              format={{
                minimumFractionDigits: plan.estimatedEarnings < 1 ? 8 : 6,
                maximumFractionDigits: plan.estimatedEarnings < 1 ? 8 : 6
              }}
              plugins={[continuous]}
              animated={true}
            />
            <AssetPriceTooltip asset={plan.asset as AssetTicker}>
              <span className="ml-1">{plan.asset}</span>
            </AssetPriceTooltip>
          </div>
        </div>
      );
    } else {
      // When not visible, use a static display to save resources
      return (
        <div className="font-semibold text-emerald-500 flex justify-end items-center">
          <div className="flex items-center tabular-nums">
            {effectiveEarnings < 1 ? effectiveEarnings.toFixed(8) : effectiveEarnings.toFixed(6)}
            <AssetPriceTooltip asset={plan.asset as AssetTicker}>
              <span className="ml-1">{plan.asset}</span>
            </AssetPriceTooltip>
          </div>
        </div>
      );
    }
  }, [calculateCurrentEarnings, isVisible, currentTime]);
  
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-centeroverflow-hidden">
      <div key={gradientKey} className="absolute inset-0 -z-10 radial-gradient-bg"></div>
      <div id="earn-plans-container" className="z-10 text-center w-full max-w mx-auto p-4 relative h-full flex flex-col">
        <div className="mb-4 flex items-center justify-between w-full">
          <div className="text-lg font-semibold">
            {showHistoric ? 'Historic Plans' : 'Your Active Plans'}
          </div>
          {historicPlans.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTogglePlansView}
              className="h-7 px-2.5 text-xs"
            >
              {showHistoric ? 'Show Active' : 'Show Historic'}
            </Button>
          )}
        </div>
        
        {/* Main content container with flex layout */}
        <div className="w-full flex flex-col flex-grow flex-shrink-0" style={{ height: "calc(100% - 100px)" }}>
          {/* Plans list in a scrollable container */}
          <div className="space-y-4 w-full overflow-y-auto flex-grow mb-4" style={{ minHeight: "150px" }}>
            {currentPlans.length > 0 ? (
              currentPlans.map(plan => (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "overflow-hidden bg-[hsl(var(--primary-foreground))] text-left",
                    "border-[hsl(var(--color-widget-inset-border))]",
                    "transition-opacity duration-200",
                    hoveredPlanId && hoveredPlanId !== plan.id ? "opacity-60" : "opacity-100"
                  )}
                  onMouseEnter={() => setHoveredPlanId(plan.id)}
                  onMouseLeave={() => setHoveredPlanId(null)}
                >
                  <div className="p-4 flex items-center">
                    {/* Token Icon and Amount */}
                    <div className="flex items-center">
                      <div className="w-12 h-12 flex items-center justify-center overflow-hidden mr-4">
                        <img 
                          src={`/assets/symbols/${plan.asset}.svg`} 
                          alt={plan.asset}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.outerHTML = `<div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">${plan.asset.charAt(0)}</div>`;
                          }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="text-sm text-muted-foreground">Staked</div>
                        <div className="font-medium flex items-center gap-1">
                          <span>{plan.amount}</span>
                          <AssetPriceTooltip asset={plan.asset as AssetTicker}>
                            <button 
                              type="button"
                              className="font-jakarta font-bold text-sm rounded-md px-1"
                              style={{ 
                                color: ASSETS[plan.asset as AssetTicker].theme[resolvedTheme as 'light' | 'dark'],
                                backgroundColor: `${ASSETS[plan.asset as AssetTicker].theme[resolvedTheme as 'light' | 'dark']}14`,
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                const target = e.currentTarget;
                                target.style.backgroundColor = ASSETS[plan.asset as AssetTicker].theme[resolvedTheme as 'light' | 'dark'];
                                target.style.color = 'hsl(var(--color-widget-bg))';
                              }}
                              onMouseLeave={(e) => {
                                const target = e.currentTarget;
                                target.style.backgroundColor = `${ASSETS[plan.asset as AssetTicker].theme[resolvedTheme as 'light' | 'dark']}14`;
                                target.style.color = ASSETS[plan.asset as AssetTicker].theme[resolvedTheme as 'light' | 'dark'];
                              }}
                            >
                              {plan.asset}
                            </button>
                          </AssetPriceTooltip>
                        </div>
                      </div>
                    </div>

                    {/* Ends Date */}
                    <div className="flex-shrink-0 ml-8 mr-6">
                      <div className="flex flex-col">
                        <div className="text-sm text-muted-foreground">Ends</div>
                        <div className="font-medium">{formatDate(plan.endDate)}</div>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex-shrink-0 mr-6">
                      <div className="flex flex-col">
                        <div className="text-sm text-muted-foreground">Duration</div>
                        <div className="font-medium">
                          {Math.ceil((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-auto"></div>
                    
                    {/* Total claimed - only show if there have been claims */}
                    {renderTotalClaimedValue(plan)}

                    {/* Earnings */}
                    <div className="flex-shrink-0 mr-6">
                      <div className="flex flex-col">
                        <div className="text-sm text-muted-foreground text-right">Earnings</div>
                        {renderCurrentEarnings(plan)}
                      </div>
                    </div>

                    {/* Claim Button */}
                    <div className="flex-shrink-0">
                      {plan.isActive ? (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={!isPlanReadyToClaim(plan)}
                            className={cn(
                              "h-8 text-sm font-bold border-transparent",
                              isPlanReadyToClaim(plan) 
                                ? "bg-[#FF4D15]/10 text-[#FF4D15] hover:bg-[#FF4D15]/90 hover:text-white"
                                : "bg-muted/30 text-muted-foreground cursor-not-allowed",
                              plan.claimCooldownUntil && new Date(plan.claimCooldownUntil).getTime() > currentTime ? "font-mono" : ""
                            )}
                            onClick={(e) => handleClaimRewards(plan, e)}
                          >
                            {plan.claimCooldownUntil && new Date(plan.claimCooldownUntil).getTime() > currentTime 
                              ? formatCooldownTime(plan.claimCooldownUntil)
                              : "Claim"}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                              >
                                <span className="sr-only">Open menu</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-4 h-4"
                                >
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="12" cy="5" r="1" />
                                  <circle cx="12" cy="19" r="1" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-fit">
                              <DropdownMenuItem
                                className={cn(
                                  "cursor-pointer transition-colors whitespace-nowrap",
                                  isPlanReadyToClaim(plan)
                                    ? "hover:bg-[#FF4D15] hover:text-white focus:bg-[#FF4D15] focus:text-white"
                                    : "text-muted-foreground cursor-not-allowed hover:bg-muted/30 focus:bg-muted/30"
                                )}
                                onClick={(e) => handleClaimRewards(plan, e as unknown as React.MouseEvent<HTMLButtonElement>)}
                                disabled={!isPlanReadyToClaim(plan)}
                              >
                                Claim rewards
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer transition-colors hover:bg-destructive hover:text-white focus:bg-destructive focus:text-white whitespace-nowrap"
                                onClick={(e) => handleTerminatePlan(plan, e as unknown as React.MouseEvent<HTMLButtonElement>)}
                              >
                                Terminate early
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {plan.terminationDate ? 'Terminated' : 'Completed'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Mobile view - Collapse to stacked layout on small screens */}
                  <div className="md:hidden border-t p-4 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Ends</div>
                      <div className="text-sm font-medium">{formatDate(plan.endDate)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                      <div className="text-sm font-medium">
                        {Math.ceil((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                      </div>
                    </div>
                    {renderMobileTotalClaimedValue(plan)}
                    <div>
                      <div className="text-xs text-muted-foreground">Earnings</div>
                      {renderCurrentEarnings(plan)}
                    </div>
                    <div className="flex justify-end items-center">
                      {plan.isActive && (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={!isPlanReadyToClaim(plan)}
                            className={cn(
                              "h-7 text-xs font-bold border-transparent",
                              isPlanReadyToClaim(plan) 
                                ? "bg-[#FF4D15]/10 text-[#FF4D15] hover:bg-[#FF4D15]/90 hover:text-white"
                                : "bg-muted/30 text-muted-foreground cursor-not-allowed",
                              plan.claimCooldownUntil && new Date(plan.claimCooldownUntil).getTime() > currentTime ? "font-mono" : ""
                            )}
                            onClick={(e) => handleClaimRewards(plan, e)}
                          >
                            {plan.claimCooldownUntil && new Date(plan.claimCooldownUntil).getTime() > currentTime 
                              ? formatCooldownTime(plan.claimCooldownUntil)
                              : "Claim"}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleTerminatePlan(plan, e)}
                          >
                            <span className="sr-only">Terminate plan</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Show additional info for historic plans if there is termination fee */}
                  {showHistoric && plan.terminationFee !== undefined && (
                    <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t p-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Termination Fee</p>
                        <div className="font-medium text-amber-500 tabular-nums flex items-center gap-1">
                          <span>{plan.terminationFee.toFixed(4)}</span>
                          <AssetPriceTooltip asset={plan.asset as AssetTicker}>
                            <button 
                              type="button"
                              className="font-jakarta font-bold text-sm rounded-md px-1"
                              style={{ 
                                color: ASSETS[plan.asset as AssetTicker].theme[resolvedTheme as 'light' | 'dark'],
                                backgroundColor: `${ASSETS[plan.asset as AssetTicker].theme[resolvedTheme as 'light' | 'dark']}14`,
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                const target = e.currentTarget;
                                target.style.backgroundColor = ASSETS[plan.asset as AssetTicker].theme[resolvedTheme as 'light' | 'dark'];
                                target.style.color = 'hsl(var(--color-widget-bg))';
                              }}
                              onMouseLeave={(e) => {
                                const target = e.currentTarget;
                                target.style.backgroundColor = `${ASSETS[plan.asset as AssetTicker].theme[resolvedTheme as 'light' | 'dark']}14`;
                                target.style.color = ASSETS[plan.asset as AssetTicker].theme[resolvedTheme as 'light' | 'dark'];
                              }}
                            >
                              {plan.asset}
                            </button>
                          </AssetPriceTooltip>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Terminated On</p>
                        <p className="font-medium">
                          {plan.terminationDate ? formatDate(plan.terminationDate) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <div className="flex flex-col justify-center items-center h-full min-h-[150px] text-center text-muted-foreground py-8">
                <span>
                  {showHistoric ? 'No historic plans found' : 'No active staking plans found'}
                </span>
                <ShimmerButton
                  className="mt-4 px-4 py-2 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold w-fit min-w-0"
                  shimmerColor="rgba(16, 185, 129, 0.5)"
                  shimmerDuration="4s"
                  borderRadius="8px"
                  background="rgba(16,185,129,0.08)"
                  onClick={onNewPlan}
                >
                  Start Earning
                </ShimmerButton>
              </div>
            )}
          </div>
          
          {/* Pagination controls - fixed at the bottom */}
          <div className="w-full flex-shrink-0">
            {totalPages > 1 && (
              <div className="flex justify-center">
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    &lt;
                  </Button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    &gt;
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Add a new plan button */}
        {!showHistoric && (
          <div className="flex flex-col items-center justify-center h-full">
            <Button
              className="mt-4 px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-semibold w-fit min-w-0"
              onClick={onNewPlan}
              style={{ width: 'fit-content' }}
            >
              Start new staking plan
            </Button>
            <span className="text-xs text-muted-foreground mt-1">
              explore all options below
            </span>
          </div>
        )}
      </div>
    </div>
  );
}; 