import { useState, useEffect } from "react";
import {
  LayoutGrid,
  RotateCcw,
  Copy,
  Clipboard,
  Palette,
  Sun,
  Moon,
  Monitor,
  Plus,
} from "./ui-icons";
import {
  Lock,
  Unlock,
  Wallet,
  LineChart,
  PieChart,
  TrendingUp,
  Receipt,
  Sparkles,
  Users,
  DollarSign,
  PanelRight,
  Cog,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { useTheme } from "next-themes";
import { cn, getThemeValues } from "@/lib/utils";
import { toast } from "sonner";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Custom style types for grid layout
type GridStyle = "rounded" | "dense";

interface AddWidgetButtonProps {
  onResetLayout: () => void;
  onCopyLayout: () => string;
  onPasteLayout: (layout: string) => void;
  initialGridStyle?: GridStyle;
  onAddWidget?: (widgetType: string) => void;
  dataSource: "demo" | "sample";
  onDataSourceChange?: (source: "demo" | "sample") => void;
  onToggleLayoutLock?: (locked: boolean) => void;
  initialLayoutLocked?: boolean;
  position?: "top" | "bottom";
}

export function AddWidgetButton({
  onResetLayout,
  onCopyLayout,
  onPasteLayout,
  initialGridStyle = "rounded",
  onAddWidget,
  dataSource,
  onDataSourceChange,
  onToggleLayoutLock,
  initialLayoutLocked = false,
  position = "bottom",
}: AddWidgetButtonProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const colors = getThemeValues(resolvedTheme || theme, 0, 0, 0);
  const [isOpen, setIsOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
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

  // Separate function to just set CSS variables without toast or grid manipulation
  const setCSSVariables = (style: GridStyle) => {
    const root = document.documentElement;
    const margin = style === "rounded" ? 8 : 4;
    const borderRadius = style === "rounded" ? "24px" : "16px";

    // Set CSS variables
    root.style.setProperty("--grid-item-border-radius", borderRadius);
    root.style.setProperty("--grid-margin", margin + "px");

    // Set data attribute for grid style
    root.setAttribute("data-grid-style", style);
  };

  const applyGridStyle = (style: GridStyle, showToast = true) => {
    // Set the CSS variables first
    setCSSVariables(style);

    try {
      // Get GridStack instance directly - try multiple methods
      const gridElement = document.querySelector(".grid-stack") as HTMLElement;

      // Try to get grid instance from the element
      let gridInstance = (gridElement as any)?.gridstack;

      // If not found via element property, try accessing through window
      if (!gridInstance && (window as any).grid) {
        gridInstance = (window as any).grid;
      }

      if (gridInstance) {
        // Apply margin directly
        if (typeof gridInstance.margin === "function") {
          gridInstance.margin(style === "rounded" ? 8 : 4);
        }

        // Update all grid items to use the new border radius
        document
          .querySelectorAll(".grid-stack-item-content")
          .forEach((item) => {
            (item as HTMLElement).style.borderRadius =
              style === "rounded" ? "24px" : "16px";
          });

        // Force a layout update
        if (typeof gridInstance.float === "function") {
          const wasFloating = gridInstance.getFloat();
          gridInstance.float(!wasFloating);
          gridInstance.float(wasFloating);
        }

        // Compact and relayout grid
        if (typeof gridInstance.compact === "function") {
          gridInstance.compact();
        }
      }

      // Save preference
      localStorage.setItem("grid-style", style);
      setGridStyle(style);

      // Only show toast when explicitly applying a style (not during initialization)
      if (showToast) {
        toast.success(`Applied ${style} grid style`);
      }
    } catch (error) {
      console.error("Error applying grid style:", error);
      // Still set the CSS variables and save preference
      localStorage.setItem("grid-style", style);
      setGridStyle(style);

      // Only show toast when explicitly applying a style (not during initialization)
      if (showToast) {
        toast.info(`Applied ${style} style (CSS only)`);
      }
    }
  };

  const handleCopyLayout = () => {
    try {
      // Get layout data
      const layoutData = onCopyLayout();
      if (!layoutData) {
        throw new Error("No layout data available");
      }

      // Get custom lists from localStorage
      const MARKETS_LISTS_KEY = "markets-widget-custom-lists";
      const savedLists = localStorage.getItem(MARKETS_LISTS_KEY);
      const customLists = savedLists ? JSON.parse(savedLists) : [];

      // Create a combined data object with layout and lists
      const combinedData = {
        layout: JSON.parse(layoutData),
        customLists: customLists,
      };

      // Copy to clipboard
      navigator.clipboard
        .writeText(JSON.stringify(combinedData))
        .then(() => {
          toast.success("Layout copied", {
            description: "Layout configuration has been copied to clipboard",
          });
        })
        .catch((err) => {
          console.error("Failed to copy layout:", err);
          toast.error("Failed to copy", {
            description: "Could not copy layout to clipboard",
          });
        });
    } catch (err) {
      console.error("Failed to prepare layout for copy:", err);
      toast.error("Failed to copy", {
        description: "Could not prepare layout data",
      });
    }
  };

  const handlePasteLayout = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Parse the clipboard data
      const clipboardData = JSON.parse(text);

      // Check if it's the new combined format
      if (clipboardData.layout && Array.isArray(clipboardData.layout)) {
        // Handle new format with custom lists
        if (
          clipboardData.customLists &&
          Array.isArray(clipboardData.customLists)
        ) {
          // Save custom lists to localStorage
          const MARKETS_LISTS_KEY = "markets-widget-custom-lists";
          localStorage.setItem(
            MARKETS_LISTS_KEY,
            JSON.stringify(clipboardData.customLists)
          );

          // Trigger a custom event to notify components that lists have been updated
          const event = new CustomEvent("markets-lists-updated", {
            detail: {
              lists: clipboardData.customLists,
              instanceId: "all", // Signal update to all widgets
            },
            bubbles: true,
          });
          document.dispatchEvent(event);
        }

        // Apply the layout
        onPasteLayout(JSON.stringify(clipboardData.layout));
        toast.success("Layout pasted", {
          description: "New layout with custom lists has been applied",
        });
      } else if (Array.isArray(clipboardData)) {
        // Handle legacy format (just layout array)
        onPasteLayout(text);
        toast.success("Layout pasted", {
          description: "New layout has been applied",
        });
      } else {
        throw new Error("Invalid layout format");
      }
    } catch (err) {
      console.error("Failed to paste layout:", err);
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

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  // Handle drag and drop events
  useEffect(() => {
    if (isTauri()) {
      // Listen for drag and drop events in Tauri
      const unlisten = listen("tauri://drag-and-drop", (event) => {
        try {
          // In Tauri, we'll just use click-only behavior
          // The drag and drop event is not needed
        } catch (error) {
          console.error("Error handling drag and drop:", error);
        }
      });

      return () => {
        unlisten.then((fn) => fn());
      };
    }
  }, [onAddWidget]);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    widgetType: string
  ) => {
    if (isTauri()) {
      // In Tauri, prevent drag and drop
      e.preventDefault();
      return;
    }

    // In web, use standard drag and drop
    e.dataTransfer.setData("text/plain", widgetType);
    e.dataTransfer.setData("widget/type", widgetType);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: widgetType })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleWidgetClick = (widgetType: string) => {
    if (onAddWidget) {
      onAddWidget(widgetType);
      setIsOpen(false); // Close dropdown after adding
    }
  };

  // Handle data source change
  const handleDataSourceChange = (source: "demo" | "sample") => {
    onDataSourceChange?.(source);
    toast.success(
      `Switched to ${source === "demo" ? "Demo API" : "Sample Data"}`
    );
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
        : "Widgets can now be moved and resized",
    });
  };

  const buttonClasses = cn(
    "fixed left-1/2 transform -translate-x-1/2 z-10",
    "bg-[hsl(var(--card))] shadow-md rounded-full",
    position === "bottom" ? "bottom-8" : "top-24"
  );

  return (
    <div className={buttonClasses}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "px-4 text-base rounded-full",
              "text-foreground",
              "hover:bg-accent hover:text-accent-foreground",
              "py-5"
            )}
          >
            <Plus className="h-5 w-5 mr-2 opacity-50" />
            <span>Widgets</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          sideOffset={8}
          className="w-[95vw] max-w-fit min-w-[320px]"
        >
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyLayout}
              >
                <Copy className="h-4 w-4 text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePasteLayout}
              >
                <Clipboard className="h-4 w-4 text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleToggleLayoutLock}
              >
                {isLayoutLocked ? (
                  <Lock className="h-4 w-4 text-gray-400" />
                ) : (
                  <Unlock className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Dialog
                open={isAppearanceOpen}
                onOpenChange={setIsAppearanceOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Cog className="h-4 w-4 mr-2 opacity-80" />
                    <span>Settings</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl">
                      Appearance Settings
                    </DialogTitle>
                    <DialogDescription>
                      Customize the look and feel of your dashboard.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-6 space-y-6">
                    <div>
                      <div className="mb-3 text-sm font-medium">Theme</div>
                      <div className="flex space-x-3">
                        <Button
                          variant={theme === "light" ? "default" : "outline"}
                          className="flex-1 h-11"
                          onClick={() => setTheme("light")}
                        >
                          <Sun className="h-4 w-4 mr-2" />
                          <span>Light</span>
                        </Button>
                        <Button
                          variant={theme === "dark" ? "default" : "outline"}
                          className="flex-1 h-11"
                          onClick={() => setTheme("dark")}
                        >
                          <Moon className="h-4 w-4 mr-2" />
                          <span>Dark</span>
                        </Button>
                        <Button
                          variant={theme === "system" ? "default" : "outline"}
                          className="flex-1 h-11"
                          onClick={() => setTheme("system")}
                        >
                          <Monitor className="h-4 w-4 mr-2" />
                          <span>System</span>
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 text-sm font-medium">
                        Data Source
                      </div>
                      <div className="flex space-x-3">
                        <Button
                          variant={
                            dataSource === "demo" ? "default" : "outline"
                          }
                          className="flex-1 h-11"
                          onClick={() => handleDataSourceChange("demo")}
                        >
                          <span>Demo API</span>
                        </Button>
                        <Button
                          variant={
                            dataSource === "sample" ? "default" : "outline"
                          }
                          className="flex-1 h-11"
                          onClick={() => handleDataSourceChange("sample")}
                        >
                          <span>Sample Data</span>
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium">Grid Style</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={cn(
                            "border rounded-xl p-3 cursor-pointer transition-all",
                            gridStyle === "rounded"
                              ? "border-primary bg-accent/50 ring-1 ring-primary"
                              : "hover:border-primary/50 hover:bg-accent/20"
                          )}
                          onClick={() => applyGridStyle("rounded")}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium">Rounded</div>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full",
                                gridStyle === "rounded"
                                  ? "bg-primary"
                                  : "border border-muted-foreground"
                              )}
                            >
                              {gridStyle === "rounded" && (
                                <div className="w-2.5 h-2.5 bg-background rounded-full m-auto mt-[5px]" />
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 p-1">
                            <div className="bg-primary/15 h-8 rounded-3xl"></div>
                            <div className="bg-primary/15 h-8 rounded-3xl"></div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            24px radius, 8px spacing
                          </div>
                        </div>

                        <div
                          className={cn(
                            "border rounded-xl p-3 cursor-pointer transition-all",
                            gridStyle === "dense"
                              ? "border-primary bg-accent/50 ring-1 ring-primary"
                              : "hover:border-primary/50 hover:bg-accent/20"
                          )}
                          onClick={() => applyGridStyle("dense")}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium">Dense</div>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full",
                                gridStyle === "dense"
                                  ? "bg-primary"
                                  : "border border-muted-foreground"
                              )}
                            >
                              {gridStyle === "dense" && (
                                <div className="w-2.5 h-2.5 bg-background rounded-full m-auto mt-[5px]" />
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-1">
                            <div className="bg-primary/15 h-8 rounded-xl"></div>
                            <div className="bg-primary/15 h-8 rounded-xl"></div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            16px radius, 4px spacing
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <DialogClose asChild>
                      <Button>Done</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="ghost" size="sm" onClick={onResetLayout}>
                <RotateCcw className="h-4 w-4 mr-2 opacity-80" />
                <span>Reset</span>
              </Button>
            </div>
          </div>
          <DropdownMenuSeparator />
          <div className="p-1">
            <div className="flex flex-row flex-wrap justify-center gap-4 p-4">
              {(() => {
                const widgetConfigs = [
                  { type: "performance", title: "Performance" },
                  { type: "markets", title: "Markets" },
                  { type: "balances", title: "Balance" },
                  { type: "treemap", title: "Breakdown" },
                  { type: "transactions", title: "Transactions" },
                  { type: "earn", title: "Earn" },
                  { type: "referrals", title: "Referrals" },
                  { type: "insight", title: "Insight" },
                ];

                return widgetConfigs.map(({ type, title }) => {
                  const IconComponent =
                    {
                      balances: Wallet,
                      performance: LineChart,
                      treemap: PieChart,
                      markets: TrendingUp,
                      transactions: Receipt,
                      insight: Sparkles,
                      referrals: Users,
                      earn: DollarSign,
                    }[type] || LayoutGrid;

                  return (
                    <div
                      key={type}
                      draggable={!isTauriEnv}
                      onDragStart={(e) => handleDragStart(e, type)}
                      onClick={() => handleWidgetClick(type)}
                      className="relative flex flex-col bg-zinc-900 border border-zinc-800 rounded-md h-[120px] w-[180px] hover:border-primary cursor-pointer transition-all overflow-hidden group"
                    >
                      <div className="p-2 flex flex-col items-start gap-3">
                        <IconComponent className="h-5 w-5 text-primary/70" />
                        <div className="font-medium text-white text-sm">
                          {title}
                        </div>
                      </div>
                      <div className="flex-1"></div>

                      <div className="absolute inset-0 bg-accent/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="text-accent-foreground text-xs font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-200">
                          {isTauriEnv ? "Click to add" : "Click or drag"}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
