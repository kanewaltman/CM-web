# GridStack Integration

GridStack is the core layout engine powering CM-Web's dynamic widget system. This document outlines how GridStack is integrated into our application architecture.

## Overview

GridStack provides our application with:
- Drag-and-drop widget management
- Responsive grid layouts
- Widget resizing capabilities
- Layout persistence
- Touch device support

## Integration Points

### Widget Container

The `WidgetContainer` component serves as the primary integration point with GridStack. Each widget in our application is wrapped in this container, which:
- Provides consistent styling and behavior
- Handles resize events
- Manages widget state
- Implements header controls

### Layout Management

Our GridStack implementation includes:
- Dynamic grid initialization
- Layout state persistence
- Responsive breakpoints
- Widget position tracking
- Save/restore functionality

## Configuration

Current GridStack configuration includes:
```typescript
const gridstackOptions = {
  float: true,
  animate: true,
  column: 12,
  margin: 8,
  cellHeight: 60,
  disableOneColumnMode: false,
  staticGrid: false,
};
```

## Best Practices

1. **Widget Creation**
   - Always use the `WidgetContainer` component
   - Implement proper cleanup on widget removal
   - Handle resize events efficiently

2. **Performance**
   - Minimize layout recalculations
   - Use proper memoization for widget content
   - Implement virtualization for large datasets

3. **State Management**
   - Persist layout changes appropriately
   - Handle widget state restoration
   - Manage widget configuration

## Common Patterns

### Adding New Widgets
```typescript
// Example of adding a new widget
grid.addWidget({
  w: 3,
  h: 2,
  content: '<div class="grid-stack-item-content">New Widget</div>'
});
```

### Saving Layouts
```typescript
// Example of saving the current layout
const serializedLayout = grid.save();
localStorage.setItem('gridLayout', JSON.stringify(serializedLayout));
```

## Related Documentation
- [Widget Container Component](../components/ui/widget-container.md)
- [Layout Management](../architecture/layout-management.md)
- [State Persistence](../architecture/state-management.md) 