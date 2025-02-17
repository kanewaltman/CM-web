import { cn } from "@/lib/utils";
import { ChevronDown, Maximize2, MoreHorizontal } from "lucide-react";
import { Button } from "./button";

interface WidgetContainerProps {
  title: string;
  children: React.ReactNode;
  headerControls?: React.ReactNode;
}

export function WidgetContainer({
  title,
  children,
  headerControls,
}: WidgetContainerProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header - reduced height, removed border */}
      <div className="widget-header flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
        
        <div className="flex items-center space-x-1 pointer-events-auto">
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

      {/* Content wrapper with padding on left, right, and bottom only */}
      <div className="widget-content flex-1 px-2 pb-2 overflow-hidden">
        {/* Scrollable content container */}
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
  );
}