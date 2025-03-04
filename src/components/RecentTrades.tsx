import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '@/lib/utils';

const trades = [
  { time: '12:30:45', price: '50,123.45', amount: '0.1235', side: 'buy' },
  { time: '12:30:42', price: '50,121.32', amount: '0.0892', side: 'sell' },
  { time: '12:30:38', price: '50,125.67', amount: '0.1578', side: 'buy' },
  { time: '12:30:35', price: '50,120.89', amount: '0.2341', side: 'sell' },
];

export function RecentTrades() {
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
                  <div className="relative z-10 px-1 py-1">Time</div>
                </div>
              </TableHead>
              <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-bg))] z-10 text-right whitespace-nowrap">Price</TableHead>
              <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-bg))] z-10 text-right whitespace-nowrap">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade, i) => (
              <TableRow key={i} className="group">
                <TableCell className="sticky left-0 bg-[hsl(var(--color-widget-bg))] z-10 whitespace-nowrap">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[hsl(var(--color-widget-bg))]"></div>
                    <div className="absolute inset-0 bg-[hsl(var(--color-widget-hover))] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">{trade.time}</div>
                  </div>
                </TableCell>
                <TableCell className={cn(
                  "text-right whitespace-nowrap font-mono",
                  trade.side === 'buy' ? "text-green-500" : "text-red-500"
                )}>
                  {trade.price}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap font-mono">{trade.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}