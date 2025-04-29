import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as ReactDOM from 'react-dom/client';
import 'gridstack/dist/gridstack.min.css';
import { GridStack } from 'gridstack';
import { TopBar } from './components/TopBar';
import { ControlBar } from './components/ControlBar';
import { Footer } from './components/Footer';
import { Toaster } from './components/ui/sonner';
import { DataSourceProvider, useDataSource } from './lib/DataSourceContext';
import { useThemeIntensity } from './contexts/ThemeContext';
import { useTheme } from 'next-themes';
import { getThemeValues } from './lib/utils';
import { getLayoutForPage, PageType, getPageFromPath, navigateToPage } from './layouts';
import { useGridStack } from './hooks/useGridStack';
import { useContentResize } from './hooks/useContentResize';
import { createWidget, updateWidgetsDataSource } from './components/WidgetRenderer';
import { DASHBOARD_LAYOUT_KEY, MOBILE_BREAKPOINT, LayoutWidget, ExtendedGridStackWidget } from './types/widgets';
import { WIDGET_REGISTRY, widgetIds, widgetTypes, widgetTitles } from './lib/widgetRegistry';
import { isValidLayout } from './layouts/dashboardLayout';
import { ExchangeRatesProvider } from './contexts/ExchangeRatesContext';
import ExchangeRatesTester from './components/ExchangeRatesTester';
import { useWidgetDialogInit } from '@/hooks/useWidgetDialogInit';
import { 
  checkDirectDialogNavigation, 
  getDirectDialogNavigationData, 
  resetDialogOpenedState, 
  markDialogOpened, 
  markHashHandled, 
  handleManualUrlNavigation, 
  generateEventId, 
  setCurrentEventId,
  isClosingDialog,
  handleDirectUrlNavigation
} from '@/lib/widgetDialogService';
import { GlobalWidgetDialogRenderer } from './components/GlobalWidgetDialogRenderer';

// Check for direct dialog navigation as early as possible
// This happens before any React component mounts
const dialogNavigation = checkDirectDialogNavigation();
if (dialogNavigation.isDirectDialogLoad) {
  console.log('🔍 Early detection of direct dialog navigation:', dialogNavigation);
}

// Track the last time a widget from URL was handled
let lastWidgetHandleTime = 0;

