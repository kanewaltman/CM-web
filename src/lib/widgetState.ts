import { ChartVariant } from '@/components/PerformanceWidget/PerformanceWidget';
import { ReferralsViewMode } from '@/components/ReferralsWidget';
import { EarnViewMode } from '@/components/EarnWidget/EarnWidget';

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

// Referrals Widget State Class
export class ReferralsWidgetState {
  private listeners: Set<() => void> = new Set();
  private _viewMode: ReferralsViewMode;
  private _title: string;
  private _widgetId: string;

  constructor(
    initialViewMode: ReferralsViewMode = 'warp',
    initialTitle: string = 'Referrals',
    widgetId: string = ''
  ) {
    this._viewMode = initialViewMode;
    this._title = initialTitle;
    this._widgetId = widgetId;
    console.log(`ReferralsWidgetState: Created with view mode ${initialViewMode} for widget ${widgetId || 'unknown'}`);
  }

  get viewMode(): ReferralsViewMode {
    return this._viewMode;
  }

  get title(): string {
    return this._title;
  }

  get widgetId(): string {
    return this._widgetId;
  }

  setViewMode(newViewMode: ReferralsViewMode) {
    if (!newViewMode) {
      console.warn('ReferralsWidgetState: Attempted to set undefined view mode');
      return;
    }
    
    console.log(`ReferralsWidgetState: Setting view mode from ${this._viewMode} to ${newViewMode}`);
    const oldViewMode = this._viewMode;
    this._viewMode = newViewMode;
    
    if (oldViewMode !== newViewMode) {
      console.log(`ReferralsWidgetState: View mode changed, notifying ${this.listeners.size} listeners`);
      this.notifyListeners();
    } else {
      console.log('ReferralsWidgetState: View mode unchanged, skipping notification');
    }
  }

  setTitle(newTitle: string) {
    if (!newTitle) return;
    console.log(`ReferralsWidgetState: Setting title from "${this._title}" to "${newTitle}"`);
    this._title = newTitle;
    this.notifyListeners();
  }

  subscribe(listener: () => void) {
    if (!listener) {
      console.warn('ReferralsWidgetState: Attempted to subscribe undefined listener');
      return () => {};
    }
    
    console.log(`ReferralsWidgetState: Adding listener, total count: ${this.listeners.size + 1}`);
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      console.log(`ReferralsWidgetState: Removing listener, new count: ${this.listeners.size - 1}`);
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    console.log(`ReferralsWidgetState: Notifying ${this.listeners.size} listeners about state change`);
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in referrals widget state listener:', error);
      }
    });
  }
}

// Global widget state registry
export const widgetStateRegistry = new Map<string, WidgetState | ReferralsWidgetState>();

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

// Create a default state for a referrals widget
export const createDefaultReferralsWidgetState = (
  viewMode: ReferralsViewMode = 'warp',
  widgetId: string = ''
): ReferralsWidgetState => {
  console.log(`Creating default ReferralsWidgetState with view mode: ${viewMode}, widgetId: ${widgetId || 'unknown'}`);
  return new ReferralsWidgetState(viewMode, 'Referrals', widgetId);
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