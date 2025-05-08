# Widget Content Only

The `WidgetContentOnly` component allows you to render just the content of a widget without its header and container. This is particularly useful for static pages where you want to embed widget functionality without the GridStack layout system.

## Implementation

```typescript
interface WidgetContentOnlyProps {
  widgetType: string;    // The type of widget to render
  widgetId: string;      // A unique ID for this widget instance
  className?: string;    // Optional additional CSS classes
  viewState?: Record<string, any>; // Optional view state for the widget
}
```

## Usage

### Direct Component Usage

```tsx
// Render an earn widget with ripple view
<WidgetContentOnly 
  widgetType="earn" 
  widgetId="earn-promo-static" 
  viewState={{ earnViewMode: 'ripple' }}
/>

// Render a market overview widget
<WidgetContentOnly 
  widgetType="market" 
  widgetId="market-static" 
/>

// Render a performance widget with specific view
<WidgetContentOnly 
  widgetType="performance" 
  widgetId="performance-static" 
  viewState={{ chartVariant: 'balance' }}
/>
```

### GridStack Layout Integration

You can also specify that a widget in a GridStack layout should be rendered without its container and header by setting the `useContentOnly` flag in the layout configuration:

```typescript
// In layout configuration files (e.g., earnLayout.ts)
export const getEarnLayout = (WIDGET_REGISTRY: Record<string, any>): LayoutWidget[] => [
  { 
    x: 0, 
    y: 0, 
    w: 12, 
    h: 6, 
    id: 'earn-promo', 
    minW: WIDGET_REGISTRY['earn'].minSize.w, 
    minH: WIDGET_REGISTRY['earn'].minSize.h,
    viewState: {
      earnViewMode: 'ripple',
      viewMode: 'split',
      useContentOnly: true // This flag renders the widget without container and header
    }
  }
];
```

## Best Practices

1. **Container Styling**
   - Always provide explicit dimensions through CSS or the parent container
   - Use consistent spacing and padding around the widget content
   - Consider adding background and border styling for visual clarity

2. **Widget IDs**
   - Use descriptive, unique IDs for each widget instance
   - Add a suffix like `-static` to distinguish from GridStack widgets
   - Keep IDs consistent between rerenders to maintain widget state

3. **View State Management**
   - Provide appropriate view state for widgets that require it
   - Consider using React state to allow user-controlled view changes
   - Persist view state preferences if relevant for the UX

4. **Layout Integration**
   - Use the `useContentOnly: true` flag in layout configurations to render widgets without containers in GridStack
   - This approach maintains consistent widget functionality while removing the visual container

## Example: Static Page Implementation

Here's how to implement a static page using the WidgetContentOnly component:

```tsx
export const StaticEarnPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-8 p-6">
      <h1 className="text-2xl font-bold">Earn</h1>
      
      {/* Earn Promotional Section */}
      <section className="w-full h-[400px] bg-card rounded-lg shadow-sm">
        <WidgetContentOnly 
          widgetType="earn" 
          widgetId="earn-promo-static" 
          viewState={{ earnViewMode: 'ripple' }}
        />
      </section>
      
      {/* Earn Cards Section */}
      <section className="w-full h-[500px] bg-card rounded-lg shadow-sm">
        <WidgetContentOnly 
          widgetType="earn" 
          widgetId="earn-assets-static" 
          viewState={{ earnViewMode: 'cards' }}
        />
      </section>
    </div>
  );
};
```

## Technical Implementation Details

The `WidgetContentOnly` feature works in two ways:

1. **Direct Component Usage**: When you explicitly use the `<WidgetContentOnly>` component in your React code.

2. **GridStack Integration**: When a widget in the GridStack layout has `useContentOnly: true` in its `viewState`. The `createWidget` function in `WidgetRenderer.tsx` checks for this flag and renders the widget content without its container.

## Limitations

- Only works with widgets that don't rely on container-specific features
- Header controls are not available, so alternative controls may be needed
- Cannot be dragged or resized like GridStack widgets
- Does not support the popout functionality 