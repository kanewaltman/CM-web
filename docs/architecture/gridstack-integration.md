# GridStack Integration

CM-Web uses GridStack v11.3.0 as its core layout engine. This document outlines both our current implementation and additional available features.

## Current Implementation

### Overview

Our GridStack implementation provides:
- Drag-and-drop widget management with header handles
- Responsive grid layouts (desktop and mobile)
- Widget resizing with auto-hiding handles
- Layout persistence in localStorage
- Touch device support
- Predictable widget swapping behavior

### Core Configuration

```typescript
const options: GridStackOptions = {
  float: false,
  cellHeight: mobile ? '100px' : 'auto',
  margin: 4,
  column: mobile ? 1 : 12,
  animate: true,
  draggable: {
    handle: '.widget-header',
  },
  resizable: {
    handles: 'e, se, s, sw, w',
    autoHide: true
  },
  minRow: 1,
  staticGrid: true,
};
```

### Layout Management

Our implementation uses a static widget structure defined in `App.tsx`:

```typescript
const defaultLayout = [
  { x: 0, y: 0, w: 6, h: 6, id: 'chart', minW: 2, minH: 2 },
  { x: 6, y: 0, w: 3, h: 6, id: 'orderbook', minW: 2, minH: 2 },
  // ... other widgets
];

const mobileLayout = [
  { x: 0, y: 0, w: 1, h: 6, id: 'chart', minW: 2, minH: 2 },
  // ... other widgets
];
```

### Layout Persistence

We implement layout saving with custom serialization:

```typescript
// Save layout
const items = grid.getGridItems();
const serializedLayout = items
  .map(item => {
    const node = item.gridstackNode;
    if (!node || !node.id) return null;
    return {
      id: node.id,
      x: node.x ?? 0,
      y: node.y ?? 0,
      w: node.w ?? 2,
      h: node.h ?? 2,
      minW: node.minW ?? 2,
      minH: node.minH ?? 2
    };
  })
  .filter(Boolean);

// Load layout
if (isValidLayout(serializedLayout)) {
  localStorage.setItem('desktop-layout', JSON.stringify(serializedLayout));
}
```

### Widget Structure

Each widget follows this structure:
```html
<div class="grid-stack-item" 
  gs-id="widget-id"
  gs-x="0" 
  gs-y="0" 
  gs-w="6" 
  gs-h="4">
  <WidgetContainer title="Widget Title">
    <WidgetComponent />
  </WidgetContainer>
</div>
```

## Additional Available Features

GridStack v11.3.0 offers several features that, while not currently used in our implementation, are available for future enhancement:

### Dynamic Widget Management
```typescript
// Add widgets dynamically
grid.addWidget({
  w: 3,
  h: 2,
  id: 'new-widget',
  content: {
    type: 'chart',
    title: 'New Widget',
    config: { /* widget specific config */ }
  }
});
```

### Enhanced Drag Options
```typescript
const enhancedOptions: GridStackOptions = {
  dragInOptions: { 
    revert: 'invalid', 
    scroll: false, 
    appendTo: 'body', 
    helper: 'clone' 
  },
  removable: false,
  acceptWidgets: false
};
```

### Alternative Layout Serialization
```typescript
// Save with content
const serializedLayout = grid.save(true);

// Load with content
grid.load(serializedLayout);
```

### Extended Mobile Configuration
```typescript
const extendedMobileOptions: GridStackOptions = {
  column: 1,
  cellHeight: '100px',
  minRow: 24,
  margin: 8,
  disableOneColumnMode: false
};
```

## Best Practices

1. **Layout Operations**
   - Use `batchUpdate()/commit()` for bulk changes
   - Validate layouts before applying
   - Maintain minimum size constraints
   - Handle mobile/desktop transitions smoothly

2. **Performance**
   - Implement proper cleanup on widget removal
   - Use memoization for expensive calculations
   - Handle resize events efficiently
   - Leverage CSS transitions for smooth animations

3. **State Management**
   - Validate layouts before saving
   - Handle missing or invalid layouts gracefully
   - Maintain widget state independently
   - Use TypeScript types for type safety

## Related Documentation
- [Widget Container](../components/ui/widget-container.md)
- [Layout Management](layout-management.md)
