import { cn } from '@/lib/utils';
import { GridStack } from 'gridstack';

interface Widget {
  id: string;
  title: string;
  minW: number;
  minH: number;
  w: number;
  h: number;
}

interface WidgetPickerProps {
  widgets: Widget[];
  activeWidgets: Set<string>;
  grid: GridStack | null;
}

export function WidgetPicker({ widgets, activeWidgets, grid }: WidgetPickerProps) {
  return (
    <div className="p-4 grid grid-cols-2 gap-2 min-w-[300px]">
      {widgets.map((widget) => {
        const isActive = activeWidgets.has(widget.id);
        return (
          <div
            key={widget.id}
            className={cn(
              "grid-stack-item cursor-grab",
              "p-2 border rounded-lg",
              "transition-opacity",
              isActive && "opacity-50 cursor-not-allowed"
            )}
            draggable={!isActive}
            gs-id={widget.id}
            gs-w={widget.w}
            gs-h={widget.h}
            gs-min-w={widget.minW}
            gs-min-h={widget.minH}
            onDragStart={(e) => {
              if (isActive) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData('application/json', JSON.stringify(widget));
            }}
          >
            <div className="text-sm font-medium">{widget.title}</div>
          </div>
        );
      })}
    </div>
  );
} 