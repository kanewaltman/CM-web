import { ChevronDown, Maximize2, MoreHorizontal, Trash2 } from '../components/ui-icons';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useRef, useCallback, memo } from 'react';
import { createPopoutWindow } from '../utils/windowManager';
import { isTauri } from '../utils/platform';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface WidgetContainerProps {
  children: React.ReactNode;
  title: string;
  headerControls?: React.ReactNode;
  extraControls?: React.ReactNode;
  onRemove?: () => void;
  isMobile?: boolean;
}

export const WidgetContainer = memo(function WidgetContainer({ 
  children, 
  title, 
  headerControls, 
  extraControls,
  onRemove,
  isMobile = false 
}: WidgetContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
    const widgetId = gridItem?.getAttribute('gs-id') || gridItem?.id;
    
    if (widgetId) {
      console.log('Dispatching widget-remove event for:', widgetId);
      const event = new CustomEvent('widget-remove', {
        detail: { widgetId, id: widgetId },
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

  return (
    <div ref={containerRef} className="grid-stack-item-content">
      <div className="widget-inner-container flex flex-col h-full">
        {/* Header */}
        <div className={cn(
          "widget-header flex items-center justify-between px-4 py-2 select-none flex-shrink-0",
          !isMobile && "cursor-move" // Only show move cursor on desktop
        )}>
          <div className="flex items-center space-x-2">
            <h2 key={title} className="text-sm font-semibold">{title}</h2>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
          
          <div className="flex items-center space-x-1">
            {extraControls}
            {headerControls}
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleExpand}
                title={`Expand widget ${isTauri ? 'to new window' : 'in browser'}`}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2 opacity-50" />
                    <span>Remove Widget</span>
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
  );
}); 