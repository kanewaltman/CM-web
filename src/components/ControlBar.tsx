import { ChevronDown, LayoutGrid, RotateCcw, Copy, Clipboard } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { cn, getThemeValues } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ControlBarProps {
  onResetLayout: () => void;
  onCopyLayout: () => string;
  onPasteLayout: (layout: string) => void;
}

export function ControlBar({ onResetLayout, onCopyLayout, onPasteLayout }: ControlBarProps) {
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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, widgetType: string) => {
    console.log('Starting drag with widget type:', widgetType);
    // Set multiple formats to ensure compatibility
    e.dataTransfer.setData('text/plain', widgetType);
    e.dataTransfer.setData('widget/type', widgetType);
    e.dataTransfer.setData('application/json', JSON.stringify({ type: widgetType }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className={cn(
      "w-full py-2",
      "bg-[hsl(var(--color-bg-base))]"
    )}>
      {/* Left Section - Account Selector and Balance */}
      <div className="flex items-center justify-between max-w-[1920px] mx-auto px-4">
        <div className="flex items-center space-x-6">
          <button 
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
              "bg-[hsl(var(--color-widget-inset))]",
              "border border-[hsl(var(--color-border-default)]",
              "shadow-[0px_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0px_1px_0px_rgba(0,0,0,0.1)]",
              colors.text
            )}
          >
            <div className="w-7 h-7 rounded-full bg-orange-500/[0.16] flex items-center justify-center text-base">
              🐂
            </div>
            <span className="font-bold">Main</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
          
          <div className="-space-y-0.5">
            <div className={cn("text-sm", colors.textMuted)}>Balance</div>
            <div className="text-lg font-bold leading-tight">55,444.15 EUR</div>
          </div>
        </div>

        {/* Right Section - Grid Controls */}
        <div className="flex items-center space-x-2">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
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
                <span>Edit</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <DropdownMenuItem onClick={handleCopyLayout}>
                <Copy className="h-4 w-4 mr-2 opacity-50" />
                <span>Copy Layout</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePasteLayout}>
                <Clipboard className="h-4 w-4 mr-2 opacity-50" />
                <span>Paste Layout</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Available Widgets</div>
              {[
                { title: 'Market Overview', type: 'market-overview' },
                { title: 'Order Book', type: 'order-book' },
                { title: 'Recent Trades', type: 'recent-trades' },
                { title: 'Trading View Chart', type: 'trading-view-chart' },
                { title: 'Trade Form', type: 'trade-form' }
              ].map((widget) => (
                <div
                  key={widget.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, widget.type)}
                  className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-grab active:cursor-grabbing"
                >
                  <span className="ml-2">{widget.title}</span>
                </div>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onResetLayout}>
                <RotateCcw className="h-4 w-4 mr-2 opacity-50" />
                <span>Reset Layout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}