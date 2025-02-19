import { ChevronDown, Maximize2, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';
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
  onRemove?: () => void;
}

export function WidgetContainer({ children, title, headerControls, onRemove }: WidgetContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div ref={containerRef} className="grid-stack-item-content">
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
              <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onRemove && (
                    <DropdownMenuItem onClick={onRemove}>
                      Remove Widget
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content wrapper */}
        <div className="flex-1 min-h-0 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
} 