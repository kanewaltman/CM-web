import { useEffect } from 'react';
import { getWidgetIdFromHash } from '@/lib/widgetDialogService';

/**
 * Hook to handle widget dialog URL routing
 * This should be called at the app level to handle initial URL dialog opening
 */
export function useWidgetDialogRouter() {
  useEffect(() => {
    // Check URL hash on mount
    const { widgetId: widgetIdFromHash, asset: assetFromHash } = getWidgetIdFromHash();
    
    if (widgetIdFromHash) {
      console.log('📍 Initial widget dialog from URL:', widgetIdFromHash);
      
      // Wait for components to initialize
      setTimeout(() => {
        // Find and dispatch a custom event to open the dialog
        const event = new CustomEvent('open-widget-dialog', {
          detail: { 
            widgetId: widgetIdFromHash,
            asset: assetFromHash 
          },
          bubbles: true
        });
        document.dispatchEvent(event);
      }, 500);
    }

    // Handle browser back/forward navigation for dialogs
    const handleHashChange = () => {
      const { widgetId, asset } = getWidgetIdFromHash();
      
      if (widgetId) {
        console.log('🔄 Opening widget dialog from hashchange:', widgetId);
        // Dispatch event to open the dialog
        const event = new CustomEvent('open-widget-dialog', {
          detail: { 
            widgetId,
            asset
          },
          bubbles: true
        });
        document.dispatchEvent(event);
      } else {
        console.log('🔄 Closing all widget dialogs from hashchange');
        // Dispatch event to close all dialogs
        const event = new CustomEvent('close-widget-dialogs', {
          bubbles: true
        });
        document.dispatchEvent(event);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
} 