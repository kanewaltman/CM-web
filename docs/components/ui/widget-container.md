# Widget Container

The `WidgetContainer` component is a crucial integration point between our application's UI components and the GridStack layout system. It provides a standardized wrapper for all widgets in the dashboard.

## GridStack v11 Migration Notes

### Content Rendering Changes
The way widget content is rendered has changed significantly in GridStack v11. Our `WidgetContainer` implementation needs to adapt to these changes:

```typescript
// BEFORE (v10)
function createWidget(config: WidgetConfig) {
  return {
    content: `
      <div class="grid-stack-item-content">
        <WidgetContainer>...</WidgetContainer>
      </div>
    `
  };
}

// AFTER (v11)
// 1. Define the render callback
GridStack.renderCB = function(el: HTMLElement, widget: GridStackWidget) {
  const container = document.createElement('div');
  container.className = 'widget-container';
  // Mount React component using createRoot
  const root = createRoot(container);
  root.render(
    <WidgetContainer
      title={widget.content.title}
      config={widget.content.config}
    />
  );
  el.appendChild(container);
};

// 2. Add widget with content as data
function createWidget(config: WidgetConfig) {
  return {
    id: config.id,
    content: {
      title: config.title,
      config: config.widgetConfig,
      type: config.type
    }
  };
}
```

### Drag & Drop Integration
The side panel drag & drop system has been completely rewritten in v11. Our implementation should be updated:

```typescript
// Update drag source configuration
GridStack.setupDragIn('.widget-template', {
  dragIn: {
    // Define widget configurations for each draggable type
    'chart-widget': {
      w: 3,
      h: 2,
      content: {
        type: 'chart',
        title: 'New Chart',
        config: { /* default chart config */ }
      }
    },
    'calendar-widget': {
      w: 2,
      h: 3,
      content: {
        type: 'calendar',
        title: 'New Calendar',
        config: { /* default calendar config */ }
      }
    }
  }
});
```

## Implementation

```typescript
interface WidgetContainerProps {
  title: string;
  children: React.ReactNode;
  headerControls?: React.ReactNode;
}
```

## GridStack Integration

The `WidgetContainer` is designed to work seamlessly with GridStack's grid-item functionality:

### Grid Item Structure
```html
<div class="grid-stack-item">
  <div class="grid-stack-item-content">
    <WidgetContainer>
      {/* Widget Content */}
    </WidgetContainer>
  </div>
</div>
```

### Key Features

1. **Resize Handling**
   - Automatically adjusts content on resize events
   - Maintains aspect ratios when needed
   - Optimizes re-renders during resize

2. **Drag Handle**
   - Header acts as the drag handle
   - Prevents content interaction during drag
   - Provides visual feedback during drag operations

3. **State Management**
   - Preserves widget state during moves
   - Handles minimize/maximize transitions
   - Manages widget configuration persistence

## Usage Example

```typescript
import { WidgetContainer } from '@/components/ui/widget-container';

function ChartWidget() {
  return (
    <WidgetContainer
      title="Market Overview"
      headerControls={
        <CustomControls />
      }
    >
      <ChartComponent />
    </WidgetContainer>
  );
}
```

## GridStack-Specific Props

While the base props are simple, the component internally handles several GridStack-specific attributes:

```typescript
// Internal GridStack attributes handled by the container
interface GridStackAttributes {
  'gs-x': number;
  'gs-y': number;
  'gs-w': number;
  'gs-h': number;
  'gs-id': string;
  'gs-no-resize'?: boolean;
  'gs-no-move'?: boolean;
  'gs-locked'?: boolean;
}
```

## Best Practices

1. **Content Sizing**
   ```typescript
   // Ensure content respects container boundaries
   <div className="h-full flex flex-col">
     <div className="widget-content flex-1 overflow-hidden">
       {children}
     </div>
   </div>
   ```

2. **Performance Optimization**
   ```typescript
   // Memoize content when appropriate
   const MemoizedContent = React.memo(WidgetContent);
   
   // Use content visibility for off-screen widgets
   <div className="widget-content" style={{ contentVisibility: 'auto' }}>
   ```

3. **Event Handling**
   ```typescript
   // Handle resize events efficiently
   useEffect(() => {
     const handleResize = debounce(() => {
       // Update widget content
     }, 100);
     
     return () => handleResize.cancel();
   }, []);
   ```

## Common Patterns

### Responsive Content
```typescript
function ResponsiveWidget() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Update dimensions on resize
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
    <WidgetContainer title="Responsive Content">
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