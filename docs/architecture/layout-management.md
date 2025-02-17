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