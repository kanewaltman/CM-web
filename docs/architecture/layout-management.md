# Layout Management

This document details how CM-Web manages its dynamic layout system using GridStack, covering initialization, configuration, state management, and advanced features.

## Layout System Overview

The layout system is built on GridStack v11.3.0 and provides:
- Drag-and-drop widget management
- Responsive grid layouts
- Widget resizing capabilities
- Layout persistence
- Mobile/desktop layout switching
- Copy/paste layout functionality

### Critical Layout Behaviors

Our implementation addresses several critical layout requirements:

1. **Layout Preservation**
   - Exact widget positions must be maintained on refresh
   - Vertical ordering must be preserved
   - No unwanted compaction during initialization

2. **Interactive Behavior**
   - Real-time compaction during user interactions
   - Natural widget swapping
   - Smooth drag and resize operations

### Layout Types

We maintain three types of layouts:
1. **Default Layout**: The base layout configuration used as a fallback
2. **Saved Layout**: User-customized layout stored in localStorage
3. **Mobile Layout**: Single-column layout for mobile devices

## Implementation Details

### Widget Structure
Each widget must have:
- A unique `gs-id` attribute for identification
- Position attributes (`gs-x`, `gs-y`)
- Size attributes (`gs-w`, `gs-h`)
- Minimum size constraints (`gs-min-w`, `gs-min-h`)

```html
<div class="grid-stack-item" 
  gs-id="chart"
  gs-x="0" 
  gs-y="0" 
  gs-w="6" 
  gs-h="4"
  gs-min-w="2"
  gs-min-h="2">
  <WidgetContainer>
    <!-- Widget content -->
  </WidgetContainer>
</div>
```

### Layout Configuration

```typescript
interface LayoutWidget {
  id: string;      // Unique widget identifier
  x: number;       // X position (column)
  y: number;       // Y position (row)
  w: number;       // Width in columns
  h: number;       // Height in rows
  minW: number;    // Minimum width
  minH: number;    // Minimum height
}

const defaultLayout: LayoutWidget[] = [
  { id: 'chart', x: 0, y: 0, w: 6, h: 6, minW: 2, minH: 2 },
  // ... other widgets
];
```

### Initialization Strategy

The key to reliable layout handling is a two-phase initialization:

```typescript
// Phase 1: Static Layout Preservation
const options: GridStackOptions = {
  float: false,      // Default compaction behavior
  staticGrid: true,  // Start static to ensure layout
  // ... other options
};

// Initialize grid with static behavior
const g = GridStack.init(options, gridElement);

// Apply exact layout positions
g.batchUpdate();
try {
  layoutToApply.forEach(node => {
    const element = gridElement.querySelector(`[gs-id="${node.id}"]`);
    if (element) {
      // Force exact position and size
      element.setAttribute('gs-x', String(node.x));
      element.setAttribute('gs-y', String(node.y));
      element.setAttribute('gs-w', String(node.w));
      element.setAttribute('gs-h', String(node.h));
      element.setAttribute('gs-auto-position', 'false');
      
      // Update grid engine
      g.update(element, {
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        autoPosition: false
      });
    }
  });
} finally {
  g.commit();
}

// Phase 2: Enable Interactive Features
setTimeout(() => {
  g.batchUpdate();
  try {
    // Restore default GridStack behavior
    g.setStatic(false);
    g.opts.float = false;
    
    // Re-enable widget interactions
    g.enableMove(true);
    g.enableResize(true);
  } finally {
    g.commit();
  }
}, 100);
```

#### Key Configuration Points

1. **Initial Grid Options**
   ```typescript
   {
     float: false,     // Default compaction behavior
     staticGrid: true, // Prevent movement during initialization
     minRow: 1,       // Allow widgets at y:0
     animate: true,    // Smooth transitions
     margin: 4,       // Widget spacing
     column: 12       // Desktop column count
   }
   ```

2. **Layout Application**
   - Remove existing grid attributes
   - Apply layout without sorting
   - Force exact positions through both attributes and engine updates
   - Double-pass position verification

