# Widget Dialog System (Integrated in WidgetContainer)

This feature allows users to expand widgets into fullscreen dialogs by clicking on the widget title, with URL navigation support for sharing specific widget views.

## Implementation

The widget dialog functionality is now integrated directly into the `WidgetContainer` component, making it automatically available to all widgets without individual modifications.

### Key Features

- **One-click expansion**: Click on any widget title to open it in a fullscreen dialog
- **URL navigation**: Directly access widgets in dialog mode via URL (`#widget=widgetId`)
- **Browser history support**: Back/forward browser navigation works with dialog state
- **Consistent UI**: Dialog maintains the same header controls as the original widget

## How to Use

### 1. Update widgets to include widgetId

For each widget in your layout, ensure it has a `widgetId` prop:

```tsx
<WidgetContainer
  title="Market Overview"
  widgetId="market-overview"
  headerControls={<MarketControls />}
>
  <MarketWidget />
</WidgetContainer>
```

### 2. Initialize URL handling in App.tsx

Add the dialog initialization hook to your App component:

```tsx
// In App.tsx
import { useWidgetDialogInit } from '@/hooks/useWidgetDialogInit';

function App() {
  // Initialize widget dialog URL handling
  useWidgetDialogInit();
  
  // Rest of your app code...
}
```

## URL Navigation Examples

- Normal dashboard: `https://app.example.com/dashboard`
- Open widget in dialog: `https://app.example.com/dashboard#widget=market-overview`
- Share specific widget: `https://app.example.com/spot#widget=orderbook`

## Styling

Dialog appearance is controlled via CSS variables:

```css
:root {
  --max-widget-width: 1200px;  /* Maximum width for widget dialog */
  --widget-dialog-max-height: 90vh;  /* Maximum height for widget dialog */
  --widget-dialog-header-height: 48px;  /* Height of the dialog header */
  --widget-dialog-content-padding: 1rem;  /* Padding inside the dialog content */
  --widget-dialog-animation-duration: 250ms;  /* Animation duration */
}
```

## Technical Details

1. The `WidgetContainer` now includes the dialog component and URL handling
2. When a widget title is clicked, it opens the dialog and updates the URL hash
3. When loading a URL with a widget hash, the dialog opens automatically
4. Browser history navigation (back/forward) works with dialog states

## Migration from Previous Widgets

No migration is needed for widgets that already use `WidgetContainer`. Simply add the `widgetId` prop to enable dialog functionality. 