# Widget Container

The `WidgetContainer` component is a presentational component that provides a consistent UI structure for all widgets in the dashboard. It works in conjunction with GridStack and provides a standardized header and content layout.

## Implementation

```typescript
interface WidgetContainerProps {
  title: string;
  children: React.ReactNode;
  headerControls?: React.ReactNode;  // Optional controls in header
}
```

## Component Role

The `WidgetContainer` is a pure presentational component that:
1. Provides a consistent header with title, system controls, and optional custom controls
2. Wraps widget content in a standardized container
3. Exposes a `.widget-header` class for GridStack's drag functionality
4. Maintains consistent base layout structure

It intentionally does not handle:
- Layout management (handled by App.tsx)
- Resize events (managed by GridStack)
- Widget state (managed by individual widgets)
- Position tracking (managed by GridStack)

## Header Structure

The header includes:
1. Left section:
   - Title
   - Dropdown indicator (ChevronDown)
2. Right section:
   - Optional custom controls (via headerControls prop)
   - System controls:
     - Maximize button
     - More options button

```tsx
<div className="widget-header flex items-center justify-between px-4 py-2 select-none">
  <div className="flex items-center space-x-2">
    <h2 className="text-base font-semibold">{title}</h2>
    <ChevronDown className="h-4 w-4 opacity-50" />
  </div>
  
  <div className="flex items-center space-x-1">
    {headerControls}
    <div className="flex items-center space-x-1">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Maximize2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  </div>
</div>
```

## Styling Architecture

The widget styling is implemented in three layers:

1. **Base Container Layer** (WidgetContainer.tsx)
   ```typescript
   <div ref={containerRef} className="grid-stack-item-content">
     <div className="h-full flex flex-col">
       {/* Header and content sections */}
     </div>
   </div>
   ```

2. **Widget Content Layer** (Individual Widgets)
   ```typescript
   // Applied by individual widget components
   className={cn(
     "h-full overflow-auto scrollbar-thin rounded-lg p-3",
     "border border-[hsl(var(--color-widget-inset-border))] widget-inset"
   )}
   ```

3. **Global Styles Layer** (index.css)
   - Defines theme variables for widget styling
   - Implements scrollbar customization
   - Provides dark/light mode support

## Usage Guidelines

### Important: Widget Container Usage

The `WidgetContainer` should ONLY be used at the GridStack layout level (in `App.tsx`). Individual widget components should NOT wrap themselves in `WidgetContainer`.

✅ Correct Implementation:
```tsx
// In App.tsx
<div className="grid-stack-item" gs-id="market">
  <WidgetContainer 
    title="Market Overview"
    headerControls={<CustomControls />}  // Optional
  >
    <MarketOverview />
  </WidgetContainer>
</div>

// In MarketOverview.tsx
export function MarketOverview() {
  return (
    <div className="widget-content">
      {/* Widget content here */}
    </div>
  );
}
```

❌ Incorrect Implementation:
```tsx
// Don't wrap widgets in WidgetContainer inside their own components
export function MarketOverview() {
  return (
    <WidgetContainer title="Market Overview">
      {/* Widget content here */}
    </WidgetContainer>
  );
}
```

## Best Practices

1. **Widget Component Structure**
   - Keep widget components focused on their content
   - Use consistent content styling
   - Handle internal state and logic independently
   - Don't include container-level concerns

2. **Layout Integration**
   - All WidgetContainer instances should be managed in App.tsx
   - Widget components should focus on their specific functionality
   - Use the provided content area classes for consistent styling

3. **Performance**
   - Keep the WidgetContainer lightweight
   - Handle complex logic in parent or child components
   - Use appropriate memoization in widget content components

## Usage Example

```typescript
// In App.tsx
<div className="grid-stack-item" gs-id="chart">
  <WidgetContainer
    title="Market Overview"
    headerControls={
      <div className="flex items-center space-x-2">
        <RefreshButton />
        <SettingsButton />
      </div>
    }
  >
    <ChartComponent />
  </WidgetContainer>
</div>
```

## Related Documentation
- [GridStack Integration](../../architecture/gridstack-integration.md)
- [Layout Management](../../architecture/layout-management.md) 