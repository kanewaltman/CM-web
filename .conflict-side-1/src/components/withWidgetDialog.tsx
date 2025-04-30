import React from 'react';
import { WidgetDialog } from './WidgetDialog';
import { useWidgetDialog } from '@/lib/widgetDialogService';

// Higher-order component to add dialog functionality to any widget
export function withWidgetDialog<P extends { widgetId: string; title: string }>(
  WrappedComponent: React.ComponentType<P & { titleClickHandler?: (e: React.MouseEvent) => void }>
) {
  // Return a new component with dialog functionality
  return function WithDialogComponent(props: P) {
    const { widgetId, title } = props;
    const { isOpen, setIsOpen } = useWidgetDialog(widgetId);

    // Handler for title click to open dialog
    const handleTitleClick = (e: React.MouseEvent) => {
      // Prevent click from triggering drag behavior
      e.stopPropagation();
      setIsOpen(true);
    };

    return (
      <>
        <WrappedComponent
          {...props}
          titleClickHandler={handleTitleClick}
        />

        <WidgetDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title={title}
          headerControls={props.headerControls as React.ReactNode}
          widgetId={widgetId}
        >
          <div className="p-4 h-full overflow-auto">
            <WrappedComponent
              {...props}
              inDialog={true}
            />
          </div>
        </WidgetDialog>
      </>
    );
  };
} 