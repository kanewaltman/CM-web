import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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