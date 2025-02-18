import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '@/lib/utils';

const markets = [
  { pair: 'BTC/USDT', price: '50,123.45', change: '+2.34%', volume: '1.2B' },
  { pair: 'ETH/USDT', price: '2,891.23', change: '-1.23%', volume: '800M' },
  { pair: 'BNB/USDT', price: '321.45', change: '+0.89%', volume: '400M' },
  { pair: 'SOL/USDT', price: '98.76', change: '+5.67%', volume: '300M' },
];

// Main widget component that will be used by the layout system
export function MarketOverview() {
  return (
    <div className={cn(
      "h-full overflow-auto scrollbar-thin rounded-lg p-3",
      "border border-[hsl(var(--color-widget-inset-border))] widget-inset"
    )}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pair</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>24h Change</TableHead>
            <TableHead>Volume</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {markets.map((market) => (
            <TableRow key={market.pair}>
              <TableCell className="font-medium">{market.pair}</TableCell>
              <TableCell>{market.price}</TableCell>
              <TableCell className={market.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}>
                {market.change}
              </TableCell>
              <TableCell>{market.volume}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}