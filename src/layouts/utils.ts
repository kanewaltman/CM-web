// Helper functions for layout management
import { WidgetConfig } from '@/types/widgets';

/**
 * Utility function to create a layout widget with appropriate size constraints
 */
export function createLayoutWidget(
  widgetType: string, 
  widgetRegistry: Record<string, WidgetConfig>,
  position: { x: number, y: number },
  desiredSize: { w: number, h: number }
) {
  const config = widgetRegistry[widgetType];
  if (!config) {
    console.warn('Missing widget configuration for:', widgetType);
    return null;
  }

  // Enforce min/max constraints
  const width = Math.min(
    Math.max(desiredSize.w, config.minSize.w),
    config.maxSize.w
  );
  
  const height = Math.min(
    Math.max(desiredSize.h, config.minSize.h), 
    config.maxSize.h
  );

  return {
    x: position.x,
    y: position.y,
    w: width,
    h: height,
    id: config.id,
    minW: config.minSize.w,
    minH: config.minSize.h
  };
} 