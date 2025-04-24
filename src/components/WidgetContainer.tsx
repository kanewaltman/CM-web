import { ChevronDown, Maximize2, MoreHorizontal, Trash2 } from '../components/ui-icons';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useRef, useCallback, memo, useState, useEffect } from 'react';
import { createPopoutWindow } from '../utils/windowManager';
import { isTauri } from '../utils/platform';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Dialog, DialogContent } from './ui/dialog';
import { getWidgetIdFromHash, markHashHandled, isHashHandled, isSameBaseWidget } from '@/lib/widgetDialogService';

interface WidgetContainerProps {
  children: React.ReactNode;
  title: string;
  headerControls?: React.ReactNode;
  extraControls?: React.ReactNode;
  onRemove?: () => void;
  isMobile?: boolean;
  titleClickHandler?: (e: React.MouseEvent) => void;
  widgetId?: string; // Optional for backward compatibility, but needed for dialog functionality
}

// Track which dialogs are currently open to prevent duplicates
const openDialogs = new Set<string>();

export const WidgetContainer = memo(function WidgetContainer({ 
  children, 
  title, 
  headerControls, 
  extraControls,
  onRemove,
  isMobile = false,
  titleClickHandler,
  widgetId
}: WidgetContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Determine widgetId from DOM if not provided
  useEffect(() => {
    if (!widgetId && containerRef.current) {
      const gridItem = containerRef.current?.closest('.grid-stack-item');
      const domWidgetId = gridItem?.getAttribute('gs-id') || gridItem?.id;
      if (domWidgetId) {
        console.log('Found widget ID from DOM:', domWidgetId);
        // We can't update props, but we can store it in a ref for use
        (containerRef as any).current.widgetId = domWidgetId;
      }
    }
  }, [widgetId]);

  // Set up dialog from URL when component mounts or hash changes
  useEffect(() => {
    // Use provided widgetId or try to get from DOM
    const effectiveWidgetId = widgetId || ((containerRef as any).current?.widgetId as string);
    if (!effectiveWidgetId) return; // Skip if no widgetId can be found

    // Keep track of dialog open state locally to prevent duplicate opens
    let isAlreadyOpened = false;

    const checkHash = () => {
      const widgetIdFromHash = getWidgetIdFromHash();
      
      // Only proceed if this widget matches the hash (using base ID comparison)
      if (widgetIdFromHash && isSameBaseWidget(widgetIdFromHash, effectiveWidgetId)) {
        // First check if hash has already been handled globally
        if (!isHashHandled()) {
          // Try to claim handling for this hash
          if (markHashHandled(effectiveWidgetId)) {
            console.log('📍 Opening widget dialog from URL hash:', effectiveWidgetId);
            isAlreadyOpened = true;
            
            // Track this dialog as open to prevent duplicates
            if (!openDialogs.has(effectiveWidgetId)) {
              openDialogs.add(effectiveWidgetId);
              setIsDialogOpen(true);
            } else {
              console.log('⚠️ Dialog already open for:', effectiveWidgetId);
            }
          } else {
            console.log('⏭️ Skipping hash check - already handled by another widget:', effectiveWidgetId);
          }
        } else if (!isAlreadyOpened) {
          console.log('⏭️ Hash already handled globally for:', effectiveWidgetId);
        }
      }
    };

    // Check on mount
    checkHash();

    // Handle hash change for browser navigation
    window.addEventListener('hashchange', checkHash);
    
    // Handle custom dialog open event for widgets
    const handleOpenDialog = (e: CustomEvent) => {
      const requestedWidgetId = e.detail?.widgetId;
      if (!requestedWidgetId) return;
      
      // Check if the requested widget ID matches this widget's ID (using base ID comparison)
      if (isSameBaseWidget(requestedWidgetId, effectiveWidgetId)) {
        console.log('📍 Opening widget dialog from event:', { 
          widgetId: effectiveWidgetId, 
          requestedId: requestedWidgetId,
          isDirectLoad: e.detail?.directLoad === true,
          alreadyOpen: isDialogOpen
        });
        
        // Skip if already open to prevent flashing
        if (isDialogOpen) {
          console.log('📍 Dialog already open, skipping redundant open');
          return;
        }
        
        // Check if another dialog with the same ID is already open
        if (openDialogs.has(effectiveWidgetId)) {
          console.log('⚠️ Dialog already open for this widget ID:', effectiveWidgetId);
          return;
        }
        
        isAlreadyOpened = true;
        
        // Track this dialog as open
        openDialogs.add(effectiveWidgetId);
        setIsDialogOpen(true);
        
        // Mark the container that has the dialog open with a specific class
        if (containerRef.current) {
          containerRef.current.classList.add('widget-dialog-open');
        }
        
        // Add a class to the body as well
        document.body.classList.add('widget-dialog-open');
        
        // If this is a direct load (from URL), ensure the URL is preserved
        if (e.detail?.directLoad === true) {
          // Ensure hash is correctly set without triggering navigation
          // Use the original requested ID to maintain proper URL format
          const currentUrl = new URL(window.location.href);
          if (currentUrl.hash !== `#widget=${requestedWidgetId}`) {
            const newUrl = new URL(window.location.href);
            newUrl.hash = `widget=${requestedWidgetId}`;
            window.history.replaceState(
              { 
                widget: requestedWidgetId,
                directLoad: true, 
                timestamp: Date.now() 
              }, 
              '', 
              newUrl.toString()
            );
          }
        }
      }
    };

    const handleCloseDialogs = () => {
      if (isDialogOpen) {
        isAlreadyOpened = false;
        openDialogs.delete(effectiveWidgetId);
        setIsDialogOpen(false);
        
        // Remove the class when dialog closes
        if (containerRef.current) {
          containerRef.current.classList.remove('widget-dialog-open');
        }
        
        // Remove the class from body if no other dialogs are open
        if (openDialogs.size === 0) {
          document.body.classList.remove('widget-dialog-open');
        }
      }
    };

    // Register event listeners
    document.addEventListener('open-widget-dialog', handleOpenDialog as EventListener);
    document.addEventListener('close-widget-dialogs', handleCloseDialogs);

    return () => {
      window.removeEventListener('hashchange', checkHash);
      document.removeEventListener('open-widget-dialog', handleOpenDialog as EventListener);
      document.removeEventListener('close-widget-dialogs', handleCloseDialogs);
      
      // Clean up when component unmounts
      if (isDialogOpen) {
        openDialogs.delete(effectiveWidgetId);
      }
    };
  }, [widgetId, isDialogOpen]);

  // Update URL when dialog state changes
  useEffect(() => {
    // Use provided widgetId or try to get from DOM
    const effectiveWidgetId = widgetId || ((containerRef as any).current?.widgetId as string);
    if (!effectiveWidgetId) return; // Skip if no widgetId provided

    if (isDialogOpen) {
      // Add widget ID to URL for direct access
      const newUrl = new URL(window.location.href);
      
      // Update dialog open classes
      if (containerRef.current) {
        containerRef.current.classList.add('widget-dialog-open');
      }
      document.body.classList.add('widget-dialog-open');
      
      // Preserve any existing widget ID with timestamp in the URL
      const currentWidgetIdFromHash = getWidgetIdFromHash();
      const widgetIdToUse = 
        (currentWidgetIdFromHash && isSameBaseWidget(currentWidgetIdFromHash, effectiveWidgetId)) 
          ? currentWidgetIdFromHash 
          : effectiveWidgetId;
      
      // Check if we're already at the correct hash to avoid redundant history entries
      if (newUrl.hash !== `#widget=${widgetIdToUse}`) {
        newUrl.hash = `widget=${widgetIdToUse}`;
        
        // Check if this was a direct load from URL - if so, replace state instead of pushing
        const isDirectLoad = !!window.history.state?.directLoad;
        
        if (isDirectLoad) {
          window.history.replaceState(
            { widget: widgetIdToUse, directLoad: true, timestamp: Date.now() }, 
            '', 
            newUrl.toString()
          );
        } else {
          window.history.pushState(
            { widget: widgetIdToUse, timestamp: Date.now() }, 
            '', 
            newUrl.toString()
          );
        }
      }
    } else {
      // Remove from open dialogs tracking when closed
      openDialogs.delete(effectiveWidgetId);
      
      // Remove dialog open classes
      if (containerRef.current) {
        containerRef.current.classList.remove('widget-dialog-open');
      }
      // Only remove from body if no other dialogs are open
      if (openDialogs.size === 0) {
        document.body.classList.remove('widget-dialog-open');
      }
      
      // Only clear hash if it's for this specific widget (or same base widget)
      const currentWidgetIdFromHash = getWidgetIdFromHash();
      if (currentWidgetIdFromHash && isSameBaseWidget(currentWidgetIdFromHash, effectiveWidgetId)) {
        // Check if we should preserve history state properties
        const currentState = window.history.state || {};
        const newUrl = new URL(window.location.href);
        newUrl.hash = '';
        
        window.history.pushState(
          { 
            ...currentState,
            widget: null, 
            timestamp: Date.now() 
          }, 
          '', 
          newUrl.toString()
        );
      }
    }
  }, [isDialogOpen, widgetId]);

  // Handle title click to open dialog
  const handleTitleClick = (e: React.MouseEvent) => {
    // Prevent propagation to stop the drag behavior
    e.stopPropagation();
    e.preventDefault();
    
    // Try to get widgetId from DOM if not provided in props
    const effectiveWidgetId = widgetId || ((containerRef as any).current?.widgetId as string);
    const gridItem = containerRef.current?.closest('.grid-stack-item');
    const domWidgetId = gridItem?.getAttribute('gs-id') || gridItem?.id;
    
    console.log('Title clicked:', { 
      widgetId: effectiveWidgetId || domWidgetId, 
      title, 
      hasCustomHandler: !!titleClickHandler,
      domId: domWidgetId,
      element: gridItem
    });

    if (titleClickHandler) {
      titleClickHandler(e);
      return;
    }
    
    if (effectiveWidgetId || domWidgetId) {
      // Use DOM-derived widgetId if prop isn't available
      if (domWidgetId && !effectiveWidgetId) {
        console.log('Using DOM-derived widget ID:', domWidgetId);
        (containerRef as any).current.widgetId = domWidgetId;
      }
      
      setIsDialogOpen(true);
    } else {
      console.log('No widget ID or custom handler available');
    }
  };

  const handleExpand = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      // Get the current content of the widget
      const contentElement = containerRef.current.querySelector('.widget-content');
      if (!contentElement) return;

      const content = contentElement.innerHTML;
      
      // Create a styled HTML document for the popup
      const popoutContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              :root {
                color-scheme: light dark;
              }
              body {
                margin: 0;
                padding: 16px;
                background: var(--background, white);
                color: var(--foreground, black);
                font-family: system-ui, -apple-system, sans-serif;
              }
              .widget-content {
                height: 100%;
                overflow: auto;
                background: var(--background);
                color: var(--foreground);
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                padding: 1rem;
              }
              @media (prefers-color-scheme: dark) {
                body {
                  background: rgb(9, 9, 11);
                  color: rgb(250, 250, 250);
                }
              }
            </style>
          </head>
          <body>
            <div class="widget-content">${content}</div>
          </body>
        </html>
      `;

      const window = await createPopoutWindow({
        title,
        width: 600,
        height: 400,
        content: popoutContent,
      });

    } catch (error) {
      console.error('Failed to create popout window:', error);
    }
  }, [title]);

  const handleRemove = () => {
    console.log('Remove button clicked for widget:', title, 'onRemove function:', !!onRemove);
    
    // First try the onRemove prop if provided
    if (onRemove) {
      const result = onRemove();
      console.log('onRemove function result:', result);
    }
    
    // Always dispatch the widget-remove event as a backup
    // Find the closest grid-stack-item to get the widget ID
    const gridItem = containerRef.current?.closest('.grid-stack-item');
    const elementWidgetId = gridItem?.getAttribute('gs-id') || gridItem?.id || widgetId;
    
    if (elementWidgetId) {
      console.log('Dispatching widget-remove event for:', elementWidgetId);
      const event = new CustomEvent('widget-remove', {
        detail: { widgetId: elementWidgetId, id: elementWidgetId },
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
    } else {
      console.warn('Could not find widget ID for removal');
      // Try to find any ID attribute on parent elements
      const parentWithId = containerRef.current?.closest('[id]');
      if (parentWithId) {
        const fallbackId = parentWithId.id;
        console.log('Using fallback widget ID for removal:', fallbackId);
        const event = new CustomEvent('widget-remove', {
          detail: { widgetId: fallbackId, id: fallbackId },
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(event);
      }
    }
  };

  // Determine effective widget ID for dialog rendering
  const effectiveWidgetId = widgetId || ((containerRef as any).current?.widgetId as string);

  return (
    <>
      <div ref={containerRef} className="grid-stack-item-content">
        <div className="widget-inner-container flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "widget-header flex items-center justify-between px-4 py-2 select-none flex-shrink-0",
            !isMobile && "cursor-move" // Only show move cursor on desktop
          )}>
            <div className="flex items-center space-x-2">
              {/* Custom clickable button-like title that prevents drag */}
              <button
                type="button"
                className="text-sm font-semibold bg-transparent border-0 p-0 m-0 cursor-pointer hover:text-primary transition-colors text-left"
                onClick={handleTitleClick}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault(); // Always prevent default to avoid drag issues
                }}
                style={{
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'none',
                  outline: 'none'
                }}
              >
                {title}
              </button>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
            
            <div className="flex items-center space-x-1">
              {extraControls}
              {headerControls}
              <div className="flex items-center space-x-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExpand} title={`Expand widget ${isTauri ? 'to new window' : 'in browser'}`}>
                      <Maximize2 className="h-4 w-4 mr-2 opacity-50" />
                      <span>Popout</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2 opacity-50" />
                      <span>Remove</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Content wrapper */}
          <div className="widget-content flex-1 min-h-0 overflow-hidden pt-0 px-1 pb-1 select-text">
            {children}
          </div>
        </div>
      </div>

      {/* Widget Dialog - render only if we have an effective widget ID */}
      {(effectiveWidgetId || ((containerRef as any).current?.widgetId)) && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[var(--max-widget-width,1200px)] max-w-[95vw] h-[90vh] max-h-[90vh] p-0">
            <div className="flex flex-col h-full">
              {/* Dialog Header */}
              <div className="widget-header flex items-center justify-between px-4 py-2 select-none flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <h2 key={title} className="text-sm font-semibold">{title}</h2>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </div>
                
                <div className="flex items-center space-x-1">
                  {headerControls}
                </div>
              </div>

              {/* Dialog Content wrapper */}
              <div className="widget-content flex-1 min-h-0 overflow-hidden pt-0 px-1 pb-1 select-text">
                {children}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}); 