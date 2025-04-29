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
import { openWidgetDialog, resetDialogOpenedState, forceOpenDialog } from '@/lib/widgetDialogService';

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

// Helper function to check if we're in a dialog
const isInDialog = (): boolean => {
  // Find dialog elements in the DOM
  return !!document.querySelector('[role="dialog"]') || 
         !!document.querySelector('.dialog-content') ||
         !!document.querySelector('.DialogContent') ||
         !!document.querySelector('.DialogOverlay');
};

// Function to more aggressively reset dialog state
const forceResetDialogState = () => {
  // First call the standard reset function
  resetDialogOpenedState();
  
  // Force reset dialog state flags in the DOM
  document.querySelectorAll('[data-dialog-open="true"]').forEach(el => {
    el.setAttribute('data-dialog-open', 'false');
  });
  
  // Remove open dialog classes from body and containers
  document.body.classList.remove('widget-dialog-open');
  document.querySelectorAll('.widget-dialog-open').forEach(el => {
    el.classList.remove('widget-dialog-open');
  });
  
  // Clear any URL hash parameters related to dialogs
  if (window.location.hash.includes('widget=') || window.location.hash.includes('asset=')) {
    const newUrl = new URL(window.location.href);
    newUrl.hash = '';
    window.history.replaceState(
      { dialogClosed: true, timestamp: Date.now() },
      '',
      newUrl.toString()
    );
  }
};

// Modified function to handle token staking
const handleTokenStake = (token: string) => {
  // Always force reset dialog state first
  forceResetDialogState();
  
  // Create a cleanup event
  const closeEvent = new CustomEvent('close-widget-dialogs', {
    bubbles: true
  });
  
  // Dispatch the close event
  document.dispatchEvent(closeEvent);
  
  // Set a flag in sessionStorage to indicate the exact asset we want to maintain
  sessionStorage.setItem('selected_stake_asset', token);
  
  // When on earn page, update URL with the correct asset parameter
  if (window.location.pathname === '/earn') {
    // Don't clear the hash first - instead set the properly formatted URL directly
    window.history.replaceState(
      null, 
      '', 
      `${window.location.pathname}#widget=earn-stake&asset=${token}`
    );
  }
  
  // Put a small delay to ensure everything is cleared
  setTimeout(() => {
    // Use the updated openWidgetDialog function with exactMatchOnly parameter
    openWidgetDialog('earn-stake', 'direct', token, true);
  }, 350); // Increased timeout to ensure previous dialog is fully closed
};

// Modified function to handle dialog closed events
const handleDialogClosed = () => {
  // ALWAYS clear session storage to prevent reopening when navigating back
  sessionStorage.removeItem('selected_stake_asset');
  
  // Also ensure URL hash is cleaned if we're on the earn page
  if (window.location.pathname === '/earn') {
    // Only clear if the hash contains widget parameter
    if (window.location.hash.includes('widget=')) {
      window.history.replaceState(
        { dialogClosed: true, timestamp: Date.now() },
        '',
        window.location.pathname
      );
    }
  }
};

// Modified function for the ripple view staking button
const handleGetStartedClick = () => {
  // Always force reset dialog state first
  forceResetDialogState();
  
  // Clear any recent closure protection
  sessionStorage.removeItem('dialog_last_closed');
  
  // Feature a random token
  const featuredToken = stakingTokens[Math.floor(Math.random() * stakingTokens.length)];
  
  // Create a cleanup event
  const closeEvent = new CustomEvent('close-widget-dialogs', {
    bubbles: true
  });
  
  // Dispatch the close event
  document.dispatchEvent(closeEvent);
  
  // When on earn page, update URL properly
  if (window.location.pathname === '/earn') {
    // Use proper format with widget parameter
    window.history.replaceState(
      null, 
      '', 
      `${window.location.pathname}#widget=earn-stake&asset=${featuredToken}`
    );
  } else {
    // Not on earn page, use updateUrlWithAsset
    updateUrlWithAsset(featuredToken);
  }
  
  // Put a small delay to ensure everything is cleared
  setTimeout(() => {
    // Force open the dialog
    forceOpenDialog('earn-stake', featuredToken);
  }, 250);
};

