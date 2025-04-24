import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { ChevronDown } from './ui-icons';
import { WIDGET_REGISTRY, widgetTitles, findWidgetById } from '@/lib/widgetRegistry';
import { useDataSource } from '@/lib/DataSourceContext';

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
  
  // Find widget in registry using the helper function (which handles compound IDs)
  const widgetInfo = findWidgetById(widgetId);
  const widgetType = widgetInfo?.type;
  const widgetConfig = widgetInfo?.config;
  const title = widgetConfig?.title || 'Widget';
  
  // Store the original ID for component props
  const originalWidgetId = widgetId;

  // Update URL when dialog is opened/closed
  useEffect(() => {
    if (open) {
      // Add widget ID to URL for direct access
      const newUrl = new URL(window.location.href);
      newUrl.hash = `widget=${widgetId}`;
      window.history.pushState({ widget: widgetId }, '', newUrl.toString());
      
      // Add CSS class to body to indicate a widget dialog is open
      document.body.classList.add('widget-dialog-open');
      
      // Simulate a short loading time for UI smoothness
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 200);
      return () => clearTimeout(timer);
    } else {
      // Remove widget ID from URL when closed
      if (window.location.hash.includes(`widget=${widgetId}`)) {
        const newUrl = new URL(window.location.href);
        newUrl.hash = '';
        window.history.pushState({}, '', newUrl.toString());
      }
      
      // Remove CSS class from body
      document.body.classList.remove('widget-dialog-open');
    }
  }, [open, widgetId]);

  // If we can't find the widget, show a not found message
  if (!widgetConfig) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--max-widget-width,1200px)] max-w-[95vw] h-[90vh] max-h-[90vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="widget-header flex items-center justify-between px-4 py-2 select-none flex-shrink-0">
            <div className="flex items-center space-x-2">
              <h2 key={title} className="text-sm font-semibold">{title}</h2>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </div>

          {/* Content wrapper */}
          <div className="widget-content flex-1 min-h-0 overflow-hidden pt-0 px-1 pb-1 select-text">
            <div className="p-4 h-full overflow-auto">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-8 w-32 bg-gray-300 rounded-md mb-4"></div>
                    <div className="h-4 w-64 bg-gray-200 rounded-md mb-2"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded-md"></div>
                  </div>
                </div>
              ) : (
                <WidgetErrorBoundary widgetId={originalWidgetId}>
                  <WidgetComponent 
                    widgetId={originalWidgetId}
                    inDialog={true}
                  />
                </WidgetErrorBoundary>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 