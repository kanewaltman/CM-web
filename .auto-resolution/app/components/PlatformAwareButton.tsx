'use client';

import { isTauri, isWeb } from '../utils/platform';

interface PlatformAwareButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function PlatformAwareButton({ onClick, children, className = '' }: PlatformAwareButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-2 transition-colors ${
        isTauri
          ? 'bg-purple-600 hover:bg-purple-700 text-white' // Tauri-specific styling
          : 'bg-blue-600 hover:bg-blue-700 text-white'     // Web-specific styling
      } ${className}`}
    >
      {isTauri ? '🖥️ ' : '🌐 '}
      {children}
      {isWeb && ' (Web Only Feature)'}
    </button>
  );
} 