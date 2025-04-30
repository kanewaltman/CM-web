import React, { useMemo, useEffect } from 'react';
import { PerformanceChart } from './charts/PerformanceChart';

type KeyedPerformanceChartProps = {
  dateRange?: {
    from: Date;
    to: Date;
  };
  viewMode?: 'split' | 'stacked' | 'line' | 'cumulative' | 'combined';
  onViewModeChange?: (mode: 'split' | 'stacked' | 'line' | 'cumulative' | 'combined') => void;
};

/**
 * KeyedPerformanceChart component
 * 
 * Wraps the PerformanceChart with a key generation mechanism
 * to ensure the component re-renders when the date range changes,
 * but still allows for proper animations.
 */
export function KeyedPerformanceChart({ dateRange, viewMode, onViewModeChange }: KeyedPerformanceChartProps) {
  // Generate a unique chart key that changes ONLY when the date range changes
  const chartKey = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return 'chart-default';
    }
    
    // Force a new key on each date range change to ensure complete re-rendering
    const key = `chart-${dateRange.from.getTime()}-${dateRange.to.getTime()}-${Math.random().toString(36).substring(2, 9)}`;
    return key;
  }, [dateRange]); // Simplified dependency array
  
  // Create a fresh copy of the date range to break reference equality
  const dateRangeProp = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return undefined;
    }
    
    const freshDateRange = {
      from: new Date(dateRange.from.getTime()),
      to: new Date(dateRange.to.getTime())
    };
    
    return freshDateRange;
  }, [dateRange]); // Simplified dependency array
  
  // Convert the viewMode for the PerformanceChart
  const mappedViewMode = useMemo(() => {
    if (viewMode === 'split' || viewMode === 'cumulative' || viewMode === 'combined') {
      return viewMode;
    }
    return 'split';
  }, [viewMode]);
  
  // Handle view mode change from the PerformanceChart
  const handleViewModeChange = useMemo(() => {
    return (mode: 'split' | 'cumulative' | 'combined') => {
      if (onViewModeChange) {
        onViewModeChange(mode);
        try {
          localStorage.setItem('performance_chart_view_mode', mode);
        } catch (error) {
          console.error('Failed to save view mode to localStorage:', error);
        }
      }
    };
  }, [onViewModeChange]);
  
  // Effect to sync with localStorage on mount
  useEffect(() => {
    if (!viewMode) {
      try {
        const savedMode = localStorage.getItem('performance_chart_view_mode');
        if (savedMode && (savedMode === 'split' || savedMode === 'cumulative' || savedMode === 'combined')) {
          onViewModeChange?.(savedMode as any);
        }
      } catch (error) {
        console.error('Failed to retrieve view mode from localStorage:', error);
      }
    }
  }, []);
  
  return (
    <PerformanceChart
      key={chartKey}
      viewMode={mappedViewMode}
      onViewModeChange={handleViewModeChange}
      dateRange={dateRangeProp}
    />
  );
} 