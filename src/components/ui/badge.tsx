import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Modified badge variant to better handle hover effects
const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        // Color variants that match TransactionsWidget
        withdrawalType: 
          'text-orange-700 dark:text-orange-400 bg-orange-500/20 border-orange-500/30 hover:bg-orange-500 hover:text-background dark:hover:text-background',
        depositType: 
          'text-green-700 dark:text-green-400 bg-green-500/20 border-green-500/30 hover:bg-green-500 hover:text-background dark:hover:text-background',
        tradeType: 
          'text-blue-700 dark:text-blue-400 bg-blue-500/20 border-blue-500/30 hover:bg-blue-500 hover:text-background dark:hover:text-background',
        stakingType: 
          'text-purple-700 dark:text-purple-400 bg-purple-500/20 border-purple-500/30 hover:bg-purple-500 hover:text-background dark:hover:text-background',
        failedStatus: 
          'text-destructive dark:text-red-400 bg-destructive/20 border-destructive/30 hover:bg-destructive dark:hover:bg-red-400 hover:text-background dark:hover:text-background',
        pendingStatus: 
          'text-yellow-700 dark:text-yellow-400 bg-yellow-500/20 border-yellow-500/30 hover:bg-yellow-500 hover:text-background dark:hover:text-background',
        completedStatus: 
          'text-green-700 dark:text-green-400 bg-green-500/20 border-green-500/30 hover:bg-green-500 hover:text-background dark:hover:text-background',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// CSS styles for active badges - shows hover effect permanently
const getActiveStyles = (variant: string | null): string => {
  switch (variant) {
    case 'withdrawalType':
      return 'bg-orange-500 text-background dark:text-background';
    case 'depositType':
      return 'bg-green-500 text-background dark:text-background';
    case 'tradeType':
      return 'bg-blue-500 text-background dark:text-background';
    case 'stakingType':
      return 'bg-purple-500 text-background dark:text-background';
    case 'failedStatus':
      return 'bg-destructive dark:bg-red-400 text-background dark:text-background';
    case 'pendingStatus':
      return 'bg-yellow-500 text-background dark:text-background';
    case 'completedStatus':
      return 'bg-green-500 text-background dark:text-background';
    default:
      return '';
  }
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div 
      className={cn(badgeVariants({ variant }), className)}
      {...props} 
    />
  );
}

export interface SortableBadgeProps extends BadgeProps {
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

function SortableBadge({ className, variant, active, onClick, ...props }: SortableBadgeProps) {
  return (
    <div 
      className={cn(
        badgeVariants({ variant }), 
        active && variant ? getActiveStyles(variant) : '',
        'cursor-pointer',
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      {...props} 
    />
  );
}

export { Badge, SortableBadge, badgeVariants };
