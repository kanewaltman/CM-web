import { LayoutGrid, RotateCcw, Copy, Clipboard } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { cn, getThemeValues } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WidgetPicker } from './WidgetPicker';
import { GridStack } from 'gridstack';

interface ControlBarProps {
  onResetLayout: () => void;
  onCopyLayout: () => string;
  onPasteLayout: (layout: string) => void;
  grid: GridStack | null;
  activeWidgets: Set<string>;
}

const availableWidgets = [
  { id: 'chart', title: 'Chart', minW: 2, minH: 2, w: 6, h: 6 },
  { id: 'orderbook', title: 'Order Book', minW: 2, minH: 2, w: 3, h: 6 },
  { id: 'tradeform', title: 'Trade Form', minW: 2, minH: 2, w: 3, h: 4 },
  { id: 'market', title: 'Market Overview', minW: 2, minH: 2, w: 3, h: 4 },
  { id: 'trades', title: 'Recent Trades', minW: 2, minH: 2, w: 9, h: 2 },
];

export function ControlBar({ onResetLayout, onCopyLayout, onPasteLayout, grid, activeWidgets }: ControlBarProps) {
  const { theme } = useTheme();
  const colors = getThemeValues(theme);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleCopyLayout = () => {
    const layoutData = onCopyLayout();
    navigator.clipboard.writeText(layoutData).then(() => {
      toast({
        title: "Layout copied",
        description: "Layout configuration has been copied to clipboard",
      });
    }).catch((err) => {
      console.error('Failed to copy layout:', err);
      toast({
        title: "Failed to copy",
        description: "Could not copy layout to clipboard",
        variant: "destructive",
      });
    });
  };

  const handlePasteLayout = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onPasteLayout(text);
      toast({
        title: "Layout pasted",
        description: "New layout has been applied",
      });
    } catch (err) {
      console.error('Failed to paste layout:', err);
      toast({
        title: "Failed to paste",
        description: "Could not paste layout from clipboard",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  return (
    <div className={cn(
      "w-full py-2",
      "bg-[hsl(var(--color-bg-base))]"
    )}>
      <div className="flex items-center justify-between max-w-[1920px] mx-auto px-4">
        <div className="flex items-center space-x-6">
          <div className="-space-y-0.5">
            <div className="text-lg font-bold leading-tight">Layout Editor</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 border rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopyLayout}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePasteLayout}
            >
              <Clipboard className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onResetLayout}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-10 px-3",
                  colors.text,
                  "hover:bg-transparent"
                )}
              >
                <LayoutGrid className="h-4 w-4 mr-2 opacity-50" />
                <span>Add Widget</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <WidgetPicker 
                widgets={availableWidgets}
                activeWidgets={activeWidgets}
                grid={grid}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}