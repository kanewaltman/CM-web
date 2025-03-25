import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { DataSourceProvider } from '@/lib/DataSourceContext';
import { WidgetContainer } from './WidgetContainer';
import { ChartVariant } from './PerformanceWidget/PerformanceWidget';
import { widgetStateRegistry, WidgetState, getPerformanceTitle } from '@/lib/widgetState';
import { DASHBOARD_LAYOUT_KEY } from '@/types/widgets';

interface PerformanceWidgetWrapperProps {
  isHeader?: boolean;
  widgetId: string;
  widgetComponent: React.FC<any>;
  onRemove: () => void;
}

export const PerformanceWidgetWrapper: React.FC<PerformanceWidgetWrapperProps> = ({
  isHeader,
  widgetId,
  widgetComponent: WidgetComponent,
  onRemove,
}) => {
  // Get or create widget state
  const getWidgetState = (): WidgetState => {
    let widgetState = widgetStateRegistry.get(widgetId);
    if (!widgetState) {
      // Default date range (last 7 days)
      const today = new Date();
      const initialDateRange = {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
        to: today
      };
      
      // Try to restore view mode from localStorage
      let initialViewMode: 'split' | 'cumulative' | 'combined' = 'split';
      try {
        // Check widget-specific key first
        const storedWidgetMode = localStorage.getItem(`widget_${widgetId}_view_mode`);
        if (storedWidgetMode && (storedWidgetMode === 'split' || storedWidgetMode === 'cumulative' || storedWidgetMode === 'combined')) {
          initialViewMode = storedWidgetMode as 'split' | 'cumulative' | 'combined';
        } else {
          // Try generic key as fallback
          const storedMode = localStorage.getItem('performance_chart_view_mode') || localStorage.getItem('performance_widget_view_mode');
          if (storedMode && (storedMode === 'split' || storedMode === 'cumulative' || storedMode === 'combined')) {
            initialViewMode = storedMode as 'split' | 'cumulative' | 'combined';
          }
        }
      } catch (error) {
        console.error('Error retrieving view mode from localStorage:', error);
      }
      
      widgetState = new WidgetState(
        'revenue',
        getPerformanceTitle('revenue'),
        initialViewMode,
        initialDateRange
      );
      widgetStateRegistry.set(widgetId, widgetState);
    }
    return widgetState;
  };

  const widgetState = getWidgetState();
  const [variant, setVariant] = useState<ChartVariant>(widgetState.variant);
  const [title, setTitle] = useState(widgetState.title);
  const [viewMode, setViewMode] = useState<'split' | 'cumulative' | 'combined'>(widgetState.viewMode);
  const [dateRange, setDateRange] = useState(widgetState.dateRange);

  // Subscribe to state changes
  useEffect(() => {
    try {
      // Initial state sync
      setVariant(widgetState.variant);
      setTitle(widgetState.title);
      setViewMode(widgetState.viewMode);
      setDateRange(widgetState.dateRange);

      // Subscribe to state changes, with safety checks
      const unsubscribe = typeof widgetState.subscribe === 'function' 
        ? widgetState.subscribe(() => {
            setVariant(widgetState.variant);
            setTitle(widgetState.title);
            setViewMode(widgetState.viewMode);
            setDateRange(widgetState.dateRange);
          })
        : () => {}; // No-op if subscribe doesn't exist

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up widget state subscription:', error);
      return () => {}; // Return no-op cleanup function
    }
  }, [widgetState]);

  const handleVariantChange = useCallback((newVariant: ChartVariant) => {
    if (!newVariant) return;
    
    // Get new title first
    const newTitle = getPerformanceTitle(newVariant);

    // Force immediate re-render of the container by updating state first
    setVariant(newVariant);
    setTitle(newTitle);

    // Update shared state
    widgetState.setVariant(newVariant);
    widgetState.setTitle(newTitle);

    // Force a re-render of the widget container
    const widgetContainer = document.querySelector(`[gs-id="${widgetId}"]`);
    if (widgetContainer) {
      const root = (widgetContainer as any)._reactRoot;
      if (root) {
        root.render(
          <React.StrictMode>
            <DataSourceProvider>
              <WidgetContainer
                key={newTitle} // Force re-render with new title
                title={newTitle}
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
      }
    }

    // Save to layout data
    const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (savedLayout) {
      try {
        const layout = JSON.parse(savedLayout);
        const widgetIndex = layout.findIndex((item: any) => item.id === widgetId);
        if (widgetIndex !== -1) {
          layout[widgetIndex] = {
            ...layout[widgetIndex],
            viewState: {
              ...layout[widgetIndex].viewState,
              chartVariant: newVariant
            }
          };
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
        }
      } catch (error) {
        console.error('Failed to save widget view state:', error);
      }
    }
  }, [widgetId, onRemove, WidgetComponent]);

  const handleViewModeChange = useCallback((newViewMode: 'split' | 'cumulative' | 'combined') => {
    if (!newViewMode) return;
    
    console.log('PerformanceWidgetWrapper: view mode changing to:', newViewMode);
    
    // Update local state first for immediate UI feedback
    setViewMode(newViewMode);
    
    // Then update the shared state
    widgetState.setViewMode(newViewMode);

    // Save to layout data
    const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (savedLayout) {
      try {
        const layout = JSON.parse(savedLayout);
        const widgetIndex = layout.findIndex((item: any) => item.id === widgetId);
        if (widgetIndex !== -1) {
          layout[widgetIndex] = {
            ...layout[widgetIndex],
            viewState: {
              ...layout[widgetIndex].viewState,
              chartVariant: widgetState.variant,
              viewMode: newViewMode
            }
          };
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
          console.log('PerformanceWidgetWrapper: saved view mode to layout data:', newViewMode);
        }
      } catch (error) {
        console.error('Failed to save widget view state:', error);
      }
    }
    
    // Also store in a simple localStorage key for redundancy
    try {
      localStorage.setItem(`widget_${widgetId}_view_mode`, newViewMode);
    } catch (error) {
      console.error('Failed to save view mode to localStorage:', error);
    }
  }, [widgetId, widgetState]);

  const handleDateRangeChange = useCallback((newDateRange: { from: Date; to: Date } | undefined) => {
    if (!newDateRange?.from || !newDateRange?.to) return;
    
    console.log(`PerformanceWidgetWrapper: Date range changed to:`, {
      from: newDateRange.from.toISOString(),
      to: newDateRange.to.toISOString(),
      widgetId,
      isHeader
    });
    
    // Update local state first for immediate UI update
    setDateRange(newDateRange);

    // Update shared state
    widgetState.setDateRange(newDateRange);
    
    // Save to layout data
    const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (savedLayout) {
      try {
        const layout = JSON.parse(savedLayout);
        const widgetIndex = layout.findIndex((item: any) => item.id === widgetId);
        if (widgetIndex !== -1) {
          layout[widgetIndex] = {
            ...layout[widgetIndex],
            viewState: {
              ...layout[widgetIndex].viewState,
              chartVariant: widgetState.variant,
              viewMode: widgetState.viewMode,
              dateRange: {
                from: newDateRange.from.toISOString(),
                to: newDateRange.to.toISOString()
              }
            }
          };
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
        }
      } catch (error) {
        console.error('Failed to save widget date range state:', error);
      }
    }
  }, [isHeader, widgetId, widgetState]);

  const handleTitleChange = useCallback((newTitle: string) => {
    widgetState.setTitle(newTitle);
  }, [widgetState]);

  return (
    <WidgetComponent 
      widgetId={widgetId} 
      headerControls={isHeader}
      defaultVariant={variant}
      defaultViewMode={viewMode}
      onVariantChange={handleVariantChange}
      onViewModeChange={handleViewModeChange}
      onDateRangeChange={handleDateRangeChange}
      dateRange={dateRange}
      onTitleChange={handleTitleChange}
    />
  );
}; 