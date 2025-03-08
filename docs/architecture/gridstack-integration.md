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

## Widget Drag Behavior

### Optimal Drag Configuration

The following configuration provides the ideal balance of widget swapping, compaction, and smooth animations:

```typescript
const gridOptions = {
  float: false,        // Disable floating to ensure proper compaction
  animate: true,       // Enable smooth transitions
  swap: true,         // Enable widget swapping during drag
  swapScroll: false   // Prevent unwanted scrolling during swaps
};
```

### Drag State Management

To achieve consistent widget behavior during and after drag operations, we implement a state-tracking system:

```typescript
let isDragging = false;

// Track drag state
grid.on('dragstart', () => {
  isDragging = true;
});

// Handle drag completion
grid.on('dragstop', () => {
  isDragging = false;
  grid.batchUpdate();
  try {
    // First ensure proper compaction
    grid.compact();
    // Then force position updates
    grid.engine.nodes.forEach(node => {
      if (node.el) {
        grid.update(node.el, {
          x: node.x,
          y: node.y,
          w: node.w,
          h: node.h
        });
      }
    });
  } finally {
    grid.commit();
  }
});

// Handle non-drag changes separately
grid.on('change', () => {
  if (!isDragging) {
    requestAnimationFrame(() => {
      grid.compact();
    });
  }
});
```

### Key Behaviors

This configuration achieves several critical behaviors:

1. **Widget Swapping**
   - Widgets swap positions horizontally instead of moving to new rows
   - Swapping is visible during drag operations
   - Maintains grid density without creating gaps

2. **Compaction Control**
   - Prevents unwanted vertical movement during horizontal drags
   - Ensures consistent compaction after drag operations
   - Maintains widget positions in their intended rows

3. **Position Consistency**
   - All widgets return to proper positions after drag
   - No widgets get stuck in incorrect rows
   - Grid maintains its compact state at all times

### Common Issues Solved

1. **Unwanted Row Shifting**
   - Problem: Widgets moving to new rows during horizontal drag
   - Solution: Disabled float and enabled swap behavior

2. **Inconsistent Compaction**
   - Problem: Some widgets failing to compact properly
   - Solution: Two-phase update in dragstop (compact + position update)

3. **Animation Smoothness**
   - Problem: Jerky transitions during and after drag
   - Solution: Batched updates and RAF-wrapped compaction

### Implementation Notes

1. The `float: false` setting is crucial for proper widget swapping
2. Batch updates prevent visual flickering during complex operations
3. Explicit position updates ensure consistency across all widgets
4. The drag state tracker prevents compaction conflicts
5. RequestAnimationFrame ensures smooth visual updates

### Best Practices

1. Always use `batchUpdate()/commit()` for multiple grid operations
2. Track drag state to differentiate between drag and other changes
3. Force position updates after compaction to ensure consistency
4. Use `requestAnimationFrame` for smooth visual changes
5. Keep animations enabled for better user experience

This calibration provides the optimal balance between:
- Intuitive widget movement
- Consistent layout behavior
- Smooth animations
- Proper compaction
- Reliable widget positioning

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
