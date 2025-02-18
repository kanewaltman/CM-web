import { useEffect, useRef } from 'react';
import { GridStack, GridStackNode } from 'gridstack';

const INITIAL_SCALE_FACTOR = 0.8; // Temporarily scale widgets to 80% of their final size

export function loadLayoutSafely(grid: GridStack, layout: GridStackNode[]) {
  // Phase 1: Load with scaled-down sizes
  const scaledLayout = layout.map(widget => ({
    ...widget,
    w: Math.max(1, Math.floor((widget.w ?? 1) * INITIAL_SCALE_FACTOR)),
    h: Math.max(1, Math.floor((widget.h ?? 1) * INITIAL_SCALE_FACTOR))
  }));

  grid.batchUpdate();
  try {
    // Instead of removing all widgets, update their positions
    const items = grid.getGridItems();
    const itemsById = new Map();
    
    // Create a map of current items by their IDs
    items.forEach((item) => {
      if (item.gridstackNode?.id) {
        itemsById.set(item.gridstackNode.id, item);
      }
    });

    // Update positions with scaled sizes
    scaledLayout.forEach(widget => {
      if (widget.id) {
        const item = itemsById.get(widget.id);
        if (item) {
          grid.update(item, {
            x: widget.x,
            y: widget.y,
            w: widget.w,
            h: widget.h,
            autoPosition: false
          });
        }
      }
    });
  } finally {
    grid.commit();
  }

  // Phase 2: Restore original sizes after a brief delay
  setTimeout(() => {
    grid.batchUpdate();
    try {
      const items = grid.getGridItems();
      const itemsById = new Map();
      items.forEach((item) => {
        if (item.gridstackNode?.id) {
          itemsById.set(item.gridstackNode.id, item);
        }
      });

      layout.forEach(widget => {
        if (widget.id) {
          const item = itemsById.get(widget.id);
          if (item && widget.w !== undefined && widget.h !== undefined) {
            grid.update(item, {
              x: widget.x,
              y: widget.y,
              w: widget.w,
              h: widget.h,
              autoPosition: false
            });
          }
        }
      });
    } finally {
      grid.commit();
    }
  }, 50); // Small delay to allow initial layout to settle
}

interface WidgetContainerProps {
  children: React.ReactNode;
}

export function WidgetContainer({ children }: WidgetContainerProps) {
  return (
    <div className="grid-stack-item-content">
      {children}
    </div>
  );
} 