3. **Interactive Behavior Restoration**
   - Re-enable grid features after layout is stable
   - Restore default compaction behavior
   - Re-initialize drag and resize capabilities

### Layout Persistence

Layout saving is implemented with debouncing to prevent excessive storage operations:

```typescript
const saveLayout = debounce(() => {
  const serializedLayout = grid.getGridItems()
    .map(item => ({
      id: item.gridstackNode.id,
      x: item.gridstackNode.x,
      y: item.gridstackNode.y,
      w: item.gridstackNode.w,
      h: item.gridstackNode.h,
      minW: item.gridstackNode.minW,
      minH: item.gridstackNode.minH
    }))
    .filter(Boolean);

  if (isValidLayout(serializedLayout)) {
    localStorage.setItem('desktop-layout', JSON.stringify(serializedLayout));
  }
}, 250);
```

### Layout Validation

Layouts must pass validation before being applied:

```typescript
const isValidLayout = (layout: GridStackWidget[]) => {
  if (!Array.isArray(layout) || layout.length !== defaultLayout.length) {
    return false;
  }
  
  return defaultLayout.every(defaultWidget => {
    const savedWidget = layout.find(w => w.id === defaultWidget.id);
    return savedWidget && 
           (savedWidget.w ?? 0) >= (defaultWidget.minW ?? 2) && 
           (savedWidget.h ?? 0) >= (defaultWidget.minH ?? 2);
  });
};
```

### Best Practices

1. **Layout Initialization**
   - Start with static grid to prevent unwanted movement
   - Apply exact positions without sorting
   - Use both DOM attributes and engine updates
   - Enable interactive features only after layout is stable

2. **Position Preservation**
   - Never sort layouts during initialization
   - Maintain exact coordinates
   - Prevent automatic compaction during setup
   - Double-verify positions

3. **Interactive Behavior**
   - Enable compaction after initialization
   - Allow natural widget swapping
   - Maintain smooth animations
   - Preserve user-specified positions

4. **Layout Persistence**
   - Validate layouts before saving
   - Use debounced save operations
   - Maintain minimum size constraints
   - Preserve all widget attributes

### Common Issues Solved

1. **Vertical Position Swapping**
   - Problem: Widgets would swap vertical positions on refresh
   - Solution: Static initialization and exact position forcing

2. **Unwanted Compaction**
   - Problem: Automatic left-right compaction changing layouts
   - Solution: Two-phase initialization with initial static grid

3. **Interactive Behavior**
   - Problem: Lost widget interaction after position preservation
   - Solution: Proper restoration of GridStack features

4. **Layout Stability**
   - Problem: Inconsistent layout restoration
   - Solution: Comprehensive position forcing and verification

### Mobile Considerations

1. **Single Column Mode**
   ```typescript
   const mobileLayout = [
     { x: 0, y: 0, w: 1, h: 6, id: 'chart' },
     { x: 0, y: 6, w: 1, h: 6, id: 'orderbook' },
     // ... other widgets
   ];
   ```

2. **Mobile Options**
   ```typescript
   const mobileOptions = {
     column: 1,
     cellHeight: '100px',
     margin: 4
   };
   ```

## Best Practices

1. **Layout Application**
   - Always use `batchUpdate()/commit()` pairs for bulk operations
   - Set both HTML attributes and update grid engine
   - Use `requestAnimationFrame` for layout enforcement
   - Apply layouts in a consistent order

2. **Layout Persistence**
   - Validate layouts before saving or applying
   - Use debouncing for save operations
   - Always maintain minimum size constraints
   - Store layouts in a consistent format

3. **Mobile Support**
   - Use single-column layout for mobile
   - Maintain widget order in mobile view
   - Adjust widget sizes appropriately
   - Handle orientation changes gracefully

4. **Performance**
   - Batch layout updates
   - Debounce save operations
   - Use `requestAnimationFrame` for DOM updates
   - Minimize layout recalculations

## Common Issues

1. **Widget Collapse**
   - Ensure minimum sizes are set before position updates
   - Apply both HTML attributes and grid updates
   - Verify layout validity before application

