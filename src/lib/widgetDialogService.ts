import { useEffect, useState, useRef, useCallback } from 'react';

// Tracks whether a dialog has already been opened in this session
let dialogAlreadyOpened = false;

// Tracks whether the URL hash has been handled already
let hashDialogHandled = false;

// Track the currently processing event to prevent duplicates
let currentEventId: string | null = null;

// Track if a dialog is in the process of closing - exported for use in App.tsx
export let isClosingDialog = false;

// Track if we're ignoring hash changes temporarily
let ignoreHashChanges = false;

// Central dialog registry to track all open dialogs
const openDialogs = new Set<string>();

// Add flag to track if this is a fresh page load
let isInitialPageLoad = true;

// Add flag to track if direct navigation is in progress
let isHandlingDirectNavigation = false;

// Add flag to track if another dialog is currently being opened
let isOpeningDialog = false;

// Extracts widget ID from URL hash
export function getWidgetIdFromHash(): { widgetId: string | null, asset: string | null } {
  const hash = window.location.hash;
  const widgetMatch = hash.match(/widget=([^&]*)/);
  const assetMatch = hash.match(/asset=([^&]*)/);
  
  // Extract the widget ID string
  let widgetId = widgetMatch ? widgetMatch[1] : null;
  
  // Clean up widgetId if it contains [object Object]
  if (widgetId === '[object%20Object]' || widgetId === '[object Object]') {
    console.warn('⚠️ Invalid widget ID format detected in URL:', widgetId);
    widgetId = null;
    
    // Clean up the URL to prevent further errors
    const newUrl = new URL(window.location.href);
    newUrl.hash = '';
    window.history.replaceState(
      { cleanedInvalidHash: true, timestamp: Date.now() },
      '',
      newUrl.toString()
    );
  }
  
  return { 
    widgetId: widgetId,
    asset: assetMatch ? assetMatch[1] : null
  };
}

// Create a unique event ID for tracking dialog events
export function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Set the current event being processed
export function setCurrentEventId(eventId: string | null): void {
  currentEventId = eventId;
}

// Check if this event ID is currently being processed
export function isProcessingEvent(eventId: string): boolean {
  return currentEventId === eventId;
}

/**
 * Check if the current URL indicates a direct dialog navigation intent
 * This can be called very early in the app initialization process
 */
export function checkDirectDialogNavigation(): { isDirectDialogLoad: boolean; widgetId: string | null } {
  const hash = window.location.hash;
  const isDirectDialogLoad = hash.includes('widget=');
  const widgetId = getWidgetIdFromHash().widgetId;
  
  if (isDirectDialogLoad && widgetId) {
    console.log('🚩 Detected direct widget dialog navigation:', { widgetId, hash });
    
    // For direct navigation on page load, ALWAYS clear any recently closed flag
    sessionStorage.removeItem('dialog_last_closed');
    console.log('🔄 Cleared dialog_last_closed for direct navigation on page load');
    
    // Reset all dialog-related flags
    dialogAlreadyOpened = false;
    hashDialogHandled = false;
    
    // Store this information in sessionStorage for persistence during page initialization
    sessionStorage.setItem('directDialogNavigation', JSON.stringify({
      widgetId,
      timestamp: Date.now(),
      originalUrl: window.location.href,
      isInitialLoad: isInitialPageLoad
    }));
  }
  
  return { isDirectDialogLoad, widgetId };
}

// Helper to check if two widget IDs refer to the same base widget
// Handles both simple IDs and compound IDs with timestamps (e.g. "transactions-1745505290237")
export function isSameBaseWidget(widgetId1: string, widgetId2: string): boolean {
  // Always require exact match for earn widgets
  if (widgetId1.startsWith('earn-') || widgetId2.startsWith('earn-')) {
    return widgetId1 === widgetId2;
  }
  
  if (widgetId1 === widgetId2) return true;
  
  // Extract base IDs
  const baseId1 = widgetId1.split('-')[0];
  const baseId2 = widgetId2.split('-')[0];
  
  return baseId1 === baseId2;
}

/**
 * Get dialog navigation data from session storage
 */
