import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataSourceProvider } from '@/lib/DataSourceContext';
import { WidgetContainer } from './WidgetContainer';
import { PerformanceWidgetWrapper } from './PerformanceWidgetWrapper';
import { InsightWidgetControls } from './InsightWidget';
import { ReferralsWrapper } from './ReferralsWidget';
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
import { widgetStateRegistry, WidgetState, getPerformanceTitle, ReferralsWidgetState } from '@/lib/widgetState';
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
  
  const widgetContent = document.createElement('div');
  widgetContent.className = 'grid-stack-item-content p-0';
  widgetElement.appendChild(widgetContent);

  try {
    // Create wrapper for special components or use generic wrapper
    let component;
    
    // For performance widget, use specialized wrapper with header controls
    if (widgetType === 'performance') {
      // Get correct title from localStorage for performance widgets
      const widgetTitle = getPerformanceWidgetTitle(widgetId);
      
      component = (
        <DataSourceProvider>
          <WidgetContainer
            title={widgetTitle}
            onRemove={() => {
              console.log('Performance widget header remove callback triggered');
              // Try both event approaches for maximum compatibility
              document.dispatchEvent(new CustomEvent('widget-remove', { detail: { widgetId: widgetId }}));
              
              // Direct call fallback if window.handleRemoveWidget is available
              try {
                if ((window as any).handleGridStackWidgetRemove) {
                  (window as any).handleGridStackWidgetRemove(widgetId);
                }
              } catch (e) {
                console.error('Direct removal fallback failed:', e);
              }
              
              return true;
            }}
            headerControls={
              <PerformanceWidgetWrapper 
                isHeader 
                widgetId={widgetId} 
                widgetComponent={WidgetComponent}
                onRemove={() => true}
              />
            }
          >
            <PerformanceWidgetWrapper
              widgetId={widgetId}
              widgetComponent={WidgetComponent}
              onRemove={() => true}
            />
          </WidgetContainer>
        </DataSourceProvider>
      );
    }
    // For insight widget with refresh control in header
    else if (widgetType === 'insight') {
      component = (
        <DataSourceProvider>
          <WidgetContainer
            title={widgetTitles[widgetType]}
            onRemove={() => {
              console.log('Insight widget header remove callback triggered');
              // Try both event approaches for maximum compatibility
              document.dispatchEvent(new CustomEvent('widget-remove', { detail: { widgetId: widgetId }}));
              
              // Direct call fallback if window.handleRemoveWidget is available
              try {
                if ((window as any).handleGridStackWidgetRemove) {
                  (window as any).handleGridStackWidgetRemove(widgetId);
                }
              } catch (e) {
                console.error('Direct removal fallback failed:', e);
              }
              
              return true;
            }}
            headerControls={<InsightWidgetControls widgetId={widgetId} />}
          >
            <WidgetComponent 
              widgetId={widgetId} 
            />
          </WidgetContainer>
        </DataSourceProvider>
      );
    }
    // For referrals widget, use the ReferralsWrapper directly
    else if (widgetType === 'referrals') {
      component = (
        <DataSourceProvider>
          <ReferralsWrapper
            widgetId={widgetId}
            onRemove={() => {
              console.log('Referrals widget header remove callback triggered');
              // Try both event approaches for maximum compatibility
              document.dispatchEvent(new CustomEvent('widget-remove', { detail: { widgetId: widgetId }}));
              
              // Direct call fallback if window.handleRemoveWidget is available
              try {
                if ((window as any).handleGridStackWidgetRemove) {
                  (window as any).handleGridStackWidgetRemove(widgetId);
                }
              } catch (e) {
                console.error('Direct removal fallback failed:', e);
              }
              
              return true;
            }}
          />
        </DataSourceProvider>
      );
    }
    // For breakdown widget, use the BreakdownWrapper directly
    else if (widgetType === 'treemap') {
      component = (
        <DataSourceProvider>
          <WidgetComponent
            widgetId={widgetId}
            onRemove={() => {
              console.log('Breakdown widget header remove callback triggered');
              // Try both event approaches for maximum compatibility
              document.dispatchEvent(new CustomEvent('widget-remove', { detail: { widgetId: widgetId }}));
              
              // Direct call fallback if window.handleRemoveWidget is available
              try {
                if ((window as any).handleGridStackWidgetRemove) {
                  (window as any).handleGridStackWidgetRemove(widgetId);
                }
              } catch (e) {
                console.error('Direct removal fallback failed:', e);
              }
              
              return true;
            }}
          />
        </DataSourceProvider>
      );
    }
    // For markets widget, use MarketsWidgetWrapper
    else if (widgetType === 'markets') {
      const handleRemove = () => {
        console.log('Markets widget header remove callback triggered');
        // Try both event approaches for maximum compatibility
        document.dispatchEvent(new CustomEvent('widget-remove', { detail: { widgetId: widgetId }}));
        
        // Direct call fallback if window.handleRemoveWidget is available
        try {
          if ((window as any).handleGridStackWidgetRemove) {
            (window as any).handleGridStackWidgetRemove(widgetId);
          }
        } catch (e) {
          console.error('Direct removal fallback failed:', e);
        }
        
        return true;
      };
      
      component = (
        <DataSourceProvider>
          <MarketsWidgetContainer
            widgetId={widgetId}
            WidgetComponent={WidgetComponent}
            title={widgetTitles[widgetType]}
            onRemove={handleRemove}
          />
        </DataSourceProvider>
      );
    }
    // For all other widgets, use standard wrapper
    else {
      component = (
        <DataSourceProvider>
          <WidgetContainer
            title={widgetTitles[widgetType]}
            onRemove={() => {
              console.log('Widget header remove callback triggered');
              // Try both event approaches for maximum compatibility
              document.dispatchEvent(new CustomEvent('widget-remove', { detail: { widgetId: widgetId }}));
              
              // Direct call fallback if window.handleRemoveWidget is available
              try {
                if ((window as any).handleGridStackWidgetRemove) {
                  (window as any).handleGridStackWidgetRemove(widgetId);
                }
              } catch (e) {
                console.error('Direct removal fallback failed:', e);
              }
              
              return true;
            }}
          >
            <WidgetComponent
              widgetId={widgetId}
            />
          </WidgetContainer>
        </DataSourceProvider>
      );
    }

    // Render the component to the widget content
    createRoot(widgetContent).render(component);

  } catch (error) {
    console.error('Error rendering widget:', error);
    widgetContent.innerHTML = `<div class="p-4 text-red-500">Failed to load widget: ${error}</div>`;
  }

  return widgetElement;
};

