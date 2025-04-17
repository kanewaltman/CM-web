import React from 'react';
import { cn } from '../lib/utils';

export function Footer() {
  return (
    <div className={cn(
      "w-full h-[350px]",
      "bg-[hsl(var(--card))]",
      "border-t border-border",
      "shadow-[0_-2px_10px_rgba(0,0,0,0.05)]",
      "flex items-center justify-center"
    )}>
      {/* Footer content will go here */}
    </div>
  );
} 