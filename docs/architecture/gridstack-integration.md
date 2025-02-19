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

The `WidgetContainer` component is a pure presentational component that provides:
- Consistent widget styling and structure
- Standard header with title and controls
- Content area for widget-specific components
- Drag handle through `.widget-header` class

The component intentionally does not handle:
- Layout management
- Resize events
- Widget state
- Position tracking

These concerns are instead managed centrally in the main App component.

### Layout Management

Our GridStack implementation in `App.tsx` includes:
- Centralized grid initialization and configuration
- Layout state persistence with localStorage
- Responsive breakpoint handling
- Widget position tracking and collision detection
- Save/restore functionality with JSON serialization
- Mobile/desktop layout switching

### Component Architecture

The system follows a clear separation of concerns:

1. **App.tsx (Controller)**
   - GridStack initialization and configuration
   - Layout state management
   - Event handling (resize, drag, change)
   - Layout persistence
   - Mobile/desktop mode switching

2. **WidgetContainer (Presentation)**
   - Consistent widget UI structure
   - Header with title and controls
   - Content wrapper
   - Drag handle via `.widget-header`

3. **Individual Widgets**
   - Widget-specific content and logic
   - Rendered within WidgetContainer
   - No direct interaction with GridStack

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

## Layout Management

### Widget Structure
Each widget in the grid should have:
- A unique `gs-id` attribute (not `data-gs-id`)
- Position attributes (`gs-x`, `gs-y`, `gs-w`, `gs-h`)
- A `grid-stack-item` class
- A `grid-stack-item-content` class on the inner content container

```html
<div class="grid-stack-item" 
  gs-id="chart"
  gs-x="0" 
  gs-y="0" 
  gs-w="8" 
  gs-h="6">
  <WidgetContainer>
    <!-- Widget content -->
  </WidgetContainer>
</div>
```

### Layout Operations

#### Saving Layouts
```typescript
// Save only positions, not content
const layout = grid.save(false);
localStorage.setItem('desktop-layout', JSON.stringify(layout));
```

#### Loading/Restoring Layouts
```typescript
// Load without recreating widgets (preserves content)
grid.batchUpdate();
try {
  grid.load(layoutData, false); // false = don't add/remove widgets
  grid.compact();
} finally {
  grid.commit();
}
```

### Best Practices

1. **Preserve Widget Content**
   - Use `load(layout, false)` to update positions without recreating widgets
   - Never use `removeAll()` when applying layouts
   - Wrap layout operations in `batchUpdate()/commit()` pairs

2. **Layout Management**
   - Save layouts without content using `save(false)`
   - Always call `compact()` after loading layouts
   - Use `batchUpdate()` for atomic operations

3. **Widget Identification**
   - Use `gs-id` attributes (not `data-gs-id`)
   - Keep IDs consistent between saved layouts and DOM elements
   - Ensure unique IDs across all widgets

4. **Event Handling**
```typescript
// Debounced layout saving
let saveTimeout: NodeJS.Timeout;
const saveLayout = () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const serializedLayout = grid.save(false);
    localStorage.setItem('layout-key', JSON.stringify(serializedLayout));
  }, 100);
};

grid.on('change', saveLayout);
grid.on('resizestop dragstop', saveLayout);
```

### Common Issues

1. **Disappearing Widget Content**
   - Cause: Recreating widgets instead of updating positions
   - Solution: Use `load(layout, false)` to preserve widgets

2. **Layout Reset Issues**
   - Cause: Using `removeAll()` before loading layouts
   - Solution: Update positions with `load(layout, false)`

3. **Inconsistent Layouts**
   - Cause: Missing `compact()` after updates
   - Solution: Always call `compact()` after loading layouts

4. **Performance Issues**
   - Cause: Individual updates without batching
   - Solution: Use `batchUpdate()/commit()` for multiple changes 