2. **Position Inconsistency**
   - Use multi-phase layout application
   - Force position updates when needed
   - Verify positions after layout changes
   - Use `compact()` to ensure proper layout

3. **Layout Restoration**
   - Clean existing attributes before applying layout
   - Apply layout in consistent order
   - Force relayout after initialization
   - Verify layout validity before saving

## GridStack Configuration

### Basic Setup
```typescript
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

// Initialize with default options
const grid = GridStack.init({
  float: false,         // disabled to prevent unwanted widget floating
  animate: true,        // smooth transitions
  column: 12,          // 12-column grid
  margin: 8,           // gap between widgets
  cellHeight: 'auto',  // dynamic height based on content
  draggable: {         // dragging configuration
    handle: '.widget-header'
  },
  resizable: {         // resizing configuration
    handles: 'e,se,s,sw,w',
    autoHide: true
  }
});
```

### Responsive Configuration
```typescript
const breakpoints = {
  desktop: 1200,
  tablet: 768,
  mobile: 480
};

const responsiveOptions = {
  desktop: {
    column: 12,
    cellHeight: 60
  },
  tablet: {
    column: 8,
    cellHeight: 50
  },
  mobile: {
    column: 4,
    cellHeight: 40
  }
};

// Apply responsive options
grid.setStatic(true);  // prevent transitions during resize
grid.column(responsiveOptions[breakpoint].column);
grid.cellHeight(responsiveOptions[breakpoint].cellHeight);
grid.setStatic(false);
```

## Layout State Management

### Saving Layouts
```typescript
interface LayoutState {
  widgets: GridStackNode[];
  options: GridStackOptions;
  breakpoint: string;
}

function saveLayout(): LayoutState {
  return {
    widgets: grid.save(),
    options: grid.getOptions(),
    breakpoint: currentBreakpoint
  };
}

// Persist to storage
localStorage.setItem('gridLayout', JSON.stringify(saveLayout()));
```

### Optimized Layout Loading
```typescript
// Use the optimized loading strategy for more reliable layout restoration
function loadLayoutSafely(grid: GridStack, layout: GridStackNode[]) {
  // Phase 1: Load with scaled-down sizes (80% of final size)
  const scaledLayout = layout.map(widget => ({
    ...widget,
    w: Math.max(1, Math.floor((widget.w ?? 1) * 0.8)),
    h: Math.max(1, Math.floor((widget.h ?? 1) * 0.8))
  }));

  grid.batchUpdate();
  try {
    grid.removeAll();
    scaledLayout.forEach(widget => grid.addWidget(widget));
  } finally {
    grid.commit();
  }

  // Phase 2: Restore to original sizes
  setTimeout(() => {
    grid.batchUpdate();
    try {
      layout.forEach(widget => {
        const el = grid.engine.nodes.find(n => n.id === widget.id);
        if (el?.el && widget.w !== undefined && widget.h !== undefined) {
          grid.update(el.el, { w: widget.w, h: widget.h });
        }
      });
    } finally {
      grid.commit();
    }
  }, 50);
}
```

This two-phase loading strategy significantly improves layout restoration reliability by:
1. Initially loading widgets at 80% of their final size
2. Allowing GridStack's layout engine more flexibility in initial placement
3. Smoothly transitioning to the final layout after initial positioning
4. Using batch updates for performance and visual smoothness

### Layout Copy/Paste
```typescript
// Copy current layout with widget IDs
function copyLayout() {
  const items = grid.getGridItems();
  const layoutConfig = items.map(item => {
    const node = item.gridstackNode;
    if (!node) return null;
    return {
      id: node.id || defaultLayout[items.indexOf(item)].id, // Fallback to default layout ID
      x: node.x,
      y: node.y,
      w: node.w,
      h: node.h
    };
  }).filter(Boolean);
  
  return JSON.stringify(layoutConfig);
}

// Paste layout with proper widget mapping
function pasteLayout(layoutStr: string) {
  const layoutData = JSON.parse(layoutStr);
  
  grid.batchUpdate();
  const items = grid.getGridItems();
  
  // Create a map of current items by their IDs
  const itemsById = new Map();
  items.forEach((item) => {
    if (item.gridstackNode?.id) {
      itemsById.set(item.gridstackNode.id, item);
    }
  });

  // Update positions in a single pass
  layoutData.forEach((config) => {
    if (config.id) {
      const item = itemsById.get(config.id);
      if (item && item.gridstackNode) {
        grid.update(item, {
          x: config.x,
          y: config.y,
          w: config.w,
          h: config.h,
          autoPosition: false
        });
      }
    }
  });
  
  grid.commit();
}
```