export function getDirectDialogNavigationData(): {
  widgetId: string;
  timestamp: number;
  originalUrl: string;
} | null {
  const storedData = sessionStorage.getItem('directDialogNavigation');
  if (!storedData) return null;
  
  try {
    const data = JSON.parse(storedData);
    if (
      typeof data === 'object' && 
      data !== null && 
      typeof data.widgetId === 'string' &&
      typeof data.timestamp === 'number' &&
      typeof data.originalUrl === 'string' &&
      Date.now() - data.timestamp < 30000 // Only valid for 30 seconds
    ) {
      return data;
    }
    return null;
  } catch (e) {
    console.error('Error parsing direct dialog navigation data:', e);
    return null;
  }
}

/**
 * Mark that a dialog has been opened in this session
 * Returns true if this is the first dialog opened, false if another was already opened
 */
export function markDialogOpened(widgetId?: string): boolean {
  if (dialogAlreadyOpened) {
    return false;
  }
  
  if (widgetId) {
    // Track the specific dialog that's open
    openDialogs.add(widgetId);
  }
  
  dialogAlreadyOpened = true;
  return true;
}

/**
 * Reset the dialog opened state
 * Useful for testing or when we want to allow another dialog to open
 */
export function resetDialogOpenedState(): void {
  // Reset dialog flags
  dialogAlreadyOpened = false;
  hashDialogHandled = false;
  currentEventId = null;
  
  // Clear stored dialogs
  openDialogs.clear();
  
  // Ensure we're not ignoring hash changes
  ignoreHashChanges = false;
  
  // Reset closing dialog state
  isClosingDialog = false;
  
  // Clear storage items that could cause dialog reopen loops
  sessionStorage.removeItem('selected_stake_asset');
  sessionStorage.removeItem('directDialogNavigation');
  sessionStorage.removeItem('last_processed_dialog_event');
  
  // Record a timestamp of when dialog state was reset, but with a slightly shorter expiry
  sessionStorage.setItem('dialog_last_closed', Date.now().toString());
  
  console.log('🔄 Dialog state has been fully reset');
}

/**
 * Marks that the URL hash has been handled for dialog opening
 * Returns false if already handled, true if this is the first handler
 */
export function markHashHandled(widgetId: string): boolean {
  if (hashDialogHandled) {
    console.log('⚠️ URL hash dialog already handled, skipping:', widgetId);
    return false;
  }
  
  hashDialogHandled = true;
  console.log('✅ Marking URL hash as handled for widget:', widgetId);
  return true;
}

/**
 * Check if URL hash-based dialog has already been handled
 */
export function isHashHandled(): boolean {
  return hashDialogHandled;
}

/**
 * Handle manual URL entry (paste and enter) by properly resetting the hash state
 * This ensures the dialog will open even if the same URL is pasted again
 */
export function handleManualUrlNavigation(): void {
  // Reset hash handled state to allow the dialog to reopen
  hashDialogHandled = false;
  dialogAlreadyOpened = false;
  currentEventId = null; // Clear any current event ID
  
  // Clear dialog_last_closed to prevent blocking dialog opens on manual navigation
  sessionStorage.removeItem('dialog_last_closed');
  
  console.log('🔄 Reset hash handled state for manual URL navigation');
}

/**
 * Open a widget dialog with centralized tracking
 */
