import { ChevronDown, LayoutGrid, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { cn, getThemeValues } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface ControlBarProps {
  onResetLayout: () => void;
}

export function ControlBar({ onResetLayout }: ControlBarProps) {
  const { theme } = useTheme();
  const colors = getThemeValues(theme);
  const [isOpen, setIsOpen] = useState(false);

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