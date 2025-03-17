import React, { useMemo } from 'react';
import { PerformanceChart } from './charts/PerformanceChart';

type KeyedPerformanceChartProps = {
  dateRange?: {
    from: Date;
    to: Date;
  };
  viewMode?: 'split' | 'stacked' | 'line' | 'cumulative';
  onViewModeChange?: (mode: 'split' | 'stacked' | 'line' | 'cumulative') => void;
};

/**
 * KeyedPerformanceChart component
 * 
 * Wraps the PerformanceChart with a unique key generation mechanism
 * to ensure the component re-renders when the date range changes.
 */
export function KeyedPerformanceChart({ dateRange, viewMode, onViewModeChange }: KeyedPerformanceChartProps) {
  // Generate a unique chart key that changes when the date range changes
  const chartKey = useMemo(() => {
    // Include timestamp to guarantee uniqueness on every render
    const timestamp = Date.now();
    
    if (!dateRange?.from || !dateRange?.to) {
      return `chart-default-${timestamp}`;
    }
    
    // Create a key based on date range timestamps
    return `chart-${dateRange.from.getTime()}-${dateRange.to.getTime()}-${timestamp}`;
  }, [dateRange]);
  
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
    key: chartKey,
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
      key={chartKey}
      viewMode={mappedViewMode}
      onViewModeChange={handleViewModeChange}
      dateRange={dateRangeProp}
    />
  );
} 