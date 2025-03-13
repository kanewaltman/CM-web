import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import { Lock, Unlock } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';

interface ThemeIntensitySliderProps {
  className?: string;
  onBackgroundIntensityChange: (intensity: number) => void;
  onWidgetIntensityChange: (intensity: number) => void;
  onBorderIntensityChange: (intensity: number) => void;
  currentBackgroundIntensity: number;
  currentWidgetIntensity: number;
  currentBorderIntensity: number;
}

export function ThemeIntensitySlider({ 
  className, 
  onBackgroundIntensityChange, 
  onWidgetIntensityChange,
  onBorderIntensityChange,
  currentBackgroundIntensity,
  currentWidgetIntensity,
  currentBorderIntensity
}: ThemeIntensitySliderProps) {
  const [isLocked, setIsLocked] = useState(() => {
    const savedLockState = localStorage.getItem('theme-sliders-locked');
    return savedLockState === null ? true : savedLockState === 'true';
  });

  // Snap to nearest valid position
  const snapToPosition = (value: number): number => {
    const positions = [-1, 0, 1];
    return positions.reduce((prev, curr) => 
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
  };

  const handleBackgroundValueChange = (value: number) => {
    const snappedValue = snapToPosition(value);
    onBackgroundIntensityChange(snappedValue);
    if (isLocked) {
      onWidgetIntensityChange(snappedValue);
      onBorderIntensityChange(snappedValue);
    }
  };

  const handleWidgetValueChange = (value: number) => {
    const snappedValue = snapToPosition(value);
    onWidgetIntensityChange(snappedValue);
    if (isLocked) {
      onBackgroundIntensityChange(snappedValue);
      onBorderIntensityChange(snappedValue);
    }
  };

  const handleBorderValueChange = (value: number) => {
    const snappedValue = snapToPosition(value);
    onBorderIntensityChange(snappedValue);
    if (isLocked) {
      onBackgroundIntensityChange(snappedValue);
      onWidgetIntensityChange(snappedValue);
    }
  };

  const toggleLock = () => {
    if (!isLocked) {
      // When re-locking, sync all to background
      onWidgetIntensityChange(currentBackgroundIntensity);
      onBorderIntensityChange(currentBackgroundIntensity);
    }
    const newLockState = !isLocked;
    setIsLocked(newLockState);
    localStorage.setItem('theme-sliders-locked', newLockState.toString());
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div className="flex justify-center mb-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full",
            isLocked ? "text-foreground" : "text-muted-foreground"
          )}
          onClick={toggleLock}
        >
          {isLocked ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
          <span className="sr-only">
            {isLocked ? "Unlock theme sliders" : "Lock theme sliders"}
          </span>
        </Button>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Background</span>
            <span className="text-xs text-muted-foreground">
              {currentBackgroundIntensity === -1 ? 'OLED' : currentBackgroundIntensity === 0 ? 'Default' : 'Backlit'}
            </span>
          </div>
          <Slider
            value={[currentBackgroundIntensity]}
            onValueChange={([value]) => handleBackgroundValueChange(value)}
            min={-1}
            max={1}
            step={1}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Widgets</span>
            <span className="text-xs text-muted-foreground">
              {currentWidgetIntensity === -1 ? 'OLED' : currentWidgetIntensity === 0 ? 'Default' : 'Backlit'}
            </span>
          </div>
          <Slider
            value={[currentWidgetIntensity]}
            onValueChange={([value]) => handleWidgetValueChange(value)}
            min={-1}
            max={1}
            step={1}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Borders</span>
            <span className="text-xs text-muted-foreground">
              {currentBorderIntensity === -1 ? 'OLED' : currentBorderIntensity === 0 ? 'Default' : 'Backlit'}
            </span>
          </div>
          <Slider
            value={[currentBorderIntensity]}
            onValueChange={([value]) => handleBorderValueChange(value)}
            min={-1}
            max={1}
            step={1}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
} 