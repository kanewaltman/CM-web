import { ChevronDown, Maximize2, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface WidgetContainerProps {
  children: React.ReactNode;
  title: string;
  headerControls?: React.ReactNode;
}

export function WidgetContainer({ children, title, headerControls }: WidgetContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent widget nesting by removing duplicate content
    if (containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent?.classList.contains('grid-stack-item')) {
        const contents = parent.querySelectorAll('.grid-stack-item-content');
        if (contents.length > 1) {
          // Keep only the first content div
          for (let i = 1; i < contents.length; i++) {
            contents[i].remove();
          }
        }
      }
    }
  }, []);

  return (
    <div ref={containerRef} className="grid-stack-item-content h-full">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="widget-header flex items-center justify-between px-4 py-2 select-none">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold">{title}</h2>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
          
          <div className="flex items-center space-x-1">
            {headerControls}
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content wrapper */}
        <div className="widget-content flex-1 px-2 pb-2 overflow-hidden">
          <div 
            className={cn(
              "h-full overflow-auto scrollbar-thin rounded-lg p-3 widget-inset",
              "border border-[hsl(var(--color-widget-inset-border))]"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 