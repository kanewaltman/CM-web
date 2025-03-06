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
};

export function getThemeValues(theme: string | undefined): ThemeColors {
  // If theme is undefined, null, empty string, or 'system', 
  // we need to check if the document has the 'dark' class
  if (!theme || theme === 'system') {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // If dark mode is detected through the class, use dark theme values
      if (document.documentElement.classList.contains('dark')) {
        return {
          background: 'bg-[#0A0A0A]',
          text: 'text-white',
          textMuted: 'text-white/50',
          hover: 'hover:text-white/80',
          buttonBg: 'bg-white/10',
          searchBg: 'bg-[#0F0F0F]',
          searchPlaceholder: 'placeholder:text-white/50',
          searchBorder: 'border-transparent',
          kbdBg: 'bg-white/10',
        };
      }
    }
    // Default to light theme if we can't detect or aren't in browser
    return {
      background: 'bg-[#F7F7F7]',
      text: 'text-gray-800',
      textMuted: 'text-gray-600',
      hover: 'hover:text-gray-900',
      buttonBg: 'bg-gray-100',
      searchBg: 'bg-gray-50',
      searchPlaceholder: 'placeholder:text-gray-500',
      searchBorder: 'border-gray-200',
      kbdBg: 'bg-gray-100',
    };
  }

  // If theme is explicitly set
  return theme === 'light' ? {
    background: 'bg-[#F7F7F7]',
    text: 'text-gray-800',
    textMuted: 'text-gray-600',
    hover: 'hover:text-gray-900',
    buttonBg: 'bg-gray-100',
    searchBg: 'bg-gray-50',
    searchPlaceholder: 'placeholder:text-gray-500',
    searchBorder: 'border-gray-200',
    kbdBg: 'bg-gray-100',
  } : {
    background: 'bg-[#0A0A0A]',
    text: 'text-white',
    textMuted: 'text-white/50',
    hover: 'hover:text-white/80',
    buttonBg: 'bg-white/10',
    searchBg: 'bg-[#0F0F0F]',
    searchPlaceholder: 'placeholder:text-white/50',
    searchBorder: 'border-transparent',
    kbdBg: 'bg-white/10',
  };
}