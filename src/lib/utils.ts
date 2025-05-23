import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a record's values into an array
 */
export function recordValues<T>(record: Record<string, T>): T[] {
  return Object.values(record);
}

type ThemeColors = {
  background: string;
  text: string;
  textMuted: string;
  hover: string;
  buttonBg: string;
  searchBg: string;
  searchPlaceholder: string;
  searchBorder: string;
  kbdBg: string;
  intensity?: number; // -1 for OLED, 0 for default, 1 for Backlit-like
  cssVariables: {
    '--color-bg-base': string;
    '--color-bg-subtle': string;
    '--color-bg-surface': string;
    '--color-bg-inset': string;
    '--color-bg-elevated': string;
    '--color-widget-bg': string;
    '--color-widget-header': string;
    '--color-widget-content': string;
    '--color-widget-inset': string;
    '--color-foreground-default': string;
    '--color-foreground-muted': string;
    '--color-foreground-subtle': string;
    '--color-border-default': string;
    '--color-border-muted': string;
    '--card': string;
    '--card-foreground': string;
    '--popover': string;
    '--popover-foreground': string;
    '--primary': string;
    '--primary-foreground': string;
    '--secondary': string;
    '--secondary-foreground': string;
    '--muted': string;
    '--muted-foreground': string;
    '--accent': string;
    '--accent-foreground': string;
    '--destructive': string;
    '--destructive-foreground': string;
    '--border': string;
    '--input': string;
    '--ring': string;
    '--color-widget-hover': string;
    '--color-widget-inset-border': string;
  };
};

  // Helper function to interpolate between two HSL values
  const interpolateHSL = (start: string, end: string, t: number): string => {
    const [h1, s1, l1] = start.split(' ').map(Number);
    const [h2, s2, l2] = end.split(' ').map(Number);
    
    // For hue, we want to take the shortest path
    let h = h1;
    if (Math.abs(h2 - h1) > 180) {
      h = h1 + (h2 > h1 ? 360 : -360);
    }
    
    return `${h1 + (h2 - h1) * t} ${s1 + (s2 - s1) * t}% ${l1 + (l2 - l1) * t}%`;
  };

// Helper function to get interpolated value based on intensity
const getInterpolatedValue = (colors: { oled: string; default: string; backlit: string }, intensity: number, opacity: number = 1): string => {
  if (intensity <= -1) return colors.oled;
  if (intensity >= 1) return colors.backlit;
  if (intensity === 0) return colors.default;
  
  const t = intensity < 0 ? intensity + 1 : intensity;
  const start = intensity < 0 ? colors.oled : colors.default;
  const end = intensity < 0 ? colors.default : colors.backlit;
  
  const interpolated = interpolateHSL(start, end, t);
  if (opacity === 1) return interpolated;
  
  // If opacity is less than 1, adjust the lightness
  const [h, s, l] = interpolated.split(' ').map(Number);
  return `${h} ${s}% ${l * opacity}%`;
};

export function getThemeValues(
  theme: string | undefined, 
  backgroundIntensity: number = 0,
  widgetIntensity: number = 0,
  borderIntensity: number = 0,
  foregroundOpacity: number = 0.7
): ThemeColors {
  // If theme is undefined, null, empty string, or 'system', 
  // we need to check if the document has the 'dark' class
  if (!theme || theme === 'system') {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // If dark mode is detected through the class, use dark theme values
      if (document.documentElement.classList.contains('dark')) {
        return getDarkThemeValues(backgroundIntensity, widgetIntensity, borderIntensity, foregroundOpacity);
      }
    }
    // Default to light theme if we can't detect or aren't in browser
    return getLightThemeValues(backgroundIntensity, widgetIntensity, borderIntensity, foregroundOpacity);
  }

  // If theme is explicitly set
  return theme === 'light' 
    ? getLightThemeValues(backgroundIntensity, widgetIntensity, borderIntensity, foregroundOpacity) 
    : getDarkThemeValues(backgroundIntensity, widgetIntensity, borderIntensity, foregroundOpacity);
}

