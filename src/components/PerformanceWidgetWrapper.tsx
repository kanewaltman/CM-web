import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { DataSourceProvider } from '@/lib/DataSourceContext';
import { WidgetContainer } from './WidgetContainer';
import { ChartVariant } from './PerformanceWidget/PerformanceWidget';
import { widgetStateRegistry, WidgetState, getPerformanceTitle } from '@/lib/widgetState';
import { DASHBOARD_LAYOUT_KEY } from '@/types/widgets';

// Preload script to update widget headers as early as possible
// This runs even before React components mount
(() => {
  try {
    // Don't run this in SSR context
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    // Function to update all widget headers based on localStorage data
    const preloadUpdateWidgetHeaders = () => {
      try {
        // Get saved layout data
        const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
        if (!savedLayout) return;
        
        const layout = JSON.parse(savedLayout);
        if (!Array.isArray(layout)) return;
        
        // Wait for DOM to be ready
        const checkAndUpdateHeaders = () => {
          // Get all widget headers in the DOM
          const widgetHeaders = document.querySelectorAll('.widget-header');
          if (!widgetHeaders.length) return;
          
          console.log('Preload header sync: Found', widgetHeaders.length, 'widget headers');
          
          // Update each header's title based on its widget ID
          widgetHeaders.forEach(header => {
            const widgetElement = header.closest('[gs-id]');
            if (!widgetElement) return;
            
            const widgetId = widgetElement.getAttribute('gs-id');
            if (!widgetId) return;
            
            // Find this widget's data in the layout
            const widgetData = layout.find((item: any) => item.id === widgetId);
            if (!widgetData?.viewState?.chartVariant) return;
            
            // Get the correct title for the stored variant
            const variant = widgetData.viewState.chartVariant;
            
            // Map of variant to title
            const titleMap: Record<string, string> = {
              'revenue': 'Performance',
              'subscribers': 'Subscribers',
              'mrr-growth': 'MRR Growth',
              'refunds': 'Refunds',
              'subscriptions': 'Subscriptions',
              'upgrades': 'Upgrades'
            };
            
            const title = titleMap[variant] || 'Performance';
            
            // Update the title element if it exists
            const titleElement = header.querySelector('.widget-title');
            if (titleElement && titleElement.textContent !== title) {
              console.log(`Preload: Updating widget ${widgetId} header to "${title}"`);
              titleElement.textContent = title;
            }
          });
        };
        
        // Try multiple times with increasing delays
        // This ensures we catch headers as they're rendered to the DOM
        [0, 50, 100, 200, 500, 1000].forEach(delay => {
          setTimeout(checkAndUpdateHeaders, delay);
        });
      } catch (error) {
        console.error('Error in preload widget header sync:', error);
      }
    };
    
    // Run on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', preloadUpdateWidgetHeaders);
    } else {
      preloadUpdateWidgetHeaders();
    }
    
    // Also run when DOM is fully loaded
    window.addEventListener('load', preloadUpdateWidgetHeaders);
  } catch (error) {
    console.error('Error in preload widget header initialization:', error);
  }
})();

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
      
      // IMPORTANT: Read the initial variant from localStorage first
      let initialVariant: ChartVariant = 'revenue';
      let initialTitle = getPerformanceTitle('revenue');
      
      try {
        const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
        if (savedLayout) {
          const layout = JSON.parse(savedLayout);
          const widgetData = layout.find((item: any) => item.id === widgetId);
          
          if (widgetData?.viewState) {
            // Get variant from layout
            if (widgetData.viewState.chartVariant) {
              const storedVariant = widgetData.viewState.chartVariant as ChartVariant;
              console.log(`Widget ${widgetId} initial variant from localStorage:`, storedVariant);
              initialVariant = storedVariant;
              initialTitle = getPerformanceTitle(storedVariant);
            }
            
            // Get viewMode from layout - this is critical for maintaining separate viewModes
            if (widgetData.viewState.viewMode) {
              const storedViewMode = widgetData.viewState.viewMode as 'split' | 'cumulative' | 'combined';
              console.log(`Widget ${widgetId} initial viewMode from localStorage:`, storedViewMode);
              initialViewMode = storedViewMode;
            }
          }
        }
      } catch (error) {
        console.error('Error reading initial variant from localStorage:', error);
      }
      
      state = new WidgetState(
        initialVariant,
        initialTitle,
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

  // Keep track of the last processed variant change to avoid loops
  const lastProcessedVariantChange = useRef<string | null>(null);
  
  // Track the last logged change to prevent excessive logging
  const lastLoggedChange = useRef<string | null>(null);

  // Listen for variant change events from other components
  useEffect(() => {
    const handleVariantChangeEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { variant, widgetId: eventWidgetId, timestamp } = customEvent.detail;
      
      // Skip if we just processed this exact same change to avoid loops
      const changeId = `${eventWidgetId}-${variant}-${timestamp}`;
      if (lastProcessedVariantChange.current === changeId) {
        return;
      }
      
      // Only process events for this widget
      if (widgetId === eventWidgetId) {
        // Update tracking to prevent loops
        lastProcessedVariantChange.current = changeId;
        
        // Skip if variant hasn't actually changed
        if (variant === widgetState.variant) {
          return;
        }
        
        // Update local state
        setVariant(variant);
        const newTitle = getPerformanceTitle(variant);
        setTitle(newTitle);
        
        // Update widget state
        widgetState.setVariant(variant);
        widgetState.setTitle(newTitle);
        
        // Force re-render
        setUpdateCounter(prev => prev + 1);
        
        // Only log if we haven't logged this exact change
        const logKey = `${widgetId}-${variant}`;
        if (lastLoggedChange.current !== logKey) {
          lastLoggedChange.current = logKey;
          console.log('PerformanceWidgetWrapper received variant change event:', {
            widgetId,
            variant,
            title: newTitle
          });
        }
      }
    };
    
    document.addEventListener('performance-widget-variant-change', handleVariantChangeEvent);
    
    return () => {
      document.removeEventListener('performance-widget-variant-change', handleVariantChangeEvent);
    };
  }, [widgetId, widgetState]);

  const handleVariantChange = useCallback((newVariant: ChartVariant) => {
    if (!newVariant) return;
    
    // Skip if no actual change occurred
    if (newVariant === variant) return;
    
    // Generate timestamp for this change to track it
    const timestamp = Date.now();
    const changeId = `${widgetId}-${newVariant}-${timestamp}`;
    lastProcessedVariantChange.current = changeId;
    
    // Get new title first
    const newTitle = getPerformanceTitle(newVariant);
    
    // Only log if we haven't logged this exact change
    const logKey = `${widgetId}-${newVariant}`;
    if (lastLoggedChange.current !== logKey) {
      lastLoggedChange.current = logKey;
      console.log('PerformanceWidgetWrapper: Variant changing from', variant, 'to', newVariant);
    }

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
            timestamp
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
        
        // Force update the widget title element directly
        const titleElement = widgetContainer.querySelector('.widget-title');
        if (titleElement) {
          titleElement.textContent = newTitle;
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
          
          // Dispatch event to update all widget headers
          const updateEvent = new CustomEvent('widget-headers-update', {
            detail: {
              widgetId,
              variant: newVariant,
              title: newTitle
            }
          });
          document.dispatchEvent(updateEvent);
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

  // Synchronize viewMode changes with layout to ensure persistence
  const handleViewModeChange = useCallback((newViewMode: 'split' | 'cumulative' | 'combined') => {
    // Update the widget state
    widgetState.setViewMode(newViewMode);
    setViewMode(newViewMode);

    // Store in widget-specific localStorage for backup
    try {
      localStorage.setItem(`widget_${widgetId}_view_mode`, newViewMode);
      
      // Also update the dashboard layout in localStorage to ensure persistence
      const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
      if (savedLayout) {
        const layout = JSON.parse(savedLayout);
        const widgetIndex = layout.findIndex((item: any) => item.id === widgetId);
        
        if (widgetIndex !== -1) {
          console.log(`Updating layout for widget ${widgetId} with viewMode: ${newViewMode}`);
          // Create or update viewState object
          layout[widgetIndex].viewState = {
            ...(layout[widgetIndex].viewState || {}),
            viewMode: newViewMode,
            // Preserve chartVariant if it exists
            chartVariant: layout[widgetIndex].viewState?.chartVariant || widgetState.variant
          };
          
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
        }
      }
    } catch (error) {
      console.error('Error saving viewMode to localStorage:', error);
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

  // Sync with localStorage when component mounts or updates
  useEffect(() => {
    try {
      // Check if we need to sync from localStorage
      const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
      if (savedLayout) {
        const layout = JSON.parse(savedLayout);
        const widgetData = layout.find((item: any) => item.id === widgetId);
        
        if (widgetData && widgetData.viewState && widgetData.viewState.chartVariant) {
          const storedVariant = widgetData.viewState.chartVariant as ChartVariant;
          
          // Only update if different from current state
          if (storedVariant !== variant) {
            console.log('PerformanceWidgetWrapper: Syncing variant from localStorage', {
              current: variant,
              stored: storedVariant,
              widgetId
            });
            
            // Update local state
            const newTitle = getPerformanceTitle(storedVariant);
            setVariant(storedVariant);
            setTitle(newTitle);
            
            // Update widget state
            widgetState.setVariant(storedVariant);
            widgetState.setTitle(newTitle);
            
            // Force re-render
            setUpdateCounter(prev => prev + 1);
            
            // Update all instances of this widget title in the DOM
            updateAllWidgetTitles(widgetId, newTitle);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing variant from localStorage:', error);
    }
  }, [widgetId, variant, widgetState]);

  // Helper function to update all instances of a widget title in the DOM
  const updateAllWidgetTitles = useCallback((widgetId: string, title: string) => {
    try {
      // First try direct widget containers by gs-id
      const widgetContainer = document.querySelector(`[gs-id="${widgetId}"]`);
      if (widgetContainer) {
        const titleElement = widgetContainer.querySelector('.widget-title');
        if (titleElement && titleElement.textContent !== title) {
          console.log(`Directly updating title for widget ${widgetId} to ${title}`);
          titleElement.textContent = title;
        }
      }
      
      // Also try widget elements by data attribute
      const widgetElements = document.querySelectorAll(`[data-widget-id="${widgetId}"]`);
      widgetElements.forEach(element => {
        const titleElement = element.querySelector('.widget-title');
        if (titleElement && titleElement.textContent !== title) {
          console.log(`Updating title by data-widget-id for ${widgetId} to ${title}`);
          titleElement.textContent = title;
        }
      });
      
      // Also try to update any rendered chart components
      const chartElements = document.querySelectorAll(`[data-chart-widget-id="${widgetId}"]`);
      chartElements.forEach(element => {
        element.setAttribute('data-title', title);
      });
    } catch (error) {
      console.error('Error updating widget titles in DOM:', error);
    }
  }, []);

  // Listen for document load to sync headers with localStorage on initialization
  useEffect(() => {
    const syncHeadersWithLocalStorage = () => {
      try {
        // Get all widget headers
        const widgetHeaders = document.querySelectorAll('.widget-header');
        if (!widgetHeaders.length) return;
        
        // Get saved layout
        const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
        if (!savedLayout) return;
        
        const layout = JSON.parse(savedLayout);
        
        // Update each header with the correct title
        widgetHeaders.forEach(header => {
          // Find the widget ID from parent
          const widgetElement = header.closest('[gs-id]');
          if (!widgetElement) return;
          
          const widgetId = widgetElement.getAttribute('gs-id');
          if (!widgetId) return;
          
          // Find widget data in layout
          const widgetData = layout.find((item: any) => item.id === widgetId);
          if (!widgetData || !widgetData.viewState || !widgetData.viewState.chartVariant) return;
          
          // Get correct title for the variant
          const variant = widgetData.viewState.chartVariant as ChartVariant;
          const title = getPerformanceTitle(variant);
          
          // Update title element
          const titleElement = header.querySelector('.widget-title');
          if (titleElement && titleElement.textContent !== title) {
            console.log(`Updating header title for widget ${widgetId} to ${title}`);
            titleElement.textContent = title;
            
            // Also update any widget state that might be out of sync
            const state = widgetStateRegistry.get(widgetId);
            if (state && state.variant !== variant) {
              state.setVariant(variant);
              state.setTitle(title);
            }
          }
        });
      } catch (error) {
        console.error('Error syncing headers with localStorage:', error);
      }
    };

    // Schedule multiple sync attempts with increasing delays
    // This ensures we catch any late-rendered components
    const syncWithDelays = () => {
      // Immediate sync attempt
      syncHeadersWithLocalStorage();
      
      // Additional sync attempts with increasing delays and more frequent early checks
      const delays = [50, 100, 200, 500, 1000, 2000, 5000];
      const timeoutIds = delays.map(delay => 
        setTimeout(syncHeadersWithLocalStorage, delay)
      );
      
      return () => timeoutIds.forEach(id => clearTimeout(id));
    };
    
    // Handle immediate header update from other widgets
    const handleHeadersUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { widgetId: updatedWidgetId, title } = customEvent.detail;
      
      try {
        // Use the helper to update all instances of this widget title
        updateAllWidgetTitles(updatedWidgetId, title);
      } catch (error) {
        console.error('Error updating widget header:', error);
      }
    };
    
    // Run sync on component mount
    const cleanupSync = syncWithDelays();
    
    // Also trigger sync when DOM is fully loaded
    document.addEventListener('DOMContentLoaded', syncWithDelays);
    
    // Also sync whenever the localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DASHBOARD_LAYOUT_KEY) {
        syncHeadersWithLocalStorage();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('load', syncWithDelays);
    document.addEventListener('widget-headers-update', handleHeadersUpdate);
    
    // Run additional sync when GridStack finishes initialization
    document.addEventListener('gridstack-initialized', syncWithDelays);
    
    // Also sync on window focus/visibility change as this may indicate a refresh
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        syncWithDelays();
      }
    });
    
    return () => {
      cleanupSync();
      document.removeEventListener('DOMContentLoaded', syncWithDelays);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('load', syncWithDelays);
      document.removeEventListener('widget-headers-update', handleHeadersUpdate);
      document.removeEventListener('gridstack-initialized', syncWithDelays);
      document.removeEventListener('visibilitychange', syncWithDelays);
    };
  }, [updateAllWidgetTitles]);

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