# GridStack Integration

GridStack v11.3.0 is the core layout engine powering CM-Web's dynamic widget system. This document outlines how GridStack is integrated into our application architecture.

## Overview

GridStack provides our application with:
- Drag-and-drop widget management
- Responsive grid layouts
- Widget resizing capabilities
- Layout persistence
- Touch device support
- Mobile-first responsive design
- Predictable widget swapping behavior

## Integration Points

### Widget Container

The `WidgetContainer` component serves as the primary integration point with GridStack. Each widget in our application is wrapped in this container, which:
- Provides consistent styling and behavior
- Handles resize events
- Manages widget state
- Implements header controls
- Ensures proper touch device support

### Layout Management

Our GridStack implementation includes:
- Dynamic grid initialization with TypeScript support
- Layout state persistence with automatic saving
- Responsive breakpoints with mobile/desktop layouts
- Widget position tracking with collision detection
- Save/restore functionality with JSON serialization
- Optimized widget swapping behavior

## Configuration

Current GridStack configuration includes:
```typescript
const gridstackOptions: GridStackOptions = {
  float: false, // Disabled to improve widget swapping behavior
  animate: true,
  column: 12,
  margin: 8,
  cellHeight: 'auto',
  disableOneColumnMode: false,
  staticGrid: false,
  // v11.3.0 specific options
  removable: false,
  acceptWidgets: false,
  dragInOptions: { 
    revert: 'invalid', 
    scroll: false, 
    appendTo: 'body', 
    helper: 'clone' 
  },
  draggable: {
    handle: '.widget-header',
    scroll: false,
    appendTo: 'body'
  },
  resizable: {
    handles: 'e, se, s, sw, w',
    autoHide: true
  }
};
```

### Key Configuration Choices

1. **Float Disabled (`float: false`)**
   - Improves predictability of widget swapping
   - Prevents widgets from automatically floating up to fill gaps
   - Maintains grid structure during drag operations

2. **Drag Configuration**
   - Header-only dragging for better UX
   - Scroll disabled during drag for smoother operation
   - Append to body for proper z-indexing

3. **Resize Configuration**
   - Multiple handle positions for flexible resizing
   - Auto-hiding handles for cleaner UI
   - Maintains aspect ratios where appropriate

## Best Practices

1. **Widget Creation**
   - Always use the `WidgetContainer` component
   - Implement proper cleanup on widget removal
   - Handle resize events efficiently
   - Use widget IDs for consistent tracking

2. **Performance**
   - Use `batchUpdate()` and `commit()` for bulk operations
   - Implement proper memoization for widget content
   - Use `will-change: transform` for smooth animations
   - Leverage touch-action: none for mobile support

3. **State Management**
   - Use `loadLayoutSafely()` for reliable layout restoration
   - Persist layout changes using `grid.save()`
   - Handle widget state restoration with IDs
   - Manage widget configuration with TypeScript types
   - Use mobile-specific layouts when needed

## Common Patterns

### Adding New Widgets
```typescript
// Example of adding a new widget with v11.3.0
grid.addWidget({
  w: 3,
  h: 2,
  id: 'unique-widget-id',
  content: {
    type: 'chart',
    title: 'New Widget',
    config: { /* widget specific config */ }
  }
});
```

### Saving Layouts
```typescript
// Example of saving the current layout with v11.3.0
const serializedLayout = grid.save(true); // true to include content
localStorage.setItem('gridLayout', JSON.stringify(serializedLayout));
```

### Mobile Responsiveness
```typescript
// Example of mobile-specific configuration
const mobileOptions: GridStackOptions = {
  column: 1,
  cellHeight: '100px',
  minRow: 24,
  margin: 8,
  disableOneColumnMode: false
};
```

### Event Handling
```typescript
// v11.3.0 event handling
grid.on('change', (event, items) => {
  const currentLayout = grid.save(true);
  // Handle layout changes
});

grid.on('dragstop resizestop', (event, element) => {
  // Handle drag/resize completion
});
```

## Related Documentation
- [Widget Container Component](../components/ui/widget-container.md)
- [Layout Management](../architecture/layout-management.md)
- [State Persistence](../architecture/state-management.md) 