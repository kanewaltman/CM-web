import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  // Track operations to reduce logging
  const operationCount = useRef(0);
  const didInit = useRef(false);
  
  // Get or create widget state - memoize to prevent unnecessary re-creation
  const widgetState = useMemo(() => {
    let state = widgetStateRegistry.get(widgetId);
    if (!state) {
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
      
      state = new WidgetState(
        'revenue',
        getPerformanceTitle('revenue'),
        initialViewMode,
        initialDateRange
      );
      widgetStateRegistry.set(widgetId, state);
    }
    return state;
  }, [widgetId]);

  const [variant, setVariant] = useState<ChartVariant>(widgetState.variant);
  const [title, setTitle] = useState(widgetState.title);
  const [viewMode, setViewMode] = useState<'split' | 'cumulative' | 'combined'>(widgetState.viewMode);
  const [dateRange, setDateRange] = useState(widgetState.dateRange);
  const [updateCounter, setUpdateCounter] = useState(0);

  // Subscribe to state changes - only subscribe once
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    
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

  // Listen for variant change events from other components
  useEffect(() => {
    const handleVariantChangeEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { variant, widgetId: eventWidgetId } = customEvent.detail;
      
      // Only process events for this widget
      if (widgetId === eventWidgetId) {
        // Update local state
        setVariant(variant);
        const newTitle = getPerformanceTitle(variant);
        setTitle(newTitle);
        
        // Update widget state
        widgetState.setVariant(variant);
        widgetState.setTitle(newTitle);
        
        // Force re-render
        setUpdateCounter(prev => prev + 1);
        
        console.log('PerformanceWidgetWrapper received variant change event:', {
          widgetId,
          variant,
          title: newTitle
        });
      }
    };
    
    document.addEventListener('performance-widget-variant-change', handleVariantChangeEvent);
    
    return () => {
      document.removeEventListener('performance-widget-variant-change', handleVariantChangeEvent);
    };
  }, [widgetId, widgetState]);

  const handleVariantChange = useCallback((newVariant: ChartVariant) => {
    if (!newVariant) return;
    
    // Get new title first
    const newTitle = getPerformanceTitle(newVariant);
    
    console.log('PerformanceWidgetWrapper: Variant changing from', variant, 'to', newVariant);

    // Force immediate re-render of the container by updating state first
    setVariant(newVariant);
    setTitle(newTitle);
    
    // Force counter update to ensure re-rendering
    setUpdateCounter(prev => prev + 1);

    // Update shared state
    widgetState.setVariant(newVariant);
    widgetState.setTitle(newTitle);

    // Force a re-render of the widget container
    const widgetContainer = document.querySelector(`[gs-id="${widgetId}"]`);
    if (widgetContainer) {
      try {
        // Force state change in all widget components sharing this ID using the custom event system
        const event = new CustomEvent('performance-widget-variant-change', { 
          detail: { 
            variant: newVariant,
            widgetId,
            timestamp: Date.now()
          } 
        });
        document.dispatchEvent(event);
        
        // Also try direct root rendering for backwards compatibility
        const root = (widgetContainer as any)._reactRoot;
        if (root) {
          // Create fresh component tree to force complete re-render
          setTimeout(() => {
            root.render(
              <React.StrictMode>
                <DataSourceProvider>
                  <WidgetContainer
                    key={`${newTitle}-${Date.now()}`} // Force re-render with new title and timestamp
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
          }, 0);
        }
        
        // Force DOM refresh by toggling classes
        widgetContainer.classList.add('variant-changing');
        setTimeout(() => {
          widgetContainer.classList.remove('variant-changing');
          widgetContainer.classList.add('variant-changed');
          setTimeout(() => {
            widgetContainer.classList.remove('variant-changed');
          }, 50);
        }, 50);
      } catch (error) {
        console.error('Error forcing widget variant update:', error);
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
          
          // Log successful save
          console.log('Updated layout in localStorage with new variant:', newVariant);
        }
      } catch (error) {
        console.error('Failed to save widget view state:', error);
      }
    }
    
    // Force update the GridStack widget to reflect changes immediately
    try {
      // Try to trigger a GridStack update
      const gridstackInstance = (window as any).gridstack?.gridstack;
      if (gridstackInstance) {
        // Update the widget in the grid
        gridstackInstance.update(`[gs-id="${widgetId}"]`, { 
          _dirty: true, 
          _forceUpdate: true 
        });
        console.log('Forced GridStack widget update for', widgetId);
      }
    } catch (error) {
      console.error('Error updating GridStack widget:', error);
    }
  }, [widgetId, onRemove, WidgetComponent, widgetState, variant]);

  const handleViewModeChange = useCallback((newViewMode: 'split' | 'cumulative' | 'combined') => {
    if (!newViewMode) return;
    
    // Only log in development mode and occasionally
    if (process.env.NODE_ENV === 'development' && (++operationCount.current % 1000 === 0)) {
      console.log('PerformanceWidgetWrapper: view mode changing to:', newViewMode);
    }
    
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

  // Use a debounced version of date range change to prevent excessive updates
  const lastDateChangeTime = useRef(0);
  const handleDateRangeChange = useCallback((newDateRange: { from: Date; to: Date } | undefined) => {
    if (!newDateRange?.from || !newDateRange?.to) return;
    
    // Debounce updates to at most once every 200ms
    const now = Date.now();
    if (now - lastDateChangeTime.current < 200) {
      return;
    }
    lastDateChangeTime.current = now;
    
    // Only log in development mode and occasionally
    if (process.env.NODE_ENV === 'development' && (++operationCount.current % 1000 === 0)) {
      console.log(`PerformanceWidgetWrapper: Date range changed to:`, {
        widgetId,
        count: operationCount.current
      });
    }
    
    // Create a completely new object to force React to recognize the change
    const freshDateRange = {
      from: new Date(newDateRange.from.getTime()),
      to: new Date(newDateRange.to.getTime())
    };
    
    // Update local state first for immediate UI update
    setDateRange(freshDateRange);
    setUpdateCounter(prev => prev + 1);

    // Update shared state with the fresh copy
    widgetState.setDateRange(freshDateRange);
    
    // Force a re-render of the widget container
    const widgetContainer = document.querySelector(`[gs-id="${widgetId}"]`);
    if (widgetContainer) {
      try {
        // Force state change in all widget components sharing this ID
        const event = new CustomEvent('performance-widget-date-change', { 
          detail: { 
            dateRange: freshDateRange,
            widgetId,
            timestamp: Date.now()
          } 
        });
        document.dispatchEvent(event);
        
      } catch (error) {
        console.error('Error forcing widget re-render:', error);
      }
    }
    
    // Save to layout data - reduce frequency of saves by checking time
    if (now - lastSaveTime.current > 1000) {
      lastSaveTime.current = now;
      saveToLayout(freshDateRange);
    }
  }, [widgetId, widgetState]);

  // Separate the layout saving to its own function to reduce complexity
  const lastSaveTime = useRef(0);
  const saveToLayout = useCallback((dateRange: { from: Date; to: Date }) => {
    const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (savedLayout) {
      try {
        const layout = JSON.parse(savedLayout);
        const widgetIndex = layout.findIndex((item: any) => item.id === widgetId);
        if (widgetIndex !== -1) {
          // Update layout with the new date range
          layout[widgetIndex] = {
            ...layout[widgetIndex],
            viewState: {
              ...layout[widgetIndex].viewState,
              dateRange: {
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString()
              }
            }
          };
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
        }
      } catch (error) {
        console.error('Failed to save date range to layout:', error);
      }
    }
  }, [widgetId]);

  const handleTitleChange = useCallback((newTitle: string) => {
    widgetState.setTitle(newTitle);
  }, [widgetState]);

  // Memoize the component props to prevent unnecessary re-renders
  const componentProps = useMemo(() => ({
    widgetId,
    headerControls: isHeader,
    defaultVariant: variant,
    defaultViewMode: viewMode,
    onVariantChange: handleVariantChange,
    onViewModeChange: handleViewModeChange,
    onDateRangeChange: handleDateRangeChange,
    dateRange,
    onTitleChange: handleTitleChange,
  }), [
    widgetId, 
    isHeader, 
    variant, 
    viewMode, 
    handleVariantChange, 
    handleViewModeChange, 
    handleDateRangeChange, 
    dateRange, 
    handleTitleChange,
  ]);

  // Generate a key that will change when important state changes
  const componentKey = useMemo(() => 
    `${widgetId}-${variant}-${viewMode}-${updateCounter}`,
    [widgetId, variant, viewMode, updateCounter]
  );

  return <WidgetComponent key={componentKey} {...componentProps} />;
}; 