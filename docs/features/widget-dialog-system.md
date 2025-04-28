# Widget Dialog System

This document outlines the widget dialog system that allows users to expand widgets into fullscreen dialogs with URL navigation support.

## Overview

The widget dialog system provides:

1. A way to expand any widget into a full-screen dialog by clicking on its title
2. URL-based navigation to open widgets directly in dialog mode
3. An extensible approach that can be applied to any widget
4. Preservation of widget state between normal and dialog views

## Implementation

The system consists of several key components:

### Core Components

1. **WidgetDialog**: A dialog component specifically designed for widgets
2. **useWidgetDialog**: A hook to manage dialog state with URL synchronization
3. **withWidgetDialog**: A higher-order component (HOC) to add dialog functionality to any widget
4. **EnhancedWidgetContainer**: An example implementation of a widget container with dialog support
5. **useWidgetDialogInit**: A hook that initializes the dialog system at the app level

### Key Features

- **URL-based Navigation**: Users can directly navigate to a specific widget in dialog view using the URL pattern `#widget=widget-id`
- **Browser Navigation Support**: Back/forward browser navigation works with the dialog state
- **Consistent UI**: Dialog maintains the same header controls as the original widget
- **Responsive**: The dialog adjusts to screen size while maintaining readability
- **Page Refresh Handling**: The system properly handles page refreshes, ensuring clean state restoration

## How to Use

There are two main approaches to implement the widget dialog system:

### 1. Using the HOC Approach (Recommended)

This approach is cleaner and more flexible:

```tsx
import { withWidgetDialog } from '@/components/withWidgetDialog';

// Your widget component
function MyWidget({ widgetId, title, inDialog, ...props }) {
  // Render different content based on inDialog flag if needed
  return (
    <div>
      {/* Widget content */}
    </div>
  );
}

// Create dialog-enabled version
export const DialogEnabledWidget = withWidgetDialog(MyWidget);

// Usage
<DialogEnabledWidget
  widgetId="unique-widget-id"
  title="Widget Title"
  // Other props...
/>
```

### 2. Using EnhancedWidgetContainer

For simpler cases where you don't need to customize dialog behavior:

```tsx
import { EnhancedWidgetContainer } from '@/components/EnhancedWidgetContainer';

<EnhancedWidgetContainer
  widgetId="unique-widget-id"
  title="Widget Title"
  headerControls={<MyCustomControls />}
>
  {/* Widget content */}
</EnhancedWidgetContainer>
```

## Styling

CSS variables in `src/styles/variables.css` control the dialog appearance:

```css
:root {
  --max-widget-width: 1200px;
  --widget-dialog-max-height: 90vh;
  --widget-dialog-header-height: 48px;
  --widget-dialog-content-padding: 1rem;
  --widget-dialog-animation-duration: 250ms;
}
```

Adjust these variables to change the appearance of all widget dialogs.

## URL Navigation Examples

- Normal dashboard: `https://app.example.com/dashboard`
- Open widget in dialog: `https://app.example.com/dashboard#widget=market-overview`
- Share a specific widget view: `https://app.example.com/spot#widget=orderbook`

## Browser Support

The widget dialog system works in all modern browsers and properly handles back/forward navigation.

## Troubleshooting

### Page Refresh Behavior

When a user refreshes the page:

1. The system detects if the refresh happened while a dialog was open
2. If the user intentionally navigated to a dialog URL, it will reopen after refresh
3. If the dialog was opened during a session and the page is refreshed, it will return to the root URL for a clean state

This prevents unintended dialog persistence after page refreshes.

### URL Serialization

The system uses proper URL serialization to ensure:

1. No invalid objects (like `[object Object]`) appear in the URL
2. Widget IDs are properly encoded and decoded
3. Hash parameters are correctly parsed for both widget IDs and optional asset parameters

### Implementation Details

The dialog initialization system is designed to be resilient against React hook rules violations:

1. Uses module-level state instead of React refs for cross-render persistence
2. Avoids conditional hook calls that could cause React errors
3. Properly cleans up session storage to prevent stale states

This ensures stable performance across refreshes, navigation events, and widget operations. 