// Refactored function to open staking dialogs from URL or direct calls
export function openEarnWidgetWithAsset(asset: string) {
  if (!asset || !stakingTokens.includes(asset)) {
    console.warn('Invalid asset for staking dialog:', asset);
    return;
  }
  
  // Always force reset dialog state first
  forceResetDialogState();
  
  // Create a cleanup event
  const closeEvent = new CustomEvent('close-widget-dialogs', {
    bubbles: true
  });
  
  // Dispatch the close event
  document.dispatchEvent(closeEvent);
  
  // When on earn page, update URL differently to avoid unwanted parameters
  if (window.location.pathname === '/earn') {
    // Use proper format with widget parameter
    window.history.replaceState(
      null, 
      '', 
      `${window.location.pathname}#widget=earn-stake&asset=${asset}`
    );
  } else {
    // Not on earn page, use updateUrlWithAsset
    updateUrlWithAsset(asset);
  }
  
  // Put a small delay to ensure everything is cleared
  setTimeout(() => {
    // Use the updated openWidgetDialog function with exactMatchOnly parameter
    openWidgetDialog('earn-stake', 'direct', asset, true);
  }, 350); // Increased timeout to ensure previous dialog is fully closed
}

// Helper function to update URL with asset parameter
const updateUrlWithAsset = (asset: string) => {
  if (!asset || !stakingTokens.includes(asset)) return;
  
  try {
    const url = new URL(window.location.href);
    const currentPath = url.pathname;
    const isEarnPage = currentPath === '/earn';
    const isDialogOpen = isInDialog();
    
    // Check if the asset is already in the URL hash
    const currentAsset = url.hash.match(/asset=([^&]*)/)?.[1];
    if (currentAsset === asset) {
      // Asset is already correctly set, don't update URL
      return;
    }
    
    // Don't modify URL on the earn page unless in a dialog
    if (isEarnPage && !isDialogOpen) return;
    
    // On earn page in dialog, use dialog URL format with widget parameter
    if (isEarnPage && isDialogOpen) {
      if (url.hash.includes('widget=earn-stake')) {
        // Preserve the widget parameter if it exists
        const newHash = url.hash.replace(/asset=[^&]*/, `asset=${asset}`);
        if (!newHash.includes('asset=')) {
          // Add asset parameter if it doesn't exist
          history.replaceState(null, '', `${currentPath}${newHash}&asset=${asset}`);
        } else {
          // Just update the existing asset parameter
          history.replaceState(null, '', `${currentPath}${newHash}`);
        }
      } else {
        // Include widget parameter when updating URL
        history.replaceState(null, '', `${currentPath}#widget=earn-stake&asset=${asset}`);
      }
      return;
    }
    
    // Otherwise, use normal URL formatting
    // Parse current hash parts
    const currentHash = url.hash || '#';
    const hashParts = currentHash.substring(1).split('&').filter(part => 
      part && !part.startsWith('asset=')
    );
    
    // Add asset parameter if it's valid
    hashParts.push(`asset=${asset}`);
    
    // Only add widget parameter if we're not on the earn page and it's not already present
    if (!isEarnPage && !hashParts.some(part => part.startsWith('widget='))) {
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
    
    // Check if we have a widget=earn-stake parameter first
    if (url.hash.includes('widget=earn-stake')) {
      // Then look for the asset parameter
      const assetParam = url.hash.match(/asset=([^&]*)/)?.[1];
      if (assetParam && stakingTokens.includes(assetParam)) {
        console.log('📱 Found valid asset in URL:', assetParam);
        return assetParam;
      }
    } else if (url.hash.includes('asset=')) {
      // Also check for standalone asset parameter
      const assetParam = url.hash.match(/asset=([^&]*)/)?.[1];
      if (assetParam && stakingTokens.includes(assetParam)) {
        console.log('📱 Found valid standalone asset in URL:', assetParam);
        return assetParam;
      }
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

// Modify the detectAndHandleAssetUrl function to prevent reopening closed dialogs
const detectAndHandleAssetUrl = () => {
  // Only run on the earn page
  if (window.location.pathname !== '/earn') return;

  // Skip if dialog is already open
  if (isInDialog()) return;
  
  // Skip if we just closed a dialog (within the last 1 second - reduced from 2 seconds)
  const lastCloseTime = parseInt(sessionStorage.getItem('dialog_last_closed') || '0', 10);
  const now = Date.now();
  if (now - lastCloseTime < 1000) {
    console.log('🛑 Skipping URL detection because a dialog was recently closed');
    return;
  }
  
  // Check if this is a direct URL navigation from fresh page load
  const navData = sessionStorage.getItem('directDialogNavigation');
  if (navData) {
    try {
      const data = JSON.parse(navData);
      if (data.isInitialLoad && Date.now() - data.timestamp < 10000) { // Within 10 seconds of navigation
        console.log('🚀 Detected direct navigation from fresh page load, handling...');
        // Let the widget dialog service handle direct navigation
        // and avoid duplicate dialog opens
        return;
      }
    } catch (e) {
      console.error('Error parsing direct dialog navigation data:', e);
    }
  }
  
  // Extract asset from URL first thing, before any modifications
  const hash = window.location.hash;
  let assetFromUrl: string | null = null;
  
  // Check for asset parameter with highest priority
  if (hash) {
    const assetMatch = hash.match(/asset=([^&]*)/);
    if (assetMatch && assetMatch[1] && stakingTokens.includes(assetMatch[1])) {
      assetFromUrl = assetMatch[1];
      console.log('🔍 Detected asset in URL during initial URL check:', assetFromUrl);
      
      // Store in session storage to ensure it persists
      sessionStorage.setItem('selected_stake_asset', assetFromUrl);
    }
  }
  
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
    // Set initial default based on widget ID
    if (props.widgetId === 'earn-assets') return 'cards';
    if (props.widgetId === 'earn-promo') return 'ripple';
    if (props.widgetId === 'earn-stake') return 'stake';
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
          sessionStorage.setItem('selected_stake_asset', finalAsset);
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
      handleDialogClosed();
      
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
  // Store the initial asset from URL to use in the component
  const [featuredToken, setFeaturedToken] = useState(() => {
    // Use our helper function to get the initial asset with priority for URL parameters
    return getInitialAssetFromAllSources();
  });

  // Prevent hash change loops
  const ignoreNextHashChange = useRef(false);

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
          <Button onClick={handleRippleGetStartedClick}>
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
    // Clear any recent closure protection
    sessionStorage.removeItem('dialog_last_closed');
    
    // Always force reset dialog state first
    forceResetDialogState();
    
    // Create a cleanup event
    const closeEvent = new CustomEvent('close-widget-dialogs', {
      bubbles: true
    });
    
    // Dispatch the close event
    document.dispatchEvent(closeEvent);
    
    // Set a flag in sessionStorage to indicate the exact asset we want to maintain
    sessionStorage.setItem('selected_stake_asset', token);
    
    // When on earn page, update URL properly
    if (window.location.pathname === '/earn') {
      // Use proper format with widget parameter
      window.history.replaceState(
        null, 
        '', 
        `${window.location.pathname}#widget=earn-stake&asset=${token}`
      );
    } else {
      // Not on earn page, use updateUrlWithAsset
      updateUrlWithAsset(token);
    }
    
    // Put a small delay to ensure everything is cleared
    setTimeout(() => {
      // Force open the dialog
      forceOpenDialog('earn-stake', token);
    }, 250);
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
  const handleAssetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAsset = e.target.value;
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
              onChange={handleAssetChange}
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
  } else {
    updateUrlWithAsset(asset);
  }
  
  // Open dialog with a new event ID to ensure it's processed
  const eventId = `force-open-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  openWidgetDialog('earn-stake', 'direct', asset, true);
} 