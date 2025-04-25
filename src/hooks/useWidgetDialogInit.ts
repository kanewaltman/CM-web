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
    let widgetIdFromHash = getWidgetIdFromHash();
    
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
      markHashHandled(widgetIdFromHash);
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
        if (markDialogOpened(widgetIdFromHash)) {
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
    const handlePopState = (event: PopStateEvent) => {
      // Get widget ID from current URL hash
      const widgetId = getWidgetIdFromHash();
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

    window.addEventListener('popstate', handlePopState);
    
    // Also handle URL changes when the user pastes a URL and hits Enter
    const handleHashChange = (e: HashChangeEvent) => {
      // Get the widget ID from the new URL hash
      const widgetId = getWidgetIdFromHash();
      
      // Check if this is navigation to the same URL (paste + enter of the same URL)
      const isSameUrlNavigation = e.oldURL === e.newURL;
      
      console.log('🔄 Hash change detected:', { 
        oldURL: e.oldURL, 
        newURL: e.newURL,
        widgetId,
        isSameUrlNavigation
      });
      
      if (widgetId) {
        console.log('🔄 Detected widget ID in URL from hash change:', widgetId);
        
        // Always reset dialog state when we detect a widget ID in hash change
        // This ensures dialogs can reopen even if we navigate to the same URL
        resetDialogOpenedState();
        
        // Generate a unique event ID
        const eventId = generateEventId();
        
        // Set as current event
        setCurrentEventId(eventId);
        
        // Mark hash as handled
        markHashHandled(widgetId);
        
        // Dispatch event to open the dialog with manual navigation flag
        const event = new CustomEvent('open-widget-dialog', {
          detail: { 
            widgetId,
            directLoad: false,
            isManualNavigation: isSameUrlNavigation,
            eventId,
            exactMatchOnly: true // Ensure only the exact widget responds
          },
          bubbles: true
        });
        document.dispatchEvent(event);
        
        // Set proper state for this hash
        window.history.replaceState(
          { 
            widgetDialog: true, 
            widgetId: widgetId,
            timestamp: Date.now(),
            isManualNavigation: isSameUrlNavigation,
            eventId
          }, 
          '', 
          window.location.href
        );
        
        // Clear event ID after a delay
        setTimeout(() => {
          setCurrentEventId(null);
        }, 500);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
} 