const initializeGrid = useCallback((mobile: boolean) => {
  const gridElement = document.querySelector('.grid-stack');
  if (!gridElement) return null;

  // Add initial opacity style to grid element
  gridElement.classList.add('grid-initializing');

  // Clean up existing instance but preserve the items
  if (gridRef.current) {
    gridRef.current.destroy(false);
  }

  const g = GridStack.init({
    float: false,
    cellHeight: mobile ? '100px' : '60px',
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
    staticGrid: false, // Ensure grid is not static
    disableResize: false, // Explicitly enable resize
    disableDrag: false // Explicitly enable drag
  }, gridElement as GridStackElement);

  // Enable resize/move for all widgets
  g.enableMove(true);
  g.enableResize(true);

  // Temporarily disable animations during layout application
  g.setAnimation(false);

  // Get the layout to apply
  let layoutToApply = defaultLayout;
  if (!mobile) {
    const savedLayout = localStorage.getItem('desktop-layout');
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        if (isValidLayout(parsedLayout)) {
          layoutToApply = parsedLayout;
        }
      } catch (error) {
        console.error('Failed to parse saved layout:', error);
      }
    }
  } else {
    layoutToApply = mobileLayout;
  }

  // Initialize all widgets with correct attributes
  g.batchUpdate();
  try {
    // First remove all gs-* attributes except gs-id
    gridElement.querySelectorAll('.grid-stack-item').forEach(item => {
      const element = item as HTMLElement;
      Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('gs-') && attr.name !== 'gs-id')
        .forEach(attr => element.removeAttribute(attr.name));
    });

    // Apply layout in exact order without sorting
    layoutToApply.forEach(node => {
      const element = gridElement.querySelector(`[gs-id="${node.id}"]`) as HTMLElement;
      if (element) {
        // Set minimum constraints first
        const defaultNode = defaultLayout.find(d => d.id === node.id);
        if (defaultNode) {
          element.setAttribute('gs-min-w', String(defaultNode.minW ?? 2));
          element.setAttribute('gs-min-h', String(defaultNode.minH ?? 2));
        }
        
        // Force exact position and size
        element.setAttribute('gs-x', String(node.x));
        element.setAttribute('gs-y', String(node.y));
        element.setAttribute('gs-w', String(node.w));
        element.setAttribute('gs-h', String(node.h));
        element.setAttribute('gs-auto-position', 'false');
        
        // Update grid engine with exact position
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

  // Remove initializing class to trigger fade in
  gridElement.classList.remove('grid-initializing');

  // Re-enable animations
  g.setAnimation(true);

  // Set up layout saving with debounce
  if (!mobile) {
    let saveTimeout: NodeJS.Timeout;
    const saveLayout = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const items = g.getGridItems();
        const serializedLayout = items
          .map(item => {
            const node = item.gridstackNode;
            if (!node || !node.id) return null;

            const defaultWidget = defaultLayout.find(w => w.id === node.id);
            if (!defaultWidget) return null;

            return {
              id: node.id,
              x: node.x ?? 0,
              y: node.y ?? 0,
              w: Math.max(node.w ?? 2, defaultWidget.minW ?? 2),
              h: Math.max(node.h ?? 2, defaultWidget.minH ?? 2),
              minW: defaultWidget.minW ?? 2,
              minH: defaultWidget.minH ?? 2
            };
          })
          .filter((item): item is LayoutWidget => item !== null);

        if (isValidLayout(serializedLayout)) {
          localStorage.setItem('desktop-layout', JSON.stringify(serializedLayout));
        }
      }, 250);
    };

    g.on('change', saveLayout);
    g.on('resizestop dragstop', saveLayout);
  }

  return g;
}, []);

const handleWidgetDrop = useCallback((event: React.DragEvent<HTMLElement>) => {
  event.preventDefault();
  const widgetType = event.dataTransfer?.getData('widget/type');
  
  if (!widgetType || !gridRef.current || !widgetComponents[widgetType]) return;

  const gridElement = document.querySelector('.grid-stack');
  if (!gridElement) return;

  // Get drop coordinates relative to grid
  const rect = gridElement.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / (rect.width / 12));
  const y = Math.floor((event.clientY - rect.top) / 150);

  // Create widget ID
  const widgetId = `${widgetType}-${Date.now()}`;

  // Create new widget element
  const widgetElement = document.createElement('div');
  widgetElement.className = 'grid-stack-item';
  widgetElement.setAttribute('gs-id', widgetId);
  widgetElement.setAttribute('gs-min-w', '2');
  widgetElement.setAttribute('gs-min-h', '2');

  // Add widget content using createRoot
  const root = ReactDOM.createRoot(widgetElement);
  const WidgetComponent = widgetComponents[widgetType];
  const widgetTitle = widgetTitles[widgetType];
  
  root.render(
    <WidgetContainer title={widgetTitle}>
      <WidgetComponent />
    </WidgetContainer>
  );

  // Add widget to grid
  const widget = gridRef.current.addWidget({
    id: widgetId,
    el: widgetElement,
    x,
    y,
    w: 3,
    h: 4,
    minW: 2,
    minH: 2,
    autoPosition: true
  } as ExtendedGridStackWidget);

  // Explicitly enable resize and move for the new widget
  gridRef.current.movable(widgetElement, true);
  gridRef.current.resizable(widgetElement, true);

  // Save updated layout
  const items = gridRef.current.getGridItems();
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
        minW: 2,
        minH: 2
      };
    })
    .filter((item): item is LayoutWidget => item !== null);

  if (isValidLayout(serializedLayout)) {
    localStorage.setItem('desktop-layout', JSON.stringify(serializedLayout));
  }
}, [gridRef]);

return g; 