import { ChevronDown, Maximize2, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useRef } from 'react';

interface WidgetContainerProps {
  children: React.ReactNode;
  title: string;
  headerControls?: React.ReactNode;
}

export function WidgetContainer({ children, title, headerControls }: WidgetContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="grid-stack-item-content h-full w-full box-border overflow-hidden">
      <div className="h-full w-full flex flex-col box-border">
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
        <div className="flex-1 min-h-0 w-full box-border px-2 pb-2 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
} 