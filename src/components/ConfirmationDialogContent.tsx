import React, { useState } from 'react';
import { Button } from './ui/button';
import { ChevronLeft } from './ui-icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ConfirmationDialogContentProps {
  title: string;
  children: React.ReactNode;
  onBack: () => void;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  termsText?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    className?: string;
    toast?: {
      type?: 'success' | 'error' | 'info' | 'warning';
      title: string;
      description?: string;
      duration?: number;
    };
    pointsEarned?: {
      amount: number;
      reason?: string;
      multiplier?: number;
    };
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    className?: string;
  };
}

// Define the wiggle keyframes animation CSS
const wiggleAnimation = {
  '0%': { transform: 'translateX(0)' },
  '25%': { transform: 'translateX(-5px)' },
  '50%': { transform: 'translateX(5px)' },
  '75%': { transform: 'translateX(-5px)' },
  '100%': { transform: 'translateX(0)' },
};

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
  termsText = "I agree to the terms and conditions",
  primaryAction,
  secondaryAction
}: ConfirmationDialogContentProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);
  
  // Handler for primary action that shows toast if configured
  const handlePrimaryAction = () => {
    if (primaryAction) {
      // Show toast if toast data is provided
      if (primaryAction.toast) {
        const { type = 'success', title, description, duration = 5000 } = primaryAction.toast;
        
        // Use the appropriate toast type
        switch (type) {
          case 'success':
            toast.success(title, { description, duration });
            break;
          case 'error':
            toast.error(title, { description, duration });
            break;
          case 'warning':
            toast.warning(title, { description, duration });
            break;
          case 'info':
          default:
            toast.info(title, { description, duration });
            break;
        }
      }
      
      // Show points earned toast if provided (with a delay)
      if (primaryAction.pointsEarned && primaryAction.pointsEarned.amount > 0) {
        const pointsData = primaryAction.pointsEarned;
        const finalPoints = pointsData.multiplier 
          ? Math.round(pointsData.amount * pointsData.multiplier) 
          : pointsData.amount;
          
        // Delay the points toast to appear after the confirmation toast
        setTimeout(() => {
          toast(
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div>
                <p className="font-medium text-base">Points Earned!</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-orange-500">+{finalPoints}</p>
                  <p className="text-sm text-muted-foreground">{pointsData.reason || "for your activity"}</p>
                </div>
                {pointsData.multiplier && pointsData.multiplier > 1 && (
                  <div className="mt-1 px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/30 inline-block">
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                      {pointsData.multiplier.toFixed(1)}x Multiplier
                    </span>
                  </div>
                )}
              </div>
            </div>,
            {
              className: "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800/30"
            }
          );
        }, 1000); // Show 1 second after the confirmation toast
      }
      
      // Call the original onClick handler
      primaryAction.onClick();
    }
  };

  const handleButtonClick = () => {
    if (termsAccepted) {
      handlePrimaryAction();
    } else {
      // Trigger wiggle animation
      setIsWiggling(true);
      setTimeout(() => {
        setIsWiggling(false);
      }, 500);
    }
  };

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
        <div className="p-6 border-t">
          {/* Terms and conditions checkbox */}
          {primaryAction && (
            <div 
              className={cn(
                "flex items-start mb-4",
                isWiggling && "animate-wiggle"
              )}
            >
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 border border-gray-300 rounded"
                />
              </div>
              <label htmlFor="terms" className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                {termsText}
              </label>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3">
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
                onClick={handleButtonClick}
                className={cn(
                  primaryAction.className,
                  !termsAccepted && "opacity-50 cursor-not-allowed"
                )}
                aria-disabled={!termsAccepted}
              >
                {primaryAction.label}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 