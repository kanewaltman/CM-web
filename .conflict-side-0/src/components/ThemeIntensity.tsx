import { cn, getThemeValues } from '@/lib/utils';
import { Lock, Unlock } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { useThemeIntensity } from '@/contexts/ThemeContext';
import { Slider } from './ui/slider';

interface ThemeIntensityProps {
  className?: string;
}

interface ThemeIntensities {
  background: number;
  widget: number;
  border: number;
  foregroundOpacity: number;
}

export function ThemeIntensity({ className }: ThemeIntensityProps) {
  const { resolvedTheme } = useTheme();
  const {
    backgroundIntensity,
    widgetIntensity,
    borderIntensity,
    foregroundOpacity,
    setBackgroundIntensity,
    setWidgetIntensity,
    setBorderIntensity,
    setForegroundOpacity,
  } = useThemeIntensity();
  
  const [isLocked, setIsLocked] = useState(() => {
    const savedLockState = localStorage.getItem('theme-sliders-locked');
    return savedLockState === null ? true : savedLockState === 'true';
  });

  // Reference to track if we're currently dragging
  const isDraggingRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const throttleTimeMs = 16; // ~ 60fps

  // Throttled function to update CSS directly without causing excessive DOM operations
  const throttledApplyForegroundOpacity = useCallback((opacity: number) => {
    const now = Date.now();
    if (now - lastUpdateTimeRef.current >= throttleTimeMs) {
      lastUpdateTimeRef.current = now;
      applyForegroundOpacity(opacity);
    }
  }, []);

  // Get intensity label based on theme and value
  const getIntensityLabel = (intensity: number) => {
    if (resolvedTheme === 'dark') {
      return intensity === -1 ? 'OLED' : intensity === 0 ? 'Default' : 'Backlit';
    } else {
      return intensity === -1 ? 'Cool' : intensity === 0 ? 'Default' : 'Warm';
    }
  };

  const getThemeIntensities = (theme: string): ThemeIntensities => {
    const saved = localStorage.getItem(`theme-intensities-${theme}`);
    if (saved) {
      return JSON.parse(saved);
    }
    return { background: 0, widget: 0, border: 0, foregroundOpacity: 0.85 };
  };

  const saveThemeIntensities = (theme: string, intensities: ThemeIntensities) => {
    localStorage.setItem(`theme-intensities-${theme}`, JSON.stringify(intensities));
  };

  const handleBackgroundValueChange = (value: string) => {
    const intensity = value === 'min' ? -1 : value === 'max' ? 1 : 0;
    setBackgroundIntensity(intensity);
    
    if (resolvedTheme) {
      const currentIntensities = getThemeIntensities(resolvedTheme);
      currentIntensities.background = intensity;
      if (isLocked) {
        currentIntensities.widget = intensity;
        currentIntensities.border = intensity;
        setWidgetIntensity(intensity);
        setBorderIntensity(intensity);
      }
      saveThemeIntensities(resolvedTheme, currentIntensities);
      
      // Apply immediate updates to background-dependent variables
      applyBackgroundIntensity(intensity, currentIntensities);
    }
  };

  // Apply CSS variables that depend on background intensity
  const applyBackgroundIntensity = (intensity: number, intensities: ThemeIntensities) => {
    if (!resolvedTheme) return;
    
    const root = document.documentElement;
    const colors = getThemeValues(
      resolvedTheme,
      intensity,
      intensities.widget,
      intensities.border,
      intensities.foregroundOpacity
    );
    
    // Update all CSS variables - this ensures primary-foreground is updated
    Object.entries(colors.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };

  const handleWidgetValueChange = (value: string) => {
    const intensity = value === 'min' ? -1 : value === 'max' ? 1 : 0;
    setWidgetIntensity(intensity);
    
    if (resolvedTheme) {
      const currentIntensities = getThemeIntensities(resolvedTheme);
      currentIntensities.widget = intensity;
      if (isLocked) {
        currentIntensities.background = intensity;
        currentIntensities.border = intensity;
        setBackgroundIntensity(intensity);
        setBorderIntensity(intensity);
      }
      saveThemeIntensities(resolvedTheme, currentIntensities);
      
      // Apply all theme variables to ensure consistency
      applyAllThemeVariables(currentIntensities);
    }
  };
  
  // Apply all theme variables to ensure consistency
  const applyAllThemeVariables = (intensities: ThemeIntensities) => {
    if (!resolvedTheme) return;
    
    const root = document.documentElement;
    const colors = getThemeValues(
      resolvedTheme,
      intensities.background,
      intensities.widget,
      intensities.border,
      intensities.foregroundOpacity
    );
    
    // Update all CSS variables
    Object.entries(colors.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };

  const handleBorderValueChange = (value: string) => {
    const intensity = value === 'min' ? -1 : value === 'max' ? 1 : 0;
    setBorderIntensity(intensity);
    
    if (resolvedTheme) {
      const currentIntensities = getThemeIntensities(resolvedTheme);
      currentIntensities.border = intensity;
      if (isLocked) {
        currentIntensities.background = intensity;
        currentIntensities.widget = intensity;
        setBackgroundIntensity(intensity);
        setWidgetIntensity(intensity);
      }
      saveThemeIntensities(resolvedTheme, currentIntensities);
      
      // Apply all theme variables to ensure consistency
      applyAllThemeVariables(currentIntensities);
    }
  };

  // Apply CSS variables for foreground opacity during drag
  const applyForegroundOpacity = (opacity: number) => {
    if (!resolvedTheme) return;
    
    const root = document.documentElement;
    const intensities = getThemeIntensities(resolvedTheme);

    // Get current theme values
    const colors = getThemeValues(
      resolvedTheme,
      intensities.background,
      intensities.widget,
      intensities.border,
      opacity
    );

    // Update foreground-related CSS variables and primary-foreground
    Object.entries(colors.cssVariables)
      .filter(([key]) => key.includes('foreground') || key === '--primary-foreground')
      .forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });

    // Also update the CSS variable for reference
    root.style.setProperty('--current-foreground-opacity', String(opacity));
  };

  // Handle active slider dragging with throttling
  const handleSliderDrag = (value: number[]) => {
    const opacity = value[0];
    if (isDraggingRef.current) {
      throttledApplyForegroundOpacity(opacity);
    }
  };

  const handleForegroundOpacityChange = (value: number[]) => {
    const opacity = value[0];
    
    // Immediate visual update while dragging
    handleSliderDrag(value);
    
    // Update state for permanent change
    setForegroundOpacity(opacity);
    
    if (resolvedTheme) {
      const currentIntensities = getThemeIntensities(resolvedTheme);
      currentIntensities.foregroundOpacity = opacity;
      saveThemeIntensities(resolvedTheme, currentIntensities);
    }
  };

  // When drag ends, ensure final value is applied properly
  const handleForegroundOpacityCommit = (value: number[]) => {
    isDraggingRef.current = false;
    const opacity = value[0];
    
    if (resolvedTheme) {
      const currentIntensities = getThemeIntensities(resolvedTheme);
      currentIntensities.foregroundOpacity = opacity;
      
      // Update state
      setForegroundOpacity(opacity);
      saveThemeIntensities(resolvedTheme, currentIntensities);
      
      // Apply all theme variables to ensure complete update
      applyAllThemeVariables(currentIntensities);
    }
  };

  const toggleLock = () => {
    if (!isLocked && resolvedTheme) {
      const currentIntensities = getThemeIntensities(resolvedTheme);
      setWidgetIntensity(backgroundIntensity);
      setBorderIntensity(backgroundIntensity);
      currentIntensities.widget = backgroundIntensity;
      currentIntensities.border = backgroundIntensity;
      saveThemeIntensities(resolvedTheme, currentIntensities);
    }
    const newLockState = !isLocked;
    setIsLocked(newLockState);
    localStorage.setItem('theme-sliders-locked', newLockState.toString());
  };

  const getValueFromIntensity = (intensity: number) => {
    return intensity === -1 ? 'min' : intensity === 1 ? 'max' : 'default';
  };

  // Initialize CSS variable with current foreground opacity on mount
  useEffect(() => {
    // Apply opacity to both themes
    document.documentElement.style.setProperty('--current-foreground-opacity', String(foregroundOpacity));
  }, [resolvedTheme, foregroundOpacity]);
  
  // Apply all theme variables whenever any intensity changes
  useEffect(() => {
    if (resolvedTheme) {
      const intensities = {
        background: backgroundIntensity,
        widget: widgetIntensity,
        border: borderIntensity,
        foregroundOpacity: foregroundOpacity
      };
      applyAllThemeVariables(intensities);
    }
  }, [resolvedTheme, backgroundIntensity, widgetIntensity, borderIntensity, foregroundOpacity]);

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Background</span>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 rounded-full",
                  isLocked ? "text-foreground" : "text-muted-foreground"
                )}
                onClick={toggleLock}
              >
                {isLocked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Unlock className="h-3 w-3" />
                )}
                <span className="sr-only">
                  {isLocked ? "Unlock theme sliders" : "Lock theme sliders"}
                </span>
              </Button>
            </div>
          </div>
          <Tabs
            value={getValueFromIntensity(backgroundIntensity)}
            onValueChange={handleBackgroundValueChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-popover p-0.5 rounded-md">
              <TabsTrigger 
                value="min" 
                className="rounded-sm text-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                {resolvedTheme === 'dark' ? 'OLED' : 'Cool'}
              </TabsTrigger>
              <TabsTrigger 
                value="default" 
                className="rounded-sm text-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                Default
              </TabsTrigger>
              <TabsTrigger 
                value="max" 
                className="rounded-sm text-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                {resolvedTheme === 'dark' ? 'Backlit' : 'Warm'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Widgets</span>
          </div>
          <Tabs
            value={getValueFromIntensity(widgetIntensity)}
            onValueChange={handleWidgetValueChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-popover p-0.5 rounded-md">
              <TabsTrigger 
                value="min" 
                className="rounded-sm text-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                {resolvedTheme === 'dark' ? 'OLED' : 'Cool'}
              </TabsTrigger>
              <TabsTrigger 
                value="default" 
                className="rounded-sm text-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                Default
              </TabsTrigger>
              <TabsTrigger 
                value="max" 
                className="rounded-sm text-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                {resolvedTheme === 'dark' ? 'Backlit' : 'Warm'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Borders</span>
          </div>
          <Tabs
            value={getValueFromIntensity(borderIntensity)}
            onValueChange={handleBorderValueChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-popover p-0.5 rounded-md">
              <TabsTrigger 
                value="min" 
                className="rounded-sm text-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                {resolvedTheme === 'dark' ? 'OLED' : 'Cool'}
              </TabsTrigger>
              <TabsTrigger 
                value="default" 
                className="rounded-sm text-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                Default
              </TabsTrigger>
              <TabsTrigger 
                value="max" 
                className="rounded-sm text-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                {resolvedTheme === 'dark' ? 'Backlit' : 'Warm'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Foreground</span>
            <span className="text-xs text-muted-foreground">{Math.round(foregroundOpacity * 100)}%</span>
          </div>
          <div className="px-1 py-3">
            <Slider
              value={[foregroundOpacity]}
              min={0.3}
              max={1}
              step={0.05}
              onValueChange={handleForegroundOpacityChange}
              onValueCommit={handleForegroundOpacityCommit}
              onPointerDown={() => { isDraggingRef.current = true; }}
              onLostPointerCapture={() => {
                if (isDraggingRef.current) {
                  // Call commit handler with current value when pointer capture is lost
                  handleForegroundOpacityCommit([foregroundOpacity]);
                }
              }}
              className="transition-all duration-150"
            />
          </div>
        </div>
      </div>
    </div>
  );
} 