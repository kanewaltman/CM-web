import React, { useState, useEffect, useRef } from 'react';

interface NumberCountUpProps {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const NumberCountUp: React.FC<NumberCountUpProps> = ({
  value,
  decimals = 2,
  duration = 1000,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);

  // Update display value on prop change
  useEffect(() => {
    // Skip animation for initial render or very small changes
    if (Math.abs(value - previousValue.current) < 0.001) {
      setDisplayValue(value);
      previousValue.current = value;
      return;
    }

    // Clean up any existing animation
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
    }

    // Set the start reference value
    const startValue = previousValue.current;
    const valueToAnimate = value;
    startTime.current = null;

    // Animation function
    const animateNumber = (timestamp: number) => {
      if (startTime.current === null) {
        startTime.current = timestamp;
      }

      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      // Calculate current display value
      const currentValue = startValue + (valueToAnimate - startValue) * easedProgress;
      
      // Update state
      setDisplayValue(currentValue);

      // Continue animation if not complete
      if (progress < 1) {
        animationFrameId.current = requestAnimationFrame(animateNumber);
      } else {
        // Ensure final value is exactly the target value
        setDisplayValue(valueToAnimate);
        previousValue.current = valueToAnimate;
        animationFrameId.current = null;
      }
    };

    // Start animation
    animationFrameId.current = requestAnimationFrame(animateNumber);

    // Cleanup on unmount or value change
    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [value, duration]);

  // Format the display value
  const formattedValue = () => {
    const stringValue = displayValue.toFixed(decimals);
    return `${prefix}${stringValue}${suffix}`;
  };

  return (
    <span className={className}>
      {formattedValue()}
    </span>
  );
}; 