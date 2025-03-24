import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as ReactDOM from 'react-dom/client';
import 'gridstack/dist/gridstack.min.css';
import { TopBar } from './components/TopBar';
import { ControlBar } from './components/ControlBar';
import { Toaster } from './components/ui/sonner';
import { DataSourceProvider, useDataSource } from './lib/DataSourceContext';
import { useThemeIntensity } from './contexts/ThemeContext';
import { useTheme } from 'next-themes';
import { getThemeValues } from './lib/utils';
import { getLayoutForPage, PageType, getPageFromPath, navigateToPage } from './layouts';
import { useGridStack } from './hooks/useGridStack';
import { createWidget, updateWidgetsDataSource } from './components/WidgetRenderer';
import { DASHBOARD_LAYOUT_KEY, MOBILE_BREAKPOINT, LayoutWidget } from './types/widgets';
import { WIDGET_REGISTRY, widgetIds, widgetTypes, widgetTitles } from './lib/widgetRegistry';
import { isValidLayout } from './layouts/dashboardLayout';

function AppContent() {
  const { dataSource, setDataSource } = useDataSource();
  const { resolvedTheme } = useTheme();
  const { backgroundIntensity, widgetIntensity, borderIntensity } = useThemeIntensity();
  const colors = getThemeValues(resolvedTheme, backgroundIntensity, widgetIntensity, borderIntensity);
  
  console.log('App component is rendering');
  
  const [error, setError] = useState<string | null>(null);
  const [adBlockerDetected, setAdBlockerDetected] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const resizeFrameRef = useRef<number>();
  const gridElementRef = useRef<HTMLDivElement>(null);

  // Initialize the grid through our custom hook
  const {
    grid,
    gridRef,
    initGrid,
    handleRemoveWidget,
    handleResetLayout,
    handleCopyLayout,
    handlePasteLayout,
    handleAddWidget
  } = useGridStack({
    isMobile,
    currentPage,
    element: gridElementRef
  });

  // Apply CSS variables when theme or intensities change
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(colors.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [resolvedTheme, backgroundIntensity, widgetIntensity, borderIntensity, colors.cssVariables]);

  // Check for ad blocker on mount
  useEffect(() => {
    const hasAdBlocker = document.documentElement.getAttribute('data-adblocker') === 'true';
    if (hasAdBlocker) {
      console.warn('Ad blocker detected in React component');
      setAdBlockerDetected(true);
    }
  }, []);

  const pageChangeRef = useRef<(page: 'dashboard' | 'spot' | 'margin' | 'stake') => void>();

  const handleResize = useCallback(() => {
    if (resizeFrameRef.current) {
      cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = requestAnimationFrame(() => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      if (mobile !== isMobile) {
        setIsMobile(mobile);
        if (pageChangeRef.current) {
          pageChangeRef.current(currentPage); // Re-initialize with current page
        }
      }
    });
  }, [isMobile, currentPage]);

  const handlePageChange = useCallback((page: PageType) => {
    console.log('🔄 Page change requested:', { from: currentPage, to: page, hasGrid: !!grid, isMobile });
    
    if (page === currentPage) {
      console.log('📌 Already on requested page, no change needed');
      return;
    }
    
    // Use our helper function instead of inline URL management
    navigateToPage(page);
    
    // Force state update to ensure component reflects the new page
    setCurrentPage(page);
  }, [grid, currentPage, isMobile]);

  // Initialize pageChangeRef
  useEffect(() => {
    pageChangeRef.current = handlePageChange;
  }, [handlePageChange]);

  // Initialize grid when page changes
  useEffect(() => {
    try {
      if (!gridElementRef.current) {
        console.error('❌ Grid element not found');
        setError('Grid element not found. Please refresh the page.');
        return;
      }

      // Initialize grid
      const cleanup = initGrid();

      return cleanup;
    } catch (err) {
      console.error('Failed to initialize grid:', err);
      const errorMessage = adBlockerDetected
        ? 'Ad blocker detected, which may be blocking the dashboard functionality. Please disable your ad blocker and refresh the page.'
        : 'Failed to initialize the dashboard. Please try refreshing the page.';
      setError(errorMessage);
    }
  }, [currentPage, isMobile, adBlockerDetected, initGrid]);

  useEffect(() => {
    // Set initial page and initialize grid based on URL
    const initialPage = getPageFromPath(window.location.pathname);
    console.log('📍 Setting initial page based on URL:', { page: initialPage, path: window.location.pathname });
    
    // Initialize page state without using the handler to avoid unnecessary state changes
    setCurrentPage(initialPage);
    
    // Add initial history state
    window.history.replaceState({ 
      page: initialPage,
      timestamp: Date.now(),
      initial: true
    }, '', window.location.pathname);

    window.addEventListener('resize', handleResize);

    // Handle browser back/forward navigation
    const handlePopState = (event: PopStateEvent) => {
      console.log('🔄 PopState event triggered:', { 
        state: event.state, 
        pathname: window.location.pathname 
      });
      
      // If we have state with a page property, use it directly
      if (event.state && typeof event.state.page === 'string') {
        const historyPage = event.state.page as PageType;
        if (historyPage !== currentPage) {
          console.log('🔄 Navigation state from history:', { from: currentPage, to: historyPage });
          setCurrentPage(historyPage);
        }
      } else {
        // Fallback to path parsing if state is missing
        const newPage = getPageFromPath(window.location.pathname);
        if (newPage !== currentPage) {
          console.log('🔄 Navigation state from URL path:', { from: currentPage, to: newPage });
          setCurrentPage(newPage);
          
          // Restore proper state to allow forward navigation
          window.history.replaceState({ 
            page: newPage, 
            timestamp: Date.now(),
            restored: true
          }, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isMobile, currentPage, handleResize]);

  useEffect(() => {
    const gridElement = document.querySelector('.grid-stack');
    if (!gridElement) return;

    let previewX = 0;
    let previewY = 0;

    // Add drop event handlers with proper types
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';

      // Check if we're over the dropdown menu
      const dropdownMenu = document.querySelector('[role="menu"]');
      if (dropdownMenu && dropdownMenu.contains(e.target as Node)) {
        cleanupPreview();
        return;
      }

      // Calculate grid position
      const rect = gridElement.getBoundingClientRect();
      previewX = Math.floor((e.clientX - rect.left) / (rect.width / 12));
      previewY = Math.floor((e.clientY - rect.top) / 150);

      // Create or update preview element
      let previewElement = document.querySelector('.widget-drag-preview');
      if (!previewElement) {
        previewElement = document.createElement('div');
        previewElement.className = 'widget-drag-preview grid-stack-item';
        previewElement.setAttribute('gs-w', '3');
        previewElement.setAttribute('gs-h', '4');
        previewElement.setAttribute('gs-no-resize', 'true');
        previewElement.setAttribute('gs-no-move', 'true');
        
        const content = document.createElement('div');
        content.className = 'grid-stack-item-content';
        previewElement.appendChild(content);
        
        // Add the preview to the grid
        gridElement.appendChild(previewElement);
        
        // Initialize it as a grid item with specific coordinates
        if (gridRef.current) {
          gridRef.current.addWidget({
            el: previewElement as HTMLElement,
            x: previewX,
            y: previewY,
            w: 3,
            h: 4,
            autoPosition: false,
            noResize: true,
            noMove: true
          });
        }
      } else {
        // Update position through GridStack
        if (gridRef.current) {
          gridRef.current.update(previewElement as HTMLElement, {
            x: previewX,
            y: previewY
          });
        }
      }
    };

    const cleanupPreview = () => {
      const previewElement = document.querySelector('.widget-drag-preview');
      if (previewElement && gridRef.current) {
        // Add removing class to trigger transition
        previewElement.classList.add('removing');
        
        // Remove from grid immediately to prevent layout issues
        gridRef.current.removeWidget(previewElement as HTMLElement, false);
        
        // Wait for transition to complete before removing from DOM
        setTimeout(() => {
          if (previewElement.parentNode) {
            previewElement.remove();
          }
          // Ensure grid is properly updated
          gridRef.current?.compact();
        }, 200); // Match this with the CSS transition duration
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Check if we're entering the dropdown menu
      const dropdownMenu = document.querySelector('[role="menu"]');
      if (dropdownMenu && dropdownMenu.contains(e.relatedTarget as Node)) {
        cleanupPreview();
        return;
      }

      // Only remove if we're actually leaving the grid area
      const rect = gridElement.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        cleanupPreview();
      }
    };

    const handleDragEnd = () => {
      cleanupPreview();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      
      const widgetType = e.dataTransfer?.getData('widget/type') || '';
      if (!widgetType || !gridRef.current) {
        return;
      }

      // Store original grid settings
      const grid = gridRef.current;
      const prevAnimate = grid.opts.animate;
      
      // Disable animations temporarily
      grid.setAnimation(false);
      grid.setStatic(true);
      grid.float(true);
      
      grid.batchUpdate();
      try {
        // Clean up preview first, but keep its position
        const previewElement = document.querySelector('.widget-drag-preview');
        const previewX = previewElement ? parseInt(previewElement.getAttribute('gs-x') || '0') : 0;
        const previewY = previewElement ? parseInt(previewElement.getAttribute('gs-y') || '0') : 0;
        
        if (previewElement) {
          grid.removeWidget(previewElement as HTMLElement, false);
          previewElement.remove();
        }

        const baseWidgetId = widgetIds[widgetType];
        const widgetId = `${baseWidgetId}-${Date.now()}`;
        
        const widgetElement = createWidget({
          widgetType,
          widgetId,
          x: previewX,
          y: previewY
        });

        if (widgetElement) {
          // Add widget with consistent settings
          grid.addWidget({
            el: widgetElement,
            x: previewX,
            y: previewY,
            w: 3,
            h: 4,
            minW: 2,
            minH: 2,
            id: widgetId,
            autoPosition: false,
            noMove: isMobile || currentPage !== 'dashboard',
            noResize: isMobile || currentPage !== 'dashboard',
            locked: isMobile || currentPage !== 'dashboard'
          });
        }
      } finally {
        grid.commit();
        
        // Restore grid settings with a slight delay
        requestAnimationFrame(() => {
          grid.setAnimation(prevAnimate);
          grid.setStatic(false);
          grid.float(false); // Ensure float is disabled after drop
          grid.compact(); // Force compaction after drop
        });
      }
    };

    // Add event listeners with proper type casting
    gridElement.addEventListener('dragover', handleDragOver as unknown as EventListener);
    gridElement.addEventListener('dragleave', handleDragLeave as unknown as EventListener);
    gridElement.addEventListener('dragend', handleDragEnd);
    gridElement.addEventListener('drop', handleDrop as unknown as EventListener);

    return () => {
      gridElement.removeEventListener('dragover', handleDragOver as unknown as EventListener);
      gridElement.removeEventListener('dragleave', handleDragLeave as unknown as EventListener);
      gridElement.removeEventListener('dragend', handleDragEnd);
      gridElement.removeEventListener('drop', handleDrop as unknown as EventListener);
      cleanupPreview();
    };
  }, [gridRef, isMobile, currentPage]);

  // Render error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 max-w-md">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg-base))]">
      <TopBar currentPage={currentPage} onPageChange={handlePageChange} />
      <div className="main-content h-[calc(100vh-4rem)] overflow-y-auto bg-[hsl(var(--color-bg-base))]">
        <div className="main-content-inner h-full relative">
          <ControlBar 
            onResetLayout={handleResetLayout}
            onCopyLayout={handleCopyLayout}
            onPasteLayout={handlePasteLayout}
            onAddWidget={handleAddWidget}
            dataSource={dataSource}
            onDataSourceChange={(source) => {
              setDataSource(source);
              if (grid) {
                updateWidgetsDataSource(grid, source, handleRemoveWidget);
              }
            }}
          />
          <div 
            ref={gridElementRef} 
            className="grid-stack w-full h-[calc(100%-4rem)] p-4 bg-[hsl(var(--color-bg-base))] overflow-hidden"
            style={{ 
              minHeight: '500px',
              position: 'relative',
              '--grid-columns': '12',
              '--grid-row-height': '50px'
            } as React.CSSProperties}
          />
        </div>
      </div>
      <Toaster 
        position="bottom-right"
        expand={false}
        visibleToasts={16}
      />
    </div>
  );
}

function App() {
  return (
    <DataSourceProvider>
      <AppContent />
    </DataSourceProvider>
  );
}

export default App;