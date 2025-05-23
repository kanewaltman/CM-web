import { WidgetConfig, WidgetComponentProps, RemovableWidgetProps, PerformanceWidgetProps } from '@/types/widgets';
import { OrderBook } from '@/components/OrderBook';
import { TradeForm } from '@/components/TradeForm';
import { TradingViewChart } from '@/components/TradingViewChart';
import { RecentTrades } from '@/components/RecentTrades';
import { BalancesWidget } from '@/components/BalancesWidget';
import { PerformanceWidget } from '@/components/PerformanceWidget/PerformanceWidget';
import { BreakdownWrapper } from '@/components/Breakdown';
import MarketsWidget from '@/components/MarketWidget/MarketsWidget';
import { TransactionsWidget } from '@/components/TransactionsWidget';
import { InsightWidget } from '@/components/InsightWidget';
import { ReferralsWidgetProps, ReferralsWrapper } from '@/components/ReferralsWidget';
import { EarnWidgetWrapper } from '@/components/EarnWidget/EarnWidget';
import { ChartVariant } from '@/components/PerformanceWidget/PerformanceWidget';
import { FC } from 'react';

// Widget Registry - Single source of truth for widget configuration
export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  'order-book': {
    id: 'orderbook',
    title: 'Order Book',
    component: OrderBook,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 4, h: 6 },
    maxSize: { w: 12, h: 9 }
  },
  'recent-trades': {
    id: 'trades',
    title: 'Recent Trades',
    component: RecentTrades,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 6 },
    maxSize: { w: 12, h: 9 }
  },
  'trading-view-chart': {
    id: 'chart',
    title: 'BTC/USDT',
    component: TradingViewChart,
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 6, h: 6 },
    maxSize: { w: 12, h: 9 }
  },
  'trade-form': {
    id: 'tradeform',
    title: 'Trade',
    component: TradeForm,
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 6, h: 6 },
    maxSize: { w: 12, h: 9 }
  },
  'balances': {
    id: 'balances',
    title: 'Balances',
    component: BalancesWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 12, h: 9 }
  },
  'markets': {
    id: 'markets',
    title: 'Markets',
    component: MarketsWidget,
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 9 }
  },
  'performance': {
    id: 'performance',
    title: 'Performance',
    component: PerformanceWidget as FC<RemovableWidgetProps | PerformanceWidgetProps | ReferralsWidgetProps>,
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 9 }
  },
  'treemap': {
    id: 'treemap',
    title: 'Breakdown',
    component: BreakdownWrapper as FC<RemovableWidgetProps | PerformanceWidgetProps | ReferralsWidgetProps>,
    defaultSize: { w: 6, h: 6 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 12, h: 9 }
  },
  'transactions': {
    id: 'transactions',
    title: 'Transactions',
    component: TransactionsWidget,
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 9 }
  },
  'insight': {
    id: 'insight',
    title: 'Insight',
    component: InsightWidget,
    defaultSize: { w: 6, h: 6 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 9 }
  },
  'referrals': {
    id: 'referrals',
    title: 'Referrals',
    component: ReferralsWrapper as FC<RemovableWidgetProps | PerformanceWidgetProps | ReferralsWidgetProps>,
    defaultSize: { w: 6, h: 6 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 9 }
  },
  'earn': {
    id: 'earn',
    title: 'Earn',
    component: EarnWidgetWrapper as FC<RemovableWidgetProps | PerformanceWidgetProps | ReferralsWidgetProps>,
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 9 }
  }
};

// Derive other mappings from registry
export const widgetIds: Record<string, string> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [key, config.id])
);

export const widgetTypes: Record<string, string> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [config.id, key])
);

export const widgetComponents: Record<string, React.FC<WidgetComponentProps>> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [key, config.component as React.FC<WidgetComponentProps>])
);

export const widgetTitles: Record<string, string> = Object.fromEntries(
  Object.entries(WIDGET_REGISTRY).map(([key, config]) => [key, config.title])
);

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

/**
 * Utility function to check if a widget exists in the registry by its ID
 * @param widgetId The ID of the widget to check
 * @returns An object with information about the widget, or null if not found
 */
export const findWidgetById = (widgetId: string): { type: string; config: WidgetConfig } | null => {
  // Handle instance-specific IDs by extracting the base ID
  // Format is typically baseId-timestamp (e.g., transactions-1745505290237)
  const baseId = widgetId.split('-')[0];
  
  // Try first with the full ID
  let entry = Object.entries(WIDGET_REGISTRY).find(([_, config]) => config.id === widgetId);
  
  // If not found, try with the base ID
  if (!entry && baseId !== widgetId) {
    entry = Object.entries(WIDGET_REGISTRY).find(([_, config]) => config.id === baseId);
    console.log('📊 Found widget using base ID:', baseId, 'from full ID:', widgetId);
  }
  
  if (!entry) return null;
  
  const [type, config] = entry;
  return { type, config };
}; 