import { ChartVariant } from '@/components/PerformanceWidget/PerformanceWidget';

// Widget State Management
export class WidgetState {
  private listeners: Set<() => void> = new Set();
  private _variant: ChartVariant;
  private _title: string;
  private _viewMode: 'split' | 'cumulative' | 'combined';
  private _dateRange: { from: Date; to: Date };

  constructor(
    initialVariant: ChartVariant = 'revenue', 
    initialTitle: string = 'Performance', 
    initialViewMode: 'split' | 'cumulative' | 'combined' = 'split',
    initialDateRange?: { from: Date; to: Date }
  ) {
    this._variant = initialVariant;
    this._title = initialTitle;
    this._viewMode = initialViewMode;
    
    // Set default date range to last 7 days if not provided
    const today = new Date();
    this._dateRange = initialDateRange || {
      from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
      to: today
    };
  }

  get variant(): ChartVariant {
    return this._variant;
  }

  get title(): string {
    return this._title;
  }

  get viewMode(): 'split' | 'cumulative' | 'combined' {
    return this._viewMode;
  }
  
  get dateRange(): { from: Date; to: Date } {
    return { 
      from: new Date(this._dateRange.from),
      to: new Date(this._dateRange.to)
    };
  }

  setVariant(newVariant: ChartVariant) {
    if (!newVariant) return;
    this._variant = newVariant;
    this.notifyListeners();
  }

  setTitle(newTitle: string) {
    if (!newTitle) return;
    this._title = newTitle;
    this.notifyListeners();
  }

  setViewMode(newViewMode: 'split' | 'cumulative' | 'combined') {
    if (!newViewMode) return;
    this._viewMode = newViewMode;
    this.notifyListeners();
  }
  
  setDateRange(newRange: { from: Date; to: Date }) {
    if (!newRange?.from || !newRange?.to) return;
    this._dateRange = {
      from: new Date(newRange.from),
      to: new Date(newRange.to)
    };
    this.notifyListeners();
  }

  subscribe(listener: () => void) {
    if (!listener) return () => {};
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in widget state listener:', error);
      }
    });
  }
}

// Global widget state registry
export const widgetStateRegistry = new Map<string, WidgetState>();

// Create a default state for a widget
export const createDefaultWidgetState = (
  variant: ChartVariant = 'revenue', 
  viewMode: 'split' | 'cumulative' | 'combined' = 'split',
  dateRange?: { from: Date; to: Date }
): WidgetState => {
  // Default date range (last 7 days)
  const today = new Date();
  const defaultDateRange = dateRange || {
    from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
    to: today
  };
  
  return new WidgetState(variant, getPerformanceTitle(variant), viewMode, defaultDateRange);
};

// Helper function for performance titles
export const getPerformanceTitle = (variant: ChartVariant): string => {
  switch (variant) {
    case 'revenue':
      return 'Performance';
    case 'subscribers':
      return 'Subscribers';
    case 'mrr-growth':
      return 'MRR Growth';
    case 'refunds':
      return 'Refunds';
    case 'subscriptions':
      return 'Subscriptions';
    case 'upgrades':
      return 'Upgrades';
    default:
      return 'Performance';
  }
}; 