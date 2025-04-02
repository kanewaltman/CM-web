import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';

interface ThemeIntensities {
  background: number;
  widget: number;
  border: number;
}

interface ThemeContextType {
  backgroundIntensity: number;
  widgetIntensity: number;
  borderIntensity: number;
  setBackgroundIntensity: (value: number) => void;
  setWidgetIntensity: (value: number) => void;
  setBorderIntensity: (value: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Get initial intensities from CSS variables
const getInitialIntensities = () => {
  const root = document.documentElement;
  const getIntensity = (base: number, current: string) => {
    const currentValue = parseInt(current.split(' ')[2]);
    return currentValue - base;
  };

  const isOled = root.classList.contains('oled');
  const isDark = root.classList.contains('dark');
  
  // For OLED theme, all base values are 0
  if (isOled) {
    return {
      background: getIntensity(0, getComputedStyle(root).getPropertyValue('--color-bg-base')),
      widget: getIntensity(0, getComputedStyle(root).getPropertyValue('--color-bg-widget')),
      border: getIntensity(0, getComputedStyle(root).getPropertyValue('--color-border'))
    };
  }

  const bgBase = isDark ? 0 : 100;
  const widgetBase = isDark ? 3 : 98;
  const borderBase = isDark ? 10 : 90;

  return {
    background: getIntensity(bgBase, getComputedStyle(root).getPropertyValue('--color-bg-base')),
    widget: getIntensity(widgetBase, getComputedStyle(root).getPropertyValue('--color-bg-widget')),
    border: getIntensity(borderBase, getComputedStyle(root).getPropertyValue('--color-border'))
  };
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const initialIntensities = useMemo(() => getInitialIntensities(), []);
  const [backgroundIntensity, setBackgroundIntensity] = useState(initialIntensities.background);
  const [widgetIntensity, setWidgetIntensity] = useState(initialIntensities.widget);
  const [borderIntensity, setBorderIntensity] = useState(initialIntensities.border);

  // Load theme-specific intensities when theme changes
  useEffect(() => {
    if (!resolvedTheme) return;

    const savedIntensities = localStorage.getItem(`theme-intensities-${resolvedTheme}`);
    if (savedIntensities) {
      const { background, widget, border } = JSON.parse(savedIntensities);
      setBackgroundIntensity(background);
      setWidgetIntensity(widget);
      setBorderIntensity(border);
    } else {
      // Reset to defaults if no saved intensities for this theme
      setBackgroundIntensity(0);
      setWidgetIntensity(0);
      setBorderIntensity(0);
    }
  }, [resolvedTheme]);

  const value = useMemo(() => ({
    backgroundIntensity,
    widgetIntensity,
    borderIntensity,
    setBackgroundIntensity: (value: number) => {
      setBackgroundIntensity(value);
      if (resolvedTheme) {
        const savedIntensities = localStorage.getItem(`theme-intensities-${resolvedTheme}`);
        const intensities = savedIntensities ? JSON.parse(savedIntensities) : { background: 0, widget: 0, border: 0 };
        localStorage.setItem(`theme-intensities-${resolvedTheme}`, JSON.stringify({ ...intensities, background: value }));
      }
    },
    setWidgetIntensity: (value: number) => {
      setWidgetIntensity(value);
      if (resolvedTheme) {
        const savedIntensities = localStorage.getItem(`theme-intensities-${resolvedTheme}`);
        const intensities = savedIntensities ? JSON.parse(savedIntensities) : { background: 0, widget: 0, border: 0 };
        localStorage.setItem(`theme-intensities-${resolvedTheme}`, JSON.stringify({ ...intensities, widget: value }));
      }
    },
    setBorderIntensity: (value: number) => {
      setBorderIntensity(value);
      if (resolvedTheme) {
        const savedIntensities = localStorage.getItem(`theme-intensities-${resolvedTheme}`);
        const intensities = savedIntensities ? JSON.parse(savedIntensities) : { background: 0, widget: 0, border: 0 };
        localStorage.setItem(`theme-intensities-${resolvedTheme}`, JSON.stringify({ ...intensities, border: value }));
      }
    },
  }), [backgroundIntensity, widgetIntensity, borderIntensity, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeIntensity() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeIntensity must be used within a ThemeProvider');
  }
  return context;
} 