"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import React, { HTMLAttributes, useCallback, useMemo, useEffect, useState, useRef } from "react";

interface WarpBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  themeVariant?: string;
  perspective?: number;
  beamsPerSide?: number;
  beamSize?: number;
  beamDelayMax?: number;
  beamDelayMin?: number;
  beamDuration?: number;
  gridColor?: string;
  onActiveHueChange?: (hue: number) => void;
  hueCycleInterval?: number;
}

const Beam = ({
  width,
  x,
  delay,
  duration,
  gridColor = "var(--border)",
  onHueGenerated,
}: {
  width: string | number;
  x: string | number;
  delay: number;
  duration: number;
  gridColor?: string;
  onHueGenerated?: (hue: number) => void;
}) => {
  const hue = useMemo(() => Math.floor(Math.random() * 360), []);
  const ar = useMemo(() => Math.floor(Math.random() * 10) + 1, []);

  useEffect(() => {
    if (onHueGenerated) {
      onHueGenerated(hue);
    }
  }, [hue, onHueGenerated]);

  return (
    <motion.div
      style={
        {
          "--x": `${x}`,
          "--width": `${width}`,
          "--aspect-ratio": `${ar}`,
          "--background": `linear-gradient(hsl(${hue} 80% 60%), transparent)`,
        } as React.CSSProperties
      }
      className={`absolute left-[var(--x)] top-0 [aspect-ratio:1/var(--aspect-ratio)] [background:var(--background)] [width:var(--width)]`}
      initial={{ y: "100cqmax", x: "-50%", opacity: 0 }}
      animate={{ y: "-100%", x: "-50%", opacity: 1 }}
      transition={{
        y: {
          duration,
          delay,
          repeat: Infinity,
          ease: "linear",
        },
        x: {
          duration,
          delay,
          repeat: Infinity,
          ease: "linear",
        },
        opacity: {
          duration: Math.min(0.5, duration * 0.2),
          delay,
          repeat: Infinity,
          repeatType: "loop",
          repeatDelay: duration - Math.min(0.5, duration * 0.2),
          ease: "easeOut",
        },
      }}
    />
  );
};

export const WarpBackground: React.FC<WarpBackgroundProps> = ({
  children,
  themeVariant,
  perspective = 100,
  className,
  beamsPerSide = 3,
  beamSize = 5,
  beamDelayMax = 3,
  beamDelayMin = 0,
  beamDuration = 3,
  gridColor = "var(--border)",
  onActiveHueChange,
  hueCycleInterval = 1500,
  ...props
}) => {
  const [generatedHues, setGeneratedHues] = useState<number[]>([]);
  const [activeHueIndex, setActiveHueIndex] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleHueGenerated = useCallback((hue: number) => {
    setGeneratedHues((prevHues) => {
      if (!prevHues.includes(hue)) {
        return [...prevHues, hue];
      }
      return prevHues;
    });
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (generatedHues.length > 0 && onActiveHueChange) {
      onActiveHueChange(generatedHues[activeHueIndex]);

      intervalRef.current = setInterval(() => {
        setActiveHueIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % generatedHues.length;
          if (onActiveHueChange) {
            onActiveHueChange(generatedHues[nextIndex]);
          }
          return nextIndex;
        });
      }, hueCycleInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [generatedHues, activeHueIndex, onActiveHueChange, hueCycleInterval]);

  const getGridColorForVariant = (variant?: string): string => {
    switch (variant) {
      case 'dark-0led': return '#555555';
      case 'dark-default': return '#444444';
      case 'dark-backlit': return '#666666';
      case 'light-cool': return '#D0D0D8';
      case 'light-default': return '#CCCCCC';
      case 'light-warm': return '#D8D8D0';
      default: return '#CCCCCC';
    }
  };

  const gradientColor = getGridColorForVariant(themeVariant);

  const generateBeams = useCallback(() => {
    const beams = [];
    const cellsPerSide = Math.floor(100 / beamSize);
    const step = cellsPerSide / beamsPerSide;

    for (let i = 0; i < beamsPerSide; i++) {
      const x = Math.floor(i * step);
      const delay =
        Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin;
      beams.push({ x, delay });
    }
    return beams;
  }, [beamsPerSide, beamSize, beamDelayMax, beamDelayMin]);

  const topBeams = useMemo(() => generateBeams(), [generateBeams]);
  const rightBeams = useMemo(() => generateBeams(), [generateBeams]);
  const bottomBeams = useMemo(() => generateBeams(), [generateBeams]);
  const leftBeams = useMemo(() => generateBeams(), [generateBeams]);

  return (
    <div className={cn("relative rounded border p-20", className)} {...props}>
      <div
        style={{
          '--perspective': `${perspective}px`,
          '--beam-size': `${beamSize}%`,
        } as React.CSSProperties}
        className={
          "pointer-events-none absolute left-0 top-0 size-full overflow-hidden [clipPath:inset(0)] [container-type:size] [perspective:var(--perspective)] [transform-style:preserve-3d]"
        }
      >
        {/* top side */}
        <div className={`absolute z-20 [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(${gradientColor}_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_${gradientColor}_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [transform-origin:50%_0%] [transform:rotateX(-90deg)] [width:100cqi]`}>
          {topBeams.map((beam, index) => (
            <Beam
              key={`top-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              gridColor={gridColor}
              onHueGenerated={handleHueGenerated}
            />
          ))}
        </div>
        {/* bottom side */}
        <div className={`absolute top-full [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(${gradientColor}_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_${gradientColor}_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [transform-origin:50%_0%] [transform:rotateX(-90deg)] [width:100cqi]`}>
          {bottomBeams.map((beam, index) => (
            <Beam
              key={`bottom-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              gridColor={gridColor}
              onHueGenerated={handleHueGenerated}
            />
          ))}
        </div>
        {/* left side */}
        <div className={`absolute left-0 top-0 [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(${gradientColor}_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_${gradientColor}_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [transform-origin:0%_0%] [transform:rotate(90deg)_rotateX(-90deg)] [width:100cqh]`}>
          {leftBeams.map((beam, index) => (
            <Beam
              key={`left-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              gridColor={gridColor}
              onHueGenerated={handleHueGenerated}
            />
          ))}
        </div>
        {/* right side */}
        <div className={`absolute right-0 top-0 [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(${gradientColor}_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_${gradientColor}_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [width:100cqh] [transform-origin:100%_0%] [transform:rotate(-90deg)_rotateX(-90deg)]`}>
          {rightBeams.map((beam, index) => (
            <Beam
              key={`right-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              gridColor={gridColor}
              onHueGenerated={handleHueGenerated}
            />
          ))}
        </div>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
};