### Restoring Layouts
```typescript
async function restoreLayout() {
  const savedLayout = JSON.parse(localStorage.getItem('gridLayout'));
  if (!savedLayout) return;

  // Restore grid options
  grid.setOptions(savedLayout.options);
  
  // Clear existing widgets
  grid.removeAll();
  
  // Restore widgets with their content
  for (const node of savedLayout.widgets) {
    await loadWidgetContent(node);
    grid.addWidget(node);
  }
}
```

## Widget Management

### Adding Widgets
```typescript
interface WidgetConfig {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  data?: any;
}

function addWidget(config: WidgetConfig) {
  const widget = {
    id: config.id,
    x: config.position.x,
    y: config.position.y,
    w: config.position.w,
    h: config.position.h,
    content: `
      <div class="grid-stack-item-content">
        <div data-widget-id="${config.id}" data-widget-type="${config.type}"></div>
      </div>
    `
  };
  
  grid.addWidget(widget);
  renderWidgetContent(config);
}
```

### Widget Events
```typescript
grid.on('added removed change', (event, items) => {
  // Handle layout changes
  saveLayout();
});

grid.on('resizestart', (event, item) => {
  // Pause widget content updates during resize
  const widget = getWidgetById(item.id);
  widget.pauseUpdates();
});

grid.on('resizestop', (event, item) => {
  // Resume widget content updates
  const widget = getWidgetById(item.id);
  widget.resumeUpdates();
  widget.refresh();
});
```

## Advanced Features

### Custom Animations
```typescript
const animationOptions = {
  duration: 300,
  easing: 'ease-in-out'
};

grid.setAnimation(true);
grid.setAnimationOptions(animationOptions);
```

### Layout Constraints
```typescript
const constraints = {
  minWidth: 2,
  maxWidth: 12,
  minHeight: 2,
  maxHeight: 8,
  noResize: false,
  noMove: false,
  locked: false
};

function addConstrainedWidget(config: WidgetConfig) {
  const widget = {
    ...config,
    ...constraints,
    'gs-min-w': constraints.minWidth,
    'gs-max-w': constraints.maxWidth,
    'gs-min-h': constraints.minHeight,
    'gs-max-h': constraints.maxHeight
  };
  
  grid.addWidget(widget);
}
```

### Performance Optimization
```typescript
// Batch widget updates
grid.batchUpdate();
try {
  // Perform multiple grid operations
  grid.removeAll();
  savedWidgets.forEach(widget => grid.addWidget(widget));
} finally {
  grid.commit();
}

// Optimize frequent updates
const debouncedSave = debounce(() => {
  saveLayout();
}, 500);

grid.on('change', debouncedSave);
```

## Error Handling

```typescript
function handleGridErrors() {
  grid.on('error', (event, error) => {
    console.error('GridStack error:', error);
    // Implement error recovery
    if (error.type === 'layout') {
      restoreLastValidLayout();
    }
  });
}

function restoreLastValidLayout() {
  const lastValid = localStorage.getItem('lastValidLayout');
  if (lastValid) {
    grid.load(JSON.parse(lastValid));
  }
}
```

## Related Documentation
- [GridStack Integration](gridstack-integration.md)
- [Widget Container](../components/ui/widget-container.md)
- [State Management](state-management.md)

## GridStack v11 Migration Notes

### Breaking Changes

