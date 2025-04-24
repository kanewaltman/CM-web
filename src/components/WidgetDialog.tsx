import React, { useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { ChevronDown } from './ui-icons';
import { cn } from '@/lib/utils';

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
  // Update URL when dialog is opened/closed
  useEffect(() => {
    if (open) {
      // Add widget ID to URL for direct access
      const newUrl = new URL(window.location.href);
      newUrl.hash = `widget=${widgetId}`;
      window.history.pushState({ widget: widgetId }, '', newUrl.toString());
    } else {
      // Remove widget ID from URL when closed
      if (window.location.hash.includes(`widget=${widgetId}`)) {
        const newUrl = new URL(window.location.href);
        newUrl.hash = '';
        window.history.pushState({}, '', newUrl.toString());
      }
    }
  }, [open, widgetId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--max-widget-width)] max-w-[95vw] h-[90vh] max-h-[90vh] p-0">
        <div className="flex flex-col h-full">
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
          <div className="widget-content flex-1 min-h-0 overflow-hidden pt-0 px-1 pb-1 select-text">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 