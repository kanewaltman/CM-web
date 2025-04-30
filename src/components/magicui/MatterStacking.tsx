import React, { useRef, useEffect, useState } from 'react';
import Matter, { Engine, Runner, Bodies, Composite, Body, Vector, Mouse, MouseConstraint, Events } from 'matter-js';
import { cn } from "@/lib/utils";

export interface MatterStackingProps extends React.ComponentPropsWithoutRef<"div"> {
  tokens?: string[];
  density?: number;
  restitution?: number; 
  friction?: number;
  interval?: number;
  maxObjects?: number;
  hardLimit?: number;
  onTokenClick?: (token: string) => void;
}

// Interface for our token elements
interface TokenElement {
  body: Matter.Body;
  element: HTMLDivElement;
  token: string;
}

// SVG cache for performance
const svgCache: Record<string, boolean> = {};

export const MatterStacking: React.FC<MatterStackingProps> = ({
  tokens = ['XCM', 'LILAI', 'FLUX', 'KDA', 'THT', 'VSP', 'ADA', 'DOT', 'KSM', 'LTO', 'MATIC', 'XTZ', 'ETH'],
  density = 0.001,
  restitution = 0.3,
  friction = 0.1,
  interval = 500,
  maxObjects = 30,
  hardLimit = 100, // Hard maximum to prevent excessive memory use
  onTokenClick,
  className,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);
  const tokenElementsRef = useRef<TokenElement[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const tokensContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const instanceCountRef = useRef(0); // Track component instance for cleanup
  const instanceId = useRef(Date.now().toString(36) + Math.random().toString(36).substr(2)); // Unique ID for this instance

  // Preload SVGs
  useEffect(() => {
    // Only preload once
    if (Object.keys(svgCache).length > 0) return;
    
    tokens.forEach(token => {
      const img = new Image();
      img.onload = () => {
        svgCache[token] = true;
      };
      img.onerror = () => {
        console.warn(`Failed to preload SVG for ${token}`);
        svgCache[token] = false;
      };
      img.src = `/assets/symbols/${token}.svg`;
    });
  }, [tokens]);

  // Clean up the Matter.js instance and token elements
  const cleanup = () => {
    // Cancel animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop the runner
    if (runnerRef.current) {
      Matter.Runner.stop(runnerRef.current);
      runnerRef.current = null;
    }
    
    // Clear the engine
    if (engineRef.current) {
      Matter.Engine.clear(engineRef.current);
      engineRef.current = null;
    }

    // Remove all token elements from the DOM
    if (tokensContainerRef.current) {
      while (tokensContainerRef.current.firstChild) {
        tokensContainerRef.current.removeChild(tokensContainerRef.current.firstChild);
      }
    }
    
    tokenElementsRef.current = [];
    mouseConstraintRef.current = null;
    
    // Log cleanup
    console.log(`Cleaning up MatterStacking instance ${instanceId.current}`);
  };

  // Create a token element with better performance
  const createTokenElement = (
    x: number, 
    y: number, 
    token: string, 
    size: number,
    options: Matter.IBodyDefinition
  ): TokenElement | null => {
    try {
      if (!tokensContainerRef.current) return null;

      // Create a circular body for physics calculation
      const body = Bodies.circle(x, y, size / 2, {
        ...options,
        render: { visible: false } // No need to render in Matter.js
      });

      // Create the DOM element for the token
      const element = document.createElement('div');
      element.className = 'token-element';
      element.style.position = 'absolute';
      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.style.borderRadius = '50%';
      element.style.overflow = 'hidden';
      element.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.2)';
      element.style.zIndex = '10';
      element.style.willChange = 'transform'; // Optimize for animations
      element.style.transform = `translate3d(${x - (size/2)}px, ${y - (size/2)}px, 0) rotate(0rad)`;
      
      // Create img element to hold the SVG - reuse from cache if possible
      const img = document.createElement('img');
      img.alt = token;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.pointerEvents = 'none'; // Prevent separate pointer events on img
      img.draggable = false;
      img.loading = 'lazy'; // Lazy load images
      img.src = `/assets/symbols/${token}.svg`;
      
      // Add click event listener - use event delegation for better performance
      if (onTokenClick) {
        element.dataset.token = token;
        element.style.cursor = 'pointer';
      }
      
      // Append the img to the element
      element.appendChild(img);
      
      // Append the element to the tokens container
      tokensContainerRef.current.appendChild(element);
      
      // Create and return token element
      const tokenElement: TokenElement = {
        body,
        element,
        token
      };
      
      return tokenElement;
    } catch (error) {
      console.error(`Error creating token element for ${token}:`, error);
      return null;
    }
  };

  // Batch update the positions of all token elements
  const updateTokenElements = () => {
    tokenElementsRef.current.forEach(({ body, element }) => {
      const { x, y } = body.position;
      // Use transform instead of top/left for better performance
      element.style.transform = `translate3d(${x - (element.offsetWidth/2)}px, ${y - (element.offsetHeight/2)}px, 0) rotate(${body.angle}rad)`;
    });
  };

  // Initialize Matter.js with improved initialization logic
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Increment the instance counter
    instanceCountRef.current++;
    const myInstanceCount = instanceCountRef.current;
    
    // Store instance ID in DOM for debugging
    if (containerRef.current) {
      containerRef.current.dataset.matterInstanceId = instanceId.current;
    }
    
    console.log(`Initializing MatterStacking instance ${instanceId.current}`);
    
    // Wait for the container to be measured
    const initTimeout = setTimeout(() => {
      try {
        // If another instance has been created since, don't initialize
        if (instanceCountRef.current !== myInstanceCount) {
          console.log(`Aborting initialization of instance ${instanceId.current} due to newer instance`);
          return;
        }
        
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        if (containerWidth === 0 || containerHeight === 0) {
          console.log('Container dimensions not ready, retrying...');
          setTimeout(() => {
            if (containerRef.current) {
              const updatedWidth = containerRef.current.clientWidth;
              const updatedHeight = containerRef.current.clientHeight;
              console.log(`Updated dimensions: ${updatedWidth}x${updatedHeight}`);
            }
          }, 200);
          return;
        }
        
        console.log(`Initializing Matter.js with container dimensions: ${containerWidth}x${containerHeight}`);
        
        // Clean up any existing setup
        cleanup();
        
        // Create tokens container
        if (!tokensContainerRef.current) {
          const tokensContainer = document.createElement('div');
          tokensContainer.className = 'tokens-container';
          tokensContainer.style.position = 'absolute';
          tokensContainer.style.top = '0';
          tokensContainer.style.left = '0';
          tokensContainer.style.width = '100%';
          tokensContainer.style.height = '100%';
          tokensContainer.style.overflow = 'hidden';
          
          // Use event delegation for click events
          if (onTokenClick) {
            tokensContainer.addEventListener('click', (e) => {
              const target = e.target as HTMLElement;
              const tokenElement = target.closest('.token-element') as HTMLElement;
              if (tokenElement && tokenElement.dataset.token) {
                onTokenClick(tokenElement.dataset.token);
              }
            });
          }
          container.appendChild(tokensContainer);
          // Use a mutable ref to store the tokens container
          const mutableRef = tokensContainerRef as React.MutableRefObject<HTMLDivElement | null>;
          mutableRef.current = tokensContainer;
        }
        
        // Create a new engine
        const engine = Engine.create({
          gravity: { x: 0, y: 1, scale: 0.001 }
        });
        engineRef.current = engine;
        
        // Create runner with optimized settings
        const runner = Runner.create({
          isFixed: true, // Use fixed timestep for better performance
          delta: 1000 / 60 // Target 60 FPS
        });
        runnerRef.current = runner;
        
        // Create boundaries
        console.log('Creating boundaries for Matter.js container');
        const wallThickness = 50;
        
        const floor = Bodies.rectangle(
          containerWidth / 2,
          containerHeight + wallThickness / 2,
          containerWidth, 
          wallThickness,
          { 
            isStatic: true,
            render: { visible: false }
          }
        );
        
        const leftWall = Bodies.rectangle(
          -wallThickness / 2,
          containerHeight / 2,
          wallThickness,
          containerHeight * 2,
          { 
            isStatic: true,
            render: { visible: false }
          }
        );
        
        const rightWall = Bodies.rectangle(
          containerWidth + wallThickness / 2,
          containerHeight / 2,
          wallThickness,
          containerHeight * 2,
          { 
            isStatic: true,
            render: { visible: false }
          }
        );
        
        // Add walls and floor to the world
        Composite.add(engine.world, [floor, leftWall, rightWall]);
        
        // Add mouse control
        console.log('Setting up mouse control for Matter.js');
        try {
          const mouse = Mouse.create(container);
          const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
              stiffness: 0.2,
              render: { visible: false }
            }
          });
          mouseConstraintRef.current = mouseConstraint;
          
          // Add the mouse constraint to world
          Composite.add(engine.world, mouseConstraint);
          
          console.log('Mouse control setup successful');
        } catch (error) {
          console.error('Error setting up mouse control:', error);
        }
        
        // Run the engine
        console.log('Starting Matter.js engine');
        Runner.run(runner, engine);
        
        // Set up the animation loop to update token elements using requestAnimationFrame for better performance
        const animate = () => {
          // Batch update all positions in one go
          updateTokenElements();
          
          // Continue the animation loop
          animationFrameRef.current = requestAnimationFrame(animate);
        };
        
        // Start the animation loop
        animationFrameRef.current = requestAnimationFrame(animate);
        
        // Token generation variables
        let counter = 0;
        let currentInterval = interval;
        let tokenIntervalId: NodeJS.Timeout | null = null;
        console.log('Setting up token creation interval');
        
        const createTokens = () => {
          // Safety check
          if (!engineRef.current || !tokensContainerRef.current) {
            if (tokenIntervalId) {
              clearInterval(tokenIntervalId);
              tokenIntervalId = null;
            }
            return;
          }
          
          // Hard limit check to prevent excessive memory usage
          if (tokenElementsRef.current.length >= hardLimit) {
            // If we hit the hard limit, stop creating new elements until some are removed
            console.log(`Reached hard limit of ${hardLimit} tokens, waiting for cleanup...`);
            
            // Remove the oldest elements when at hard limit
            const excessCount = tokenElementsRef.current.length - hardLimit + 5; // Remove 5 extra to make room
            if (excessCount > 0) {
              const elementsToRemove = tokenElementsRef.current.slice(0, excessCount);
              elementsToRemove.forEach(tokenElement => {
                // Remove from Matter.js world
                if (engineRef.current) {
                  Composite.remove(engineRef.current.world, tokenElement.body);
                }
                
                // Remove from DOM
                if (tokenElement.element && tokenElement.element.parentNode) {
                  tokenElement.element.parentNode.removeChild(tokenElement.element);
                }
              });
              
              // Update the array
              tokenElementsRef.current = tokenElementsRef.current.slice(excessCount);
            }
            
            return;
          }
          
          // If we've reached max objects, slow down generation exponentially
          if (counter >= maxObjects) {
            const excess = counter - maxObjects;
            
            // Stop creating new tokens if we're significantly over the limit
            // Allow a few excess tokens for a smooth transition
            if (excess > 10) {
              console.log(`Reached max objects limit (${maxObjects}) plus buffer, stopping token generation`);
              if (tokenIntervalId) {
                clearInterval(tokenIntervalId);
                tokenIntervalId = null;
              }
              return;
            }
            
            // Calculate slowdown factor - exponential increase based on how many excess tokens we have
            const slowdownFactor = Math.pow(1.15, Math.min(20, excess / 5)); // Cap the slowdown
            
            // Apply slowdown to interval (with a reasonable max slowdown)
            const targetInterval = Math.min(interval * 10, interval * slowdownFactor);
            
            // If interval needs significant adjustment, clear and reset the interval
            if (Math.abs(currentInterval - targetInterval) > 100) {
              if (tokenIntervalId) {
                clearInterval(tokenIntervalId);
              }
              currentInterval = targetInterval;
              tokenIntervalId = setInterval(createTokens, currentInterval);
              console.log(`Slowing down token generation, new interval: ${currentInterval.toFixed(0)}ms`);
              return; // Skip this cycle as we're about to start a new interval
            }
          }
          
          // Create a random token element
          try {
            const token = tokens[Math.floor(Math.random() * tokens.length)];
            // Increased size range: 40-160px
            const tokenSize = 40 + Math.random() * 120; 
            
            // Random position at the top, just above the visible area
            const x = Math.random() * (containerWidth - tokenSize * 2) + tokenSize;
            const y = -tokenSize - Math.random() * 100; // Above the container
            
            // Create token element
            const tokenElement = createTokenElement(x, y, token, tokenSize, {
              restitution,
              friction,
              density
            });
            
            if (tokenElement) {
              // Add some initial velocity for more dynamic movement
              Body.setVelocity(tokenElement.body, { 
                x: (Math.random() - 0.5) * 3, 
                y: Math.random() * 2 
              });
              
              // Add some initial angular velocity for spinning
              Body.setAngularVelocity(tokenElement.body, (Math.random() - 0.5) * 0.1);
              
              // Add to the world and track
              Composite.add(engine.world, tokenElement.body);
              tokenElementsRef.current.push(tokenElement);
              counter++;
              
              // Only log every 5 tokens to reduce console spam
              if (counter % 5 === 0 || counter === 1 || counter === maxObjects) {
                console.log(`Created token ${counter}/${maxObjects}${counter > maxObjects ? ' (slowdown active)' : ''}`);
              }
            }
          } catch (error) {
            console.error('Error creating token element:', error);
          }
          
          // Remove token elements that fall below bottom bound
          try {
            if (engineRef.current && tokensContainerRef.current) {
              const elementsToRemove: TokenElement[] = [];
              
              tokenElementsRef.current = tokenElementsRef.current.filter(tokenElement => {
                if (tokenElement.body.position.y > containerHeight + 100) {
                  elementsToRemove.push(tokenElement);
                  return false;
                }
                return true;
              });
              
              // Batch remove elements from world and DOM for better performance
              if (elementsToRemove.length > 0) {
                // Remove bodies from Matter world
                Composite.remove(engineRef.current.world, elementsToRemove.map(te => te.body));
                
                // Remove elements from DOM in a batch
                const fragment = document.createDocumentFragment();
                elementsToRemove.forEach(tokenElement => {
                  if (tokenElement.element && tokenElement.element.parentNode) {
                    tokenElement.element.parentNode.removeChild(tokenElement.element);
                  }
                });
              }
            }
          } catch (error) {
            console.error('Error cleaning up token elements:', error);
          }
        };
        
        // Start the initial token generation
        tokenIntervalId = setInterval(createTokens, interval);
        
        setIsInitialized(true);
        
        // Make sure we clean up the interval when the component unmounts
        return () => {
          if (tokenIntervalId) {
            clearInterval(tokenIntervalId);
            tokenIntervalId = null;
          }
          cleanup();
        };
      } catch (err) {
        console.error('Error initializing Matter.js:', err);
      }
    }, 1000); // Increased timeout to ensure DOM is ready
    
    return () => {
      clearTimeout(initTimeout);
      cleanup();
    };
  }, [tokens, density, restitution, friction, interval, maxObjects, hardLimit, onTokenClick]);

  // Handle window resize with throttling to avoid excessive updates
  useEffect(() => {
    if (!isInitialized) return;
    
    let resizeTimeout: NodeJS.Timeout | null = null;
    
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      // Throttle resize handling
      resizeTimeout = setTimeout(() => {
        if (!containerRef.current || !engineRef.current) return;
        
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        if (containerWidth === 0 || containerHeight === 0) return;
        
        // Update walls position
        if (engineRef.current && engineRef.current.world.bodies.length >= 3) {
          const [floor, leftWall, rightWall] = engineRef.current.world.bodies.slice(0, 3);
          
          // Update floor
          Body.setPosition(floor, Vector.create(
            containerWidth / 2,
            containerHeight + 25
          ));
          Body.setVertices(floor, Bodies.rectangle(
            containerWidth / 2,
            containerHeight + 25,
            containerWidth,
            50
          ).vertices);
          
          // Update right wall
          Body.setPosition(rightWall, Vector.create(
            containerWidth + 25,
            containerHeight / 2
          ));
        }
        
        // Force update token positions
        updateTokenElements();
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, [isInitialized]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden",
        className
      )}
      {...props}
    />
  );
};

MatterStacking.displayName = "MatterStacking"; 