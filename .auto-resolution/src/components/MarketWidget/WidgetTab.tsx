import React from 'react';
import { cn } from '@/lib/utils';

interface WidgetTabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  active?: boolean;
  children: React.ReactNode;
}

export const WidgetTab: React.FC<WidgetTabProps> = ({
  value,
  active = false,
  className,
  children,
  ...props
}) => {
  return (
    <button
      type="button"
      value={value}
      className={cn(
        "px-3 py-2 text-sm font-medium relative",
        "hover:text-foreground/80",
        "focus:outline-none focus:ring-0",
        active 
          ? "text-foreground border-b-2 border-primary" 
          : "text-muted-foreground",
        className
      )}
      {...props}
    >
      <div className="flex items-center">
        {children}
      </div>
    </button>
  );
}; 