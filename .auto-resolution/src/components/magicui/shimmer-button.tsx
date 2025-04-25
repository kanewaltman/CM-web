import React, { CSSProperties, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export interface ShimmerButtonProps extends ComponentPropsWithoutRef<"button"> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<
  HTMLButtonElement,
  ShimmerButtonProps
>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "rgba(0, 0, 0, 1)",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        style={
          {
            "--spread": "45deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 flex !cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)]",
          "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
          className,
        )}
        ref={ref}
        {...props}
      >
        {/* spark container */}
        <div
          className={cn(
            "-z-30 blur-[2px]",
            "absolute inset-0 overflow-visible [container-type:size]",
          )}
        >
          {/* spark */}
          <div className="absolute inset-0 [border-radius:0] [mask:none]">
            {/* spark before - Updated conic-gradient for fading effect */}
            <div className="absolute -inset-full w-auto rotate-0 animate-spin-around [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,transparent_calc(var(--spread)*0.1),var(--shimmer-color)_calc(var(--spread)*0.5),transparent_calc(var(--spread)*0.9),transparent_var(--spread))] [translate:0_0] transition-[background]" />
          </div>
        </div>
        {children}

        {/* Highlight - Added !cursor-pointer */}
        <div
          className={cn(
            "insert-0 absolute size-full z-10",
            "!cursor-pointer",

            // Base shadow adjusted for light/dark themes
            "text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff43] dark:shadow-[inset_0_-8px_10px_#ffffff16]",
            "[border-radius:var(--radius)]",

            // transition
            "transform-gpu transition-all duration-300 ease-in-out",

            // on hover - adjusted for light/dark themes
            "group-hover:shadow-[inset_0_-6px_10px_#ffffff74] dark:group-hover:shadow-[inset_0_-6px_10px_#ffffff22]",

            // on click - adjusted for light/dark themes
            "group-active:shadow-[inset_0_-10px_10px_#ffffff4d] dark:group-active:shadow-[inset_0_-10px_10px_#ffffff33]",
          )}
        />

        {/* backdrop - Removed pointer-events-none */}
        <div
          className={cn(
            "absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]",
          )}
        />
      </button>
    );
  },
);

ShimmerButton.displayName = "ShimmerButton";
