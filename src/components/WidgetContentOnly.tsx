import React, { useEffect } from 'react';
import { DataSourceProvider } from '@/lib/DataSourceContext';
import { widgetComponents } from '@/lib/widgetRegistry';
import { cn } from '@/lib/utils';

export interface WidgetContentOnlyProps {
  widgetType: string;
  widgetId: string;
  className?: string;
  viewState?: Record<string, any>;
}

/**
 * Renders only the content of a widget without its header and container.
 * Useful for static pages that need to embed widget functionality.
 */
export const WidgetContentOnly: React.FC<WidgetContentOnlyProps> = ({
  widgetType,
  widgetId,
  className,
  viewState
}) => {
  const WidgetComponent = widgetComponents[widgetType];
  
  useEffect(() => {
    console.log(`WidgetContentOnly rendering: ${widgetType} - ${widgetId}`, {viewState});
  }, [widgetType, widgetId, viewState]);
  
  if (!WidgetComponent) {
    console.error('Unknown widget type:', widgetType);
    return <div className="p-4 text-red-500">Widget type not found: {widgetType}</div>;
  }

  // For static earn pages, we need to pass the forceStatic flag to ensure it doesn't try to use a container
  const enhancedViewState = {
    ...viewState,
    useContentOnly: true // Always force content-only mode for all widgets used with this component
  };

  return (
    <DataSourceProvider>
      <div 
        className={cn(
          "h-full w-full widget-content-only",
          className
        )}
        data-widget-id={widgetId}
        data-widget-type={widgetType}
      >
        <WidgetComponent
          widgetId={widgetId}
          viewState={enhancedViewState}
        />
      </div>
    </DataSourceProvider>
  );
}; 