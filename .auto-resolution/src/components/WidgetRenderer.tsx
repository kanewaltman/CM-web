import React, { useRef, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { DataSourceProvider } from '@/lib/DataSourceContext';
import { WidgetContainer } from './WidgetContainer';
import { PerformanceWidgetWrapper } from './PerformanceWidgetWrapper';
import { MarketsWidgetWrapper } from './MarketsWidgetWrapper';
import { 
  CreateWidgetParams, 
  ExtendedGridStackWidget,
  DASHBOARD_LAYOUT_KEY
} from '@/types/widgets';
import { 
  widgetTypes, 
  widgetTitles, 
  widgetComponents,
  WIDGET_REGISTRY
} from '@/lib/widgetRegistry';
import { widgetStateRegistry, WidgetState, getPerformanceTitle } from '@/lib/widgetState';
import { MarketsWidgetColumnVisibility } from './MarketsWidget';
import { useReactTable } from '@tanstack/react-table';

// Create a wrapper component for Markets widget to use hooks properly
const MarketsWidgetContainer = ({ 
  widgetId, 
  WidgetComponent, 
  title, 
  onRemove 
}: { 
  widgetId: string, 
  WidgetComponent: React.FC<any>, 
  title: string, 
  onRemove: () => boolean 
}) => {
  // Now hooks are used inside a functional component
  const [marketTable, setMarketTable] = useState<ReturnType<typeof useReactTable<any>> | null>(null);
  
  const getMarketTable = (table: ReturnType<typeof useReactTable<any>> | null) => {
    setMarketTable(table);
  };

  return (
    <WidgetContainer
      title={title}
      onRemove={onRemove}
      headerControls={
        <MarketsWidgetWrapper 
          isHeader 
          widgetId={widgetId} 
          widgetComponent={WidgetComponent} 
          onRemove={onRemove}
          getTable={getMarketTable}
        />
      }
      widgetMenu={
        <MarketsWidgetWrapper 
          isMenu 
          widgetId={widgetId} 
          widgetComponent={WidgetComponent} 
          onRemove={onRemove} 
        />
      }
    >
      <MarketsWidgetWrapper 
        widgetId={widgetId} 
        widgetComponent={WidgetComponent} 
        onRemove={onRemove} 
      />
    </WidgetContainer>
  );
};

/**
 * Creates a new widget DOM element for GridStack
 */
export const createWidget = ({ 
  widgetType, 
  widgetId, 
  x, 
  y, 
  w = 3, 
  h = 4, 
  minW = 2, 
  minH = 2 
}: CreateWidgetParams): HTMLElement | null => {
  if (!widgetType || !widgetId) {
    console.error('Invalid widget parameters:', { widgetType, widgetId });
    return null;
  }

  const WidgetComponent = widgetComponents[widgetType];
  if (!WidgetComponent) {
    console.error('Unknown widget type:', widgetType);
    return null;
  }

  // Get the widget config
  const widgetConfig = WIDGET_REGISTRY[widgetType];
  // Ensure we're using configuration-defined minimum and maximum sizes
  const effectiveMinW = widgetConfig ? widgetConfig.minSize.w : minW;
  const effectiveMinH = widgetConfig ? widgetConfig.minSize.h : minH;
  const effectiveMaxW = widgetConfig ? widgetConfig.maxSize.w : 12;
  const effectiveMaxH = widgetConfig ? widgetConfig.maxSize.h : 8;

  // Debug logging for the treemap widget
  if (widgetType === 'treemap') {
    console.log('Creating treemap widget:', { 
      id: widgetId, 
      size: { w, h }, 
      minSize: { w: effectiveMinW, h: effectiveMinH },
      maxSize: { w: effectiveMaxW, h: effectiveMaxH },
      configMinSize: widgetConfig ? widgetConfig.minSize : 'not found',
      configMaxSize: widgetConfig ? widgetConfig.maxSize : 'not found'
    });
  }

  const baseWidgetId = widgetId.split('-')[0];
  const widgetElement = document.createElement('div');
  widgetElement.className = 'grid-stack-item';
  
  // Set grid attributes with effective minimum and maximum sizes
  widgetElement.setAttribute('gs-id', widgetId);
  widgetElement.setAttribute('gs-x', String(x));
  widgetElement.setAttribute('gs-y', String(y));
  widgetElement.setAttribute('gs-w', String(Math.min(Math.max(w, effectiveMinW), effectiveMaxW)));
  widgetElement.setAttribute('gs-h', String(Math.min(Math.max(h, effectiveMinH), effectiveMaxH)));
  widgetElement.setAttribute('gs-min-w', String(effectiveMinW));
  widgetElement.setAttribute('gs-min-h', String(effectiveMinH));
  widgetElement.setAttribute('gs-max-w', String(effectiveMaxW));
  widgetElement.setAttribute('gs-max-h', String(effectiveMaxH));

  // Create the content wrapper
  const contentElement = document.createElement('div');
  contentElement.className = 'grid-stack-item-content';
  widgetElement.appendChild(contentElement);

  // Render the React component into the widget
  renderWidgetIntoElement(
    contentElement, 
    widgetId, 
    widgetType, 
    widgetElement,
    () => {
      // Create a direct removeHandler function for consistent behavior
      const event = new CustomEvent('widget-remove', { detail: { widgetId } });
      document.dispatchEvent(event);
      return true; // Always return true to indicate success
    }
  );

  return widgetElement;
};

/**
 * Renders a React widget into a DOM element
 */
export const renderWidgetIntoElement = (
  el: HTMLElement, 
  widgetId: string, 
  widgetType: string, 
  widgetElement: HTMLElement,
  onRemove: () => boolean
): void => {
  try {
    const root = createRoot(el);
    (widgetElement as any)._reactRoot = root;
    
    const baseId = widgetId.split('-')[0]; 
    const WidgetComponent = widgetComponents[widgetType];
    
    if (!WidgetComponent) {
      console.error('Widget component not found for type:', widgetType);
      return;
    }

    // Create a clean onRemove wrapper that will properly clean up
    const handleRemove = () => {
      // Unmount the component before removing
      try {
        if ((widgetElement as any)._reactRoot) {
          (widgetElement as any)._reactRoot.unmount();
        }
      } catch (err) {
        console.error('Error unmounting widget:', err);
      }
      
      return onRemove();
    };

    if (baseId === 'performance') {
      root.render(
        <React.StrictMode>
          <DataSourceProvider>
            <WidgetContainer
              title={widgetTitles[widgetType]}
              onRemove={handleRemove}
              headerControls={<PerformanceWidgetWrapper 
                isHeader 
                widgetId={widgetId} 
                widgetComponent={WidgetComponent} 
                onRemove={handleRemove} 
              />}
            >
              <PerformanceWidgetWrapper 
                widgetId={widgetId} 
                widgetComponent={WidgetComponent} 
                onRemove={handleRemove} 
              />
            </WidgetContainer>
          </DataSourceProvider>
        </React.StrictMode>
      );
    } else if (widgetType === 'markets') {
      // Special handling for Markets widget to add column visibility menu
      const widgetRef = createRef<any>();
      
      root.render(
        <React.StrictMode>
          <DataSourceProvider>
            <WidgetContainer
              title={widgetTitles[widgetType]}
              onRemove={handleRemove}
              widgetMenu={
                <MarketsWidgetMenuWrapper widgetRef={widgetRef} />
              }
            >
              <WidgetComponent 
                widgetId={widgetId} 
                onRemove={handleRemove} 
                ref={widgetRef}
              />
            </WidgetContainer>
          </DataSourceProvider>
        </React.StrictMode>
      );
    } else if (widgetType === 'markets') {
      // Use MarketsWidgetContainer for markets widgets
      root.render(
        <React.StrictMode>
          <DataSourceProvider>
            <MarketsWidgetContainer
              widgetId={widgetId}
              WidgetComponent={WidgetComponent}
              title={widgetTitles[widgetType]}
              onRemove={onRemove}
            />
          </DataSourceProvider>
        </React.StrictMode>
      );
    } else {
      // For other widgets
      root.render(
        <React.StrictMode>
          <DataSourceProvider>
            <WidgetContainer
              title={widgetTitles[widgetType]}
              onRemove={handleRemove}
            >
              <WidgetComponent 
                widgetId={widgetId} 
                onRemove={handleRemove} 
              />
            </WidgetContainer>
          </DataSourceProvider>
        </React.StrictMode>
      );
    }
  } catch (error) {
    console.error('Error rendering widget:', error);
  }
};

// Wrapper to handle getting table from MarketsWidget ref
const MarketsWidgetMenuWrapper = ({ widgetRef }: { widgetRef: React.RefObject<any> }) => {
  const [table, setTable] = React.useState<any>(null);
  
  React.useEffect(() => {
    // Function to check for table
    const checkForTable = () => {
      if (widgetRef.current?.getTable) {
        const tableInstance = widgetRef.current.getTable();
        if (tableInstance) {
          setTable(tableInstance);
          return true;
        }
      }
      return false;
    };
    
    // Try immediately
    if (!checkForTable()) {
      // If not available, try again in a short delay to allow for component to mount
      const timer = setTimeout(checkForTable, 100);
      return () => clearTimeout(timer);
    }
  }, [widgetRef]);
  
  if (!table) {
    return null;
  }

  return <MarketsWidgetColumnVisibility table={table} />;
};

/**
 * Update all widgets with the new data source
 */
export const updateWidgetsDataSource = (
  grid: any, 
  dataSource: string, 
  handleRemoveWidget: (widgetId: string) => void
): void => {
  if (!grid) return;
  
  const items = grid.getGridItems();
  
  items.forEach((item: any) => {
    const node = item.gridstackNode;
    if (!node?.id) return;
    
    const widgetContainer = document.querySelector(`[gs-id="${node.id}"]`);
    if (widgetContainer) {
      const contentElement = widgetContainer.querySelector('.grid-stack-item-content');
      if (contentElement) {
        const prevReactRoot = (widgetContainer as any)._reactRoot;
        
        if (prevReactRoot) {
          prevReactRoot.unmount();
        }
        
        const baseId = node.id.split('-')[0];
        const widgetType = widgetTypes[baseId];
        
        if (widgetType) {
          renderWidgetIntoElement(
            contentElement, 
            node.id, 
            widgetType, 
            widgetContainer as HTMLElement,
            () => {
              handleRemoveWidget(node.id);
              return true;
            }
          );
        }
      }
    }
  });
}; 