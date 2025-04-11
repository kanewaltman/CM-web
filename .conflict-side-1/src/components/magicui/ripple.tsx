import React, { ComponentPropsWithoutRef, CSSProperties, useRef, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  baseIncrementSize?: number;
}

export const Ripple = React.memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  baseIncrementSize = 70,
  className,
  ...props
}: RippleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    
    // Defer initial measurement until after the first paint
    const animationFrameId = requestAnimationFrame(() => {
      updateDimensions();
    });
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    
    return () => {
      // Cancel the animation frame if the component unmounts before it runs
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);
  
  // Calculate the increment size based on container dimensions
  const getIncrementSize = () => {
    const minDimensionRef = 320; // Minimum reference dimension for scaling start
    const maxFactor = 2.5; // Maximum multiplier for the increment

    // Use the smaller dimension to determine the scaling, ensuring ripples fit well
    const relevantDimension = Math.min(containerDimensions.width, containerDimensions.height);

    if (relevantDimension <= minDimensionRef) return baseIncrementSize;

    // Calculate scale factor based on how much the smaller dimension exceeds the reference
    // Adjusted the divisor to make scaling less aggressive
    const scaleFactor = Math.min(maxFactor, 1 + (relevantDimension - minDimensionRef) / 1000); 
    return baseIncrementSize * scaleFactor;
  };
  
  const incrementSize = getIncrementSize();

  // Only render ripples if container dimensions are valid
  const shouldRenderRipples = containerDimensions.width > 0 && containerDimensions.height > 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 select-none [mask-image:linear-gradient(to_bottom,white,transparent)]",
        className,
      )}
      {...props}
    >
      {shouldRenderRipples && Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * incrementSize;
        const opacity = mainCircleOpacity - i * 0.03;
        const animationDelay = `${i * 0.06}s`;
        const borderStyle = i === numCircles - 1 ? "dashed" : "solid";
        const borderOpacity = 5 + i * 5;

        return (
          <div
            key={i}
            className={`absolute animate-ripple rounded-full border bg-foreground/25 shadow-xl`}
            style={
              {
                "--i": i,
                width: `${size}px`,
                height: `${size}px`,
                opacity,
                animationDelay,
                borderStyle,
                borderWidth: "1px",
                borderColor: `hsl(var(--foreground), ${borderOpacity / 100})`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) scale(1)",
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
});

Ripple.displayName = "Ripple";
