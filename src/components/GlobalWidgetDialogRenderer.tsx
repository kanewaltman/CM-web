import React, { useEffect, useState } from 'react';
import { StandaloneWidgetDialog } from './StandaloneWidgetDialog';
import { findWidgetById } from '@/lib/widgetRegistry';

/**
 * This component renders a standalone widget dialog based on custom events
 * It can display any widget from the registry even if it's not on the current page
 */
export function GlobalWidgetDialogRenderer() {
  const [openWidgets, setOpenWidgets] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    // Listen for open widget dialog events
    const handleOpenDialog = (e: CustomEvent) => {
      const widgetId = e.detail?.widgetId;
      if (!widgetId) return;
      
      console.log('🌐 Global dialog renderer handling widget:', widgetId);
      
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
        } else {
          console.log('🌐 Dialog already handled by a widget container, skipping global renderer');
        }
      }, 150);
    };
    
    // Listen for close all dialogs event
    const handleCloseDialogs = () => {
      setOpenWidgets({});
    };
    
    // Register event listeners
    document.addEventListener('open-widget-dialog', handleOpenDialog as EventListener);
    document.addEventListener('close-widget-dialogs', handleCloseDialogs);
    
    return () => {
      document.removeEventListener('open-widget-dialog', handleOpenDialog as EventListener);
      document.removeEventListener('close-widget-dialogs', handleCloseDialogs);
    };
  }, []);
  
  return (
    <>
      {Object.entries(openWidgets).map(([widgetId, isOpen]) => (
        isOpen && (
          <div key={widgetId} className="standalone-widget-dialog">
            <StandaloneWidgetDialog
              widgetId={widgetId}
              open={isOpen}
              onOpenChange={(open) => {
                setOpenWidgets(prev => ({
                  ...prev,
                  [widgetId]: open
                }));
              }}
            />
          </div>
        )
      ))}
    </>
  );
} 