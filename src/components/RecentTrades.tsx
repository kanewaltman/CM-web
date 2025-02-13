import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { WidgetContainer } from './ui/widget-container';

const trades = [
  { time: '12:30:45', price: '50,123.45', amount: '0.1235', side: 'buy' },
  { time: '12:30:42', price: '50,121.32', amount: '0.0892', side: 'sell' },
  { time: '12:30:38', price: '50,125.67', amount: '0.1578', side: 'buy' },
  { time: '12:30:35', price: '50,120.89', amount: '0.2341', side: 'sell' },
];

export function RecentTrades() {
  return (
    <WidgetContainer title="Recent Trades">
      <div className="h-full overflow-auto scrollbar-thin widget-inset table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade, i) => (
              <TableRow key={i}>
                <TableCell>{trade.time}</TableCell>
                <TableCell className={trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                  {trade.price}
                </TableCell>
                <TableCell>{trade.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </WidgetContainer>
  );
}