1. **Widget Content Rendering**
   ```typescript
   // BEFORE (v10) - Direct innerHTML setting (now removed)
   function addWidget(config: WidgetConfig) {
     const widget = {
       content: `<div>...</div>`  // No longer supported
     };
   }

   // AFTER (v11) - Using renderCB
   GridStack.renderCB = function(el: HTMLElement, widget: GridStackWidget) {
     // Implement proper HTML sanitization
     const sanitizedContent = DOMPurify.sanitize(widget.content);
     el.innerHTML = sanitizedContent;
   };
   ```

2. **Widget Addition**
   ```typescript
   // BEFORE (v10)
   grid.addWidget({
     content: '<div class="widget-content">...</div>'
   });

   // AFTER (v11)
   const widget: GridStackWidget = {
     id: 'widget-1',
     // content property used for data only, not HTML
     content: { type: 'chart', config: {...} }
   };
   grid.addWidget(widget);
   ```

3. **Side Panel Drag & Drop**
   ```typescript
   // BEFORE (v10)
   GridStack.setupDragIn('.sidebar-item');

   // AFTER (v11)
   GridStack.setupDragIn('.sidebar-item', {
     // Associate widget configuration with sidebar items
     dragIn: {
       'chart-item': {
         w: 3,
         h: 2,
         content: { type: 'chart' }
       }
     }
   });
   ```

### New Features to Consider

1. **Lazy Loading**
   ```typescript
   const grid = GridStack.init({
     // Enable lazy loading for better performance
     lazyLoad: true,
     // Configure lazy loading threshold
     lazyLoadThrottle: 100
   });
   ```

2. **Enhanced Widget Creation**
   ```typescript
   // Use the new utility for creating widget structure
   const el = GridStack.Utils.createWidgetDivs();
   grid.makeWidget(el);
   ```

## Layout Persistence

### Layout Application
```typescript
const applyLayout = (layout: GridStackWidget[]) => {
  grid.batchUpdate();
  try {
    // Clean slate approach - remove old attributes
    gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
      const element = item as HTMLElement;
      element.removeAttribute('gs-x');
      element.removeAttribute('gs-y');
      element.removeAttribute('gs-w');
      element.removeAttribute('gs-h');
    });

    // Apply new layout
    layout.forEach((node: GridStackWidget) => {
      if (node.id) {
        const item = gridElement.querySelector(`[gs-id="${node.id}"]`);
        if (item) {
          grid.update(item as HTMLElement, {
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h
          });
        }
      }
    });

    grid.compact(); // Ensure no gaps
  } finally {
    grid.commit();
  }
};
```

### Layout Validation
```typescript
const isValidLayout = (layout: GridStackWidget[]) => {
  if (!Array.isArray(layout) || layout.length !== defaultLayout.length) {
    return false;
  }
  
  // Verify all required widgets are present
  return defaultLayout.every(defaultWidget => 
    layout.some(savedWidget => savedWidget.id === defaultWidget.id)
  );
};
```

### Save and Restore
```typescript
// Save layout
const saveLayout = () => {
  const serializedLayout = grid.save(false);
  if (isValidLayout(serializedLayout)) {
    localStorage.setItem('desktop-layout', JSON.stringify(serializedLayout));
  }
};

// Restore layout
const restoreLayout = () => {
  const savedLayout = localStorage.getItem('desktop-layout');
  if (savedLayout) {
    try {
      const layoutData = JSON.parse(savedLayout);
      if (isValidLayout(layoutData)) {
        applyLayout(layoutData);
        return true;
      }
    } catch (error) {
      console.error('Failed to restore layout:', error);
    }
  }
  applyLayout(defaultLayout);
  return false;
};
```

## Responsive Behavior

### Breakpoint Management
```typescript
const MOBILE_BREAKPOINT = 768;

const handleResize = () => {
  const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
  if (mobile !== isMobile) {
    setIsMobile(mobile);
    initializeGrid(mobile);
  }
};
```

## Best Practices

1. **Layout Application**
   - Always use the clean slate approach when applying layouts
   - Apply layouts atomically using batchUpdate/commit
   - Validate layouts before saving or restoring
   - Handle errors gracefully with fallbacks

