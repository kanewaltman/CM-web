import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '@/lib/utils';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export function OrderBook() {
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);

  useEffect(() => {
    // Simulate order book data
    const sampleAsks = Array.from({ length: 10 }, (_, i) => ({
      price: 50000 + i * 10,
      amount: Math.random() * 2,
      total: Math.random() * 100000
    }));

    const sampleBids = Array.from({ length: 10 }, (_, i) => ({
      price: 49990 - i * 10,
      amount: Math.random() * 2,
      total: Math.random() * 100000
    }));

    setAsks(sampleAsks);
    setBids(sampleBids);
  }, []);

  return (
    <div className={cn(
      "h-full flex flex-col p-2"
    )}>
      <div className="flex-1 min-h-0">
        <Table>
          <TableHeader>
            <TableRow isHeader={true}>
              <TableHead className="sticky left-0 top-0 bg-[hsl(var(--color-widget-header))] z-20 whitespace-nowrap">
                <div className="relative">
                  <div className="absolute inset-0 bg-[hsl(var(--color-widget-header))]"></div>
                  <div className="relative z-10 px-0 py-1">Price (USDT)</div>
                </div>
              </TableHead>
              <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-10 text-right whitespace-nowrap">Amount (BTC)</TableHead>
              <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-header))] z-10 text-right whitespace-nowrap">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {asks.map((ask, i) => (
              <TableRow key={`ask-${i}`} className="group hover:bg-red-500/5" isHeader={false}>
                <TableCell className="sticky left-0 bg-[hsl(var(--color-widget-header))] z-10 whitespace-nowrap">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[hsl(var(--color-widget-header))]"></div>
                    <div className="absolute inset-0 bg-[hsl(var(--color-widget-hover))] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 text-red-500 font-mono">{ask.price.toFixed(2)}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap font-mono">{ask.amount.toFixed(4)}</TableCell>
                <TableCell className="text-right whitespace-nowrap font-mono">{ask.total.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {bids.map((bid, i) => (
              <TableRow key={`bid-${i}`} className="group hover:bg-green-500/5" isHeader={false}>
                <TableCell className="sticky left-0 bg-[hsl(var(--color-widget-header))] z-10 whitespace-nowrap">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[hsl(var(--color-widget-header))]"></div>
                    <div className="absolute inset-0 bg-[hsl(var(--color-widget-hover))] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 text-green-500 font-mono">{bid.price.toFixed(2)}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap font-mono">{bid.amount.toFixed(4)}</TableCell>
                <TableCell className="text-right whitespace-nowrap font-mono">{bid.total.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}