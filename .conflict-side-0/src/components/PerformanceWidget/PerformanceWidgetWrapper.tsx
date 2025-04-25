import React, { useCallback, useState, useRef, useMemo } from 'react';
import { useWidgetState } from '../../contexts/WidgetStateContext';
import { useWidgetStateRegistry } from '../../contexts/WidgetStateRegistryContext';

const DASHBOARD_LAYOUT_KEY = 'dashboard_layout';

const PerformanceWidgetWrapper: React.FC = () => {
  const widgetId = 'performance-widget-wrapper';
  const widgetState = useWidgetState(widgetId);
  const widgetStateRegistry = useWidgetStateRegistry();
  const [forceUpdate, setForceUpdate] = useState(0);
  const operationCount = useRef(0);
  const lastUpdateTime = useRef(0);
  const lastSaveTime = useRef(0);

  const handleDateRangeChange = useCallback((newDateRange: { from: Date; to: Date } | undefined) => {
    if (!newDateRange?.from || !newDateRange?.to) return;
    
    // Implement debouncing to reduce frequency of updates
    const now = Date.now();
    if (now - lastUpdateTime.current < 200) {
      return; // Debounce updates to max once per 200ms
    }
    lastUpdateTime.current = now;
    
    // Create deep copies to avoid reference issues
    const newDateRangeCopy = {
      from: new Date(newDateRange.from),
      to: new Date(newDateRange.to)
    };
    
    // Only log in development and occasionally
    operationCount.current += 1;
    if (process.env.NODE_ENV === 'development' && operationCount.current % 1000 === 0) {
      console.log('PerformanceWidgetWrapper: Date range changed to:', {
        widgetId,
        count: operationCount.current
      });
    }
    
    // Update the widget state directly to ensure both header and content receive changes
    widgetState.setDateRange(newDateRangeCopy);
    
    // Update widget registry state - critical for shared state between header and content
    widgetStateRegistry.set(widgetId, widgetState);
    
    // Force update to ensure re-render
    setForceUpdate(prev => prev + 1);
    
    // Save to layout with throttling (only save once per second max)
    if (now - lastSaveTime.current > 1000) {
      lastSaveTime.current = now;
      saveToLayout(newDateRangeCopy);
    }
  }, [widgetId, widgetState, widgetStateRegistry]);

  // Separate layout saving to its own function to reduce complexity
  const saveToLayout = useCallback((dateRange: { from: Date; to: Date }) => {
    try {
      const layout = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
      if (layout) {
        const layoutData = JSON.parse(layout);
        layoutData.widgets = layoutData.widgets || {};
        layoutData.widgets[widgetId] = layoutData.widgets[widgetId] || {};
        layoutData.widgets[widgetId].dateRange = {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        };
        localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layoutData));
      }
    } catch (error) {
      console.error('Failed to save date range to layout:', error);
    }
  }, [widgetId]);

  // Memoize the component's rendered output
  return useMemo(() => (
    <div>
      {/* Render your widget components here */}
    </div>
  ), [forceUpdate]); // Only re-render when forceUpdate changes
};

export default PerformanceWidgetWrapper; 