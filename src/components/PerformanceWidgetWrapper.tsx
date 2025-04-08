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
          
          if (widgetData?.viewState?.chartVariant) {
            const storedVariant = widgetData.viewState.chartVariant as ChartVariant;
            console.log(`Widget ${widgetId} initial variant from localStorage:`, storedVariant);
            initialVariant = storedVariant;
            initialTitle = getPerformanceTitle(storedVariant);
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

  const [variant, setVariant] = useState<ChartVariant>((widgetState as WidgetState).variant);
  const [title, setTitle] = useState((widgetState as WidgetState).title);
  const [viewMode, setViewMode] = useState<'split' | 'cumulative' | 'combined'>((widgetState as WidgetState).viewMode);
  const [dateRange, setDateRange] = useState((widgetState as WidgetState).dateRange);
  const [updateCounter, setUpdateCounter] = useState(0);

  // Subscribe to state changes - only subscribe once
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    
    try {
      // Initial state sync with type safety
      const typedWidgetState = widgetState as WidgetState;
      setVariant(typedWidgetState.variant);
      setTitle(typedWidgetState.title);
      setViewMode(typedWidgetState.viewMode);
      setDateRange(typedWidgetState.dateRange);

      // Subscribe to state changes, with safety checks
      const unsubscribe = typeof widgetState.subscribe === 'function' 
        ? widgetState.subscribe(() => {
            const typedState = widgetState as WidgetState;
            setVariant(typedState.variant);
            setTitle(typedState.title);
            setViewMode(typedState.viewMode);
            setDateRange(typedState.dateRange);
          })
        : () => {}; // No-op if subscribe doesn't exist

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up widget state subscription:', error);
      return () => {}; // Return no-op cleanup function
    }
  }, [widgetState]);
  
  // Ensure widget state is properly stored in layout
  useEffect(() => {
    // Skip for header components - they don't need to initialize
    if (isHeader) return;
    
    // Use a timer to ensure this runs after layout initialization
    const timer = setTimeout(() => {
      try {
        const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
        if (!savedLayout) return;
        
        const layout = JSON.parse(savedLayout);
        const widgetIndex = layout.findIndex((item: any) => item.id === widgetId);
        
        // If the widget exists in the layout but has no viewState or incomplete viewState
        if (widgetIndex !== -1) {
          if (!layout[widgetIndex].viewState || 
              !layout[widgetIndex].viewState.chartVariant) {
            
            console.log(`PerformanceWidgetWrapper: Initializing missing viewState for widget ${widgetId}`, {
              currentVariant: variant,
              currentViewMode: viewMode
            });
            
            // Update the widget with current state
            layout[widgetIndex] = {
              ...layout[widgetIndex],
              viewState: {
                ...(layout[widgetIndex].viewState || {}),
                chartVariant: variant,
                viewMode: viewMode,
                dateRange: {
                  from: dateRange.from.toISOString(),
                  to: dateRange.to.toISOString()
                }
              }
            };
            
            localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
            console.log('PerformanceWidgetWrapper: Created missing viewState in layout for widget:', widgetId);
            
            // Dispatch event to update all widget headers
            const updateEvent = new CustomEvent('widget-headers-update', {
              detail: {
                widgetId,
                variant,
                title
              }
            });
            document.dispatchEvent(updateEvent);
          }
        }
      } catch (error) {
        console.error('Error ensuring viewState in localStorage:', error);
      }
    }, 750); // Slightly longer delay to ensure it runs after React's initialization
    
    return () => clearTimeout(timer);
  }, [isHeader, widgetId, variant, viewMode, dateRange, title]);

  // Keep track of the last processed variant change to avoid loops
  const lastProcessedVariantChange = useRef<string | null>(null);
  
  // Track the last logged change to prevent excessive logging
  const lastLoggedChange = useRef<string | null>(null);

  // Track last refresh timestamps to prevent refresh loops
  const lastRefreshTimestamps = useRef<Record<string, number>>({});

  // Listen for variant change events from other components
  useEffect(() => {
    const handleVariantChangeEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { variant, widgetId: eventWidgetId, timestamp, forceRefresh, title: eventTitle } = customEvent.detail;
      
      // Skip if we just processed this exact same change to avoid loops
      const changeId = `${eventWidgetId}-${variant}-${timestamp}`;
      if (lastProcessedVariantChange.current === changeId) {
        return;
      }
      
      // Only process events for this widget
      if (widgetId === eventWidgetId) {
        // Update tracking to prevent loops
        lastProcessedVariantChange.current = changeId;
        
        // Skip if variant hasn't actually changed and we're not forcing a refresh
        if ('variant' in widgetState && variant === widgetState.variant && !forceRefresh) {
          return;
        }
        
        // Update local state
        setVariant(variant);
        const newTitle = eventTitle || getPerformanceTitle(variant);
        setTitle(newTitle);
        
        // Update widget state if it's a PerformanceWidgetState
        if ('setVariant' in widgetState) {
          widgetState.setVariant(variant);
          widgetState.setTitle(newTitle);
        }
        
        // Force an immediate DOM update of the title
        try {
          // Update all instances of the title throughout the DOM
          const widgetContainer = document.querySelector(`[gs-id="${widgetId}"]`);
          if (widgetContainer) {
            const titleElements = widgetContainer.querySelectorAll('.widget-title');
            titleElements.forEach(el => {
              if (el.textContent !== newTitle) {
                console.log(`Event title update: ${widgetId} → "${newTitle}"`);
                el.textContent = newTitle;
              }
            });
          }
          
          // Also try widget container by ID
          const containers = document.querySelectorAll(`[data-widget-id="${widgetId}"]`);
          containers.forEach(container => {
            const titleEl = container.querySelector('.widget-title');
            if (titleEl && titleEl.textContent !== newTitle) {
              titleEl.textContent = newTitle;
            }
          });
        } catch (error) {
          console.error('Error updating title from event:', error);
        }
        
        // Force re-render, especially important for same-variant refresh
        setUpdateCounter(prev => prev + 1);
        
        // Only log if we haven't logged this exact change
        const logKey = `${widgetId}-${variant}${forceRefresh ? '-force' : ''}`;
        if (lastLoggedChange.current !== logKey) {
          lastLoggedChange.current = logKey;
          console.log('PerformanceWidgetWrapper received variant change event:', {
            widgetId,
            variant,
            title: newTitle,
            forceRefresh
          });
        }
      }
    };
    
    document.addEventListener('performance-widget-variant-change', handleVariantChangeEvent);
    
    return () => {
      document.removeEventListener('performance-widget-variant-change', handleVariantChangeEvent);
    };
  }, [widgetId, widgetState, variant]);

  const handleVariantChange = useCallback((newVariant: ChartVariant, forceRefresh: boolean = false) => {
    if (!newVariant) return;
    
    // Check if variant is actually changing
    const isSameVariant = newVariant === variant;
    
    // Skip if no actual change occurred unless it's a deliberate refresh
    if (isSameVariant) {
      // Implement a cooldown for force refreshes to prevent "freaking out"
      const now = Date.now();
      const lastRefresh = lastRefreshTimestamps.current[widgetId] || 0;
      const cooldownPeriod = 1500; // Increase cooldown to 1.5 seconds between forced refreshes
      
      if (now - lastRefresh < cooldownPeriod) {
        console.log(`Skipping repeated refresh for ${widgetId}, too soon since last refresh (${now - lastRefresh}ms)`);
        return;
      }
      
      // Use a global tracker to prevent excessive refreshes across component remounts
      const globalRefreshKey = `last-refresh-${widgetId}`;
      const globalLastRefresh = (window as any)[globalRefreshKey] || 0;
      
      if (now - globalLastRefresh < cooldownPeriod) {
        console.log(`Global cooldown active for ${widgetId}, skipping refresh (${now - globalLastRefresh}ms)`);
        return;
      }
      
      // Update the refresh timestamps
      lastRefreshTimestamps.current[widgetId] = now;
      (window as any)[globalRefreshKey] = now;
    }
    
    // Generate timestamp for this change to track it
    const timestamp = Date.now();
    const changeId = `${widgetId}-${newVariant}-${timestamp}`;
    lastProcessedVariantChange.current = changeId;
    
    // Get new title first
    const newTitle = getPerformanceTitle(newVariant);
    
    // Only log if we haven't logged this exact change
    const logKey = `${widgetId}-${newVariant}${isSameVariant ? '-force' : ''}`;
    if (lastLoggedChange.current !== logKey) {
      lastLoggedChange.current = logKey;
      console.log('PerformanceWidgetWrapper: Variant changing from', variant, 'to', newVariant, isSameVariant ? '(force refresh)' : '');
    }

    // Force immediate re-render of the container by updating state first
    setVariant(newVariant);
    setTitle(newTitle);
    
    // Force counter update to ensure re-rendering
    setUpdateCounter(prev => prev + 1);
    // Update shared state if widgetState supports these methods
    if ('setVariant' in widgetState) {
      widgetState.setVariant(newVariant);
    }
    if ('setTitle' in widgetState) {
      widgetState.setTitle(newTitle);
    }

    // Forcefully update all DOM instances of this widget's title immediately
    const updateTitlesInDOM = () => {
      try {
        // Update all widget title instances
        // 1. First try updating via gs-id selector (most specific)
        const containers = document.querySelectorAll(`[gs-id="${widgetId}"]`);
        containers.forEach(container => {
          const titleElements = container.querySelectorAll('.widget-title');
          titleElements.forEach(el => {
            if (el.textContent !== newTitle) {
              console.log(`Direct title update: ${widgetId} → "${newTitle}"`);
              el.textContent = newTitle;
            }
          });
        });
        
        // 2. Try by widget container class
        const widgetContainers = document.querySelectorAll(`.grid-stack-item[gs-id="${widgetId}"] .widget-container`);
        widgetContainers.forEach(container => {
          const titleEl = container.querySelector('.widget-title');
          if (titleEl && titleEl.textContent !== newTitle) {
            titleEl.textContent = newTitle;
          }
        });
        
        // 3. Try by header element
        const headers = document.querySelectorAll(`.grid-stack-item[gs-id="${widgetId}"] .widget-header`);
        headers.forEach(header => {
          const titleEl = header.querySelector('.widget-title');
          if (titleEl && titleEl.textContent !== newTitle) {
            titleEl.textContent = newTitle;
          }
        });
        
        // 4. Also try data attributes
        const dataElements = document.querySelectorAll(`[data-widget-id="${widgetId}"], [data-chart-widget-id="${widgetId}"]`);
        dataElements.forEach(el => {
          const titleEl = el.querySelector('.widget-title');
          if (titleEl && titleEl.textContent !== newTitle) {
            titleEl.textContent = newTitle;
          }
          // Also update data attributes
          el.setAttribute('data-title', newTitle);
          el.setAttribute('data-variant', newVariant);
        });
      } catch (error) {
        console.error('Error forcing widget title updates:', error);
      }
    };
    
    // Update titles immediately
    updateTitlesInDOM();
    
    // Schedule additional updates to handle potential race conditions
    // with React rendering or async DOM updates
    setTimeout(updateTitlesInDOM, 50);
    setTimeout(updateTitlesInDOM, 150);

    // Force a re-render of the widget container
    const widgetContainer = document.querySelector(`[gs-id="${widgetId}"]`);
    if (widgetContainer) {
      try {
        // Force state change in all widget components sharing this ID using the custom event system
        const event = new CustomEvent('performance-widget-variant-change', { 
          detail: { 
            variant: newVariant,
            widgetId,
            timestamp,
            forceRefresh: isSameVariant, // Explicitly force refresh when selecting same variant
            title: newTitle // Include title for direct header updates
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
        
        // Force DOM refresh by toggling classes - more aggressive for same-variant selections
        widgetContainer.classList.add('variant-changing');
        if (isSameVariant) {
          widgetContainer.classList.add('force-refresh');
        }
        setTimeout(() => {
          widgetContainer.classList.remove('variant-changing');
          widgetContainer.classList.add('variant-changed');
          setTimeout(() => {
            widgetContainer.classList.remove('variant-changed');
            if (isSameVariant) {
              widgetContainer.classList.remove('force-refresh');
            }
          }, 50);
        }, 50);
        
        // Ensure the widget is properly movable (fix for locked widgets after view changes)
        try {
          // More robust grid instance retrieval with additional fallbacks
          let grid = (window as any).gridstack?.el?.gridstack || 
                     (window as any).grid || 
                     (window as any).gridstack ||
                     (window as any).GridStack?.instance;
          
          // Check if grid is actually available
          if (!grid) {
            // Try to find gridstack by directly querying for a grid element
            const gridEl = document.querySelector('.grid-stack');
            if (gridEl && (gridEl as any).gridstack) {
              grid = (gridEl as any).gridstack;
            }
          }
          
          // Only proceed if we have grid with all required properties
          if (grid && typeof grid === 'object' && grid.engine && Array.isArray(grid.engine.nodes)) {
            // Find the widget node in the grid
            const gridItem = grid.engine.nodes.find((n: any) => n && n.id === widgetId);
            if (gridItem) {
              // Only re-enable movement if we're on dashboard and not mobile
              const isMobile = window.innerWidth <= 768;
              const currentPage = document.body.dataset.currentPage || 'dashboard';
              const shouldEnableInteraction = !isMobile && currentPage === 'dashboard';
              const isLayoutLocked = (window as any).isLayoutLocked === true;

              if (shouldEnableInteraction && !isLayoutLocked) {
                // Re-enable widget movement at the node level
                gridItem.noMove = false;
                gridItem.noResize = false;
                gridItem.locked = false;
                
                try {
                  // Find the actual widget element - try multiple methods to be sure
                  let widgetElement = widgetContainer.parentElement;
                  
                  // If not found directly, try querying for it
                  if (!widgetElement || !widgetElement.classList.contains('grid-stack-item')) {
                    widgetElement = document.querySelector(`.grid-stack-item[gs-id="${widgetId}"]`);
                  }
                  
                  if (widgetElement) {
                    // First, remove any draggable-disabled classes
                    widgetElement.classList.remove('ui-draggable-disabled');
                    widgetElement.classList.remove('ui-resizable-disabled');
                    
                    // Add draggable classes if missing
                    if (!widgetElement.classList.contains('ui-draggable')) {
                      widgetElement.classList.add('ui-draggable');
                    }
                    if (!widgetElement.classList.contains('ui-resizable')) {
                      widgetElement.classList.add('ui-resizable');
                    }
                    
                    // Apply a more comprehensive fix to reset the grid's internal state
                    try {
                      // First make the entire grid static temporarily
                      const wasStatic = grid.opts.staticGrid;
                      
                      // Force grid to recalculate everything
                      grid.setStatic(true);
                      
                      // Then reset to previous state after a short delay
                      setTimeout(() => {
                        // Re-enable all grid functionality
                        grid.setStatic(wasStatic);
                        
                        // Explicitly enable this specific widget
                        if (widgetElement && typeof grid.movable === 'function') {
                          grid.movable(widgetElement, true);
                          grid.resizable(widgetElement, true);
                        }
                        
                        // Also try updating it via the update method
                        if (typeof grid.update === 'function') {
                          grid.update(widgetElement, {
                            noMove: false,
                            noResize: false,
                            locked: false
                          });
                        }
                        
                        console.log(`Re-enabled movement for widget ${widgetId} after view change`);
                      }, 50);
                    } catch (e) {
                      console.error('Error resetting grid state:', e);
                    }
                  } else {
                    console.warn(`Couldn't find widget element for ${widgetId}`);
                  }
                } catch (err) {
                  console.error('Error re-enabling widget movement:', err);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error accessing GridStack instance:', error);
        }
        
        // For same-variant selections, directly access and refresh chart components
        try {
          if (isSameVariant) {
            const chartComponents = widgetContainer.querySelectorAll('[data-chart-variant]');
            chartComponents.forEach(component => {
              // Toggle attributes to force DOM updates
              component.setAttribute('data-refresh', 'true');
              component.setAttribute('data-timestamp', Date.now().toString());
              setTimeout(() => {
                component.removeAttribute('data-refresh');
              }, 100);
            });
          }
        } catch (error) {
          console.error('Error forcing widget variant update:', error);
        }
      } catch (error) {
        console.error('Error updating widget container:', error);
      }
    }

    // Save to layout data
    try {
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
          console.error('Failed to parse or update layout JSON:', error);
        }
      }
    } catch (error) {
      console.error('Failed to save widget view state to localStorage:', error);
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
    if ('setViewMode' in widgetState && typeof widgetState.setViewMode === 'function') {
      // Type assertion to any as a safe workaround for the narrowed type incompatibility
      (widgetState.setViewMode as any)(newViewMode);
    }

    // Get current variant and title
    const currentVariant = 'variant' in widgetState ? widgetState.variant : variant;
    const currentTitle = getPerformanceTitle(currentVariant);
    
    // Local function to update all widget titles in the DOM
    const updateTitlesInDOM = (id: string, title: string) => {
      try {
        // First try direct widget containers by gs-id
        const container = document.querySelector(`[gs-id="${id}"]`);
        if (container) {
          const titleEl = container.querySelector('.widget-title');
          if (titleEl && titleEl.textContent !== title) {
            console.log(`Updating title for widget ${id} to ${title}`);
            titleEl.textContent = title;
          }
        }
        
        // Also try widget elements by data attribute
        const elements = document.querySelectorAll(`[data-widget-id="${id}"]`);
        elements.forEach(el => {
          const titleEl = el.querySelector('.widget-title');
          if (titleEl && titleEl.textContent !== title) {
            titleEl.textContent = title;
          }
        });
        
        // Also update chart components
        const chartElements = document.querySelectorAll(`[data-chart-widget-id="${id}"]`);
        chartElements.forEach(el => {
          el.setAttribute('data-title', title);
        });
      } catch (error) {
        console.error('Error updating widget titles in DOM:', error);
      }
    };

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
              chartVariant: currentVariant,
              viewMode: newViewMode
            }
          };
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
          
          // Force widget title updates in DOM
          updateTitlesInDOM(widgetId, currentTitle);
          
          // Dispatch event to update all widget headers
          const updateEvent = new CustomEvent('widget-headers-update', {
            detail: {
              widgetId,
              variant: currentVariant,
              title: currentTitle,
              viewMode: newViewMode
            }
          });
          document.dispatchEvent(updateEvent);
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
    
    // Force a re-render of the widget container
    const widgetContainer = document.querySelector(`[gs-id="${widgetId}"]`);
    if (widgetContainer) {
      try {
        // Toggle classes to force DOM updates
        widgetContainer.classList.add('view-mode-changing');
        setTimeout(() => {
          widgetContainer.classList.remove('view-mode-changing');
          
          // Force title update directly
          const titleElement = widgetContainer.querySelector('.widget-title');
          if (titleElement) {
            titleElement.textContent = currentTitle;
          }
          
          // Update chart components
          const chartComponents = widgetContainer.querySelectorAll('[data-chart-variant]');
          chartComponents.forEach(component => {
            component.setAttribute('data-view-mode', newViewMode);
            component.setAttribute('data-refresh-timestamp', Date.now().toString());
          });
        }, 50);
      } catch (error) {
        console.error('Error updating widget DOM after view mode change:', error);
      }
    }
  }, [widgetId, widgetState, variant]);

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
    if ('setDateRange' in widgetState) {
      widgetState.setDateRange(freshDateRange);
    }
    
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
            if ('setVariant' in widgetState) {
              widgetState.setVariant(storedVariant);
              widgetState.setTitle(newTitle);
            }
            
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
            if (state && 'variant' in state && state.variant !== variant) {
              if ('setVariant' in state) {
                state.setVariant(variant);
                state.setTitle(title);
              }
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
        
        // Schedule additional updates with delays to handle race conditions
        // with React re-rendering or late DOM updates
        [50, 150, 300].forEach(delay => {
          setTimeout(() => updateAllWidgetTitles(updatedWidgetId, title), delay);
        });
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