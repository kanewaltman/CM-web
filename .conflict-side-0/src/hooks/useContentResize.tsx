import { useState, useRef, useCallback, useEffect } from 'react';

interface UseContentResizeProps {
  minWidth?: number;
  maxWidth?: number;
}

export function useContentResize({ minWidth = 1940, maxWidth = 3840 }: UseContentResizeProps = {}) {
  const [contentWidth, setContentWidth] = useState<number>(() => {
    // Get saved width from localStorage or use default (1940px)
    const savedWidth = localStorage.getItem('cm-content-width');
    const width = savedWidth ? parseInt(savedWidth, 10) : minWidth;
    // Ensure width is at least the minimum width
    return Math.max(minWidth, width);
  });
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeSide, setResizeSide] = useState<'left' | 'right' | null>(null);
  const [startX, setStartX] = useState<number>(0);
  const [startWidth, setStartWidth] = useState<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [scrollY, setScrollY] = useState(0);
  const [contentRect, setContentRect] = useState<DOMRect | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const leftHandleRef = useRef<HTMLDivElement>(null);
  const rightHandleRef = useRef<HTMLDivElement>(null);

  // Track element position
  const updateElementPosition = useCallback(() => {
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      setContentRect(rect);
      
      // Directly update handle positions for immediate response
      if (leftHandleRef.current) {
        leftHandleRef.current.style.left = `${rect.left}px`;
      }
      if (rightHandleRef.current) {
        rightHandleRef.current.style.left = `${rect.right - 12}px`;
      }
    }
  }, []);

  // Set up ResizeObserver to track content element position
  useEffect(() => {
    if (!resizeObserverRef.current && contentRef.current) {
      resizeObserverRef.current = new ResizeObserver(updateElementPosition);
      resizeObserverRef.current.observe(contentRef.current);
    }
    
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [updateElementPosition]);

  // Track scroll and resize events
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      updateElementPosition();
    };
    
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      updateElementPosition();
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    // Initial position update
    updateElementPosition();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [updateElementPosition]);

  const handleResizeStart = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    // Only allow resizing if viewport width is greater than minWidth
    if (contentRef.current && viewportWidth > minWidth) {
      // Add active class directly to the clicked resize handle for immediate feedback
      if (e.currentTarget) {
        (e.currentTarget as HTMLElement).classList.add('active');
      }
      
      setIsResizing(true);
      setResizeSide(side);
      setStartX(e.clientX);
      setStartWidth(contentWidth);
      
      // Add resizing class to body for visual feedback
      document.body.classList.add('resizing');
    }
  }, [contentWidth, viewportWidth, minWidth]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const delta = e.clientX - startX;
    let newWidth = startWidth;
    
    // Both sides should adjust the width equally to maintain centering
    if (resizeSide === 'right') {
      newWidth = startWidth + delta * 2;
    } else if (resizeSide === 'left') {
      newWidth = startWidth - delta * 2;
    }
    
    // Constrain width between minimum and maximum values
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    setContentWidth(newWidth);
    
    // Trigger an immediate position update
    requestAnimationFrame(updateElementPosition);
  }, [isResizing, resizeSide, startX, startWidth, minWidth, maxWidth, updateElementPosition]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeSide(null);
    
    // Save the new width to localStorage using the current state value
    localStorage.setItem('cm-content-width', String(contentWidth));
    
    // Remove resizing class
    document.body.classList.remove('resizing');
    
    // Remove active class from any active resize handles
    document.querySelectorAll('.resize-handle.active').forEach((handle) => {
      handle.classList.remove('active');
    });
    
    // Ensure handle positions are updated
    updateElementPosition();
  }, [contentWidth, updateElementPosition]);

  // Clean up event listeners and attach them when needed
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    } else {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.classList.remove('resizing');
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Update viewport width when window resizes
  useEffect(() => {
    const handleViewportResize = () => {
      setViewportWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleViewportResize);
    return () => {
      window.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  // Render resize handles
  const renderResizeHandles = useCallback(() => {
    if (viewportWidth > minWidth) {
      return (
        <>
          <div 
            ref={leftHandleRef}
            className="resize-handle resize-handle-left" 
            onMouseDown={(e) => handleResizeStart(e, 'left')}
            title="Drag to resize width"
            style={{
              position: 'fixed',
              top: 0,
              height: '100vh',
              left: contentRect ? `${contentRect.left}px` : '0px',
              zIndex: 10
            }}
          />
          <div 
            ref={rightHandleRef}
            className="resize-handle resize-handle-right" 
            onMouseDown={(e) => handleResizeStart(e, 'right')}
            title="Drag to resize width"
            style={{
              position: 'fixed',
              top: 0,
              height: '100vh',
              left: contentRect ? `${contentRect.right - 12}px` : '0px',
              zIndex: 10
            }}
          />
        </>
      );
    }
    return null;
  }, [viewportWidth, minWidth, handleResizeStart, contentRect]);

  return {
    contentRef,
    contentWidth,
    viewportWidth,
    isResizing,
    renderResizeHandles
  };
} 