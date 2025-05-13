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
import { MatterStacking } from './magicui/MatterStacking';
import { EarnWidgetState, widgetStateRegistry, createDefaultEarnWidgetState } from '@/lib/widgetState';
import { DASHBOARD_LAYOUT_KEY } from '@/types/widgets';
import { Slider } from './ui/slider';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';
import { ChartContainer, ChartConfig } from './ui/chart';
import { openWidgetDialog, resetDialogOpenedState, forceOpenDialog } from '@/lib/widgetDialogService';
import { ShimmerButton } from './magicui/shimmer-button';
import { Input } from './ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from './ui/table';
import { AssetButtonWithPrice } from './AssetPriceTooltip';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { stakingPlansManager, StakingPlan } from './EarnConfirmationContent';
import NumberFlow, { continuous } from '@number-flow/react';
import { AssetPriceTooltip } from './AssetPriceTooltip';

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
  network: token === 'ETH' || token === 'MATIC' ? 'Ethereum' : 
           token === 'DOT' || token === 'KSM' ? 'Polkadot' : 
           token === 'ADA' ? 'Cardano' : 
           token === 'XTZ' ? 'Tezos' : 'Blockchain',
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
  viewState?: Record<string, any>;
}

// Keep track of processed URLs to avoid duplicate processing
const processedUrls = new Set<string>();

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
  
  // Check if we're on the EarnPage to add the max-height constraint
  const isEarnPage = window.location.pathname === '/earn';
  
  // When on earn page, update URL with the correct asset parameter
  if (isEarnPage) {
    // Don't clear the hash first - instead set the properly formatted URL directly
    window.history.replaceState(
      null, 
      '', 
      `${window.location.pathname}#widget=earn-stake&asset=${token}`
    );
    
    // Set a flag for the dialog height constraint
    sessionStorage.setItem('earn_dialog_height_constraint', 'true');
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
  
  // Clear processed URLs to allow re-processing the same URL when manually reentered
  processedUrls.clear();
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
  
  // Check if we already have an open dialog
  if (isInDialog()) {
    console.log('📌 Dialog already open, just updating asset:', asset);
    
    // Store in session storage to ensure it's picked up
    sessionStorage.setItem('selected_stake_asset', asset);
    
    // When on earn page, update URL differently to avoid unwanted parameters
    if (window.location.pathname === '/earn') {
      // Use proper format with widget parameter
      window.history.replaceState(
        null, 
        '', 
        `${window.location.pathname}#widget=earn-stake&asset=${asset}`
      );
      
      // Set a flag for the dialog height constraint
      sessionStorage.setItem('earn_dialog_height_constraint', 'true');
    } else {
      // Not on earn page, use updateUrlWithAsset
      updateUrlWithAsset(asset);
    }
    
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
    
    // Set a flag for the dialog height constraint
    sessionStorage.setItem('earn_dialog_height_constraint', 'true');
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

// Update the AssetIcon component to support size options and text hiding
const AssetIcon: React.FC<{ 
  asset: AssetTicker, 
  iconPosition?: 'before' | 'after',
  iconSize?: 'small' | 'medium' | 'large',
  showText?: boolean,
  className?: string
}> = ({ 
  asset, 
  iconPosition = 'after',
  iconSize = 'small',
  showText = true,
  className = '' 
}) => {
  const assetConfig = ASSETS[asset];
  
  // Determine size class based on iconSize prop
  const sizeClass = iconSize === 'large' ? 'w-6 h-6' : 
                   iconSize === 'medium' ? 'w-5 h-5' : 'w-4 h-4';
  
  const iconElement = assetConfig?.icon ? (
    <img
      src={assetConfig.icon}
      alt={asset}
      className={`${sizeClass} object-contain`}
      onError={(e) => {
        // Replace with letter placeholder on image load error
        const target = e.target as HTMLImageElement;
        target.outerHTML = `<span class="${sizeClass} rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">${asset.charAt(0)}</span>`;
      }}
    />
  ) : (
    <span className={`${sizeClass} rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold`}>
      {asset.charAt(0)}
    </span>
  );
  
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {iconPosition === 'before' && iconElement}
      {showText && <span>{asset}</span>}
      {iconPosition === 'after' && iconElement}
    </span>
  );
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
    <CardGridView forcedTheme={forcedTheme} widgetId={props.widgetId} />
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
    const plans = stakingPlansManager.getPlans();
    setUserPlans(plans);
    setShowPlans(plans.length > 0);
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
          onTokenClick={handleTokenClick}
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

// For special handling in CardGridView
const isStaticWidget = (widgetId: string): boolean => {
  return widgetId.includes('-static');
};

// Card Grid View component for token browsing
const CardGridView: React.FC<{ forcedTheme?: 'light' | 'dark', widgetId?: string }> = ({ forcedTheme, widgetId }) => {
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
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    const token = target.alt;
    // Replace with letter placeholder on image load error
    target.outerHTML = `<div class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">${token.charAt(0)}</div>`;
  };
  
  // Check if this is a static widget (on EarnPage)
  const isOnStaticPage = widgetId ? isStaticWidget(widgetId) : false;
  
  // Log rendering mode
  useEffect(() => {
    console.log(`CardGridView rendering with widgetId: ${widgetId}, isStatic: ${isOnStaticPage}`);
  }, [widgetId, isOnStaticPage]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tokenData.map((token) => (
        <Card 
          key={token.symbol} 
          className={cn(
            "overflow-hidden hover:shadow-md transition-shadow bg-[hsl(var(--primary-foreground))]",
            forcedTheme === 'dark' ? "border-border" : "border-border"
          )}
        >
          <CardHeader className="p-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 mr-4 flex items-center justify-center overflow-hidden">
                  <img 
                    src={`/assets/symbols/${token.symbol}.svg`} 
                    alt={token.symbol}
                    className="w-full h-full object-contain"
                    onError={handleImageError}
                  />
                </div>
                <div>
                  <CardTitle className="text-xl">{token.symbol}</CardTitle>
                  <p className="text-xs text-muted-foreground">on {token.network}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">${(token.minStake * 23.5).toFixed(2)}M</div>
                <div className="text-xs text-muted-foreground">TVL</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 pb-2">
            <div className="space-y-1 ">
              <div className="flex justify-between bg-[hsl(var(--color-widget-inset))] border border-[hsl(var(--color-widget-inset-border))] rounded-lg p-6">
                <span className="text-md text-muted-foreground">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="border-b border-dotted border-muted-foreground">APY</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Annual Percentage Yield - the yearly return on your staked assets.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
                <span className="text-md text-emerald-500 font-medium">{token.apy}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="bg-[hsl(var(--color-widget-inset))] border border-[hsl(var(--color-widget-inset-border))] rounded-lg p-6 pt-4 pb-4 flex flex-col items-left">
                  <span className="text-sm text-muted-foreground pb-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="border-b border-dotted border-muted-foreground">30d Avg APY</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Average Annual Percentage Yield over the last 30 days.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <span className="text-md font-medium">8.97%</span>
                </div>
                <div className="bg-[hsl(var(--color-widget-inset))] border border-[hsl(var(--color-widget-inset-border))] rounded-lg p-6 pt-4 pb-4 flex flex-col items-left">
                  <span className="text-sm text-muted-foreground pb-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="border-b border-dotted border-muted-foreground">30d Prediction</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Estimated APY for the next 30 days based on recent trends.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <div className="flex flex-col items-left">
                    <span className="text-md font-medium text-emerald-500">&gt;7.45%</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 pb-3 bg-[hsl(var(--color-widget-inset))] border border-[hsl(var(--color-widget-inset-border))] rounded-lg p-6">
                <div className="text-sm text-muted-foreground mt-2 pb-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="border-b border-dotted border-muted-foreground">Historical APY</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Past APY performance over different time periods.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex justify-between">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">24h</span>
                    <span className="text-sm">-</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">7d</span>
                    <span className="text-sm text-emerald-500">9.53%</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">30d</span>
                    <span className="text-sm text-emerald-500">9.57%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-2">
            <Button 
              className="w-full bg-primary/10 text-primary hover:bg-primary/20 font-medium text-base py-6" 
              size="lg"
              onClick={() => handleStakeClick(token.symbol)}
            >
              Earn {token.symbol}
            </Button>
          </CardFooter>
        </Card>
      ))}
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

  // Handle time frame changes
  const handleTimeFrameChange = (value: string) => {
    setSelectedTimeFrame(value);
  };

  // Create a function to calculate reasonable chart bounds based on earnings values
  const getChartYDomain = () => {
    // Get all the earnings values
    const values = [
      parseFloat(estimatedEarningsWithModifiers["1m"].earnings),
      parseFloat(estimatedEarningsWithModifiers["3m"].earnings),
      parseFloat(estimatedEarningsWithModifiers["6m"].earnings),
      parseFloat(estimatedEarningsWithModifiers["1y"].earnings),
      parseFloat(estimatedEarningsWithModifiers["2y"].earnings)
    ].filter(val => !isNaN(val) && isFinite(val) && val >= 0);
    
    if (values.length === 0) return [0, 10];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Add a bit of padding (10%) for visual appeal
    const padding = (max - min) * 0.1;
    
    // Ensure minimum is never below zero for this chart
    return [Math.max(0, min - padding), max + padding];
  };

  // Add this function to the StakeView component (around line 1590)
  // Add this near the other event handlers in StakeView
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
        import('react-dom').then(({ createRoot }) => {
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
            <label className="text-sm font-mediu pb-2">Time Frame</label>
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

// The exported wrapper component that includes the widget container
export const EarnWidgetWrapper: React.FC<EarnWidgetProps> = (props) => {
  // If we're in content-only mode, just return the EarnWidget itself without container
  if (props.viewState?.useContentOnly) {
    console.log(`EarnWidgetWrapper rendering in content-only mode: ${props.widgetId}`);
    return (
      <EarnWidget
        widgetId={props.widgetId}
        defaultViewMode={props.defaultViewMode}
        onViewModeChange={props.onViewModeChange}
        viewState={props.viewState}
      />
    );
  }
  
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
          viewState={props.viewState}
        />
      }
    >
      <EarnWidget
        widgetId={props.widgetId}
        defaultViewMode={props.defaultViewMode}
        onViewModeChange={props.onViewModeChange}
        viewState={props.viewState}
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

// Add new ActivePlansView component
const ActivePlansView: React.FC<{ plans: StakingPlan[], onNewPlan: () => void }> = ({ plans, onNewPlan }) => {
  const { resolvedTheme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<StakingPlan | null>(plans[0] || null);
  const [gradientKey, setGradientKey] = useState<number>(Date.now());
  const [showHistoric, setShowHistoric] = useState<boolean>(false);
  // Add state to track current time for real-time updates
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  
  // Calculate active and historic plans
  const activePlans = plans.filter(plan => plan.isActive);
  const historicPlans = plans.filter(plan => !plan.isActive);
  
  // Force update of the gradient when theme changes
  useEffect(() => {
    setGradientKey(Date.now());
  }, [resolvedTheme]);
  
  // Add effect for real-time updates of earnings using requestAnimationFrame
  useEffect(() => {
    let frameId: number;
    
    // Use requestAnimationFrame for smoother updates
    const updateTime = () => {
      setCurrentTime(Date.now());
      frameId = requestAnimationFrame(updateTime);
    };
    
    // Start the animation frame loop
    frameId = requestAnimationFrame(updateTime);
    
    // Clean up
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);
  
  // Calculate current earnings for a plan with a continuous growth model
  const calculateCurrentEarnings = (plan: StakingPlan): number => {
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
  };
  
  // Calculate remaining time for a plan
  const formatRemainingTime = (plan: StakingPlan): string => {
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
  };
  
  // Calculate termination fee for a plan
  const calculateTerminationFee = (plan: StakingPlan): number => {
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
  };
  
  // Handle plan termination
  const handleTerminatePlan = (plan: StakingPlan) => {
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
  };
  
  // Format date string
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 overflow-hidden">
      <div key={gradientKey} className="absolute inset-0 -z-10 radial-gradient-bg"></div>
      <div className="z-10 text-center max-w-lg mx-auto relative w-full">
        <div className="mb-4 flex items-center justify-between w-full">
          <div className="text-lg font-semibold">
            {showHistoric ? 'Historic Plans' : 'Your Active Staking Plans'}
          </div>
          {historicPlans.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowHistoric(!showHistoric)}
              className="h-7 px-2.5 text-xs"
            >
              {showHistoric ? 'Show Active' : 'Show Historic'}
            </Button>
          )}
        </div>
        
        {/* Show active or historic plans */}
        <div className="space-y-4 w-full">
          {showHistoric ? (
            // Historic plans
            historicPlans.length > 0 ? (
              historicPlans.map(plan => (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "overflow-hidden bg-[hsl(var(--primary-foreground))] text-left",
                    "border-[hsl(var(--color-widget-inset-border))]"
                  )}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 mr-3 flex items-center justify-center overflow-hidden">
                          <img 
                            src={`/assets/symbols/${plan.asset}.svg`} 
                            alt={plan.asset}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.outerHTML = `<div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">${plan.asset.charAt(0)}</div>`;
                            }}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-base">{plan.amount} {plan.asset}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(plan.startDate)} - {plan.terminationDate ? formatDate(plan.terminationDate) : formatDate(plan.endDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-muted-foreground">
                          {plan.terminationDate ? 'Terminated early' : 'Completed'}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 pb-4">
                    <div className="grid grid-cols-2 gap-4">
                                              <div>
                          <p className="text-xs text-muted-foreground">Earned</p>
                          <p className="font-medium text-emerald-500 flex justify-end tabular-nums w-full">
                            <span className="flex items-center">
                              {plan.actualEarnings ? (plan.actualEarnings < 1 ? plan.actualEarnings.toFixed(8) : plan.actualEarnings.toFixed(6)) : '0.00'} 
                              <AssetPriceTooltip asset={plan.asset as AssetTicker}>
                                <span className="ml-1">{plan.asset}</span>
                              </AssetPriceTooltip>
                            </span>
                          </p>
                        </div>
                      {plan.terminationFee !== undefined && (
                        <div>
                          <p className="text-xs text-muted-foreground">Termination Fee</p>
                          <p className="font-medium text-amber-500 flex justify-end tabular-nums w-full">
                            <span className="flex items-center">
                              {plan.terminationFee.toFixed(2)} 
                              <AssetPriceTooltip asset={plan.asset as AssetTicker}>
                                <span className="ml-1">{plan.asset}</span>
                              </AssetPriceTooltip>
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No historic plans found
              </div>
            )
          ) : (
            // Active plans
            activePlans.length > 0 ? (
              activePlans.map(plan => (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "overflow-hidden bg-[hsl(var(--primary-foreground))] text-left cursor-pointer",
                    "border-[hsl(var(--color-widget-inset-border))]",
                    selectedPlan?.id === plan.id ? "border-primary/50" : ""
                  )}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 mr-3 flex items-center justify-center overflow-hidden">
                          <img 
                            src={`/assets/symbols/${plan.asset}.svg`} 
                            alt={plan.asset}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.outerHTML = `<div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">${plan.asset.charAt(0)}</div>`;
                            }}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-base">{plan.amount} {plan.asset}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
                          </p>
                        </div>
                      </div>
                                              <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-500 flex justify-end items-center">
                          <div className="flex items-center tabular-nums">
                            <NumberFlow
                              value={calculateCurrentEarnings(plan)}
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
                        <div className="text-xs text-muted-foreground text-right">
                          {formatRemainingTime(plan)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {selectedPlan?.id === plan.id && (
                    <CardContent className="p-4 pt-2 pb-4 border-t">
                      <div className="flex items-center justify-between">
                                                  <div>
                            <p className="text-xs text-muted-foreground">Estimated Total</p>
                            <p className="font-medium flex justify-end tabular-nums w-full">
                              <span className="flex items-center">
                                {plan.estimatedEarnings < 1 ? plan.estimatedEarnings.toFixed(8) : plan.estimatedEarnings.toFixed(6)} 
                                <AssetPriceTooltip asset={plan.asset as AssetTicker}>
                                  <span className="ml-1">{plan.asset}</span>
                                </AssetPriceTooltip>
                              </span>
                            </p>
                          </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTerminatePlan(plan);
                          }}
                        >
                          Terminate Early
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No active staking plans found
              </div>
            )
          )}
        </div>
        
        {/* Add a new plan button */}
        {!showHistoric && (
          <Button 
            className="mt-6 bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={onNewPlan}
          >
            Start new staking plan
          </Button>
        )}
      </div>
    </div>
  );
}; 