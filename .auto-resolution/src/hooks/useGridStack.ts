import { useCallback, useState, useRef } from 'react';
import { GridStack, GridStackNode, GridStackOptions } from 'gridstack';
import { ExtendedGridStackWidget, LayoutWidget, DASHBOARD_LAYOUT_KEY } from '@/types/widgets';
import { widgetStateRegistry } from '@/lib/widgetState';
import { widgetTypes, WIDGET_REGISTRY, widgetComponents } from '@/lib/widgetRegistry';
import { createWidget } from '@/components/WidgetRenderer';
import { defaultLayout, mobileLayout, isValidLayout } from '@/layouts/dashboardLayout';
import { PageType, getLayoutForPage } from '@/layouts';
import { getPerformanceTitle } from '@/lib/widgetState';

interface UseGridStackOptions {
  isMobile: boolean;
  currentPage: PageType;
  element: React.RefObject<HTMLDivElement>;
}

export const useGridStack = ({ isMobile, currentPage, element }: UseGridStackOptions) => {
  const [grid, setGrid] = useState<GridStack | null>(null);
  const gridRef = useRef<GridStack | null>(null);
  
  // Remove widget handler
  const handleRemoveWidget = useCallback((widgetId: string) => {
    if (!gridRef.current) {
      console.error('Cannot remove widget: no grid instance');
      return;
    }
    
    const grid = gridRef.current;
    console.log('handleRemoveWidget called for widgetId:', widgetId, 'grid exists:', !!grid);
    
    const widget = grid.getGridItems().find(w => w.gridstackNode?.id === widgetId);
    if (!widget) {
      console.error('Widget not found for removal:', widgetId);
      return;
    }

    // Store the previous grid state for animations and float
    const prevAnimate = grid.opts.animate;
    const prevFloat = grid.opts.float;
    
    // Temporarily disable animations and float for reliable compaction
    try {
      grid.batchUpdate();
      try {
        // Disable animations during removal for smoother operation
        grid.setAnimation(false);
        grid.float(false);
        
        // Remove the specific widget
        grid.removeWidget(widget, false);
        
        // Unmount React component if it exists
        const reactRoot = (widget as any)._reactRoot;
        if (reactRoot) {
          reactRoot.unmount();
        }
        
        // Clean up widget state for performance widgets
        widgetStateRegistry.delete(widgetId);
        
        // Remove the DOM element to ensure clean removal
        (widget as unknown as HTMLElement).remove();
        
        // Compact the grid to fill gaps
        grid.compact();
        
        // Save the updated layout
        saveLayout(grid);
      } finally {
        try {
          grid.commit();
        } catch (commitErr) {
          console.log('⚠️ Non-critical error during grid commit in removeWidget:', commitErr);
        }
      }
    } catch (batchErr) {
      console.log('⚠️ Non-critical error during grid batchUpdate in removeWidget:', batchErr);
    }
    
    // Re-enable animations and restore float settings with a slight delay for smooth transition
    setTimeout(() => {
      grid.setAnimation(prevAnimate);
      grid.float(prevFloat === undefined ? false : prevFloat);
      
      // Compact the grid to fill any gaps cleanly
      grid.compact();
    }, 50);
  }, []);
  
  // Custom grid compaction
  const compactGrid = useCallback((grid: GridStack, verticalOnly: boolean = false) => {
    if (!grid.engine?.nodes) return;
    
    const nodes = [...grid.engine.nodes];
    if (nodes.length === 0) return;

    try {
      grid.batchUpdate();
      try {
        // Sort nodes by position (top to bottom, left to right)
        nodes.sort((a, b) => {
          const aY = a.y || 0;
          const bY = b.y || 0;
          if (aY !== bY) return aY - bY;
          return (a.x || 0) - (b.x || 0);
        });
        
        nodes.forEach(node => {
          if (!node.el) return;
          
          // Try to move the widget up and optionally to the left
          let newY = node.y || 0;
          let newX = node.x || 0;
          let moved;

          do {
            moved = false;
            
            // Try moving up
            if (newY > 0) {
              const testNodeUp = { ...node, y: newY - 1, x: newX };
              const hasCollisionUp = nodes.some(other => 
                other !== node && 
                other.el && 
                grid.engine.collide(testNodeUp, other)
              );
              
              if (!hasCollisionUp) {
                newY--;
                moved = true;
              }
            }
            
            // Try moving left only if not verticalOnly mode
            if (!verticalOnly && newX > 0) {
              const testNodeLeft = { ...node, y: newY, x: newX - 1 };
              const hasCollisionLeft = nodes.some(other => 
                other !== node && 
                other.el && 
                grid.engine.collide(testNodeLeft, other)
              );
              
              if (!hasCollisionLeft) {
                newX--;
                moved = true;
              }
            }
          } while (moved);

          // Update position if changed
          if (newY !== node.y || (newX !== node.x && !verticalOnly)) {
            grid.update(node.el, {
              y: newY,
              x: verticalOnly ? node.x : newX, // Preserve x position if verticalOnly
              w: node.w,
              h: node.h,
              autoPosition: false
            });
          }
        });
      } finally {
        try {
          grid.commit();
        } catch (commitErr) {
          console.log('⚠️ Non-critical error during grid commit in compactGrid:', commitErr);
        }
      }
    } catch (batchErr) {
      console.log('⚠️ Non-critical error during grid batchUpdate in compactGrid:', batchErr);
    }
  }, []);
  
  const saveLayout = useCallback((grid: GridStack) => {
    if (!grid || currentPage !== 'dashboard') return;
    
    const items = grid.getGridItems();
    const serializedLayout = items
      .map((item): LayoutWidget | null => {
        const node = item.gridstackNode;
        if (!node?.id) return null;
        
        const baseId = node.id.split('-')[0];
        const widgetType = widgetTypes[baseId];
        const widgetConfig = WIDGET_REGISTRY[widgetType];
        const viewState = widgetStateRegistry.get(node.id) ? {
          chartVariant: widgetStateRegistry.get(node.id)!.variant,
          viewMode: widgetStateRegistry.get(node.id)!.viewMode
        } : undefined;

        return {
          id: node.id,
          x: node.x ?? 0,
          y: node.y ?? 0,
          w: Math.max(node.w ?? 2, widgetConfig?.minSize.w || 2),
          h: Math.max(node.h ?? 2, widgetConfig?.minSize.h || 2),
          minW: widgetConfig?.minSize.w || 2,
          minH: widgetConfig?.minSize.h || 2,
          viewState
        } as LayoutWidget;
      })
      .filter((item): item is LayoutWidget => item !== null);

    if (isValidLayout(serializedLayout, Object.values(widgetTypes))) {
      localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(serializedLayout));
      console.log('✅ Saved layout:', serializedLayout);
    }
  }, [currentPage]);
  
  // Reset the layout
  const handleResetLayout = useCallback(() => {
    if (!gridRef.current) return;
    
    const grid = gridRef.current;
    
    try {
      grid.batchUpdate();
      try {
        // Use the appropriate layout based on device type
        const layoutToApply = isMobile ? mobileLayout : defaultLayout;
        console.log('🔄 Reset to layout:', { 
          isMobile, 
          type: isMobile ? 'mobile' : 'desktop',
          layout: layoutToApply,
          widgetCount: layoutToApply.length
        });
        localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layoutToApply));
        
        // First, remove all existing widgets and their DOM elements
        const currentWidgets = grid.getGridItems();
        console.log('🧹 Removing existing widgets:', currentWidgets.length);
        currentWidgets.forEach(widget => {
          if (widget.gridstackNode?.id) {
            // Clean up widget state
            widgetStateRegistry.delete(widget.gridstackNode.id);
            // Remove the widget from GridStack
            grid.removeWidget(widget, false);
            // Also remove the DOM element
            widget.remove();
          }
        });
        
        // Clear any remaining grid-stack-item elements
        const gridElement = document.querySelector('.grid-stack');
        if (gridElement) {
          const remainingWidgets = gridElement.querySelectorAll('.grid-stack-item');
          remainingWidgets.forEach(widget => widget.remove());
        }
        
        // Now add all widgets from the appropriate layout
        layoutToApply.forEach(node => {
          const baseWidgetId = node.id.split('-')[0];
          const widgetType = widgetTypes[baseWidgetId];
          
          if (!widgetType) {
            console.warn('❌ Unknown widget type:', baseWidgetId);
            return;
          }

          try {
            // Get widget configuration to enforce minimum and maximum sizes
            const widgetConfig = WIDGET_REGISTRY[widgetType];
            if (!widgetConfig) {
              console.warn('❌ Missing widget configuration for:', widgetType);
              return;
            }

            // Enforce minimum and maximum sizes from registry
            const width = Math.min(Math.max(node.w, widgetConfig.minSize.w), widgetConfig.maxSize.w);
            const height = Math.min(Math.max(node.h, widgetConfig.minSize.h), widgetConfig.maxSize.h);

            const widgetElement = createWidget({
              widgetType,
              widgetId: node.id,
              x: node.x,
              y: node.y,
              w: width,
              h: height,
              minW: widgetConfig.minSize.w,
              minH: widgetConfig.minSize.h
            });

            if (widgetElement) {
              console.log(`✅ Created widget element: ${node.id} (${widgetType}) at (${node.x},${node.y})`);
              
              // Apply viewState to widget state registry if it exists
              if (node.viewState) {
                const widgetState = widgetStateRegistry.get(node.id);
                if (widgetState) {
                  console.log(`📊 Applying viewState to ${node.id}:`, node.viewState);
                  widgetState.setVariant(node.viewState.chartVariant);
                  if (node.viewState.viewMode) {
                    widgetState.setViewMode(node.viewState.viewMode);
                  }
                } else {
                  // If widget state doesn't exist yet, ensure we set it
                  console.log(`📊 Setting initial viewState for ${node.id}:`, node.viewState);
                  widgetStateRegistry.set(node.id, {
                    variant: node.viewState.chartVariant,
                    viewMode: node.viewState.viewMode || 'split',
                    title: getPerformanceTitle(node.viewState.chartVariant),
                    dateRange: {
                      from: new Date(),
                      to: new Date()
                    },
                    setVariant: () => {},  // Will be replaced when component mounts
                    setViewMode: () => {},  // Will be replaced when component mounts
                    setTitle: () => {},    // Will be replaced when component mounts
                    setDateRange: () => {}, // Will be replaced when component mounts
                    subscribe: () => { return () => {}; }  // Add placeholder subscribe method
                  });
                }
              }
              
              // Add widget with enforced sizes
              grid.addWidget({
                el: widgetElement,
                id: node.id,
                x: node.x,
                y: node.y,
                w: width,
                h: height,
                minW: widgetConfig.minSize.w,
                minH: widgetConfig.minSize.h,
                maxW: widgetConfig.maxSize.w,
                maxH: widgetConfig.maxSize.h,
                autoPosition: false,
                noMove: isMobile || currentPage !== 'dashboard',
                noResize: isMobile || currentPage !== 'dashboard',
                locked: isMobile || currentPage !== 'dashboard'
              } as ExtendedGridStackWidget);
            }
          } catch (error) {
            console.error('Failed to create widget:', node.id, error);
          }
        });

        // Force a complete layout recalculation
        grid.setStatic(true);
        setTimeout(() => {
          grid.setStatic(false);
          // Force compaction after a brief delay to ensure all widgets are properly positioned
          setTimeout(() => {
            try {
              grid.batchUpdate();
              try {
                grid.compact();
                // Verify final positions and sizes
                layoutToApply.forEach(node => {
                  const widget = grid.getGridItems().find(w => w.gridstackNode?.id === node.id);
                  if (widget && widget.gridstackNode) {
                    const baseWidgetId = node.id.split('-')[0];
                    const widgetType = widgetTypes[baseWidgetId];
                    const widgetConfig = WIDGET_REGISTRY[widgetType];
                    
                    if (widgetConfig) {
                      grid.update(widget, {
                        x: node.x,
                        y: node.y,
                        w: Math.max(node.w, widgetConfig.minSize.w),
                        h: Math.max(node.h, widgetConfig.minSize.h),
                        minW: widgetConfig.minSize.w,
                        minH: widgetConfig.minSize.h,
                        autoPosition: false
                      });
                    }
                  }
                });
              } finally {
                try {
                  grid.commit();
                } catch (commitErr) {
                  console.log('⚠️ Non-critical error during grid commit in layout verification:', commitErr);
                }
              }
            } catch (batchErr) {
              console.log('⚠️ Non-critical error during grid batchUpdate in compaction:', batchErr);
            }
          }, 50);
        }, 0);
      } finally {
        try {
          grid.commit();
        } catch (commitErr) {
          console.log('⚠️ Non-critical error during grid commit in handleResetLayout:', commitErr);
        }
      }
    } catch (batchErr) {
      console.log('⚠️ Non-critical error during grid batchUpdate in handleResetLayout:', batchErr);
    }
    
    console.log('✅ Reset layout completed');
  }, [isMobile, currentPage]);

  // Copy layout to clipboard
  const handleCopyLayout = useCallback(() => {
    if (!gridRef.current) return '';
    
    const grid = gridRef.current;
    const items = grid.getGridItems();
    const serializedLayout = items
      .map((item): LayoutWidget | null => {
        const node = item.gridstackNode;
        if (!node || !node.id) return null;
        
        // Get the base widget type from the ID
        const baseId = node.id.split('-')[0];
        const widgetType = widgetTypes[baseId];
        const widgetConfig = WIDGET_REGISTRY[widgetType];
        if (!widgetConfig) return null;

        // Get widget state if it exists
        const widgetState = widgetStateRegistry.get(node.id);
        const viewState = widgetState ? { 
          chartVariant: widgetState.variant,
          viewMode: widgetState.viewMode 
        } : undefined;

        return {
          id: node.id,
          x: node.x ?? 0,
          y: node.y ?? 0,
          w: Math.max(node.w ?? 2, widgetConfig.minSize.w),
          h: Math.max(node.h ?? 2, widgetConfig.minSize.h),
          minW: widgetConfig.minSize.w,
          minH: widgetConfig.minSize.h,
          viewState
        };
      })
      .filter((item): item is LayoutWidget => item !== null);

    return JSON.stringify(serializedLayout);
  }, []);

  // Paste layout from clipboard
  const handlePasteLayout = useCallback((layoutStr: string) => {
    if (!gridRef.current) {
      console.warn('Cannot paste layout: no grid instance');
      return;
    }

    try {
      const grid = gridRef.current;
      const layout = JSON.parse(layoutStr) as LayoutWidget[];
      
      // Validate layout structure
      if (!Array.isArray(layout)) {
        throw new Error('Invalid layout format');
      }

      // Ensure all widgets in the layout exist in defaultLayout
      const validLayout = layout.every(widget => {
        const baseId = widget.id.split('-')[0];
        const widgetType = widgetTypes[baseId];
        const widgetConfig = WIDGET_REGISTRY[widgetType];
        if (!widgetConfig) return false;

        // Validate minimum sizes
        return widget.w >= widgetConfig.minSize.w && widget.h >= widgetConfig.minSize.h;
      });

      if (!validLayout) {
        throw new Error('Layout contains invalid widgets or sizes');
      }

      try {
        grid.batchUpdate();
        try {
          // Store the new layout
          localStorage.setItem(DASHBOARD_LAYOUT_KEY, layoutStr);
          
          // Get current widgets
          const currentWidgets = grid.getGridItems();
          const currentWidgetsMap = new Map();
          
          // Group widgets by their base ID (without timestamp)
          currentWidgets.forEach(widget => {
            const widgetId = widget.gridstackNode?.id;
            if (widgetId) {
              const baseId = widgetId.split('-')[0];
              if (!currentWidgetsMap.has(baseId)) {
                currentWidgetsMap.set(baseId, []);
              }
              currentWidgetsMap.get(baseId).push(widget);
            }
          });
          
          // Track which widgets we've updated
          const updatedWidgets = new Set<string>();
          
          // First update existing widgets
          layout.forEach(node => {
            const baseId = node.id.split('-')[0];
            const widgetType = widgetTypes[baseId];
            const widgetConfig = WIDGET_REGISTRY[widgetType];
            
            if (!widgetConfig) {
              console.warn('❌ Unknown widget type:', widgetType);
              return;
            }

            const existingWidgets = currentWidgetsMap.get(baseId) || [];
            const existingWidget = existingWidgets.find((w: ExtendedGridStackWidget) => w.gridstackNode?.id === node.id) || existingWidgets[0];
            
            if (existingWidget) {
              // Update position and size of existing widget, enforcing minimum sizes
              grid.update(existingWidget, {
                x: node.x,
                y: node.y,
                w: Math.max(node.w, widgetConfig.minSize.w),
                h: Math.max(node.h, widgetConfig.minSize.h),
                minW: widgetConfig.minSize.w,
                minH: widgetConfig.minSize.h,
                autoPosition: false
              });

              // Update widget state if it exists
              if (node.viewState) {
                const widgetState = widgetStateRegistry.get(node.id);
                if (widgetState) {
                  widgetState.setVariant(node.viewState.chartVariant);
                  if (node.viewState.viewMode) {
                    widgetState.setViewMode(node.viewState.viewMode);
                  }
                }
              }

              updatedWidgets.add(existingWidget.gridstackNode?.id || '');
              
              // Remove this widget from the map to track usage
              const widgetIndex = existingWidgets.indexOf(existingWidget);
              if (widgetIndex > -1) {
                existingWidgets.splice(widgetIndex, 1);
              }
            } else {
              // Create new widget if it doesn't exist
              try {
                const widgetElement = createWidget({
                  widgetType,
                  widgetId: node.id,
                  x: node.x,
                  y: node.y,
                  w: Math.max(node.w, widgetConfig.minSize.w),
                  h: Math.max(node.h, widgetConfig.minSize.h),
                  minW: widgetConfig.minSize.w,
                  minH: widgetConfig.minSize.h
                });

                if (widgetElement) {
                  grid.addWidget({
                    el: widgetElement,
                    id: node.id,
                    x: node.x,
                    y: node.y,
                    w: Math.max(node.w, widgetConfig.minSize.w),
                    h: Math.max(node.h, widgetConfig.minSize.h),
                    minW: widgetConfig.minSize.w,
                    minH: widgetConfig.minSize.h,
                    autoPosition: false,
                    noMove: isMobile || currentPage !== 'dashboard',
                    noResize: isMobile || currentPage !== 'dashboard',
                    locked: isMobile || currentPage !== 'dashboard'
                  } as ExtendedGridStackWidget);

                  // Update widget state if it exists
                  if (node.viewState) {
                    const widgetState = widgetStateRegistry.get(node.id);
                    if (widgetState) {
                      widgetState.setVariant(node.viewState.chartVariant);
                      if (node.viewState.viewMode) {
                        widgetState.setViewMode(node.viewState.viewMode);
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Failed to create widget:', node.id, error);
              }
            }
          });

          // Remove any widgets that aren't in the pasted layout
          currentWidgets.forEach(widget => {
            const widgetId = widget.gridstackNode?.id;
            if (widgetId && !updatedWidgets.has(widgetId)) {
              // Clean up widget state before removing
              widgetStateRegistry.delete(widgetId);
              grid.removeWidget(widget, false);
            }
          });
        } finally {
          try {
            grid.commit();
            console.log('✅ Paste layout completed');
          } catch (commitErr) {
            console.log('⚠️ Non-critical error during grid commit in paste layout:', commitErr);
          }
        }
      } catch (batchErr) {
        console.log('⚠️ Non-critical error during grid batchUpdate in paste layout:', batchErr);
      }
    } catch (error) {
      console.error('Failed to paste layout:', error);
    }
  }, [isMobile, currentPage]);

  // Add a new widget
  const handleAddWidget = useCallback((widgetType: string) => {
    if (!gridRef.current) return;
    
    const grid = gridRef.current;
    const widgetId = `${widgetType}-${Date.now()}`;
    const widgetConfig = WIDGET_REGISTRY[widgetType];
    
    if (!widgetConfig) {
      console.error('Unknown widget type:', widgetType);
      return;
    }

    // Create widget at the front (top-left)
    const newWidget = createWidget({
      widgetType,
      widgetId,
      x: 0,
      y: 0,
      w: widgetConfig.defaultSize.w,
      h: widgetConfig.defaultSize.h,
      minW: widgetConfig.minSize.w,
      minH: widgetConfig.minSize.h
    });

    if (newWidget) {
      // Temporarily disable animations for smoother addition
      const prevAnimate = grid.opts.animate;
      const prevFloat = grid.opts.float;
      
      // Disable both animation and float for proper compaction
      grid.setAnimation(false);
      grid.float(false);
      
      try {
        grid.batchUpdate();
        try {
          // Add to grid with proper size constraints
          grid.addWidget({
            el: newWidget,
            x: 0,
            y: 0,
            w: widgetConfig.defaultSize.w,
            h: widgetConfig.defaultSize.h,
            minW: widgetConfig.minSize.w,
            minH: widgetConfig.minSize.h,
            autoPosition: true
          } as ExtendedGridStackWidget);
          
          // Force compact immediately while in batch mode
          grid.compact();
        } finally {
          try {
            grid.commit();
          } catch (commitErr) {
            console.log('⚠️ Non-critical error during grid commit in add widget:', commitErr);
          }
        }
      } catch (batchErr) {
        console.log('⚠️ Non-critical error during grid batchUpdate in add widget:', batchErr);
      }
      
      // Restore previous settings with a delay to ensure UI is updated
      setTimeout(() => {
        grid.setAnimation(prevAnimate);
        grid.float(prevFloat === undefined ? false : prevFloat);
        
        // Save the updated layout
        saveLayout(grid);
      }, 100);
    }
  }, [saveLayout]);

  // Initialize Grid
  const initGrid = useCallback((): (() => void) => {
    if (!element.current) return () => {}; // Return empty cleanup function
    
    // Clear any existing grid
    element.current.innerHTML = '';

    // Helper functions for safely calling GridStack methods
    const safeBatchUpdate = (grid: GridStack | null) => {
      if (!grid) return false;
      try {
        if (typeof grid.batchUpdate === 'function') {
          grid.batchUpdate();
          return true;
        } else {
          console.warn('⚠️ Grid instance exists but batchUpdate method is not available');
          return false;
        }
      } catch (err) {
        console.warn('⚠️ Error calling batchUpdate, grid may not be fully initialized:', err);
        return false;
      }
    };

    const safeCommit = (grid: GridStack | null) => {
      if (!grid) return false;
      try {
        if (typeof grid.commit === 'function') {
          grid.commit();
          return true;
        } else {
          console.warn('⚠️ Grid instance exists but commit method is not available');
          return false;
        }
      } catch (err) {
        console.warn('⚠️ Error calling commit, but layout should still be applied:', err);
        // Force a redraw to ensure UI is consistent
        setTimeout(() => {
          if (grid && grid.engine && typeof grid.compact === 'function') {
            try {
              grid.compact();
            } catch (compactErr) {
              // Ignore compact errors
            }
          }
        }, 50);
        return false;
      }
    };

    const safeAddWidget = (grid: GridStack | null, options: any) => {
      if (!grid) return null;
      try {
        // First check if grid is ready for adding widgets
        if (!grid.engine || typeof grid.engine.prepareNode !== 'function') {
          console.warn('⚠️ Grid engine not fully initialized, adding widget to DOM manually');
          // If grid engine isn't ready, at least add the widget element to the DOM
          const el = options.el;
          if (el && grid.el) {
            grid.el.appendChild(el);
            // Set basic positioning and size using CSS
            el.style.gridColumnStart = options.x + 1;
            el.style.gridRowStart = options.y + 1; 
            el.style.gridColumnEnd = 'span ' + options.w;
            el.style.gridRowEnd = 'span ' + options.h;
            return el;
          }
          return null;
        }
        
        // If we get here, grid engine is initialized
        return grid.addWidget(options);
      } catch (err) {
        console.warn('⚠️ Error adding widget, fallback to DOM append:', err);
        // Fallback: add element to DOM directly
        const el = options.el;
        if (el && grid.el) {
          grid.el.appendChild(el);
          // Apply some basic positioning via CSS
          el.classList.add('grid-stack-item');
          el.style.gridColumnStart = options.x + 1;
          el.style.gridRowStart = options.y + 1;
          el.style.gridColumnEnd = 'span ' + options.w;
          el.style.gridRowEnd = 'span ' + options.h;
          return el;
        }
        return null;
      }
    };

    // Initialize GridStack with options
    const computedStyle = getComputedStyle(document.documentElement);
    const margin = parseInt(computedStyle.getPropertyValue('--grid-margin') || '8', 10);
    
    const g = GridStack.init({
      cellHeight: '100px',
      margin: margin,
      column: isMobile ? 1 : 12,
      animate: true,
      draggable: {
        handle: '.widget-header',
        scroll: true,
        appendTo: 'body',
        enabled: !isMobile && currentPage === 'dashboard'
      },
      resizable: {
        handles: 'e, se, s, sw, w',
        autoHide: true,
        enabled: !isMobile && currentPage === 'dashboard'
      },
      disableDrag: isMobile || currentPage !== 'dashboard',
      disableResize: isMobile || currentPage !== 'dashboard',
      staticGrid: isMobile || currentPage !== 'dashboard',
      minRow: 1,
      alwaysShowResizeHandle: false,
      float: false,
      acceptWidgets: !isMobile && currentPage === 'dashboard',
      removable: false,
      swap: !isMobile && currentPage === 'dashboard',
      swapScroll: !isMobile && currentPage === 'dashboard'
    } as GridStackOptions, element.current);

    // Add resize event handler to enforce size constraints
    g.on('resize', (event: Event, el: GridStackNode) => {
      if (el.id && el.el) {
        const baseId = el.id.split('-')[0];
        const widgetType = widgetTypes[baseId];
        const config = WIDGET_REGISTRY[widgetType];
        
        if (config) {
          const minW = config.minSize.w;
          const minH = config.minSize.h;
          const maxW = config.maxSize.w;
          const maxH = config.maxSize.h;
          
          // Enforce minimum and maximum sizes
          if ((el.w && (el.w < minW || el.w > maxW)) || (el.h && (el.h < minH || el.h > maxH))) {
            g.update(el.el, {
              w: Math.min(Math.max(el.w || minW, minW), maxW),
              h: Math.min(Math.max(el.h || minH, minH), maxH),
              autoPosition: false
            });
          }

          // Update visual feedback for min/max size
          const isAtLimit = (el.w && (el.w <= minW || el.w >= maxW)) || 
                          (el.h && (el.h <= minH || el.h >= maxH));
          if (isAtLimit) {
            el.el.classList.add('size-limit');
          } else {
            el.el.classList.remove('size-limit');
          }
        }
      }
    });

    // Add change event handler to save layout
    g.on('change', () => {
      saveLayout(g);
    });

    // Listen for custom widget remove events
    const handleWidgetRemove = (event: CustomEvent) => {
      const widgetId = event.detail?.widgetId;
      if (widgetId) {
        handleRemoveWidget(widgetId);
      }
    };

    document.addEventListener('widget-remove', handleWidgetRemove as EventListener);

    // Set grid references
    gridRef.current = g;
    setGrid(g);

    // Load and apply the initial layout
    console.log('📊 Loading initial layout for page:', currentPage);
    setTimeout(() => {
      try {
        // Get layout to apply based on page type
        let layoutToApply: LayoutWidget[];
        
        if (currentPage === 'dashboard' && !isMobile) {
          // For dashboard, try to load saved layout
          const savedLayout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
          if (savedLayout) {
            try {
              const parsedLayout = JSON.parse(savedLayout);
              if (isValidLayout(parsedLayout, Object.values(widgetTypes))) {
                layoutToApply = parsedLayout;
                console.log('✅ Using saved dashboard layout');
              } else {
                console.warn('❌ Saved dashboard layout invalid, using default');
                layoutToApply = defaultLayout;
              }
            } catch (error) {
              console.error('Failed to parse saved dashboard layout:', error);
              layoutToApply = defaultLayout;
            }
          } else {
            console.log('📋 First visit - using default layout');
            layoutToApply = defaultLayout;
            // Save the default layout for future visits
            localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(defaultLayout));
          }
        } else if (isMobile) {
          console.log('📱 Using mobile layout');
          layoutToApply = mobileLayout;
        } else {
          // For other pages, always use their static layout
          layoutToApply = getLayoutForPage(currentPage, WIDGET_REGISTRY);
          console.log(`📋 Using static layout for ${currentPage} page`);
        }

        // Apply the layout
        if (!g) {
          console.error('❌ Grid instance is undefined or null at batchUpdate call');
          return;
        }
        
        try {
          // Use safe batchUpdate instead of direct call
          if (!safeBatchUpdate(g)) {
            console.log('⚠️ Skipping batch operations due to initialization issue - layout will still work');
          }
          console.log('🔄 Applying layout with widgets:', layoutToApply.length);
          
          // Create and add all widgets from the layout
          layoutToApply.forEach((node: LayoutWidget) => {
            // Get the base widget type from the ID (handle both default and dynamic IDs)
            const baseWidgetId = node.id.split('-')[0];
            const widgetType = widgetTypes[baseWidgetId];
            
            if (!widgetComponents[widgetType]) {
              console.warn('❌ Unknown widget type:', widgetType);
              return;
            }

            // Pre-register viewState in widget registry if it exists
            if (node.viewState && baseWidgetId === 'performance') {
              console.log(`🔄 Pre-registering viewState for ${node.id}:`, node.viewState);
              widgetStateRegistry.set(node.id, {
                variant: node.viewState.chartVariant,
                viewMode: node.viewState.viewMode || 'split',
                title: getPerformanceTitle(node.viewState.chartVariant),
                dateRange: {
                  from: new Date(),
                  to: new Date()
                },
                setVariant: () => {},  // Will be replaced when component mounts
                setViewMode: () => {},  // Will be replaced when component mounts
                setTitle: () => {},    // Will be replaced when component mounts
                setDateRange: () => {}, // Will be replaced when component mounts
                subscribe: () => { return () => {}; }  // Add placeholder subscribe method
              });
            }

            try {
              // Get widget configuration to enforce minimum sizes
              const widgetConfig = WIDGET_REGISTRY[widgetType];
              if (!widgetConfig) {
                console.warn('❌ Missing widget configuration for:', widgetType);
                return;
              }

              // Enforce minimum sizes from registry
              const width = Math.max(node.w, widgetConfig.minSize.w);
              const height = Math.max(node.h, widgetConfig.minSize.h);

              console.log(`Adding widget: ${node.id} (${widgetType}) at position (${node.x},${node.y})`);
              
              // Create widget element with the exact ID from the layout
              const widgetElement = createWidget({
                widgetType,
                widgetId: node.id,
                x: node.x,
                y: node.y,
                w: width,
                h: height,
                minW: widgetConfig.minSize.w,
                minH: widgetConfig.minSize.h
              });

              if (widgetElement) {
                console.log(`✅ Created widget element: ${node.id} (${widgetType}) at (${node.x},${node.y})`);
                
                // Apply viewState to widget state registry if it exists
                if (node.viewState) {
                  const widgetState = widgetStateRegistry.get(node.id);
                  if (widgetState) {
                    console.log(`📊 Applying viewState to ${node.id}:`, node.viewState);
                    widgetState.setVariant(node.viewState.chartVariant);
                    if (node.viewState.viewMode) {
                      widgetState.setViewMode(node.viewState.viewMode);
                    }
                  } else {
                    // If widget state doesn't exist yet, ensure we set it
                    console.log(`📊 Setting initial viewState for ${node.id}:`, node.viewState);
                    widgetStateRegistry.set(node.id, {
                      variant: node.viewState.chartVariant,
                      viewMode: node.viewState.viewMode || 'split',
                      title: getPerformanceTitle(node.viewState.chartVariant),
                      dateRange: {
                        from: new Date(),
                        to: new Date()
                      },
                      setVariant: () => {},  // Placeholder - will be replaced by actual component
                      setViewMode: () => {},  // Placeholder - will be replaced by actual component
                      setTitle: () => {},    // Will be replaced when component mounts
                      setDateRange: () => {}, // Will be replaced when component mounts
                      subscribe: () => { return () => {}; }  // Add placeholder subscribe method
                    });
                  }
                }
                
                // Add widget to grid with exact position and enforced minimum sizes
                safeAddWidget(g, {
                  el: widgetElement,
                  id: node.id,
                  x: node.x,
                  y: node.y,
                  w: width,
                  h: height,
                  minW: widgetConfig.minSize.w,
                  minH: widgetConfig.minSize.h,
                  maxW: widgetConfig.maxSize.w,
                  maxH: widgetConfig.maxSize.h,
                  autoPosition: false,
                  noMove: isMobile || currentPage !== 'dashboard',
                  noResize: isMobile || currentPage !== 'dashboard',
                  locked: isMobile || currentPage !== 'dashboard'
                });
              } else {
                console.error('Failed to create widget element:', node.id);
              }
            } catch (error) {
              console.error('Failed to create widget:', node.id, error);
            }
          });
        } finally {
          // Use safe commit instead of direct call
          if (!safeCommit(g)) {
            console.log('⚠️ Skipping commit due to initialization issue - layout should still apply');
          } else {
            console.log('✅ Initial layout applied');
          }
        }
      } catch (error) {
        console.error('Failed to apply initial layout:', error);
      }
    }, 250); // Increased delay to ensure the grid is properly initialized

    return () => {
      if (g) {
        g.destroy(false);
        document.removeEventListener('widget-remove', handleWidgetRemove as EventListener);
      }
    };
  }, [
    isMobile, 
    currentPage, 
    element, 
    handleRemoveWidget, 
    saveLayout, 
    widgetTypes, 
    widgetComponents, 
    createWidget, 
    WIDGET_REGISTRY, 
    DASHBOARD_LAYOUT_KEY,
    defaultLayout,
    mobileLayout,
    getLayoutForPage
  ]);

  return {
    grid,
    gridRef,
    initGrid,
    handleRemoveWidget,
    handleResetLayout,
    handleCopyLayout,
    handlePasteLayout,
    handleAddWidget,
    compactGrid,
    saveLayout
  };
}; 