export function openWidgetDialog(
  widgetId: string, 
  source: 'url' | 'direct' | 'container' = 'direct',
  asset?: string,
  exactMatchOnly: boolean = false
): void {
  // Prevent opening if another dialog is currently being opened
  if (isOpeningDialog) {
    console.log('⚠️ Another dialog is currently being opened, ignoring this request:', widgetId);
    return;
  }

  // Set a flag to indicate we're in the process of opening a dialog
  isOpeningDialog = true;
  
  // Clear flag after a short delay to allow future openings
  setTimeout(() => {
    isOpeningDialog = false;
  }, 500);

  // Check if we already have this exact dialog open (prevents duplicate dialogs)
  if (openDialogs.has(widgetId)) {
    console.log('⚠️ Dialog already open, updating instead of creating duplicate:', widgetId);
    
    // Just update the URL if needed
    if (source === 'direct' && widgetId === 'earn-stake' && asset) {
      updateDialogUrl(widgetId, asset);
    }
    
    // Don't proceed with opening a new instance
    isOpeningDialog = false;
    return;
  }

  // Proceed with normal dialog opening logic
  // Mark that we're no longer in initial page load
  isInitialPageLoad = false;
  
  // Check if this is a direct navigation from URL on initial page load
  const isDirectNavigation = source === 'direct' && 
                             window.location.hash.includes(`widget=${widgetId}`);
  
  // For direct navigation from URL or force open, bypass recently closed check
  if (source === 'direct' || source === 'container') {
    // If force opening or direct navigation, clear the closure timestamp
    sessionStorage.removeItem('dialog_last_closed');
    console.log('🔓 Direct navigation or force opening dialog:', widgetId);
  }
  // Otherwise check if we should skip opening due to recent close
  else if (source === 'url') {
    const lastCloseTime = parseInt(sessionStorage.getItem('dialog_last_closed') || '0', 10);
    if (Date.now() - lastCloseTime < 1000) { // Reduced from 2 seconds to 1 second
      console.log('⏭️ Skipping dialog open because a dialog was recently closed:', widgetId);
      return;
    }
  }

  // Temporarily ignore hash changes
  ignoreHashChanges = true;
  
  // Update URL
  const newUrl = new URL(window.location.href);
  let hashContent = `widget=${widgetId}`;
  if (asset) {
    hashContent += `&asset=${asset}`;
  }
  newUrl.hash = hashContent;
  window.history.replaceState({ widget: widgetId, asset }, '', newUrl.toString());
  
  // Track this dialog as open
  openDialogs.add(widgetId);
  
  // Reset ignore flag after a short delay
  setTimeout(() => {
    ignoreHashChanges = false;
  }, 50);
  
  // Generate a unique event ID to ensure proper tracking
  let eventId;
  if (source === 'direct' || source === 'container') {
    eventId = `force-open-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  } else if (isDirectNavigation) {
    eventId = `direct-nav-${isInitialPageLoad ? 'init' : 'exact'}-${widgetId}-${Date.now()}`;
  } else {
    eventId = `open-widget-${widgetId}-${Date.now()}`;
  }
  
  // Dispatch event to open dialog
  const event = new CustomEvent('open-widget-dialog', {
    detail: { 
      widgetId,
      asset,
      source: source || 'direct', // Track the source of the open request
      exactMatchOnly: exactMatchOnly === true, // Only pass true if explicitly set
      forceOpen: source === 'direct' || source === 'container', // Treat direct navigation as force open
      isInitialNavigation: isInitialPageLoad,
      eventId
    },
    bubbles: true
  });
  document.dispatchEvent(event);
}

/**
 * Special handler for direct URL navigation
 * Call this during app initialization to ensure direct navigation works
 */
export function handleDirectUrlNavigation(): void {
  // Prevent multiple calls from handling the same navigation
  if (isHandlingDirectNavigation) {
    console.log('⏭️ Already handling direct navigation, skipping duplicate call');
    return;
  }
  
  // Set flag to prevent multiple handling
  isHandlingDirectNavigation = true;
  
  // Check if this is direct navigation from URL hash
  const { isDirectDialogLoad, widgetId } = checkDirectDialogNavigation();
  
  // Only proceed if we have a widget ID in the URL
  if (!isDirectDialogLoad || !widgetId) {
    isHandlingDirectNavigation = false;
    return;
  }
  
  console.log('🌟 Setting up direct URL navigation for widget:', widgetId);
  
  // Extract asset from URL (if available)
  const asset = getWidgetIdFromHash().asset;
  
  // ALWAYS clear the following to ensure dialog can open
  sessionStorage.removeItem('dialog_last_closed');
  sessionStorage.removeItem('last_processed_dialog_event');
  
  // Reset all dialog state
  dialogAlreadyOpened = false;
  hashDialogHandled = false;
  openDialogs.clear();
  
  // For earn-stake widget, ensure the asset is stored in session storage
  if (widgetId === 'earn-stake' && asset) {
    sessionStorage.setItem('selected_stake_asset', asset);
    console.log('📱 Storing asset from direct navigation:', asset);
  }
  
  // Use a unique ID for this direct navigation event
  const directNavEventId = `direct-nav-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Queue the dialog to open with a longer delay to ensure the app is fully loaded
  setTimeout(() => {
    console.log('🚀 Forcefully opening dialog from direct URL navigation:', widgetId, asset);
    
    // Clear all protection mechanisms again right before opening
    sessionStorage.removeItem('dialog_last_closed');
    sessionStorage.removeItem('last_processed_dialog_event');
    dialogAlreadyOpened = false;
    hashDialogHandled = false;
    
    // Update URL (maintain the hash)
    const newUrl = new URL(window.location.href);
    let hashContent = `widget=${widgetId}`;
    if (asset) {
      hashContent += `&asset=${asset}`;
    }
    newUrl.hash = hashContent;
    window.history.replaceState({ widget: widgetId, asset, directNav: true }, '', newUrl.toString());
    
    // Create and dispatch a special direct navigation event
    const event = new CustomEvent('open-widget-dialog', {
      detail: { 
        widgetId,
        asset,
        source: 'direct',
        exactMatchOnly: false, // Allow any container to handle it
        forceOpen: true,
        isDirectNavigation: true,
        isInitialNavigation: true,
        eventId: directNavEventId
      },
      bubbles: true
    });
    document.dispatchEvent(event);
    
    // Try again after a short delay if needed
    setTimeout(() => {
      // Check if dialog was opened
      if (openDialogs.size === 0) {
        console.log('⚠️ Dialog wasn\'t opened on first attempt, trying again...');
        
        // Try again with a new event ID
        const retryEventId = `direct-nav-retry-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        
        const retryEvent = new CustomEvent('open-widget-dialog', {
          detail: { 
            widgetId,
            asset,
            source: 'direct',
            exactMatchOnly: false, 
            forceOpen: true,
            isDirectNavigation: true,
            isInitialNavigation: true,
            eventId: retryEventId
          },
          bubbles: true
        });
        document.dispatchEvent(retryEvent);
      }
    }, 500);
    
    // Reset the handling flag after the event is dispatched
    isHandlingDirectNavigation = false;
  }, 1000); // Use an even longer delay to ensure the app is fully rendered
}

/**
 * Update URL for an existing dialog
 */
function updateDialogUrl(widgetId: string, asset?: string): void {
  if (!widgetId) return;
  
  // Only relevant for earn dialogs with assets
  if (widgetId !== 'earn-stake' || !asset) return;
  
  const currentPath = window.location.pathname;
  const isEarnPage = currentPath === '/earn';
  
  console.log('🔄 Updating URL for existing dialog:', { widgetId, asset, isEarnPage });
  
  // Different URL handling based on current page
  if (isEarnPage) {
    // On earn page, use widget parameter format
    window.history.replaceState(
      { widgetDialog: true, widgetId, asset, timestamp: Date.now() },
      '',
      `${currentPath}#widget=${widgetId}&asset=${asset}`
    );
  } else {
    // On other pages, use regular format
    const url = new URL(window.location.href);
    const hashParts = url.hash.substring(1).split('&').filter(part => 
      part && !part.startsWith('asset=') && !part.startsWith('widget=')
    );
    
    // Add new parameters
    hashParts.push(`widget=${widgetId}`);
    hashParts.push(`asset=${asset}`);
    
    // Update URL
    window.history.replaceState(
      { widgetDialog: true, widgetId, asset, timestamp: Date.now() },
      '',
      `${currentPath}#${hashParts.join('&')}`
    );
  }
}

/**
 * Force open a dialog, bypassing any protection mechanisms
 */
export function forceOpenDialog(widgetId: string, asset?: string): void {
  // Clear any protection mechanisms
  sessionStorage.removeItem('dialog_last_closed');
  sessionStorage.removeItem('last_processed_dialog_event');
  
  // Reset dialog state flags
  dialogAlreadyOpened = false;
  hashDialogHandled = false;
  
  // For earn widget, ensure asset is stored
  if (widgetId === 'earn-stake' && asset) {
    sessionStorage.setItem('selected_stake_asset', asset);
  }
  
  // Use a unique event ID
  const forceOpenEventId = `force-open-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Dispatch a special force open event
  const event = new CustomEvent('open-widget-dialog', {
    detail: { 
      widgetId,
      asset,
      source: 'direct',
      exactMatchOnly: true,
      forceOpen: true,
      isDirectNavigation: false,
      eventId: forceOpenEventId
    },
    bubbles: true
  });
  document.dispatchEvent(event);
}

/**
 * Centralized function to close a dialog
 */
export function closeWidgetDialog(widgetId: string): void {
  // Set closing flag
  isClosingDialog = true;
  
  // Temporarily ignore hash changes
  ignoreHashChanges = true;
  
  // Remove from tracking
  openDialogs.delete(widgetId);
  
  // Record dialog close time to prevent immediate reopening
  sessionStorage.setItem('dialog_last_closed', Date.now().toString());
  
  // Clear any stored dialog event IDs to prevent stale events
  sessionStorage.removeItem('last_processed_dialog_event');
  
  // Always clear selected_stake_asset for earn widgets, regardless of widget type
  sessionStorage.removeItem('selected_stake_asset');
  
  // Update URL only if this is the last open dialog
  if (openDialogs.size === 0) {
    // Clear hash
    const newUrl = new URL(window.location.href);
    newUrl.hash = '';
    window.history.replaceState(
      { dialogClosed: true, timestamp: Date.now() },
      '',
      newUrl.toString()
    );
    
    // Reset dialog state
    resetDialogOpenedState();
    
    // Also clear any storage items to prevent persisting dialogs on refresh
    sessionStorage.removeItem('directDialogNavigation');
    
    // Ensure dialog-specific storage items are cleared
    sessionStorage.removeItem('selected_stake_asset');
    
    // Add more specific storage cleanups here as needed
    
    // Dispatch a global close event to clean up any lingering dialog state
    const globalCloseEvent = new CustomEvent('close-all-widget-dialogs', {
      bubbles: true,
      detail: { source: 'closeWidgetDialog', timestamp: Date.now(), widgetId }
    });
    document.dispatchEvent(globalCloseEvent);
  }
  
  // Reset flags after a short delay, slightly longer than before
  setTimeout(() => {
    isClosingDialog = false;
    ignoreHashChanges = false;
    
    // Extra check to make sure we reset dialog state if all dialogs should be closed
    if (openDialogs.size === 0) {
      resetDialogOpenedState();
      
      // Double check storage clearance
      sessionStorage.removeItem('selected_stake_asset');
    }
  }, 250); // Increased to ensure complete cleanup
}

/**
 * Check if any dialogs are currently open
 */
export function hasOpenDialogs(): boolean {
  return openDialogs.size > 0;
}

// Custom hook to handle widget dialog state
export function useWidgetDialog(widgetId: string) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Custom handler for opening/closing dialogs
  const handleSetIsOpen = useCallback((open: boolean) => {
    if (open === isOpen) return; // Skip if no change
    
    if (open) {
      // Use centralized function to open dialog
      openWidgetDialog(widgetId);
    } else {
      // Use centralized function to close dialog
      closeWidgetDialog(widgetId);
    }
    
    // Update local state
    setIsOpen(open);
  }, [widgetId, isOpen]);
  
  // Respond to URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      // Skip if we're explicitly ignoring hash changes
      if (ignoreHashChanges) return;
      
      const widgetIdFromHash = getWidgetIdFromHash().widgetId;
      
      if (widgetIdFromHash && isSameBaseWidget(widgetIdFromHash, widgetId)) {
        if (!isOpen) {
          setIsOpen(true);
        }
      } else if (isOpen) {
        setIsOpen(false);
      }
    };
    
    // Check hash on mount
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [widgetId, isOpen]);
  
  return {
    isOpen,
    setIsOpen: handleSetIsOpen
  };
}

// Mark that we're no longer in initial page load after a delay
setTimeout(() => {
  isInitialPageLoad = false;
}, 3000); 