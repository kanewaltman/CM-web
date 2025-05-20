import React, { useEffect, useState } from 'react';
import { StandaloneWidgetDialog } from './StandaloneWidgetDialog';
import { findWidgetById } from '@/lib/widgetRegistry';
import { resetDialogOpenedState } from '@/lib/widgetDialogService';
import { useDialogContentStore, clearDialogContentHistory } from '@/lib/dialogContentService';

// Track which events have been handled globally
const handledGlobalEvents = new Set<string>();

/**
 * This component renders a standalone widget dialog based on custom events
 * It can display any widget from the registry even if it's not on the current page
 */
export function GlobalWidgetDialogRenderer() {
  const [openWidgets, setOpenWidgets] = useState<Record<string, boolean>>({});
  
  // Access content store to clear history when all dialogs are closed
  const { clearHistory } = useDialogContentStore();
  
  useEffect(() => {
    // Listen for open widget dialog events
    const handleOpenDialog = (e: CustomEvent) => {
      const widgetId = e.detail?.widgetId;
      if (!widgetId) return;
      
      // Get event ID if available
      const eventId = typeof e.detail?.eventId === 'string' ? e.detail.eventId : null;
      
      // Skip events from container title clicks (source = 'container')
      if (e.detail?.source === 'container') {
        console.log('🌐 Skipping global renderer for container-sourced event:', widgetId);
        return;
      }
      
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
        
        // Check if there's custom content to display immediately
        if (e.detail?.initialContent) {
          // Dispatch event to push content after dialog opens
          setTimeout(() => {
            const contentEvent = new CustomEvent('dialog-content-change', {
              detail: {
                type: 'push',
                widgetId: widgetId,
                contentId: e.detail.initialContent,
                data: e.detail.contentData || {}
              }
            });
            document.dispatchEvent(contentEvent);
          }, 300);
        }
        
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
      
      // Skip title-click events which should only be handled by the specific container
      if (eventId && eventId.startsWith('title-click-')) {
        console.log('🌐 Skipping global handling for title-click event:', eventId);
        return;
      }
      
      // Skip if this dialog was opened by a container directly
      if (e.detail?.source === 'container') {
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
        return;
      }
      
      // Continue with normal dialog handling
      handleGlobalDialog();
      
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
        // findWidgetById now handles compound IDs with timestamps
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
            
            // Check if there's custom content to display immediately
            if (e.detail?.initialContent) {
              // Dispatch event to push content after dialog opens
              setTimeout(() => {
                const contentEvent = new CustomEvent('dialog-content-change', {
                  detail: {
                    type: 'push',
                    widgetId: widgetId,
                    contentId: e.detail.initialContent,
                    data: e.detail.contentData || {}
                  }
                });
                document.dispatchEvent(contentEvent);
              }, 300);
            }
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
        
        // Clear dialog content history
        clearHistory();
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
      
      // Clear dialog content history
      clearHistory();
      
      console.log('🌐 All dialogs have been forcibly closed and state reset');
    };
    
    // Register event listeners
    document.addEventListener('open-widget-dialog', handleOpenDialog as EventListener);
    document.addEventListener('close-widget-dialogs', handleCloseDialogs);
    
    return () => {
      document.removeEventListener('open-widget-dialog', handleOpenDialog as EventListener);
      document.removeEventListener('close-widget-dialogs', handleCloseDialogs);
    };
  }, [openWidgets, clearHistory]);
  
  // Handler for individual dialog open state changes
  const handleDialogOpenChange = (widgetId: string, open: boolean) => {
    if (!open) {
      // When closing a dialog, ensure we reset the dialog state
      setOpenWidgets(prev => ({
        ...prev,
        [widgetId]: false
      }));
      
      // Only reset global dialog state if no other dialogs are open
      const otherDialogsOpen = Object.entries(openWidgets)
        .some(([id, isOpen]) => id !== widgetId && isOpen);
      
      if (!otherDialogsOpen) {
        resetDialogOpenedState();
        // Clear content history for this widget
        clearDialogContentHistory(widgetId);
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