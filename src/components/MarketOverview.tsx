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
      "h-full flex flex-col p-2",
      "border border-[hsl(var(--color-widget-inset-border))] widget-inset"
    )}>
      <div className="flex-1 min-h-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 top-0 bg-[hsl(var(--color-widget-bg))] z-20 whitespace-nowrap">
                <div className="relative">
                  <div className="absolute inset-0 bg-[hsl(var(--color-widget-bg))]"></div>
                  <div className="relative z-10 px-0 py-1">Pair</div>
                </div>
              </TableHead>
              <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-bg))] z-10 text-right whitespace-nowrap">Price</TableHead>
              <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-bg))] z-10 text-right whitespace-nowrap">24h Change</TableHead>
              <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-bg))] z-10 text-right whitespace-nowrap">Volume</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {markets.map((market) => (
              <TableRow key={market.pair} className="group">
                <TableCell className="sticky left-0 bg-[hsl(var(--color-widget-bg))] z-10 whitespace-nowrap">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[hsl(var(--color-widget-bg))]"></div>
                    <div className="absolute inset-0 bg-[hsl(var(--color-widget-hover))] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 font-medium">{market.pair}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap font-mono">{market.price}</TableCell>
                <TableCell className={cn(
                  "text-right whitespace-nowrap font-mono",
                  market.change.startsWith('+') ? "text-green-500" : "text-red-500"
                )}>
                  {market.change}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap font-mono">{market.volume}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}