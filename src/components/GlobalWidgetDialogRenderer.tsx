import React, { useEffect, useState } from 'react';
import { StandaloneWidgetDialog } from './StandaloneWidgetDialog';
import { findWidgetById } from '@/lib/widgetRegistry';
import { resetDialogOpenedState } from '@/lib/widgetDialogService';

// Track which events have been handled globally
const handledGlobalEvents = new Set<string>();

// Add a helper to check if a dialog was recently closed
function wasDialogRecentlyClosed(): boolean {
  // If we detect this is an initial page load with a URL hash, skip this check
  const hash = window.location.hash;
  if (hash && (hash.includes('widget=') || hash.includes('asset='))) {
    const navData = sessionStorage.getItem('directDialogNavigation');
    if (navData) {
      try {
        const data = JSON.parse(navData);
        if (data.isInitialLoad) {
          // This is a direct navigation on page load, allow the dialog to open
          console.log('⏯️ Bypassing recently closed check for direct navigation');
          return false;
        }
      } catch (e) {
        console.error('Error parsing direct dialog navigation data:', e);
      }
    }
  }

  // Normal check for recently closed dialogs
  const lastCloseTime = parseInt(sessionStorage.getItem('dialog_last_closed') || '0', 10);
  return Date.now() - lastCloseTime < 1000; // Reduced from 2 seconds to 1 second
}

/**
 * This component renders a standalone widget dialog based on custom events
 * It can display any widget from the registry even if it's not on the current page
 */
