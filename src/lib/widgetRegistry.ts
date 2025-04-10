import { WidgetConfig, WidgetComponentProps } from '@/types/widgets';
import { MarketOverview } from '@/components/MarketOverview';
import { OrderBook } from '@/components/OrderBook';
import { TradeForm } from '@/components/TradeForm';
import { TradingViewChart } from '@/components/TradingViewChart';
import { RecentTrades } from '@/components/RecentTrades';
import { BalancesWidget } from '@/components/BalancesWidget';
import { PerformanceWidget } from '@/components/PerformanceWidget/PerformanceWidget';
import { BreakdownWrapper } from '@/components/Breakdown';
import MarketsWidget from '@/components/MarketsWidget';
import { TransactionsWidget } from '@/components/TransactionsWidget';
import { InsightWidget } from '@/components/InsightWidget';
import { ReferralsWrapper } from '@/components/ReferralsWidget';
import { ChartVariant } from '@/components/PerformanceWidget/PerformanceWidget';

// Widget Registry - Single source of truth for widget configuration
export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  'market-overview': {
    id: 'market',
    title: 'Market Overview',
    component: MarketOverview,
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 6 },
    maxSize: { w: 12, h: 9 }
  },
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
    minSize: { w: 2, h: 3 },
    maxSize: { w: 12, h: 9 }
  },
  'performance': {
    id: 'performance',
    title: 'Performance',
    component: PerformanceWidget,
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 9 }
  },
  'treemap': {
    id: 'treemap',
    title: 'Breakdown',
    component: BreakdownWrapper,
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
    component: ReferralsWrapper,
    defaultSize: { w: 6, h: 6 },
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