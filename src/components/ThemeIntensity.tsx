import { cn } from '@/lib/utils';
import { Lock, Unlock } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { useThemeIntensity } from '@/contexts/ThemeContext';

interface ThemeIntensityProps {
  className?: string;
}

interface ThemeIntensities {
  background: number;
  widget: number;
  border: number;
}

export function ThemeIntensity({ className }: ThemeIntensityProps) {
  const { resolvedTheme } = useTheme();
  const {
    backgroundIntensity,
    widgetIntensity,
    borderIntensity,
    setBackgroundIntensity,
    setWidgetIntensity,
    setBorderIntensity,
  } = useThemeIntensity();
  
  const [isLocked, setIsLocked] = useState(() => {
    const savedLockState = localStorage.getItem('theme-sliders-locked');
    return savedLockState === null ? true : savedLockState === 'true';
  });

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
    return { background: 0, widget: 0, border: 0 };
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
    }
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
    }
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
      </div>
    </div>
  );
} 