export function GlobalWidgetDialogRenderer() {
  const [openWidgets, setOpenWidgets] = useState<Record<string, boolean>>({});
  
  // Handle URL hash changes for direct navigation
  useEffect(() => {
    // Check if there's a widget in the URL hash on initial load
    const hash = window.location.hash;
    if (hash && hash.includes('widget=')) {
      const widgetMatch = hash.match(/widget=([^&]*)/);
      const assetMatch = hash.match(/asset=([^&]*)/);
      
      const widgetId = widgetMatch ? widgetMatch[1] : null;
      const asset = assetMatch ? assetMatch[1] : null;
      
      if (widgetId) {
        console.log('🌐 GlobalWidgetDialogRenderer detected widget in URL on mount:', widgetId, asset);
        
        // Check if this is a direct navigation from page load
        const navData = sessionStorage.getItem('directDialogNavigation');
        if (navData) {
          try {
            const data = JSON.parse(navData);
            if (data.isInitialLoad && Date.now() - data.timestamp < 10000) {
              console.log('🌐 Detected direct navigation on page load, preparing to handle');
              
              // Clear any recently closed dialogs flag
              sessionStorage.removeItem('dialog_last_closed');
              
              // Use a small delay to allow other initialization to complete
              setTimeout(() => {
                // Check if the dialog has already been opened by another component
                if (!document.body.classList.contains('widget-dialog-open')) {
                  console.log('🌐 Opening widget from URL hash:', widgetId, asset);
                  
                  // Find widget in registry
                  const widgetInfo = findWidgetById(widgetId);
                  if (widgetInfo) {
                    // Open the dialog directly
                    setOpenWidgets(prev => ({
                      ...prev,
                      [widgetId]: true
                    }));
                  }
                }
              }, 1200);
            }
          } catch (e) {
            console.error('Error parsing direct dialog navigation data:', e);
          }
        }
      }
    }
  }, []);
  
  useEffect(() => {
    // Listen for open widget dialog events
    const handleOpenDialog = (e: CustomEvent) => {
      const widgetId = e.detail?.widgetId;
      
      // Make sure we have a valid string widgetId, not an object
      if (!widgetId || typeof widgetId !== 'string') {
        console.log('🌐 Invalid widget ID received:', widgetId);
        return;
      }
      
      // Get event ID if available
      const eventId = typeof e.detail?.eventId === 'string' ? e.detail.eventId : null;
      
      // Check for special flags
      const isDirectNavigation = e.detail?.isDirectNavigation === true;
      const isInitialNavigation = e.detail?.isInitialNavigation === true;
      const isForceOpen = e.detail?.forceOpen === true || 
                         (eventId && eventId.startsWith('force-open-')) ||
                         (eventId && eventId.startsWith('direct-nav-init-')) ||
                         (eventId && eventId.startsWith('direct-nav-retry-'));
      
      // For initial URL navigation or force open, ALWAYS bypass protection
      if (isInitialNavigation || isForceOpen) {
        console.log('🌐 Direct or force navigation detected, bypassing all protection');
        // Clear the protection flag to ensure dialog opens 
        sessionStorage.removeItem('dialog_last_closed');
        sessionStorage.removeItem('last_processed_dialog_event');
        
        // Prioritize handling this dialog immediately
        // Special handling for direct navigation: highest priority handling
        console.log('🌐 Prioritizing direct navigation or force open in global renderer:', widgetId);
        
        // If event has an ID, mark it as handled
        if (eventId) {
          handledGlobalEvents.add(eventId);
        }
        
        // Check if the widget exists
        const widgetInfo = findWidgetById(widgetId);
        if (!widgetInfo) {
          console.warn(`Widget with ID "${widgetId}" not found in registry.`);
          return;
        }
        
        // Save the asset in session storage if applicable
        if (e.detail?.asset && widgetId === 'earn-stake') {
          sessionStorage.setItem('selected_stake_asset', e.detail.asset);
          console.log('🌐 Storing asset in session storage:', e.detail.asset);
        }
        
        console.log('🌐 Forcefully opening widget from direct navigation in global renderer:', widgetId);
        setOpenWidgets(prev => ({
          ...prev,
          [widgetId]: true
        }));
        return;
      }
      
      // Otherwise check if dialog was recently closed
      if (!isForceOpen && !isDirectNavigation && wasDialogRecentlyClosed()) {
        console.log('🌐 Dialog was recently closed, preventing immediate reopening:', widgetId);
        return;
      }
      
      // Skip if this event has already been handled globally (unless force open or initial navigation)
      if (!isForceOpen && !isInitialNavigation && eventId && handledGlobalEvents.has(eventId)) {
        console.log('🌐 Event already handled globally:', eventId);
        return;
      }
      
      // Check for duplicate events using sessionStorage (unless special event)
      if (!isForceOpen && !isInitialNavigation && eventId) {
        const lastProcessedEvent = sessionStorage.getItem('last_processed_dialog_event');
        if (lastProcessedEvent === eventId) {
          console.log('🌐 Ignoring duplicate dialog event:', eventId);
          return;
        }
        // Store this event ID to prevent duplicates
        sessionStorage.setItem('last_processed_dialog_event', eventId);
      }
      
      // Skip title-click events which should only be handled by the specific container
      if (!isInitialNavigation && !isForceOpen && eventId && eventId.startsWith('title-click-')) {
        console.log('🌐 Skipping global handling for title-click event:', eventId);
        return;
      }
      
      // Skip if this dialog was opened by a container directly (unless it's initial navigation)
      if (!isInitialNavigation && e.detail?.source === 'container') {
        console.log('🌐 Skipping global handling for container-sourced dialog:', widgetId);
        return;
      }
      
      // If exactMatchOnly is set and a widget container will handle it, skip global handling
      if (e.detail?.exactMatchOnly === true) {
        // Give containers a chance to handle it first
        setTimeout(() => {
          // Check if any container has already opened a dialog (which would be the case if there's an exact match)
          if (document.body.classList.contains('widget-dialog-open')) {
            console.log('🌐 Skipping global handling for exact match widget that was handled by container:', widgetId);
            return;
          }
          
          // If we get here, no container handled it, so the global renderer can show it
          console.log('🌐 No exact container match found, global renderer will handle widget:', widgetId);
          handleGlobalDialog();
        }, 300);
      } else {
        // Standard handling for most dialog opens
        handleGlobalDialog();
      }
      
      function handleGlobalDialog() {
        console.log('🌐 Global dialog renderer handling widget:', widgetId);
        
        // If event has an ID, mark it as handled
        if (eventId) {
          handledGlobalEvents.add(eventId);
          
          // Cleanup - limit size to prevent memory issues
          if (handledGlobalEvents.size > 20) {
            const oldestEvent = handledGlobalEvents.values().next().value;
            if (oldestEvent) handledGlobalEvents.delete(oldestEvent);
          }
        }
        
        // Check if the widget exists in the registry using the helper function
        const widgetInfo = findWidgetById(widgetId);
        if (!widgetInfo) {
          console.warn(`Widget with ID "${widgetId}" not found in registry.`);
          return;
        }
        
        // Extract base widget ID for DOM queries (without timestamp)
        const baseWidgetId = widgetId.split('-')[0];
        
        // Check if any existing widget container has already handled this event
        // Give a short delay to allow widget containers to handle their own dialogs
        setTimeout(() => {
          // For exact match - look for the exact widget ID
          const exactMatch = document.querySelector(`.grid-stack-item[gs-id="${widgetId}"] .widget-dialog-open`);
          
          // For fuzzy match - look for any widget with the same base ID
          const fuzzyMatch = !exactMatch && 
            document.querySelector(`.grid-stack-item[gs-id^="${baseWidgetId}-"] .widget-dialog-open`);
          
          const dialogOpenedByContainer = document.body.classList.contains('widget-dialog-open') && 
                                        !document.querySelector('.standalone-widget-dialog');
          
          // If no dialog is open for this widget yet, open it in the global renderer
          if (!exactMatch && !fuzzyMatch && !dialogOpenedByContainer) {
            console.log('🌐 Opening widget in global renderer:', widgetId, 'Type:', widgetInfo.type);
            setOpenWidgets(prev => ({
              ...prev,
              [widgetId]: true
            }));
          } else {
            console.log('🌐 Dialog already handled by a widget container, skipping global renderer');
          }
        }, 150);
      }
    };
    
    // Listen for close all dialogs event
    const handleCloseDialogs = () => {
      if (Object.values(openWidgets).some(isOpen => isOpen)) {
        setOpenWidgets({});
        // Reset dialog state to ensure they can be reopened
        resetDialogOpenedState();
        
        // Record dialog close time to prevent immediate reopening
        sessionStorage.setItem('dialog_last_closed', Date.now().toString());
        
        // Clear any specific asset storage
        sessionStorage.removeItem('selected_stake_asset');
      }
    };
    
    // Listen for global close all dialogs event (new)
    const handleGlobalCloseAllDialogs = (e: CustomEvent) => {
      console.log('🌐 Global dialog renderer received close-all command', e.detail);
      
      // Force close all widget dialogs
      setOpenWidgets({});
      
      // Reset all dialog state completely
      resetDialogOpenedState();
      
      // Clean up DOM state
      document.body.classList.remove('widget-dialog-open');
      document.querySelectorAll('.widget-dialog-open').forEach(el => {
        el.classList.remove('widget-dialog-open');
      });
      
      // Record dialog close time to prevent immediate reopening
      sessionStorage.setItem('dialog_last_closed', Date.now().toString());
      
      // Clear any specific asset storage 
      sessionStorage.removeItem('selected_stake_asset');
      
      console.log('🌐 All dialogs have been forcibly closed and state reset');
    };
    
    // Register event listeners
    document.addEventListener('open-widget-dialog', handleOpenDialog as EventListener);
    document.addEventListener('close-widget-dialogs', handleCloseDialogs);
    document.addEventListener('close-all-widget-dialogs', handleGlobalCloseAllDialogs as EventListener);
    
    return () => {
      document.removeEventListener('open-widget-dialog', handleOpenDialog as EventListener);
      document.removeEventListener('close-widget-dialogs', handleCloseDialogs);
      document.removeEventListener('close-all-widget-dialogs', handleGlobalCloseAllDialogs as EventListener);
    };
  }, [openWidgets]);
  
  // Handler for individual dialog open state changes
  const handleDialogOpenChange = (widgetId: string, open: boolean) => {
    if (!open) {
      // When closing a dialog, ensure we reset the dialog state
      setOpenWidgets(prev => ({
        ...prev,
        [widgetId]: false
      }));
      
      // Record dialog close time to prevent immediate reopening
      sessionStorage.setItem('dialog_last_closed', Date.now().toString());
      
      // Ensure asset storage is cleared on dialog close
      sessionStorage.removeItem('selected_stake_asset');
      
      // Only reset global dialog state if no other dialogs are open
      const otherDialogsOpen = Object.entries(openWidgets)
        .some(([id, isOpen]) => id !== widgetId && isOpen);
      
      if (!otherDialogsOpen) {
        resetDialogOpenedState();
      }
    } else {
      setOpenWidgets(prev => ({
        ...prev,
        [widgetId]: true
      }));
    }
  };
  
  return (
    <>
      {Object.entries(openWidgets).map(([widgetId, isOpen]) => (
        isOpen && (
          <div key={widgetId} className="standalone-widget-dialog">
            <StandaloneWidgetDialog
              widgetId={widgetId}
              open={isOpen}
              onOpenChange={(open) => handleDialogOpenChange(widgetId, open)}
            />
          </div>
        )
      ))}
    </>
  );
} 