function getDarkThemeValues(
  backgroundIntensity: number, 
  widgetIntensity: number, 
  borderIntensity: number,
  foregroundOpacity: number
): ThemeColors {
  const baseColors = {
    background: {
      default: 'hsl(0 0% 0%)',
      oled: 'hsl(0 0% 0%)',
      backlit: 'hsl(0 0% 2%)'
    },
    widget: {
      default: 'hsl(0 0% 3%)',
      oled: 'hsl(0 0% 2%)',
      backlit: 'hsl(0 0% 4%)'
    },
    border: {
      default: '0 0% 10%',
      oled: '0 0% 6%',
      backlit: '0 0% 14%'
    }
  };

  // Get background colors based on background intensity
  const bgBase = getInterpolatedValue(
    {
      oled: '0 0% 0%',
      default: '0 0% 7.83%',
      backlit: '220 3% 18%'
    },
    backgroundIntensity
  );

  // Get widget colors based on widget intensity
  const widgetBase = getInterpolatedValue(
    {
      oled: '0 0% 2%',
      default: '0 0% 6%',
      backlit: '220 3% 21%'
    },
    widgetIntensity
  );

  // Get card colors based on intensity
  const cardBase = getInterpolatedValue(
    {
      oled: '0 0% 2.63%',
      default: '0 0.67% 7.59%',
      backlit: '240 2.08% 19.4%'
    },
    widgetIntensity
  );

  // Get border colors based on border intensity and background state
  const getBorderColor = (intensity: number, opacity: number = 1): string => {
    // If we're in backlit mode, adjust the border colors to be lighter
    if (widgetIntensity >= 1) {
      return getInterpolatedValue(
        {
          oled: '0 0% 18%',
          default: '0 0% 22%',
          backlit: '0 0% 26%'
        },
        intensity,
        opacity
      );
    }
    return getInterpolatedValue(baseColors.border, intensity, opacity);
  };

  const borderBase = getBorderColor(borderIntensity);
  const borderMuted = getBorderColor(borderIntensity, 0.5);

  // Helper function to get widget inset color
  const getWidgetInsetColor = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: '0 0% 6%',
        default: '0 0% 10%',
        backlit: '220 3% 27%'
      },
      intensity
    );
  };

  // Get widget inset border color based on intensity
  const getWidgetInsetBorderColor = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: '220 3% 8%',
        default: '0 0% 14%',
        backlit: '220 3% 32%'
      },
      intensity
    );
  };

  // Get widget hover color based on widget intensity
  const getWidgetHoverColor = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: '0 0% 8%',  // Darker hover for OLED
        default: '0 0% 12%', // Default hover
        backlit: '220 3% 19%' // Blueish hover for backlit
      },
      intensity
    );
  };

  // Get accent color based on intensity
  const accentBase = getInterpolatedValue(
    {
      oled: '0 0% 30%',
      default: '0 0% 20%',
      backlit: '220 6% 25%'
    },
    widgetIntensity
  );

  // Get widget hover color
  const widgetHoverColor = getWidgetHoverColor(widgetIntensity);

  // Get primary foreground color based on background intensity
  const getPrimaryForegroundColor = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: '0 0% 4%',      // Pure black for OLED
        default: '0 0% 12%',   // Dark gray for default
        backlit: '220 3% 22%' // Blueish dark gray for backlit
      },
      intensity
    );
  };

  // Apply foreground opacity to text styles
  const textColor = `text-white/${foregroundOpacity}`;
  const textMutedColor = `text-white/${foregroundOpacity * 0.5}`;
  const hoverColor = `hover:text-white/${foregroundOpacity * 0.8}`;

  return {
    background: `bg-[${bgBase}]`,
    text: textColor,
    textMuted: textMutedColor,
    hover: hoverColor,
    buttonBg: 'bg-white/10',
    searchBg: `bg-[${widgetBase}]`,
    searchPlaceholder: `placeholder:${textMutedColor}`,
    searchBorder: 'border-border',
    kbdBg: 'bg-white/10',
    intensity: backgroundIntensity,
    cssVariables: {
      '--color-bg-base': bgBase,
      '--color-bg-subtle': widgetBase,
      '--color-bg-surface': widgetBase,
      '--color-bg-inset': widgetBase,
      '--color-bg-elevated': widgetBase,
      '--color-widget-bg': widgetBase,
      '--color-widget-header': widgetBase,
      '--color-widget-content': widgetBase,
      '--color-widget-inset': getWidgetInsetColor(widgetIntensity),
      '--color-widget-inset-border': getWidgetInsetBorderColor(backgroundIntensity),
      '--color-widget-hover': widgetHoverColor,
      '--color-foreground-default': `0 0% ${98 * foregroundOpacity}%`,
      '--color-foreground-muted': getInterpolatedValue(
        {
          oled: `0 0% ${40 * foregroundOpacity}%`,
          default: `0 0% ${64 * foregroundOpacity}%`,
          backlit: `0 0% ${60 * foregroundOpacity}%`
        },
        backgroundIntensity
      ),
      '--color-foreground-subtle': getInterpolatedValue(
        {
          oled: `0 0% ${30 * foregroundOpacity}%`,
          default: `0 0% ${50 * foregroundOpacity}%`,
          backlit: `0 0% ${50 * foregroundOpacity}%`
        },
        backgroundIntensity
      ),
      '--color-border-default': borderBase,
      '--color-border-muted': borderMuted,
      '--card': cardBase,
      '--card-foreground': '0 0% 98%',
      '--popover': widgetBase,
      '--popover-foreground': '0 0% 98%',
      '--primary': '0 0% 98%',
      '--primary-foreground': getPrimaryForegroundColor(backgroundIntensity),
      '--secondary': widgetBase,
      '--secondary-foreground': '0 0% 98%',
      '--muted': widgetBase,
      '--muted-foreground': getInterpolatedValue(
        {
          oled: `0 0% ${40 * foregroundOpacity}%`,
          default: `0 0% ${64 * foregroundOpacity}%`,
          backlit: `0 0% ${60 * foregroundOpacity}%`
        },
        backgroundIntensity
      ),
      '--accent': accentBase,
      '--accent-foreground': '0 0% 98%',
      '--destructive': '0 63% 31%',
      '--destructive-foreground': '0 0% 98%',
      '--border': borderBase,
      '--input': borderBase,
      '--ring': '0 0% 83%',
    }
  };
}

