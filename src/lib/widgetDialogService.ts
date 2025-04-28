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
    
    // Store this information in sessionStorage for persistence during page initialization
    sessionStorage.setItem('directDialogNavigation', JSON.stringify({
      widgetId,
      timestamp: Date.now(),
      originalUrl: window.location.href
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
  console.log('🔄 Reset hash handled state for manual URL navigation');
}

/**
 * Centralized function to open a dialog
 */
export function openWidgetDialog(
  widgetId: string, 
  source?: 'container' | 'global' | 'direct',
  asset?: string,
  exactMatchOnly?: boolean
): void {
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
  const eventId = `open-widget-${widgetId}-${Date.now()}`;
  
  // Dispatch event to open dialog
  const event = new CustomEvent('open-widget-dialog', {
    detail: { 
      widgetId,
      asset,
      source: source || 'direct', // Track the source of the open request
      exactMatchOnly: exactMatchOnly === true, // Only pass true if explicitly set
      eventId
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
    
    // Clear specific storage items related to dialogs
    if (widgetId.startsWith('earn-')) {
      sessionStorage.removeItem('selected_stake_asset');
    }
    
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
      if (widgetId.startsWith('earn-')) {
        sessionStorage.removeItem('selected_stake_asset');
      }
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