/**
 * Gets the correct title for a Performance widget from localStorage
 */
const getPerformanceWidgetTitle = (widgetId: string): string => {
  try {
    const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (savedLayout) {
      const layout = JSON.parse(savedLayout);
      const widgetData = layout.find((item: any) => item.id === widgetId);
      if (widgetData?.viewState?.chartVariant) {
        return getPerformanceTitle(widgetData.viewState.chartVariant);
      }
    }
  } catch (error) {
    console.error('Error getting performance widget title:', error);
  }
  return widgetTitles['performance']; // Fallback to default
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

    if (baseId === 'performance') {
      // Get correct title from localStorage for performance widgets
      const widgetTitle = getPerformanceWidgetTitle(widgetId);
      
      root.render(
        <React.StrictMode>
          <DataSourceProvider>
            <WidgetContainer
              title={widgetTitle}
              onRemove={onRemove}
              headerControls={<PerformanceWidgetWrapper 
                isHeader 
                widgetId={widgetId} 
                widgetComponent={WidgetComponent} 
                onRemove={onRemove} 
              />}
            >
              <PerformanceWidgetWrapper 
                widgetId={widgetId} 
                widgetComponent={WidgetComponent} 
                onRemove={onRemove} 
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
      // For non-performance, non-markets widgets
      root.render(
        <React.StrictMode>
          <DataSourceProvider>
            <WidgetContainer
              title={widgetTitles[widgetType]}
              onRemove={onRemove}
            >
              <WidgetComponent 
                widgetId={widgetId} 
                onRemove={onRemove} 
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
    
    const widgetElement = document.querySelector(`[gs-id="${node.id}"]`);
    if (!widgetElement) return;
    
    // Remove existing content
    const existingContent = widgetElement.querySelector('.grid-stack-item-content');
    if (existingContent) {
      // Clean up React roots if they exist
      const root = (existingContent as any)._reactRoot;
      if (root) {
        try {
          root.unmount();
        } catch (error) {
          console.error('Error unmounting React root:', error);
        }
      }
      existingContent.remove();
    }
    
    // Create a new widget content element
    const widgetContent = document.createElement('div');
    widgetContent.className = 'grid-stack-item-content p-0';
    widgetElement.appendChild(widgetContent);
    
    // Get widget type and component
    const baseId = node.id.split('-')[0];
    const widgetType = widgetTypes[baseId];
    
    if (!widgetType) {
      console.error('Unknown widget type for ID:', node.id);
      return;
    }
    
    // Re-render the widget with the same logic as createWidget
    try {
      const params: CreateWidgetParams = {
        widgetType,
        widgetId: node.id,
        x: node.x || 0,
        y: node.y || 0,
        w: node.w,
        h: node.h
      };
      
      // Remove the old element and replace with a new one
      const parent = widgetElement.parentElement;
      if (parent) {
        const newElement = createWidget(params);
        if (newElement) {
          parent.replaceChild(newElement, widgetElement);
        }
      }
    } catch (error) {
      console.error('Error re-rendering widget:', error);
    }
  });
}; 