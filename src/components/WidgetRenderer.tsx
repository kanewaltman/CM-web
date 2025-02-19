import { TradingViewChart } from './TradingViewChart';
import { OrderBook } from './OrderBook';
import { TradeForm } from './TradeForm';
import { MarketOverview } from './MarketOverview';
import { RecentTrades } from './RecentTrades';
import { WidgetContainer } from './WidgetContainer';

interface WidgetRendererProps {
  id: string;
  title: string;
  onRemove: () => void;
}

export function WidgetRenderer({ id, title, onRemove }: WidgetRendererProps) {
  const renderWidget = () => {
    switch (id) {
      case 'chart':
        return <TradingViewChart />;
      case 'orderbook':
        return <OrderBook />;
      case 'tradeform':
        return <TradeForm />;
      case 'market':
        return <MarketOverview />;
      case 'trades':
        return <RecentTrades />;
      default:
        return <div>Unknown widget type</div>;
    }
  };

  return (
    <WidgetContainer title={title} onRemove={onRemove}>
      {renderWidget()}
    </WidgetContainer>
  );
} 