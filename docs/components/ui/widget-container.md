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

## GridStack Integration

The `WidgetContainer` is designed to work seamlessly with GridStack's grid-item functionality:

### Grid Item Structure
```html
<div class="grid-stack-item" gs-id="unique-widget-id">
  <div class="grid-stack-item-content">
    <WidgetContainer title="Widget Title" id="unique-widget-id">
      {/* Widget Content */}
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
   ```typescript
   // Header configuration
   const headerProps = {
     className: 'widget-header',
     style: { cursor: isDragging ? 'grabbing' : 'grab' }
   };
   ```

3. **Performance Optimizations**
   - Uses ResizeObserver for efficient size tracking
   - Implements will-change transform for smooth animations
   - Optimizes re-renders during resize operations
   ```typescript
   useEffect(() => {
     const resizeObserver = new ResizeObserver((entries) => {
       // Efficient resize handling
     });
     return () => resizeObserver.disconnect();
   }, []);
   ```

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

## Best Practices

1. **Content Sizing**
   ```typescript
   // Ensure content respects container boundaries
   <div className="h-full flex flex-col">
     <div className="widget-content flex-1 overflow-hidden">
       <div className="h-full overflow-auto scrollbar-thin">
         {children}
       </div>
     </div>
   </div>
   ```

2. **Performance Optimization**
   ```typescript
   // Memoize content and use content visibility
   const MemoizedContent = React.memo(WidgetContent);
   
   <div className="widget-content" style={{ contentVisibility: 'auto' }}>
     <MemoizedContent />
   </div>
   ```

3. **Mobile Responsiveness**
   ```typescript
   // Handle mobile-specific layout
   const isMobile = useMediaQuery('(max-width: 768px)');
   
   <WidgetContainer
     {...props}
     className={cn(
       'widget-container',
       isMobile && 'widget-container-mobile'
     )}
   >
     {children}
   </WidgetContainer>
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