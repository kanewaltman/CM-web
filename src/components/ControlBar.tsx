import { ChevronDown, LayoutGrid, RotateCcw, Copy, Clipboard, Palette } from '../components/ui-icons';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { useTheme } from 'next-themes';
import { cn, getThemeValues } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { WIDGET_REGISTRY } from '@/App';

interface ControlBarProps {
  onResetLayout: () => void;
  onCopyLayout: () => string;
  onPasteLayout: (layout: string) => void;
}

export function ControlBar({ onResetLayout, onCopyLayout, onPasteLayout }: ControlBarProps) {
  const { theme, setTheme } = useTheme();
  const colors = getThemeValues(theme);
  const [isOpen, setIsOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);

  const handleCopyLayout = () => {
    try {
      const layoutData = onCopyLayout();
      if (!layoutData) {
        throw new Error('No layout data available');
      }
      navigator.clipboard.writeText(layoutData).then(() => {
        toast.success("Layout copied", {
          description: "Layout configuration has been copied to clipboard",
        });
      }).catch((err) => {
        console.error('Failed to copy layout:', err);
        toast.error("Failed to copy", {
          description: "Could not copy layout to clipboard",
        });
      });
    } catch (err) {
      console.error('Failed to prepare layout for copy:', err);
      toast.error("Failed to copy", {
        description: "Could not prepare layout data",
      });
    }
  };

  const handlePasteLayout = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Validate that the text is valid JSON and has the expected structure
      const parsedLayout = JSON.parse(text);
      if (!Array.isArray(parsedLayout)) {
        throw new Error('Invalid layout format');
      }
      onPasteLayout(text);
      toast.success("Layout pasted", {
        description: "New layout has been applied",
      });
    } catch (err) {
      console.error('Failed to paste layout:', err);
      toast.error("Failed to paste", {
        description: "Invalid layout data in clipboard",
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
      "w-full py-4",
      "bg-[hsl(var(--color-bg-base))]"
    )}>
      {/* Left Section - Account Selector and Balance */}
      <div className="flex items-center justify-between max-w-[1920px] mx-auto px-4">
        <div className="flex items-center space-x-6">
          <button 
            className={cn(
              "flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors",
              "bg-[hsl(var(--color-widget-inset))]",
              "border border-[hsl(var(--color-border-default)]",
              "shadow-[0px_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0px_1px_0px_rgba(0,0,0,0.1)]",
              colors.text
            )}
          >
            <div className="w-8 h-8 rounded-full bg-orange-500/[0.16] flex items-center justify-center text-base">
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
        <div className="flex items-center space-x-3">
          {/* Edit Dropdown Menu */}
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-12 px-4 text-base",
                  colors.text,
                  "hover:bg-transparent"
                )}
              >
                <LayoutGrid className="h-5 w-5 mr-2 opacity-50" />
                <span>Edit</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-64">
              <div className="flex space-x-2 p-2">
                <Button variant="outline" className="flex-1 h-10" onClick={handleCopyLayout}>
                  <Copy className="h-4 w-4 mr-2 opacity-80" />
                  <span>Copy</span>
                </Button>
                <Button variant="outline" className="flex-1 h-10" onClick={handlePasteLayout}>
                  <Clipboard className="h-4 w-4 mr-2 opacity-80" />
                  <span>Paste</span>
                </Button>
              </div>
              <DropdownMenuSeparator />
              <div className="px-2 py-2 text-sm font-medium">Available Widgets</div>
              <div className="grid grid-cols-1 gap-2 p-2">
                {(Object.entries(WIDGET_REGISTRY) as [string, { title: string }][]).map(([type, config]) => (
                  <div
                    key={type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, type)}
                    className="relative flex select-none items-center rounded-md px-3 py-3 text-sm border shadow-sm
                    hover:bg-accent hover:text-accent-foreground cursor-grab active:cursor-grabbing"
                  >
                    <span>{config.title}</span>
                  </div>
                ))}
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Dialog open={isAppearanceOpen} onOpenChange={setIsAppearanceOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Palette className="h-4 w-4 mr-2 opacity-80" />
                      <span>Appearance</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Appearance Settings</DialogTitle>
                      <DialogDescription>
                        Customize the look and feel of your dashboard.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="mb-4">
                        <div className="mb-2 text-sm font-medium">Theme</div>
                        <div className="flex space-x-2">
                          <Button 
                            variant={theme === 'light' ? 'default' : 'outline'} 
                            className="flex-1"
                            onClick={() => setTheme('light')}
                          >
                            <span className="mr-2">☀️</span>
                            <span>Light</span>
                          </Button>
                          <Button 
                            variant={theme === 'dark' ? 'default' : 'outline'} 
                            className="flex-1"
                            onClick={() => setTheme('dark')}
                          >
                            <span className="mr-2">🌙</span>
                            <span>Dark</span>
                          </Button>
                          <Button 
                            variant={theme === 'system' ? 'default' : 'outline'} 
                            className="flex-1"
                            onClick={() => setTheme('system')}
                          >
                            <span className="mr-2">💻</span>
                            <span>System</span>
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <div className="mb-2 text-sm font-medium">Layout</div>
                        <Button variant="outline" className="w-full" onClick={() => {
                          onResetLayout();
                          setIsAppearanceOpen(false);
                        }}>
                          <RotateCcw className="h-4 w-4 mr-2 opacity-80" />
                          <span>Reset Layout</span>
                        </Button>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button>Done</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}