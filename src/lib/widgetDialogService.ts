import { useEffect, useState } from 'react';

// Tracks whether a dialog has already been opened in this session
let dialogAlreadyOpened = false;

// Tracks whether the URL hash has been handled already
let hashDialogHandled = false;

// Extracts widget ID from URL hash
export function getWidgetIdFromHash(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/widget=([^&]*)/);
  return match ? match[1] : null;
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
 * Get previously detected direct dialog navigation data
 */
export function getDirectDialogNavigationData(): { widgetId: string; originalUrl: string } | null {
  const data = sessionStorage.getItem('directDialogNavigation');
  if (!data) return null;
  
  try {
    const parsed = JSON.parse(data);
    // Clean up after retrieving
    if (Date.now() - parsed.timestamp > 10000) {
      // Clear if too old (10 seconds)
      sessionStorage.removeItem('directDialogNavigation');
      return null;
    }
    return parsed;
  } catch (e) {
    sessionStorage.removeItem('directDialogNavigation');
    return null;
  }
}

/**
 * Tracks whether a dialog has been opened in this session
 * Used to prevent multiple dialogs from being opened during initialization
 */
export function markDialogOpened(widgetId: string): boolean {
  if (dialogAlreadyOpened) {
    console.log('⚠️ Dialog already opened in this session, skipping:', widgetId);
    return false;
  }
  
  dialogAlreadyOpened = true;
  console.log('✅ Marking dialog as opened for session:', widgetId);
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

// Custom hook to handle widget dialog state
export function useWidgetDialog(widgetId: string) {
  const [isOpen, setIsOpen] = useState(false);

  // Check URL hash on mount and when hash changes
  useEffect(() => {
    const checkHash = () => {
      const widgetIdFromHash = getWidgetIdFromHash();
      
      // Handle both exact matches and widget instances with timestamps
      if (widgetIdFromHash && isSameBaseWidget(widgetIdFromHash, widgetId)) {
        setIsOpen(true);
      } else if (isOpen) {
        setIsOpen(false);
      }
    };

    // Check hash on mount
    checkHash();

    // Listen for hash changes
    window.addEventListener('hashchange', checkHash);
    
    return () => {
      window.removeEventListener('hashchange', checkHash);
    };
  }, [widgetId, isOpen]);

  return {
    isOpen,
    setIsOpen
  };
} 