import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableRow } from './ui/table';
import { WidgetContainer } from './ui/widget-container';

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
    <WidgetContainer title="Order Book">
      <div className="h-full flex flex-col widget-inset table-container">
        <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground mb-2 px-4 pt-4">
          <div>Price (USDT)</div>
          <div>Amount (BTC)</div>
          <div>Total</div>
        </div>
        <div className="flex-1 overflow-auto scrollbar-thin">
          <Table>
            <TableBody>
              {asks.map((ask, i) => (
                <TableRow key={`ask-${i}`} className="hover:bg-red-500/5">
                  <TableCell className="text-red-500">{ask.price.toFixed(2)}</TableCell>
                  <TableCell>{ask.amount.toFixed(4)}</TableCell>
                  <TableCell>{ask.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-center font-bold">
                  50,000.00
                </TableCell>
              </TableRow>
              {bids.map((bid, i) => (
                <TableRow key={`bid-${i}`} className="hover:bg-green-500/5">
                  <TableCell className="text-green-500">{bid.price.toFixed(2)}</TableCell>
                  <TableCell>{bid.amount.toFixed(4)}</TableCell>
                  <TableCell>{bid.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </WidgetContainer>
  );
}