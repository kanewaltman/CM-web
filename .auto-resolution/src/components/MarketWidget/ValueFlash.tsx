import React, { useRef, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface ValueFlashProps {
  value: number | string;
  formatter?: (value: number) => string;
  className?: string;
  children?: React.ReactNode;
}

// Component to show animated flash effect when values change
const ValueFlash = React.memo<ValueFlashProps>(({ 
  value, 
  formatter, 
  className, 
  children 
}) => {
  const prevValueRef = useRef<number | string>(value);
  const [isFlashing, setIsFlashing] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  
  useEffect(() => {
    const prevValue = prevValueRef.current;
    
    // Use a small epsilon value for floating point comparison
    const hasChanged = typeof value === 'number' && typeof prevValue === 'number'
      ? Math.abs((value - prevValue) / (Math.abs(prevValue) || 1)) > 0.0000001 
      : value !== prevValue;
    
    if (hasChanged) {
      prevValueRef.current = value;
      setIsFlashing(false);
      
      requestAnimationFrame(() => {
        setIsFlashing(true);
        
        const timer = setTimeout(() => {
          setIsFlashing(false);
        }, 800);
        
        return () => clearTimeout(timer);
      });
    }
  }, [value]);
  
  // Format the value if a formatter is provided and value is a number
  const displayValue = typeof formatter === 'function' && typeof value === 'number' 
    ? formatter(value) 
    : value;
  
  return (
    <span 
      className={cn(
        className,
        isFlashing && (isDarkTheme 
          ? "animate-value-flash-dark" 
          : "animate-value-flash-light")
      )}
    >
      {children || displayValue}
    </span>
  );
});

ValueFlash.displayName = 'ValueFlash';

export default ValueFlash; 