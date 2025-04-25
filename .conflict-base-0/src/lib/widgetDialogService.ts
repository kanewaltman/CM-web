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
export function getWidgetIdFromHash(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/widget=([^&]*)/);
  return match ? match[1] : null;
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
  const widgetId = getWidgetIdFromHash();
  
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
export function markDialogOpened(): boolean {
  if (dialogAlreadyOpened) {
    return false;
  }
  
  dialogAlreadyOpened = true;
  return true;
}

/**
 * Reset the dialog opened state
 * Useful for testing or when we want to allow another dialog to open
 */
export function resetDialogOpenedState(): void {
  dialogAlreadyOpened = false;
  hashDialogHandled = false;
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
export function openWidgetDialog(widgetId: string, source?: 'container' | 'global' | 'direct'): void {
  // Temporarily ignore hash changes
  ignoreHashChanges = true;
  
  // Update URL
  const newUrl = new URL(window.location.href);
  newUrl.hash = `widget=${widgetId}`;
  window.history.replaceState({ widget: widgetId }, '', newUrl.toString());
  
  // Track this dialog as open
  openDialogs.add(widgetId);
  
  // Reset ignore flag after a short delay
  setTimeout(() => {
    ignoreHashChanges = false;
  }, 50);
  
  // Dispatch event to open dialog
  const event = new CustomEvent('open-widget-dialog', {
    detail: { 
      widgetId,
      source: source || 'direct' // Track the source of the open request
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
  }
  
  // Reset flags after a short delay
  setTimeout(() => {
    isClosingDialog = false;
    ignoreHashChanges = false;
  }, 150);
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
      
      const widgetIdFromHash = getWidgetIdFromHash();
      
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