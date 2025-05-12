import React from 'react';
import { Button } from './ui/button';
import { ChevronLeft } from './ui-icons';
import { cn } from '@/lib/utils';

export interface ConfirmationDialogContentProps {
  title: string;
  children: React.ReactNode;
  onBack: () => void;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    className?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    className?: string;
  };
}

/**
 * A component that renders confirmation content within a dialog
 * with a back button to return to the previous dialog content
 */
export function ConfirmationDialogContent({
  title,
  children,
  onBack,
  className,
  headerClassName,
  contentClassName,
  primaryAction,
  secondaryAction
}: ConfirmationDialogContentProps) {
  return (
    <div className={cn("flex flex-col h-full w-full", className)}>
      {/* Header with back button */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3 border-b",
        headerClassName
      )}>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
      </div>
      
      {/* Content area */}
      <div className={cn(
        "flex-1 overflow-auto p-4",
        contentClassName
      )}>
        {children}
      </div>
      
      {/* Actions footer */}
      {(primaryAction || secondaryAction) && (
        <div className="p-4 border-t flex items-center justify-end space-x-3">
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className={secondaryAction.className}
            >
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              className={primaryAction.className}
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
} 