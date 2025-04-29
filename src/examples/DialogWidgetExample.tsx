import React from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { withWidgetDialog } from '@/components/withWidgetDialog';
import { RemovableWidgetProps } from '@/types/widgets';

// Define a base widget component
interface ExampleWidgetProps extends RemovableWidgetProps {
  title: string;
  titleClickHandler?: (e: React.MouseEvent) => void;
  inDialog?: boolean;
}

// Basic widget component 
function ExampleWidget({ 
  widgetId, 
  title, 
  titleClickHandler,
  inDialog = false
}: ExampleWidgetProps) {
  // The widget content should adapt to whether it's displayed in a dialog or not
  const content = (
    <div className="p-4">
      <h3 className="text-lg font-medium mb-4">
        Example Widget Content
        {inDialog && <span className="ml-2 text-sm text-muted-foreground">(Dialog Mode)</span>}
      </h3>
      <p className="mb-4">
        This is an example widget that demonstrates how to use the withWidgetDialog HOC.
        When you click on the widget title, it opens in a larger dialog.
      </p>
      <p className="mb-4">
        Widget ID: <code>{widgetId}</code>
      </p>
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-muted p-4 rounded-lg">Panel 1</div>
        <div className="bg-muted p-4 rounded-lg">Panel 2</div>
        <div className="bg-muted p-4 rounded-lg">Panel 3</div>
        <div className="bg-muted p-4 rounded-lg">Panel 4</div>
      </div>
    </div>
  );

  // If this component is displayed directly in the dialog, just return the content
  if (inDialog) {
    return content;
  }

  // Otherwise, wrap it in a WidgetContainer
  return (
    <WidgetContainer
      title={title}
      titleClickHandler={titleClickHandler}
    >
      {content}
    </WidgetContainer>
  );
}

// Create an enhanced version of the widget with dialog functionality
export const DialogEnabledWidget = withWidgetDialog(ExampleWidget);

// Usage example:
export function ExampleUsage() {
  return (
    <div className="grid-stack-item" gs-id="example-widget">
      <DialogEnabledWidget 
        widgetId="example-widget"
        title="Example Widget"
      />
    </div>
  );
} 