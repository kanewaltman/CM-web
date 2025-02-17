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
    grid.removeAll();
    scaledLayout.forEach(widget => grid.addWidget(widget));
  } finally {
    grid.commit();
  }

  // Phase 2: Restore original sizes after a brief delay
  setTimeout(() => {
    grid.batchUpdate();
    try {
      layout.forEach(widget => {
        const el = grid.engine.nodes.find((n: GridStackNode) => n.id === widget.id);
        if (el?.el && widget.w !== undefined && widget.h !== undefined) {
          grid.update(el.el, { w: widget.w, h: widget.h });
        }
      });
    } finally {
      grid.commit();
    }
  }, 50); // Small delay to allow initial layout to settle
} 