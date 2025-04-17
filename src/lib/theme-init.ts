import { getThemeValues } from './utils';

// Get the current theme from localStorage or system preference
const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) return savedTheme;
  
  // Check system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

// Get saved intensities for the theme
const getSavedIntensities = (theme: string) => {
  const saved = localStorage.getItem(`theme-intensities-${theme}`);
  if (saved) {
    return JSON.parse(saved);
  }
  return { background: 0, widget: 0, border: 0, foregroundOpacity: 0.7 };
};

// Apply initial theme values
const applyInitialTheme = () => {
  const theme = getInitialTheme();
  const intensities = getSavedIntensities(theme);
  const colors = getThemeValues(
    theme, 
    intensities.background, 
    intensities.widget, 
    intensities.border,
    intensities.foregroundOpacity
  );
  
  // Apply CSS variables
  Object.entries(colors.cssVariables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
  
  // Set initial theme class
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

// Run immediately
applyInitialTheme();

export { applyInitialTheme }; 