function getLightThemeValues(
  backgroundIntensity: number, 
  widgetIntensity: number, 
  borderIntensity: number,
  foregroundOpacity: number
): ThemeColors {
  // Get background colors based on background intensity
  const bgBase = getInterpolatedValue(
    {
      oled: '210 40% 98%', // Cooler temperature
      default: '0 0% 100%',
      backlit: '45 30% 98%' // FLUX-like warm glow
    },
    backgroundIntensity
  );

  // Get widget colors based on widget intensity
  const widgetBase = getInterpolatedValue(
    {
      oled: '210 40% 96%', // Cooler temperature
      default: '0 0% 97%',
      backlit: '45 30% 96%' // FLUX-like warm glow
    },
    widgetIntensity
  );

  // Get card colors based on intensity
  const cardBase = getInterpolatedValue(
    {
      oled: '210 40% 97%',
      default: '0 0% 98%',
      backlit: '45 30% 97%'
    },
    widgetIntensity
  );

  // Get border colors based on border intensity and background state
  const getBorderColor = (intensity: number, opacity: number = 1): string => {
    // If we're in backlit mode, adjust the border colors to be darker
    if (widgetIntensity >= 1) {
      return getInterpolatedValue(
        {
          oled: '210 40% 85%',
          default: '0 0% 80%',
          backlit: '45 30% 88%' // Made warmer but more subtle
        },
        intensity,
        opacity
      );
    }
    return getInterpolatedValue(
      {
        oled: '210 40% 92%',
        default: '0 0% 90%',
        backlit: '45 30% 92%' // Made warmer but more subtle
      },
      intensity,
      opacity
    );
  };

  const borderBase = getBorderColor(borderIntensity);
  const borderMuted = getBorderColor(borderIntensity, 0.5);

  // Get foreground colors based on intensity and apply opacity
  const getForegroundColor = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: `210 40% ${20 * foregroundOpacity}%`,
        default: `222.2 84% ${4.9 * foregroundOpacity}%`,
        backlit: `45 30% ${20 * foregroundOpacity}%`
      },
      intensity
    );
  };

  const getMutedForegroundColor = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: `210 40% ${40 * foregroundOpacity}%`,
        default: `215.4 16.3% ${46.9 * foregroundOpacity}%`,
        backlit: `45 30% ${40 * foregroundOpacity}%`
      },
      intensity
    );
  };

  // Apply foreground opacity also to secondary text
  const getSubtleForegroundColor = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: `210 40% ${30 * foregroundOpacity}%`,
        default: `215.4 16.3% ${35 * foregroundOpacity}%`,
        backlit: `45 30% ${30 * foregroundOpacity}%`
      },
      intensity
    );
  };

  // Get button background color based on intensity
  const getButtonBgColor = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: '210 40% 96%',
        default: '0 0% 96%',
        backlit: '45 30% 96%'
      },
      intensity
    );
  };

  // Get search background color based on intensity
  const getSearchBgColor = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: '210 40% 98%',
        default: '0 0% 98%',
        backlit: '45 30% 98%'
      },
      intensity
    );
  };

  // Get widget inset color based on intensity
  const getWidgetInsetColor = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: '210 40% 94%',
        default: '0 0% 92%',
        backlit: '45 30% 94%'
      },
      intensity
    );
  };

  // Get widget inset border color based on intensity for light theme
  const getWidgetInsetBorderColorLight = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: '210 40% 90%',
        default: '0 0% 88%',
        backlit: '45 30% 90%'
      },
      intensity
    );
  };

  // Get widget hover color based on widget intensity
  const getWidgetHoverColor = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: '210 40% 94%', // Cooler hover for cool theme
        default: '0 0% 94%',  // Neutral hover for default
        backlit: '45 30% 94%' // Warmer hover for warm theme
      },
      intensity
    );
  };

  const foregroundColor = getForegroundColor(backgroundIntensity);
  const mutedForegroundColor = getMutedForegroundColor(backgroundIntensity);
  const buttonBgColor = getButtonBgColor(backgroundIntensity);
  const searchBgColor = getSearchBgColor(backgroundIntensity);
  
  // Use consistent theme for hover effect
  const widgetHoverColor = getWidgetHoverColor(widgetIntensity);

  // Get primary foreground color based on background intensity for light theme
  const getPrimaryForegroundColorLight = (intensity: number): string => {
    return getInterpolatedValue(
      {
        oled: '210 40% 98%',      // Coolest for OLED
        default: '0 0% 100%',     // Pure white for default
        backlit: '45 30% 98%'     // Warmest for backlit
      },
      intensity
    );
  };

  return {
    background: `bg-[${bgBase}]`,
    text: `text-[${foregroundColor}]`,
    textMuted: `text-[${mutedForegroundColor}]`,
    hover: `hover:text-[${foregroundColor}]/80`,
    buttonBg: `bg-[${buttonBgColor}]`,
    searchBg: `bg-[${searchBgColor}]`,
    searchPlaceholder: `placeholder:text-[${mutedForegroundColor}]`,
    searchBorder: 'border-border',
    kbdBg: `bg-[${buttonBgColor}]`,
    intensity: backgroundIntensity,
    cssVariables: {
      '--color-bg-base': bgBase,
      '--color-bg-subtle': widgetBase,
      '--color-bg-surface': widgetBase,
      '--color-bg-inset': widgetBase,
      '--color-bg-elevated': widgetBase,
      '--color-widget-bg': widgetBase,
      '--color-widget-header': widgetBase,
      '--color-widget-content': widgetBase,
      '--color-widget-inset': getWidgetInsetColor(widgetIntensity),
      '--color-widget-inset-border': getWidgetInsetBorderColorLight(backgroundIntensity),
      '--color-widget-hover': widgetHoverColor,
      '--color-foreground-default': foregroundColor,
      '--color-foreground-muted': mutedForegroundColor,
      '--color-foreground-subtle': getSubtleForegroundColor(backgroundIntensity),
      '--color-border-default': borderBase,
      '--color-border-muted': borderMuted,
      '--card': cardBase,
      '--card-foreground': foregroundColor,
      '--popover': widgetBase,
      '--popover-foreground': foregroundColor,
      '--primary': foregroundColor,
      '--primary-foreground': getPrimaryForegroundColorLight(backgroundIntensity),
      '--secondary': widgetBase,
      '--secondary-foreground': foregroundColor,
      '--muted': widgetBase,
      '--muted-foreground': mutedForegroundColor,
      '--accent': widgetBase,
      '--accent-foreground': foregroundColor,
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': borderBase,
      '--input': borderBase,
      '--ring': foregroundColor,
    }
  };
}