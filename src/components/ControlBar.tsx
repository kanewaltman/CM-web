import { ChevronDown } from '../components/ui-icons';
import { Button } from './ui/button';
import { cn, getThemeValues } from '@/lib/utils';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';

interface ControlBarProps {
  dataSource: 'demo' | 'sample';
  onDataSourceChange?: (source: 'demo' | 'sample') => void;
  contentWidth?: number;
}

export function ControlBar({ 
  dataSource,
  onDataSourceChange,
  contentWidth = 1940
}: ControlBarProps) {
  const { theme, resolvedTheme } = useTheme();

  // Handle theme initialization
  useEffect(() => {
    // Force a re-render when the theme/resolvedTheme changes
    // This ensures correct styling when the app first loads
    console.log('Theme changed:', { theme, resolvedTheme });
  }, [theme, resolvedTheme]);

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
          paddingLeft: `calc(8px + var(--grid-margin))`, 
          paddingRight: `calc(8px + var(--grid-margin))` 
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

        {/* Right Section - Removed Edit button */}
        <div className="flex items-center space-x-3">
          {/* Edit button has been moved to the EditButton component */}
        </div>
      </div>
    </div>
  );
}