import React, { useMemo, useState } from 'react';
import { PerformanceChart } from './charts/PerformanceChart';

interface KeyedPerformanceChartProps {
  viewMode?: 'split' | 'cumulative';
  onViewModeChange?: (mode: 'split' | 'cumulative') => void;
  dateRange?: { from: Date; to: Date };
  autoScale?: boolean;
  onAutoScaleChange?: (autoScale: boolean) => void;
  percentageMode?: boolean;
  onPercentageModeChange?: (percentageMode: boolean) => void;
}

/**
 * KeyedPerformanceChart component
 * 
 * Wraps the PerformanceChart with a key generation mechanism
 * to ensure the component re-renders when the date range changes,
 * but still allows for proper animations.
 */
export function KeyedPerformanceChart({
  viewMode = 'split',
  onViewModeChange,
  dateRange,
  autoScale = true,
  onAutoScaleChange,
  percentageMode = false,
  onPercentageModeChange
}: KeyedPerformanceChartProps) {
  // Add local state for the new options if they're not controlled
  const [localAutoScale, setLocalAutoScale] = useState(autoScale);
  const [localPercentageMode, setLocalPercentageMode] = useState(percentageMode);

  // Handle changes for the charts
  const handleAutoScaleChange = (newValue: boolean) => {
    if (onAutoScaleChange) {
      onAutoScaleChange(newValue);
    } else {
      setLocalAutoScale(newValue);
    }
  };

  const handlePercentageModeChange = (newValue: boolean) => {
    if (onPercentageModeChange) {
      onPercentageModeChange(newValue);
    } else {
      setLocalPercentageMode(newValue);
    }
  };

  // Generate a unique key based on the date range
  const getChartKey = () => {
    if (!dateRange?.from || !dateRange?.to) return 'no-date-range';
    return `chart-${dateRange.from.getTime()}-${dateRange.to.getTime()}`;
  };

  // Create a fresh copy of the date range to break reference equality
  const dateRangeProp = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return undefined;
    
    return {
      from: new Date(dateRange.from),
      to: new Date(dateRange.to)
    };
  }, [dateRange]);
  
  // Convert the viewMode for the PerformanceChart
  // 'cumulative' needs to be mapped correctly for the chart
  const mappedViewMode = useMemo(() => {
    // The PerformanceChart expects 'split' or 'cumulative'
    if (viewMode === 'split' || viewMode === 'cumulative') {
      return viewMode;
    }
    // Default to 'split' for any other mode
    return 'split';
  }, [viewMode]);
  
  // Log the current render for debugging
  console.log('KeyedPerformanceChart rendering with:', {
    key: getChartKey(),
    originalViewMode: viewMode,
    mappedViewMode,
    dateRange: dateRangeProp ? {
      from: dateRangeProp.from.toISOString(),
      to: dateRangeProp.to.toISOString()
    } : 'undefined'
  });
  
  // Handle view mode change from the PerformanceChart
  const handleViewModeChange = (mode: 'split' | 'cumulative') => {
    if (onViewModeChange) {
      console.log('KeyedPerformanceChart: view mode changed to', mode);
      onViewModeChange(mode);
    }
  };
  
  return (
    <PerformanceChart
      key={getChartKey()}
      viewMode={mappedViewMode}
      onViewModeChange={handleViewModeChange}
      dateRange={dateRangeProp}
      autoScale={onAutoScaleChange ? autoScale : localAutoScale}
      onAutoScaleChange={handleAutoScaleChange}
      percentageMode={onPercentageModeChange ? percentageMode : localPercentageMode}
      onPercentageModeChange={handlePercentageModeChange}
    />
  );
} 