// Track if we're currently handling a dialog
let isCurrentlyHandlingDialog = false;

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
  const [grid, setGrid] = useState<GridStack | null>(null);
  const [isLayoutLocked, setIsLayoutLocked] = useState(false);
  
  // Use the content resize hook
  const { contentRef, contentWidth, viewportWidth, renderResizeHandles } = useContentResize();

  // Check if we're on the exchange-rates route
  const isExchangeRatesRoute = window.location.pathname === '/exchange-rates';

  // Initialize the grid through our custom hook
  const {
    gridRef,
    initGrid,
    handleRemoveWidget,
    handleResetLayout,
    handleCopyLayout,
    handlePasteLayout,
    handleAddWidget,
    toggleLayoutLock
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

  const pageChangeRef = useRef<(page: 'dashboard' | 'spot' | 'margin' | 'earn') => void>();

  const handleResize = useCallback(() => {
    if (resizeFrameRef.current) {
      cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = requestAnimationFrame(() => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      if (mobile !== isMobile) {
        setIsMobile(mobile);
        if (pageChangeRef.current) {
          pageChangeRef.current(currentPage as PageType); // Re-initialize with current page
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

  // Skip grid initialization on exchange rates route
  useEffect(() => {
    if (isExchangeRatesRoute) return;
    
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
  }, [currentPage, isMobile, adBlockerDetected, initGrid, isExchangeRatesRoute]);

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
      const hasWidgetId = event.state && event.state.widgetId;
      
      // Log more details about the popstate event
      console.log('🔄 PopState event in App.tsx:', {
        hasWidgetId,
        state: event.state,
        url: window.location.href,
        hash: window.location.hash
      });
      
      // If we're already processing, don't do duplicate work
      if (isCurrentlyHandlingDialog) {
        console.log('⏭️ Already handling a dialog, skipping popstate handler');
        return;
      }
      
      isCurrentlyHandlingDialog = true;
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isCurrentlyHandlingDialog = false;
      }, 300);
      
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
      
      // Check if this is a widget drag (not text selection)
      // Only proceed if we have widget type data
      if (!e.dataTransfer?.types.includes('widget/type')) {
        cleanupPreview();
        return;
      }
      
      e.dataTransfer.dropEffect = 'copy';

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
          } as ExtendedGridStackWidget);
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
      
      // Ensure this is a widget drag operation and not a text selection drag
      if (!e.dataTransfer?.types.includes('widget/type')) {
        return;
      }
      
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
        
        // Get widget configuration from registry
        const widgetConfig = WIDGET_REGISTRY[widgetType];
        if (!widgetConfig) {
          console.warn('Missing widget configuration for type:', widgetType);
          return;
        }
        
        const widgetElement = createWidget({
          widgetType,
          widgetId,
          x: previewX,
          y: previewY,
          w: widgetConfig.defaultSize.w,
          h: widgetConfig.defaultSize.h,
          minW: widgetConfig.minSize.w,
          minH: widgetConfig.minSize.h
        });

        if (widgetElement) {
          // Add widget with size constraints from registry
          grid.addWidget({
            el: widgetElement, 
            x: previewX,
            y: previewY,
            w: widgetConfig.defaultSize.w,
            h: widgetConfig.defaultSize.h,
            minW: widgetConfig.minSize.w,
            minH: widgetConfig.minSize.h,
            maxW: widgetConfig.maxSize.w,
            maxH: widgetConfig.maxSize.h,
            id: widgetId,
            autoPosition: false,
            noMove: isMobile || currentPage !== 'dashboard',
            noResize: isMobile || currentPage !== 'dashboard',
            locked: isMobile || currentPage !== 'dashboard'
          } as ExtendedGridStackWidget);
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

  // If we're on the exchange rates route, render the tester component
  if (isExchangeRatesRoute) {
    return (
      <div className="flex flex-col h-screen bg-[hsl(var(--color-bg-base))]">
        <TopBar currentPage={currentPage} onPageChange={handlePageChange} />
        <div className="main-content overflow-auto flex-grow">
          <div className="mx-auto mb-4" style={{ maxWidth: `${contentWidth}px` }}>
            <div className="p-4">
              <ExchangeRatesTester />
            </div>
          </div>
          <Footer />
        </div>
        <Toaster position="bottom-right" />
      </div>
    );
  }

  // Render error state if there's an error
  if (error) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="main-content overflow-auto flex-grow">
          <div className="flex items-center justify-center min-h-[calc(100vh-124px)]">
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
          <Footer />
        </div>
        <Toaster position="bottom-right" />
      </div>
    );
  }

  // Regular dashboard view
  return (
    <div className="flex flex-col h-screen bg-[hsl(var(--color-bg-base))]">
      <TopBar currentPage={currentPage} onPageChange={handlePageChange} />
      <div className="main-content overflow-auto flex-grow">
        <div 
          ref={contentRef}
          className="main-content-inner relative mx-auto mb-4"
          style={{ maxWidth: `${contentWidth}px` }}
        >
          {renderResizeHandles()}
          <ControlBar
            onResetLayout={handleResetLayout}
            onCopyLayout={handleCopyLayout}
            onPasteLayout={handlePasteLayout}
            onAddWidget={handleAddWidget}
            dataSource={dataSource}
            onDataSourceChange={(source) => {
              // Save the new data source to localStorage first
              setDataSource(source);
              localStorage.setItem('data-source', source);
              
              // Use window.location.reload() to refresh the entire application
              // This ensures all components get the updated data source
              window.location.reload();
            }}
            onToggleLayoutLock={toggleLayoutLock}
            contentWidth={contentWidth}
          />
          <div 
            ref={gridElementRef} 
            className="grid-stack w-full p-4 bg-[hsl(var(--color-bg-base))]"
            style={{ 
              height: 'auto',
              minHeight: '200px',
              position: 'relative',
              '--grid-columns': '12',
              '--grid-row-height': '50px'
            } as React.CSSProperties}
          />
        </div>
        <Footer />
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
  const [dialogInitialized, setDialogInitialized] = useState(false);
  const dialogData = useRef(checkDirectDialogNavigation());
  
  // Handle dialog initialization with proper timing
  useEffect(() => {
    // If this is a direct dialog navigation, add a delay to ensure components are mounted
    if (dialogData.current.isDirectDialogLoad) {
      // Small delay to ensure GridStack and widgets are ready
      const timer = setTimeout(() => {
        console.log('🔄 Initializing widget dialog system after delay for direct load');
        setDialogInitialized(true);
      }, 200);
      
      return () => clearTimeout(timer);
    } else {
      // Regular initialization for non-dialog loads
      setDialogInitialized(true);
    }
  }, []);
  
  // Handle direct URL navigation with widget and asset parameters
  useEffect(() => {
    // Use a setTimeout to ensure the app is fully mounted
    const timer = setTimeout(() => {
      console.log('🔄 Initializing widget dialog system after delay for direct load');
      // Call the function to handle direct URL navigation with assets
      handleDirectUrlNavigation();
    }, 800); // Use a longer delay to ensure the app is fully loaded
    
    return () => clearTimeout(timer);
  }, []);
  
  // Existing useEffect for checking current URL
  useEffect(() => {
    // Track processed URLs to prevent infinite loops
    const processedUrls = new Set<string>();
    let processingUrl = false;
    
    // Function to check for widget in URL
    const checkCurrentUrl = () => {
      // Skip if already processing a URL
      if (processingUrl) {
        return;
      }
      
      // Skip if a dialog is in the process of closing
      if (isClosingDialog) {
        console.log('⏭️ Skipping URL check - dialog is in the process of closing');
        return;
      }
      
      const currentUrl = window.location.href;
      const hash = window.location.hash;
      const pathname = window.location.pathname;
      
      // Check for dialog closed flag in history state to skip processing
      if (window.history.state?.dialogClosed) {
        console.log('⏭️ Skipping URL check - dialog was explicitly closed');
        return;
      }
      
      // Flag to track if this is manual navigation to same URL
      let isManualNavigation = false;
      
      // Check for simple asset parameter on earn page
      if (pathname === '/earn' && hash.includes('asset=')) {
        const assetMatch = hash.match(/asset=([^&]+)/);
        const asset = assetMatch ? assetMatch[1] : null;
        
        if (asset) {
          console.log('📱 Detected asset in URL on earn page:', asset);
          
          // Check if dialog was already opened by another process
          if (isCurrentlyHandlingDialog) {
            console.log('📌 Dialog already opened by another process, skipping URL handler');
            processingUrl = false;
            return;
          }
          
          // Mark as processing to prevent reentry
          processingUrl = true;
          
          // Remember this URL to prevent infinite loops
          processedUrls.add(currentUrl);
          
          // Generate a unique event ID for this opening attempt
          const eventId = generateEventId();
          
          // Set as current event
          setCurrentEventId(eventId);
          
          // Reset dialog state to allow opening again
          resetDialogOpenedState();
          
          // Store the asset in sessionStorage as a backup to ensure it's used
          if (asset) {
            console.log('📝 Storing asset in session storage from URL handler:', asset);
            sessionStorage.setItem('selected_stake_asset', asset);
          }
          
          // Update URL to include widget parameter - ensure both widget and asset are set
          console.log('🔄 Updating URL with widget and asset parameters:', asset);
          window.history.replaceState(
            { widgetDialog: true, widgetId: 'earn-stake', asset },
            '',
            `${window.location.pathname}#widget=earn-stake&asset=${asset}`
          );
          
          // Directly dispatch the open dialog event
          console.log('🚀 Dispatching open-widget-dialog event with asset:', asset);
          const event = new CustomEvent('open-widget-dialog', {
            detail: { 
              widgetId: 'earn-stake',
              asset,
              directLoad: true,
              isManualNavigation,
              eventId,
              exactMatchOnly: true
            },
            bubbles: true
          });
          document.dispatchEvent(event);
          
          // Release the processing lock and clear event ID after a short delay
          window.setTimeout(() => {
            processingUrl = false;
            setCurrentEventId(null);
          }, 500);
          
          return;
        }
      }
      
      if (hash.includes('widget=')) {
        const widgetIdMatch = hash.match(/widget=([^&]+)/);
        const assetMatch = hash.match(/asset=([^&]+)/);
        const widgetId = widgetIdMatch ? widgetIdMatch[1] : null;
        const asset = assetMatch ? assetMatch[1] : null;
        
        if (widgetId) {
          console.log('📱 Detected widget in URL bar navigation:', widgetId, asset ? `with asset: ${asset}` : '');
          
          // Check if dialog was already opened by another process
          if (isCurrentlyHandlingDialog) {
            console.log('📌 Dialog already opened by popstate, skipping URL handler');
            processingUrl = false;
            return;
          }
          
          // Mark as processing to prevent reentry
          processingUrl = true;
          
          // Remember this URL to prevent infinite loops
          processedUrls.add(currentUrl);
          
          // Limit the size of the Set to prevent memory leaks
          if (processedUrls.size > 10) {
            const iterator = processedUrls.values();
            const firstValue = iterator.next().value;
            if (firstValue) {
              processedUrls.delete(firstValue);
            }
          }
          
          // We need to wait for dialog system to initialize
          const checkAndOpen = () => {
            if (dialogInitialized) {
              // We need to manually open the dialog through our event system
              const openDialog = () => {
                // Check if this dialog has already been handled by the popstate event
                // by looking for the widget-dialog-open class
                const hasOpenDialog = document.body.classList.contains('widget-dialog-open');
                
                if (hasOpenDialog) {
                  console.log('📌 Dialog already opened by popstate, skipping URL handler');
                  processingUrl = false;
                  return;
                }
                
                // Only check for recent handling if this is NOT a manual navigation
                if (!isManualNavigation) {
                  // Check if we've handled this widget ID recently
                  const now = Date.now();
                  if (lastWidgetId === widgetId && now - lastWidgetHandleTime < 1000) {
                    console.log('📌 Recently handled this widget, skipping to prevent duplicates:', widgetId);
                    processingUrl = false;
                    return;
                  }
                } else {
                  console.log('🔄 Manual navigation detected - bypassing recent handling check');
                }
                
                // Update tracking
                lastWidgetId = widgetId as string;
                lastWidgetHandleTime = Date.now();
                
                // Generate a unique event ID for this opening attempt
                const eventId = generateEventId();
                
                // Set as current event
                setCurrentEventId(eventId);
                
                // Reset dialog state to allow opening again
                resetDialogOpenedState();
                
                // Mark hash as handled first
                markHashHandled(widgetId as string);
                
                // Directly dispatch the open dialog event instead of using popstate
                const event = new CustomEvent('open-widget-dialog', {
                  detail: { 
                    widgetId,
                    asset,
                    directLoad: true,
                    isManualNavigation,
                    eventId, // Pass the event ID to track which widgets have handled it
                    exactMatchOnly: true // Always require exact match for widgets
                  },
                  bubbles: true
                });
                document.dispatchEvent(event);
                
                // Also set proper history state
                window.history.replaceState(
                  { 
                    widgetDialog: true, 
                    widgetId: widgetId,
                    asset: asset,
                    directLoad: true,
                    timestamp: Date.now(),
                    processed: true // Mark as processed in state
                  }, 
                  '', 
                  window.location.href
                );
                
                // Release the processing lock and clear event ID after a short delay
                window.setTimeout(() => {
                  processingUrl = false;
                  setCurrentEventId(null);
                }, 500);
              };
              
              window.setTimeout(openDialog, 100);
            } else {
              // Retry after a short delay if dialog system isn't ready
              window.setTimeout(checkAndOpen, 50);
            }
          };
          
          // Start the check
          checkAndOpen();
        } else {
          processingUrl = false;
        }
      } else {
        // No widget hash found
        processingUrl = false;
      }
      
      // Don't check URL if it's been processed already, unless it's a manual navigation
      if (!isManualNavigation && processedUrls.has(currentUrl)) {
        console.log('📌 URL already processed, skipping automatic check:', currentUrl);
        processingUrl = false;
        return;
      }
      
      // For manual navigation, clear processedUrls to ensure we can reprocess
      if (isManualNavigation) {
        console.log('🔄 Manual URL navigation detected, clearing processedUrls cache');
        processedUrls.clear();
      }
      
      // Add current URL to processed set
      processedUrls.add(currentUrl);
    };
    
    // Debounced URL check to avoid rapid consecutive checks
    let urlCheckTimeout: number | undefined = undefined;
    const debouncedCheckUrl = () => {
      if (urlCheckTimeout !== undefined) {
        window.clearTimeout(urlCheckTimeout);
      }
      urlCheckTimeout = window.setTimeout(checkCurrentUrl, 200); // Increased timeout from 50ms to 200ms
    };
    
    // Prevent duplicate dialog opening detection
    let lastWidgetId: string | null = null;
    
    // Handle popstate events with debouncing
    const handlePopState = (event: PopStateEvent) => {
      // Don't process popstate if we're already handling a URL change
      if (processingUrl) return;
      
      // Get current widget ID from hash
      const hash = window.location.hash;
      let currentWidgetId: string | null = null;
      
      if (hash.includes('widget=')) {
        const widgetIdMatch = hash.match(/widget=([^&]+)/);
        currentWidgetId = widgetIdMatch ? widgetIdMatch[1] : null;
      }
      
      // Check if we just processed this widget recently (within 1.5 seconds)
      const now = Date.now();
      if (currentWidgetId && 
          currentWidgetId === lastWidgetId && 
          now - lastWidgetHandleTime < 1500) {
        console.log('📌 Skipping duplicate widget handling for:', currentWidgetId);
        return;
      }
      
      // Update tracking
      if (currentWidgetId) {
        lastWidgetId = currentWidgetId;
        lastWidgetHandleTime = now;
      }
      
      // Check for widget dialog state in the event
      if (event.state?.widgetDialog) {
        // This is already being handled properly, no need to do anything
        return;
      }
      
      console.log('🔄 Handling popstate for URL bar navigation');
      debouncedCheckUrl();
    };
    
    // Only check URL on mount if there's a hash
    if (window.location.hash) {
      // Slight delay to ensure everything is initialized
      setTimeout(() => debouncedCheckUrl(), 200);
    }
    
    window.addEventListener('popstate', handlePopState);
    
    // For modern browsers: monitor URL changes via the Navigation API if available
    if ('navigation' in window) {
      try {
        const navigation = (window as any).navigation;
        navigation.addEventListener('navigate', () => {
          if (!processingUrl) {
            debouncedCheckUrl();
          }
        });
      } catch (e) {
        console.error('Error setting up Navigation API:', e);
      }
    }
    
    // Check if we're navigating to the same URL when the page loads
    window.addEventListener('load', () => {
      const lastUrl = sessionStorage.getItem('lastUrl');
      
      // Clean up invalid dialog state on page load
      if (window.location.hash) {
        // Check for invalid widget hash and clean it up
        const hash = window.location.hash;
        if (hash.includes('#widget=[object') || hash.includes('%20Object]') || hash === '#widget=undefined') {
          console.log('🧹 Cleaning up invalid widget hash on page load');
          // Clear the invalid hash to prevent errors
          window.history.replaceState(
            { cleanedHash: true, timestamp: Date.now() },
            '',
            window.location.pathname + window.location.search
          );
          
          // Reset dialog state to ensure clean startup
          handleManualUrlNavigation();
          return;
        }
      }
      
      // Handle the case where URL contains a valid widget hash but we should be at the root
      if (window.location.hash.includes('#widget=')) {
        // Check if we're coming from a page close/refresh and the hash isn't actually needed
        const isRefreshWithWidget = sessionStorage.getItem('navigatingAway') !== 'true';
        
        if (isRefreshWithWidget) {
          console.log('🧹 Cleaning up stale widget hash on page load');
          // Clear the widget hash to prevent unintended dialog reopening
          window.history.replaceState(
            { cleanedHash: true, timestamp: Date.now() },
            '',
            window.location.pathname + window.location.search
          );
          
          // Reset dialog state to ensure clean startup
          handleManualUrlNavigation();
          // Reset session storage to avoid persistence issues
          sessionStorage.removeItem('directDialogNavigation');
          return;
        }
      }
      
      // Original behavior for intentional navigation to widget URLs
      if (lastUrl === window.location.href && lastUrl?.includes('#widget=')) {
        console.log('🔄 Detected navigation to same URL with widget hash');
        handleManualUrlNavigation();
        debouncedCheckUrl();
      }
      
      // Clear navigation flag after handling
      sessionStorage.removeItem('navigatingAway');
    });
    
    // Set a flag when actually navigating away (not just refreshing)
    window.addEventListener('beforeunload', (e) => {
      // This will fire before the page refreshes or navigates
      // Save the current URL to sessionStorage to detect if we're refreshing or navigating to the same URL
      sessionStorage.setItem('lastUrl', window.location.href);
      
      // Only set navigating flag for actual navigation (not refresh)
      if (e.currentTarget === window && e.type === 'beforeunload') {
        const navType = (performance?.getEntriesByType('navigation')[0] as any)?.type;
        if (navType !== 'reload') {
          sessionStorage.setItem('navigatingAway', 'true');
        } else {
          // Explicitly clear the dialog navigation data on page refresh
          sessionStorage.removeItem('directDialogNavigation');
        }
      }
      
      // Don't actually prevent navigation
      delete e.returnValue;
    });
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (urlCheckTimeout !== undefined) {
        window.clearTimeout(urlCheckTimeout);
      }
    };
  }, [dialogInitialized]);
  
  // Only initialize the dialog system after proper timing
  useEffect(() => {
    if (dialogInitialized) {
      // Safe to initialize dialog system now
      console.log('🔄 Widget dialog system ready');
    }
  }, [dialogInitialized]);

  return (
    <DataSourceProvider>
      <ExchangeRatesProvider refreshInterval={30000}>
        <AppContent />
        {dialogInitialized && <DialogInitializer />}
        <GlobalWidgetDialogRenderer />
      </ExchangeRatesProvider>
    </DataSourceProvider>
  );
}

// Separate component for dialog initialization to ensure it only happens once
function DialogInitializer() {
  const [ready, setReady] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    // Ensure we only initialize once
    if (initialized) return;
    
    // Wait for the next animation frame to ensure all widgets are mounted
    requestAnimationFrame(() => {
      // Add a small delay to ensure grid stack and layouts are complete
      setTimeout(() => {
        console.log('🔄 Dialog initializer ready after widgets mounted');
        setReady(true);
      }, 300); // Increased timeout for reliability
    });
    
    return () => {
      // Mark as initialized so we don't attempt again if component remounts
      setInitialized(true);
    };
  }, [initialized]);
  
  // Only initialize dialog system after widgets are mounted
  if (!ready) return null;
  
  return <WidgetDialogInit />;
}

// Simplified component to run the hook without unnecessary complexity
function WidgetDialogInit() {
  try {
    useWidgetDialogInit();
  } catch (err) {
    console.error('Error initializing widget dialog system:', err);
  }
  return null;
}

export default App;