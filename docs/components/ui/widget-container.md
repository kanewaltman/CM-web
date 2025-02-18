# Widget Container

The `WidgetContainer` component is a crucial integration point between our application's UI components and the GridStack v11.3.0 layout system. It provides a standardized wrapper for all widgets in the dashboard.

## Implementation

```typescript
interface WidgetContainerProps {
  title: string;
  children: React.ReactNode;
  headerControls?: React.ReactNode;
  id?: string; // Added for v11.3.0 widget tracking
  onResize?: (dimensions: { width: number; height: number }) => void;
}
```

## Usage Guidelines

### Important: Widget Container Usage

The `WidgetContainer` should ONLY be used at the GridStack layout level (typically in `App.tsx` or your main layout component). Individual widget components should NOT wrap themselves in `WidgetContainer`. This prevents duplicate headers and maintains proper GridStack integration.

✅ Correct Implementation:
```tsx
// In App.tsx or layout component
<div className="grid-stack-item" gs-id="market">
  <WidgetContainer title="Market Overview">
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

## GridStack Integration

The `WidgetContainer` is designed to work seamlessly with GridStack's grid-item functionality:

### Grid Item Structure
```html
<div class="grid-stack-item" gs-id="unique-widget-id">
  <div class="grid-stack-item-content">
    <WidgetContainer title="Widget Title" id="unique-widget-id">
      {/* Widget Content Component */}
    </WidgetContainer>
  </div>
</div>
```

### Key Features

1. **Enhanced Mobile Support**
   - Touch-friendly drag handles
   - Mobile-optimized resize controls
   - Proper touch event handling
   ```typescript
   // CSS improvements for mobile
   .grid-stack-item {
     touch-action: none;
   }
   ```

2. **Improved Drag Handle**
   - Header acts as the drag handle with better touch support
   - Visual feedback during drag operations
   - Prevents content interaction during drag

3. **Content Styling**
   - Widget content should use the following base classes:
   ```typescript
   className={cn(
     "h-full overflow-auto scrollbar-thin rounded-lg p-3",
     "border border-[hsl(var(--color-widget-inset-border))] widget-inset"
   )}
   ```

## Best Practices

1. **Widget Component Structure**
   - Keep widget components focused on their content
   - Use consistent content styling
   - Handle internal state and logic independently
   - Don't include container-level concerns

2. **Layout Management**
   - Handle all widget container wrapping at the layout level
   - Maintain widget IDs and positions in the layout configuration
   - Use the GridStack API for dynamic layout changes

3. **Performance**
   - Implement proper cleanup in widget components
   - Use appropriate memoization for expensive calculations
   - Handle resize events efficiently

## Usage Example

```typescript
import { WidgetContainer } from '@/components/ui/widget-container';

function ChartWidget() {
  const handleResize = useCallback((dimensions) => {
    // Handle resize with new dimensions
  }, []);

  return (
    <WidgetContainer
      title="Market Overview"
      id="chart-widget-1"
      onResize={handleResize}
      headerControls={
        <CustomControls />
      }
    >
      <ChartComponent />
    </WidgetContainer>
  );
}
```

## Common Patterns

### Responsive Content
```typescript
function ResponsiveWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, []);
  
  return (
    <WidgetContainer title="Responsive Content" ref={containerRef}>
      <ResponsiveContent {...dimensions} />
    </WidgetContainer>
  );
}
```

### Custom Header Controls
```typescript
function WidgetWithControls() {
  return (
    <WidgetContainer
      title="Custom Controls"
      headerControls={
        <div className="flex items-center space-x-2">
          <RefreshButton />
          <SettingsButton />
          <ExportButton />
        </div>
      }
    >
      <WidgetContent />
    </WidgetContainer>
  );
}
```

## Related Documentation
- [GridStack Integration](../../architecture/gridstack-integration.md)
- [Layout Management](../../architecture/layout-management.md)
- [Widget State Management](../../architecture/state-management.md) 