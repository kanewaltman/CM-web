import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { ChevronDown } from './ui-icons';
import { WIDGET_REGISTRY, widgetTitles, findWidgetById } from '@/lib/widgetRegistry';
import { useDataSource } from '@/lib/DataSourceContext';
import { openWidgetDialog, closeWidgetDialog } from '@/lib/widgetDialogService';
import { useDialogContentStore } from '@/lib/dialogContentService';

// Lazy load the EarnConfirmationContent component
const EarnConfirmationContent = lazy(() => import('./EarnConfirmationContent'));

// Import isClosingDialog flag from WidgetDialog
// @ts-ignore - Accessing from WidgetDialog which is not explicitly exported
declare const isClosingDialog: boolean;

// Set our own closing flag in case the import doesn't work
let isStandaloneDialogClosing = false;

// Error boundary to catch rendering errors in widgets
class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode, widgetId: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode, widgetId: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error rendering widget ${this.props.widgetId}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 rounded-md border border-red-100">
          <h3 className="text-red-800 font-medium mb-2">Widget Error</h3>
          <p className="text-red-700">
            There was an error rendering this widget. The widget might not be designed to run standalone.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

interface StandaloneWidgetDialogProps {
  widgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StandaloneWidgetDialog({
  widgetId,
  open,
  onOpenChange
}: StandaloneWidgetDialogProps) {
  const dataSource = useDataSource();
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Subscribe to dialog content store
  const { currentContentId, contentHistory, pushContent, popContent, clearHistory } = useDialogContentStore();
  
  // Find widget in registry using the helper function (which handles compound IDs)
  const widgetInfo = findWidgetById(widgetId);
  const widgetType = widgetInfo?.type;
  const widgetConfig = widgetInfo?.config;
  const title = widgetConfig?.title || 'Widget';
  
  // Store the original ID for component props
  const originalWidgetId = widgetId;

  // Handle dialog state changes with centralized management
  useEffect(() => {
    if (open) {
      // Let the service handle URL updates
      openWidgetDialog(widgetId, 'global');
      
      // Add CSS class to body to indicate a widget dialog is open
      document.body.classList.add('widget-dialog-open');
      
      // Simulate a short loading time for UI smoothness
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 200);
      return () => clearTimeout(timer);
    } else {
      // Remove CSS class from body
      document.body.classList.remove('widget-dialog-open');
      
      // Clear content history when dialog is closed
      clearHistory(widgetId);
    }
  }, [open, widgetId, clearHistory]);

  // Listen for dialog content change events
  useEffect(() => {
    const handleContentChange = (e: CustomEvent) => {
      const { type, widgetId: targetWidgetId, contentId, data } = e.detail;
      
      // Only process events for this widget
      if (targetWidgetId && targetWidgetId !== widgetId) {
        return;
      }
      
      if (type === 'push') {
        pushContent(widgetId, contentId, data);
      } else if (type === 'pop') {
        popContent();
      } else if (type === 'clear') {
        clearHistory(targetWidgetId);
      }
    };
    
    // Listen for content change events
    document.addEventListener('dialog-content-change', handleContentChange as EventListener);
    
    return () => {
      document.removeEventListener('dialog-content-change', handleContentChange as EventListener);
    };
  }, [widgetId, pushContent, popContent, clearHistory]);

  // Handle focus prevention for direct URL navigation
  useEffect(() => {
    if (open && contentRef.current) {
      // Remove focus styling
      contentRef.current.style.outline = 'none';
      contentRef.current.setAttribute('tabindex', '-1');
      
      // Move focus to body
      setTimeout(() => {
        document.body.focus();
      }, 50);
    }
  }, [open]);

  // Handle dialog closing via the Dialog component's onOpenChange
  const handleOpenChange = (newOpenState: boolean) => {
    if (!newOpenState && open) {
      // Dialog is being closed
      closeWidgetDialog(widgetId);
      
      // Clear content history
      clearHistory(widgetId);
    }
    // Forward the change to the parent
    onOpenChange(newOpenState);
  };

  // If we can't find the widget, show a not found message
  if (!widgetConfig) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[600px] max-w-[95vw]">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-2">Widget Not Found</h2>
            <p>The widget with ID "{widgetId}" could not be found in the registry.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Available widget IDs: {Object.values(WIDGET_REGISTRY).map(c => c.id).join(', ')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render the widget component from the registry
  const WidgetComponent = widgetConfig.component;
  
  // Find a custom content component if specified
  let CustomContent = null;
  let contentType = null;
  if (currentContentId) {
    try {
      // Extract the content type from the ID
      contentType = currentContentId.split(':')[0];
      
      if (contentType === 'earn-confirmation') {
        CustomContent = EarnConfirmationContent;
      }
      // Add other content types as needed
    } catch (error) {
      console.error('Error loading custom content:', error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        ref={contentRef}
        className="DialogContent w-[var(--max-widget-width,1200px)] max-w-[95vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden"
        onOpenAutoFocus={(e) => {
          // Prevent default focus behavior
          e.preventDefault();
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header - hide when showing custom content with its own header */}
          {!CustomContent && (
            <div className="widget-header flex items-center justify-between px-4 py-2 select-none flex-shrink-0">
              <div className="flex items-center space-x-2">
                <h2 key={title} className="text-sm font-semibold">{title}</h2>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </div>
            </div>
          )}

          {/* Content wrapper */}
          <div className="widget-content flex-1 min-h-0 overflow-hidden pt-0 px-1 pb-1 select-text">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-8 w-32 bg-gray-300 rounded-md mb-4"></div>
                  <div className="h-4 w-64 bg-gray-200 rounded-md mb-2"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded-md"></div>
                </div>
              </div>
            ) : CustomContent ? (
              <div className="h-full">
                <Suspense fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-8 w-32 bg-gray-300 rounded-md mb-4"></div>
                      <div className="h-4 w-64 bg-gray-200 rounded-md mb-2"></div>
                      <div className="h-4 w-48 bg-gray-200 rounded-md"></div>
                    </div>
                  </div>
                }>
                  <CustomContent 
                    {...useDialogContentStore.getState().contentData}
                    onConfirm={() => {
                      // Handle confirmation action
                      console.log('Confirmation action triggered');
                      handleOpenChange(false);
                    }}
                    onCancel={() => {
                      // Handle cancel action
                      console.log('Cancel action triggered');
                      handleOpenChange(false);
                    }}
                    onBack={() => {
                      // Handle back action
                      popContent();
                    }}
                  />
                </Suspense>
              </div>
            ) : (
              <div className="p-4 h-full overflow-auto">
                <WidgetErrorBoundary widgetId={originalWidgetId}>
                  <WidgetComponent 
                    widgetId={originalWidgetId}
                    inDialog={true}
                  />
                </WidgetErrorBoundary>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 