2. **Widget Management**
   - Maintain consistent widget IDs
   - Use proper widget cleanup on removal
   - Handle widget content resizing appropriately
   - Implement proper mobile/desktop transitions

3. **Performance**
   - Debounce layout save operations
   - Use efficient layout validation
   - Optimize compact operations
   - Minimize unnecessary layout updates

4. **Error Handling**
   - Validate layouts before applying
   - Provide fallback layouts
   - Log errors appropriately
   - Maintain layout integrity 

## Widget Size Management

### Minimum Size Constraints
To prevent widgets from becoming too small and maintain layout integrity, we implement size constraints:

1. **Widget Attributes**
   ```typescript
   // Set minimum size constraints on widget elements
   element.setAttribute('gs-min-w', String(Math.min(2, defaultWidget.w)));
   element.setAttribute('gs-min-h', String(Math.min(2, defaultWidget.h)));
   ```

2. **Layout Validation**
   ```typescript
   const hasValidSizes = widgets.every(widget => {
     return widget.w >= Math.min(2, defaultSize.w) && 
            widget.h >= Math.min(2, defaultSize.h);
   });
   ```

### Size Restoration
When applying layouts, we ensure widget sizes are properly maintained:

```typescript
const applyLayout = (layout: GridStackWidget[]) => {
  grid.batchUpdate();
  try {
    // First pass: Apply minimum size constraints
    layout.forEach(node => {
      const defaultWidget = defaultLayout.find(w => w.id === node.id);
      grid.update(element, {
        w: Math.max(node.w || 0, defaultWidget?.w || 2),
        h: Math.max(node.h || 0, defaultWidget?.h || 2)
      });
    });

    // Second pass: Ensure proper sizing
    setTimeout(() => {
      grid.batchUpdate();
      layout.forEach(node => {
        const defaultWidget = defaultLayout.find(w => w.id === node.id);
        if (defaultWidget) {
          grid.update(element, {
            w: Math.max(node.w || 0, defaultWidget.w),
            h: Math.max(node.h || 0, defaultWidget.h)
          });
        }
      });
      grid.commit();
    }, 0);
  } finally {
    grid.commit();
  }
};
```

## Layout Persistence

### Layout Validation
```typescript
const isValidLayout = (layout: GridStackWidget[]) => {
  if (!Array.isArray(layout) || layout.length !== defaultLayout.length) {
    return false;
  }
  
  // Verify all required widgets are present with valid sizes
  return defaultLayout.every(defaultWidget => {
    const savedWidget = layout.find(w => w.id === defaultWidget.id);
    return savedWidget && 
           (savedWidget.w ?? 0) >= Math.min(2, defaultWidget.w) && 
           (savedWidget.h ?? 0) >= Math.min(2, defaultWidget.h);
  });
};
```

### Save and Restore
```typescript
// Save layout with size validation
const saveLayout = () => {
  const serializedLayout = grid.save(false);
  if (isValidLayout(serializedLayout)) {
    localStorage.setItem('desktop-layout', JSON.stringify(serializedLayout));
  }
};

// Restore layout with size constraints
const restoreLayout = () => {
  const savedLayout = localStorage.getItem('desktop-layout');
  if (savedLayout) {
    try {
      const layoutData = JSON.parse(savedLayout);
      if (isValidLayout(layoutData)) {
        applyLayout(layoutData);
        return true;
      }
    } catch (error) {
      console.error('Failed to restore layout:', error);
    }
  }
  applyLayout(defaultLayout);
  return false;
};
```

## Best Practices

1. **Size Management**
   - Always enforce minimum widget sizes
   - Use two-pass layout application for reliable sizing
   - Validate sizes before saving layouts
   - Maintain default size references

2. **Layout Application**
   - Use batch updates for atomic changes
   - Apply size constraints before position updates
   - Handle layout validation comprehensively
   - Provide fallback to default sizes

3. **Performance**
   - Use setTimeout for reliable size updates
   - Batch related size operations
   - Validate layouts efficiently
   - Cache default widget references

4. **Error Handling**
   - Validate sizes before saving
   - Handle missing or invalid sizes
   - Provide fallback sizes
   - Log size-related errors 