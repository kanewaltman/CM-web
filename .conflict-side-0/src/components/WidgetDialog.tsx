import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { ChevronDown } from './ui-icons';
import { cn } from '@/lib/utils';
import { openWidgetDialog, closeWidgetDialog } from '@/lib/widgetDialogService';

// Flag provided by widgetDialogService.ts
// @ts-ignore - Accessing exported variable
declare const isClosingDialog: boolean;

interface WidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  headerControls?: React.ReactNode;
  children: React.ReactNode;
  widgetId: string;
}

export function WidgetDialog({
  open,
  onOpenChange,
  title,
  headerControls,
  children,
  widgetId
}: WidgetDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle dialog state changes with centralized management
  useEffect(() => {
    if (open) {
      // Let the service handle URL updates
      openWidgetDialog(widgetId, 'container');
    }
  }, [open, widgetId]);

  // Handle auto-focus prevention
  useEffect(() => {
    // Check if URL contains this widget ID
    const urlWidgetId = new URLSearchParams(window.location.hash.substring(1)).get('widget');
    if (open && urlWidgetId === widgetId && contentRef.current) {
      // Remove focus outline via DOM manipulation
      contentRef.current.style.outline = 'none';
      contentRef.current.setAttribute('tabindex', '-1');
      
      // Ensure focus doesn't stay on the dialog by moving it elsewhere
      document.body.focus();
    }
  }, [open, widgetId]);

  // Handle dialog closing via the Dialog component's onOpenChange
  const handleOpenChange = (newOpenState: boolean) => {
    if (!newOpenState && open) {
      // Dialog is being closed
      closeWidgetDialog(widgetId);
      
      // Clear any session storage values that might cause dialogs to reopen
      if (widgetId === 'earn-stake') {
        sessionStorage.removeItem('selected_stake_asset');
      }
      
      // Clear any other specific dialog-related storage here as needed
      // If dialog is for earn, also dispatch a custom event
      if (widgetId.startsWith('earn-')) {
        const closeEvent = new CustomEvent('close-all-widget-dialogs', {
          bubbles: true,
          detail: { source: 'dialog-component', widgetId }
        });
        document.dispatchEvent(closeEvent);
      }
    }
    // Forward the change to the parent
    onOpenChange(newOpenState);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        ref={contentRef}
        className="DialogContent w-[var(--max-widget-width)] max-w-[95vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden"
        onOpenAutoFocus={(e) => {
          // Prevent default autofocus behavior 
          e.preventDefault();
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="widget-header flex items-center justify-between px-4 py-2 select-none flex-shrink-0">
            <div className="flex items-center space-x-2">
              <h2 key={title} className="text-sm font-semibold">{title}</h2>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
            
            <div className="flex items-center space-x-1">
              {headerControls}
            </div>
          </div>

          {/* Content wrapper */}
          <div className="widget-content flex-1 min-h-0 overflow-auto pt-0 px-1 pb-1 select-text">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 