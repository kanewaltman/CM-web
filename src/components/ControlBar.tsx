import { ChevronDown, LayoutGrid, RotateCcw, Copy, Clipboard, Palette, Sun, Moon, Monitor } from '../components/ui-icons';
import { Lock, Unlock } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { useTheme } from 'next-themes';
import { cn, getThemeValues } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { WIDGET_REGISTRY } from '@/lib/widgetRegistry';
// Import GridStack directly
import { GridStack } from 'gridstack';
// Import Tauri API
import { isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Custom style types for grid layout
type GridStyle = 'rounded' | 'dense';

interface ControlBarProps {
  onResetLayout: () => void;
  onCopyLayout: () => string;
  onPasteLayout: (layout: string) => void;
  // Add optional props for controlling state
  initialGridStyle?: GridStyle;
  defaultIsOpen?: boolean;
  defaultIsAppearanceOpen?: boolean;
  // Add new prop for handling widget addition
  onAddWidget?: (widgetType: string) => void;
  // Add new prop for data source
  dataSource: 'demo' | 'sample';
  onDataSourceChange?: (source: 'demo' | 'sample') => void;
  // Add new prop for controlling layout lock
  onToggleLayoutLock?: (locked: boolean) => void;
  initialLayoutLocked?: boolean;
  // Add new prop for content width
  contentWidth?: number;
}

export function ControlBar({ 
  onResetLayout, 
  onCopyLayout, 
  onPasteLayout,
  initialGridStyle = 'rounded',
  defaultIsOpen = false,
  defaultIsAppearanceOpen = false,
  onAddWidget,
  dataSource,
  onDataSourceChange,
  onToggleLayoutLock,
  initialLayoutLocked = false,
  contentWidth = 1940
}: ControlBarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const colors = getThemeValues(resolvedTheme || theme, 0, 0, 0);
  const [isOpen, setIsOpen] = useState(defaultIsOpen);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(defaultIsAppearanceOpen);
  const [gridStyle, setGridStyle] = useState<GridStyle>(initialGridStyle);
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  const [isLayoutLocked, setIsLayoutLocked] = useState(initialLayoutLocked);

  // Check if we're in Tauri environment
  useEffect(() => {
    setIsTauriEnv(isTauri());
  }, []);

  // Initialize grid style on mount
  useEffect(() => {
    setCSSVariables(initialGridStyle);
    setGridStyle(initialGridStyle);
  }, [initialGridStyle]);

  // Handle theme initialization
  useEffect(() => {
    // Force a re-render when the theme/resolvedTheme changes
    // This ensures correct styling when the app first loads
    console.log('Theme changed:', { theme, resolvedTheme });
  }, [theme, resolvedTheme]);

  // Separate function to just set CSS variables without toast or grid manipulation
  const setCSSVariables = (style: GridStyle) => {
    const root = document.documentElement;
    const margin = style === 'rounded' ? 8 : 4;
    const borderRadius = style === 'rounded' ? '24px' : '16px';
    
    // Set CSS variables
    root.style.setProperty('--grid-item-border-radius', borderRadius);
    root.style.setProperty('--grid-margin', margin + 'px');
    
    // Set data attribute for grid style
    root.setAttribute('data-grid-style', style);
  };
  
  const applyGridStyle = (style: GridStyle, showToast = true) => {
    // Set the CSS variables first
    setCSSVariables(style);
    
    try {
      // Get GridStack instance directly - try multiple methods
      const gridElement = document.querySelector('.grid-stack') as HTMLElement;
      
      // Try to get grid instance from the element
      let gridInstance = (gridElement as any)?.gridstack;
      
      // If not found via element property, try accessing through window
      if (!gridInstance && (window as any).grid) {
        gridInstance = (window as any).grid;
      }
      
      if (gridInstance) {
        // Apply margin directly
        if (typeof gridInstance.margin === 'function') {
          gridInstance.margin(style === 'rounded' ? 8 : 4);
        }
        
        // Update all grid items to use the new border radius
        document.querySelectorAll('.grid-stack-item-content').forEach(item => {
          (item as HTMLElement).style.borderRadius = style === 'rounded' ? '24px' : '16px';
        });
        
        // Force a layout update
        if (typeof gridInstance.float === 'function') {
          const wasFloating = gridInstance.getFloat();
          gridInstance.float(!wasFloating);
          gridInstance.float(wasFloating);
        }
        
        // Compact and relayout grid
        if (typeof gridInstance.compact === 'function') {
          gridInstance.compact();
        }
      }
      
      // Save preference
      localStorage.setItem('grid-style', style);
      setGridStyle(style);
      
      // Only show toast when explicitly applying a style (not during initialization)
      if (showToast) {
        toast.success(`Applied ${style} grid style`);
      }
    } catch (error) {
      console.error('Error applying grid style:', error);
      // Still set the CSS variables and save preference
      localStorage.setItem('grid-style', style);
      setGridStyle(style);
      
      // Only show toast when explicitly applying a style (not during initialization)
      if (showToast) {
        toast.info(`Applied ${style} style (CSS only)`);
      }
    }
  };

  // Apply the styles immediately on component mount to prevent flashing
  useEffect(() => {
    const savedStyle = localStorage.getItem('grid-style') as GridStyle | null;
    
    // Set the CSS variables immediately to prevent layout shift
    if (savedStyle === 'rounded' || savedStyle === 'dense') {
      // Apply CSS variables immediately
      setCSSVariables(savedStyle);
      setGridStyle(savedStyle);
    } else {
      // Default to rounded
      setCSSVariables('rounded');
      setGridStyle('rounded');
    }
    
    // Apply the full grid style (with grid manipulation) after a delay
    // but without showing the toast notification
    const timer = setTimeout(() => {
      try {
        if (savedStyle === 'rounded' || savedStyle === 'dense') {
          applyGridStyle(savedStyle, false); // false = don't show toast
        } else {
          applyGridStyle('rounded', false); // false = don't show toast
        }
      } catch (error) {
        console.error('Error applying grid style on load:', error);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

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

  // Handle drag and drop events
  useEffect(() => {
    if (isTauri()) {
      // Listen for drag and drop events in Tauri
      const unlisten = listen('tauri://drag-and-drop', (event) => {
        try {
          // In Tauri, we'll just use click-only behavior
          // The drag and drop event is not needed
        } catch (error) {
          console.error('Error handling drag and drop:', error);
        }
      });

      return () => {
        unlisten.then(fn => fn());
      };
    }
  }, [onAddWidget]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, widgetType: string) => {
    if (isTauri()) {
      // In Tauri, prevent drag and drop
      e.preventDefault();
      return;
    }
    
    // In web, use standard drag and drop
    e.dataTransfer.setData('text/plain', widgetType);
    e.dataTransfer.setData('widget/type', widgetType);
    e.dataTransfer.setData('application/json', JSON.stringify({ type: widgetType }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleWidgetClick = (widgetType: string) => {
    if (onAddWidget) {
      onAddWidget(widgetType);
      setIsOpen(false); // Close dropdown after adding
    }
  };

  // Handle data source change
  const handleDataSourceChange = (source: 'demo' | 'sample') => {
    onDataSourceChange?.(source);
    toast.success(`Switched to ${source === 'demo' ? 'Demo API' : 'Sample Data'}`);
  };

  const handleToggleLayoutLock = () => {
    const newLockedState = !isLayoutLocked;
    setIsLayoutLocked(newLockedState);
    if (onToggleLayoutLock) {
      onToggleLayoutLock(newLockedState);
    }
    toast.success(newLockedState ? "Layout locked" : "Layout unlocked", {
      description: newLockedState 
        ? "Widgets cannot be moved or resized" 
        : "Widgets can now be moved and resized"
    });
  };

  return (
    <div className={cn(
      "w-full py-4",
      "bg-[hsl(var(--color-bg-base))]"
    )}>
      {/* Left Section - Account Selector and Balance */}
      <div 
        className="flex items-center justify-between mx-auto"
        style={{ 
          maxWidth: `${contentWidth}px`,
          paddingLeft: `calc(${gridStyle === 'rounded' ? '8px' : '4px'} + var(--grid-margin))`, 
          paddingRight: `calc(${gridStyle === 'rounded' ? '8px' : '4px'} + var(--grid-margin))` 
        }}
      >
        <div className="flex items-center space-x-6">
          <Button 
            variant="outline"
            className={cn(
              "flex items-center space-x-2 px-2",
              "bg-[hsl(var(--card))]",
              "text-foreground",
              "border border-border",
              "shadow-sm",
              "rounded-[calc(var(--grid-item-border-radius)/2)]",
              "[padding-top:1.4rem] [padding-bottom:1.4rem]"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center text-base">
              🐂
            </div>
            <span className="font-bold">Main</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </div>

        {/* Right Section - Grid Controls */}
        <div className="flex items-center space-x-3">
          {/* Edit Dropdown Menu */}
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "px-4 text-base",
                  "text-foreground",
                  "hover:bg-accent hover:text-accent-foreground",
                  "[padding-top:1.4rem] [padding-bottom:1.4rem]"
                )}
              >
                <LayoutGrid className="h-5 w-5 mr-2 opacity-50" />
                <span>Edit</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-72">
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={handleCopyLayout}>
                          <Copy className="h-4 w-4 opacity-80" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="tooltip-content">
                        <p>Copy Layout</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={handlePasteLayout}>
                          <Clipboard className="h-4 w-4 opacity-80" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="tooltip-content">
                        <p>Paste Layout</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={handleToggleLayoutLock}>
                          {isLayoutLocked ? (
                            <Lock className="h-4 w-4 opacity-80" />
                          ) : (
                            <Unlock className="h-4 w-4 opacity-80" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="tooltip-content">
                        <p>{isLayoutLocked ? "Unlock Layout" : "Lock Layout"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <Button variant="ghost" size="sm" onClick={onResetLayout}>
                  <RotateCcw className="h-4 w-4 mr-2 opacity-80" />
                  <span>Reset</span>
                </Button>
              </div>
              <DropdownMenuSeparator />
              <div className="px-3 py-2 text-sm font-medium">Available Widgets</div>
              <div className="px-1 py-1 pb-2">
                {(Object.entries(WIDGET_REGISTRY) as [string, { title: string }][])
                  .filter(([type]) => type === 'balances' || type === 'performance' || type === 'treemap' || type === 'markets' || type === 'transactions' || type === 'insight' || type === 'referrals' || type === 'earn')
                  .map(([type, config]) => (
                  <div
                    key={type}
                    draggable={!isTauriEnv}
                    onDragStart={(e) => handleDragStart(e, type)}
                    onClick={() => handleWidgetClick(type)}
                    className="relative flex select-none items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer active:bg-accent/80"
                  >
                    <div
                      className="bg-background flex size-8 items-center justify-center rounded-md border"
                      aria-hidden="true"
                    >
                      <LayoutGrid className="h-4 w-4 opacity-60" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{config.title}</div>
                      <div className="text-muted-foreground text-xs">
                        {isTauriEnv ? 'Click to add to dashboard' : 'Click or drag to add to dashboard'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Dialog open={isAppearanceOpen} onOpenChange={setIsAppearanceOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Palette className="h-4 w-4 mr-2 opacity-80" />
                      <span>Edit Appearance</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader className="pb-2">
                      <DialogTitle className="text-xl">Appearance Settings</DialogTitle>
                      <DialogDescription>
                        Customize the look and feel of your dashboard.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                      <div>
                        <div className="mb-3 text-sm font-medium">Theme</div>
                        <div className="flex space-x-3">
                          <Button 
                            variant={theme === 'light' ? 'default' : 'outline'} 
                            className="flex-1 h-11"
                            onClick={() => setTheme('light')}
                          >
                            <Sun className="h-4 w-4 mr-2" />
                            <span>Light</span>
                          </Button>
                          <Button 
                            variant={theme === 'dark' ? 'default' : 'outline'} 
                            className="flex-1 h-11"
                            onClick={() => setTheme('dark')}
                          >
                            <Moon className="h-4 w-4 mr-2" />
                            <span>Dark</span>
                          </Button>
                          <Button 
                            variant={theme === 'system' ? 'default' : 'outline'} 
                            className="flex-1 h-11"
                            onClick={() => setTheme('system')}
                          >
                            <Monitor className="h-4 w-4 mr-2" />
                            <span>System</span>
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <div className="mb-3 text-sm font-medium">Data Source</div>
                        <div className="flex space-x-3">
                          <Button 
                            variant={dataSource === 'demo' ? 'default' : 'outline'} 
                            className="flex-1 h-11"
                            onClick={() => handleDataSourceChange('demo')}
                          >
                            <span>Demo API</span>
                          </Button>
                          <Button 
                            variant={dataSource === 'sample' ? 'default' : 'outline'} 
                            className="flex-1 h-11"
                            onClick={() => handleDataSourceChange('sample')}
                          >
                            <span>Sample Data</span>
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <div className="mb-3 text-sm font-medium">Grid Style</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div 
                            className={cn(
                              "border rounded-xl p-4 cursor-pointer transition-all",
                              gridStyle === 'rounded' 
                                ? "border-primary bg-accent/50 ring-1 ring-primary" 
                                : "hover:border-primary/50 hover:bg-accent/20"
                            )}
                            onClick={() => applyGridStyle('rounded')}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-medium">Rounded</div>
                              <div className={cn(
                                "w-5 h-5 rounded-full",
                                gridStyle === 'rounded' ? "bg-primary" : "border border-muted-foreground"
                              )}>
                                {gridStyle === 'rounded' && <div className="w-2.5 h-2.5 bg-background rounded-full m-auto mt-[5px]" />}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 p-2">
                              <div className="bg-primary/15 h-14 rounded-3xl"></div>
                              <div className="bg-primary/15 h-14 rounded-3xl"></div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-3">24px radius, 8px spacing</div>
                          </div>
                          
                          <div 
                            className={cn(
                              "border rounded-xl p-4 cursor-pointer transition-all",
                              gridStyle === 'dense' 
                                ? "border-primary bg-accent/50 ring-1 ring-primary" 
                                : "hover:border-primary/50 hover:bg-accent/20"
                            )}
                            onClick={() => applyGridStyle('dense')}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-medium">Dense</div>
                              <div className={cn(
                                "w-5 h-5 rounded-full",
                                gridStyle === 'dense' ? "bg-primary" : "border border-muted-foreground"
                              )}>
                                {gridStyle === 'dense' && <div className="w-2.5 h-2.5 bg-background rounded-full m-auto mt-[5px]" />}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 p-2">
                              <div className="bg-primary/15 h-14 rounded-xl"></div>
                              <div className="bg-primary/15 h-14 rounded-xl"></div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-3">16px radius, 4px spacing</div>
                          </div>
                        </div>
                      </div>
                    </div>
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