import { useEffect } from 'react';
import { 
  getWidgetIdFromHash, 
  getDirectDialogNavigationData, 
  markDialogOpened,
  resetDialogOpenedState,
  markHashHandled,
  generateEventId,
  setCurrentEventId
} from '@/lib/widgetDialogService';

// Used to avoid duplicate initialization attempts
let initializationAttempted = false;

// Refs that need to be accessible across renders but don't trigger re-renders
const globalState = {
  isProcessingHashChange: false,
  closeOnNext: false
};

/**
 * Hook to initialize widget dialog routing at the app level
 * This should be called once in App.tsx to handle URL-based widget dialog navigation
 */
export function useWidgetDialogInit() {
  useEffect(() => {
    // Early return if initialization was already attempted to prevent duplicates
    if (initializationAttempted) {
      console.log('📌 Widget dialog initialization already attempted, skipping');
      return;
    }
    
    initializationAttempted = true;
    
    // Store original hash to prevent it from being cleared
    const originalUrl = window.location.href;
    const originalHash = window.location.hash;
    const isDirectDialogLoad = originalHash.includes('widget=');
    
    // Check URL hash on mount
    const hashData = getWidgetIdFromHash();
    let widgetIdFromHash = hashData.widgetId;
    
    // If hash is missing but we had stored early navigation data, use that
    const earlyNavigationData = getDirectDialogNavigationData();
    if (!widgetIdFromHash && earlyNavigationData) {
      console.log('📍 Recovering lost widget dialog from early detection:', earlyNavigationData);
      widgetIdFromHash = earlyNavigationData.widgetId;
      
      // Restore the original URL
      window.history.replaceState(
        { 
          widgetDialog: true, 
          widgetId: widgetIdFromHash,
          directLoad: true,
          timestamp: Date.now(),
          restored: true
        }, 
        '', 
        earlyNavigationData.originalUrl
      );
      
      // Mark this hash as handled since we're restoring it
      if (widgetIdFromHash) {
        markHashHandled(widgetIdFromHash);
      }
    }
    
    if (widgetIdFromHash) {
      console.log('📍 Initial widget dialog from URL:', widgetIdFromHash, 'Direct load:', isDirectDialogLoad);
      
      // For direct loads, ensure the URL doesn't get cleared during app initialization
      if (isDirectDialogLoad || earlyNavigationData) {
        // Watch for hash changes that might clear our dialog URL
        const hashWatcher = setInterval(() => {
          const currentHash = window.location.hash;
          if (currentHash !== originalHash && !currentHash.includes(`widget=${widgetIdFromHash}`)) {
            console.log('⚠️ Dialog URL was cleared, restoring:', originalHash || `#widget=${widgetIdFromHash}`);
            // Restore the original hash without triggering a navigation event
            window.history.replaceState(
              { 
                widgetDialog: true, 
                widgetId: widgetIdFromHash,
                directLoad: true,
                timestamp: Date.now() 
              }, 
              '', 
              originalHash ? originalUrl : `${window.location.pathname}${window.location.search}#widget=${widgetIdFromHash}`
            );
            clearInterval(hashWatcher);
          }
        }, 50);
        
        // Stop watching after a reasonable time
        setTimeout(() => clearInterval(hashWatcher), 3000);
      }
      
      // Mark hash as handled first to ensure only one dialog opens
      markHashHandled(widgetIdFromHash);
      
      // Wait for components to initialize, then attempt to open dialog (only once)
      setTimeout(() => {
        // Only dispatch open event if no dialog has been opened yet
        if (markDialogOpened()) {
          // Generate a unique event ID for direct navigation that includes the exact widget ID
          const directNavEventId = `direct-nav-exact-${widgetIdFromHash}-${Date.now()}`;
          
          // Dispatch a custom event to open the dialog
          const event = new CustomEvent('open-widget-dialog', {
            detail: { 
              widgetId: widgetIdFromHash,
              directLoad: isDirectDialogLoad || !!earlyNavigationData,
              eventId: directNavEventId,
              exactMatchOnly: true // Flag to indicate only exact matches should respond
            },
            bubbles: true
          });
          document.dispatchEvent(event);
          
          // Ensure URL is still correctly set
          if (!window.location.hash.includes(`widget=${widgetIdFromHash}`)) {
            window.history.replaceState(
              { 
                widgetDialog: true, 
                widgetId: widgetIdFromHash,
                directLoad: true,
                timestamp: Date.now(),
                eventId: directNavEventId,
                exactMatchOnly: true
              }, 
              '', 
              `${window.location.pathname}${window.location.search}#widget=${widgetIdFromHash}`
            );
          }
        } else {
          console.log('📍 Skipping dialog open event - dialog already opened');
        }
      }, 800); // Increased timeout to ensure components are ready
    }

    // Handle browser back/forward navigation
    const handlePopState = (event) => {
      // Get widget ID from current URL hash
      const hashData = getWidgetIdFromHash();
      const widgetId = hashData.widgetId;
      const isDirectNavigationState = event.state?.directLoad === true;
      
      // Log the navigation event with more details
      console.log('🔄 PopState event for widget dialog:', { 
        widgetId, 
        hash: window.location.hash,
        state: event.state,
        isDirectNavigation: isDirectNavigationState
      });
      
      // Check if hash contains a widget ID, regardless of state
      if (widgetId) {
        // Reset the dialog opened state when navigating to allow opening a dialog again
        resetDialogOpenedState();
        
        // Mark hash as handled first
        markHashHandled(widgetId);
        
        // Generate a unique event ID for this navigation
        const popstateEventId = `popstate-exact-${widgetId}-${Date.now()}`;
        
        console.log('🔄 Opening widget dialog from popstate:', widgetId);
        // Dispatch event to open the dialog
        const event = new CustomEvent('open-widget-dialog', {
          detail: { 
            widgetId,
            directLoad: isDirectNavigationState,
            eventId: popstateEventId,
            exactMatchOnly: true // Ensure only the exact widget responds
          },
          bubbles: true
        });
        document.dispatchEvent(event);
        
        // Ensure proper state for this navigation
        if (!event.state) {
          window.history.replaceState(
            { 
              widgetDialog: true, 
              widgetId: widgetId,
              directLoad: false,
              timestamp: Date.now() 
            }, 
            '', 
            window.location.href
          );
        }
      } else {
        console.log('🔄 Closing widget dialogs from popstate');
        // Dispatch event to close all dialogs
        const event = new CustomEvent('close-widget-dialogs', {
          bubbles: true
        });
        document.dispatchEvent(event);
      }
    };

    // Add popstate listener
    window.addEventListener('popstate', handlePopState);
    
    // Helper to handle URL hash changes that doesn't use hooks
    const handleHashChange = (forceCheck = false) => {
      // Skip if already processing or in a recovery state
      if (globalState.isProcessingHashChange && !forceCheck) {
        return;
      }
      
      globalState.isProcessingHashChange = true;
      
      // Get widget ID from hash
      const { widgetId, asset } = getWidgetIdFromHash();
      
      if (widgetId) {
        console.log('🔄 Detected widget dialog in URL:', widgetId);
        
        // Close state if needed
        if (globalState.closeOnNext) {
          globalState.closeOnNext = false;
          globalState.isProcessingHashChange = false;
          return;
        }
        
        // Trigger dialog open event
        window.requestAnimationFrame(() => {
          const event = new CustomEvent('open-widget-dialog', {
            detail: { 
              widgetId,
              asset,
              source: 'hash',
              exactMatchOnly: true // Always require exact match for hash-based navigation
            },
            bubbles: true
          });
          document.dispatchEvent(event);
          
          // Add a short delay before clearing processing state
          setTimeout(() => {
            globalState.isProcessingHashChange = false;
          }, 50);
        });
      } else {
        console.log('🔄 No widget dialog in URL, clearing state');
        // Dispatch a close event
        const event = new CustomEvent('close-widget-dialogs', {
          bubbles: true
        });
        document.dispatchEvent(event);
        globalState.isProcessingHashChange = false;
      }
    };
    
    // Hash change event handler
    const onHashChange = (e) => {
      // Check if this is navigation to the same URL (paste + enter of the same URL)
      const isSameUrlNavigation = e.oldURL === e.newURL;
      
      console.log('🔄 Hash change detected:', { 
        oldURL: e.oldURL, 
        newURL: e.newURL,
        isSameUrlNavigation
      });
      
      // Reset dialog opened state for manual navigation
      if (isSameUrlNavigation) {
        resetDialogOpenedState();
      }
      
      // Process hash change normally
      handleHashChange(true);
    };
    
    // Add hashchange listener
    window.addEventListener('hashchange', onHashChange);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []); // Empty dependency array to ensure this runs once
} 