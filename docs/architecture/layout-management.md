# Layout Management

This document details how CM-Web manages its dynamic layout system using GridStack, covering initialization, configuration, state management, and advanced features.

## GridStack Configuration

### Basic Setup
```typescript
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

// Initialize with default options
const grid = GridStack.init({
  float: true,          // widgets can float
  animate: true,        // smooth transitions
  column: 12,           // 12-column grid
  margin: 8,            // gap between widgets
  cellHeight: 60,       // base height unit
  draggable: {          // dragging configuration
    handle: '.widget-header'
  },
  resizable: {          // resizing configuration
    handles: 'e,se,s,sw,w'
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