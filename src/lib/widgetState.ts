import { ChartVariant } from '@/components/PerformanceWidget/PerformanceWidget';
import { ReferralsViewMode } from '@/components/ReferralsWidget';
import { EarnViewMode } from '@/components/EarnWidget/EarnWidget';
import { AssetTicker } from '@/assets/AssetTicker';
import { QuoteAssetsWithCounts } from '@/components/MarketWidget/MarketsWidget';

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

// Add EarnViewMode type and EarnWidgetState class
export class EarnWidgetState {
  private listeners: Set<() => void> = new Set();
  private _viewMode: EarnViewMode;
  private _showHistoricPlans: boolean = false;
  private _featuredToken: string = 'XCM';
  private _selectedAssetFilter: AssetTicker | 'ALL' = 'ALL';
  public widgetId: string;

  constructor(initialViewMode: EarnViewMode = 'ripple', widgetId: string) {
    this._viewMode = initialViewMode;
    this.widgetId = widgetId;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  get viewMode(): EarnViewMode {
    return this._viewMode;
  }

  get showHistoricPlans(): boolean {
    return this._showHistoricPlans;
  }

  get featuredToken(): string {
    return this._featuredToken;
  }

  get selectedAssetFilter(): AssetTicker | 'ALL' {
    return this._selectedAssetFilter;
  }

  setViewMode(newViewMode: EarnViewMode): void {
    if (!newViewMode) return;
    this._viewMode = newViewMode;
    this.notifyListeners();
  }

  setShowHistoricPlans(show: boolean): void {
    if (this._showHistoricPlans === show) return;
    this._showHistoricPlans = show;
    this.notifyListeners();
  }
  
  setFeaturedToken(token: string): void {
    if (!token || this._featuredToken === token) return;
    this._featuredToken = token;
    this.notifyListeners();
  }

  setSelectedAssetFilter(filter: AssetTicker | 'ALL'): void {
    if (this._selectedAssetFilter === filter) return;
    this._selectedAssetFilter = filter;
    this.notifyListeners();
  }
}

export function createDefaultEarnWidgetState(initialViewMode: EarnViewMode = 'ripple', widgetId: string): EarnWidgetState {
  return new EarnWidgetState(initialViewMode, widgetId);
}

// Markets Widget State Class
export class MarketsWidgetState {
  private listeners: Set<() => void> = new Set();
  private _searchQuery: string;
  private _selectedQuoteAsset: AssetTicker | 'ALL';
  private _secondaryCurrency: AssetTicker | null;
  private _quoteAssets: QuoteAssetsWithCounts;
  private _widgetId: string;

  constructor(
    initialSearchQuery: string = '',
    initialSelectedQuoteAsset: AssetTicker | 'ALL' = 'ALL',
    initialSecondaryCurrency: AssetTicker | null = null,
    initialQuoteAssets: QuoteAssetsWithCounts = {
      assets: ['USDT', 'BTC', 'ETH', 'USD', 'EUR'] as AssetTicker[],
      counts: {
        'USDT': 0,
        'BTC': 0,
        'ETH': 0,
        'USD': 0,
        'EUR': 0
      },
      totalCount: 0
    },
    widgetId: string = ''
  ) {
    this._searchQuery = initialSearchQuery;
    this._selectedQuoteAsset = initialSelectedQuoteAsset;
    this._secondaryCurrency = initialSecondaryCurrency;
    this._quoteAssets = initialQuoteAssets;
    this._widgetId = widgetId;
  }

  get searchQuery(): string {
    return this._searchQuery;
  }

  get selectedQuoteAsset(): AssetTicker | 'ALL' {
    return this._selectedQuoteAsset;
  }

  get secondaryCurrency(): AssetTicker | null {
    return this._secondaryCurrency;
  }

  get quoteAssets(): QuoteAssetsWithCounts {
    return this._quoteAssets;
  }

  get widgetId(): string {
    return this._widgetId;
  }

  setSearchQuery(newSearchQuery: string) {
    if (this._searchQuery === newSearchQuery) return;
    this._searchQuery = newSearchQuery;
    this.notifyListeners();
  }

  setSelectedQuoteAsset(newSelectedQuoteAsset: AssetTicker | 'ALL') {
    if (this._selectedQuoteAsset === newSelectedQuoteAsset) return;
    this._selectedQuoteAsset = newSelectedQuoteAsset;
    this.notifyListeners();
  }

  setSecondaryCurrency(newSecondaryCurrency: AssetTicker | null) {
    if (this._secondaryCurrency === newSecondaryCurrency) return;
    this._secondaryCurrency = newSecondaryCurrency;
    this.notifyListeners();
  }

  setQuoteAssets(newQuoteAssets: QuoteAssetsWithCounts) {
    this._quoteAssets = newQuoteAssets;
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
        console.error('Error in markets widget state listener:', error);
      }
    });
  }
}

// Create a default state for a markets widget
export const createDefaultMarketsWidgetState = (
  searchQuery: string = '',
  selectedQuoteAsset: AssetTicker | 'ALL' = 'ALL',
  secondaryCurrency: AssetTicker | null = null,
  quoteAssets?: QuoteAssetsWithCounts,
  widgetId: string = ''
): MarketsWidgetState => {
  return new MarketsWidgetState(
    searchQuery,
    selectedQuoteAsset,
    secondaryCurrency,
    quoteAssets,
    widgetId
  );
};

// Global widget state registry
export const widgetStateRegistry = new Map<string, WidgetState | ReferralsWidgetState | EarnWidgetState | MarketsWidgetState>();

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