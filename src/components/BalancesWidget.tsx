import React from 'react';
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from './ui/table';
import { cn } from '@/lib/utils';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';

interface BalanceData {
  asset: AssetTicker;
  balance: string;
  value?: string;
  change24h?: string;
  available?: string;
}

// Mock data - will be replaced with real data later
const mockBalances: BalanceData[] = [
  { asset: 'BTC', balance: '0.012171', value: '€402.50', change24h: '+1.74%', available: '12%' },
  { asset: 'ETH', balance: '0.3611', value: '€402.50', change24h: '+1.74%', available: '34%' },
  { asset: 'AAVE', balance: '1.75', value: '€402.50', change24h: '+1.74%', available: '20%' },
  { asset: 'DOGE', balance: '1,049.80', value: '€402.50', change24h: '-1.74%', available: '100%' },
  { asset: 'XCM', balance: '4,206.95', value: '€402.50', change24h: '-1.74%', available: '100%' },
] as const;

interface BalancesWidgetProps {
  className?: string;
  compact?: boolean;
}

export const BalancesWidget: React.FC<BalancesWidgetProps> = ({ className, compact = false }) => {
  return (
    <div className={cn(
      "h-full overflow-auto scrollbar-thin p-3",
      "border border-[hsl(var(--color-widget-inset-border))] widget-inset",
      className
    )}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            {!compact && (
              <>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">24h Change</TableHead>
                <TableHead className="text-right">Available</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockBalances.map((balance) => {
            const assetConfig = ASSETS[balance.asset];
            return (
              <TableRow key={balance.asset}>
                <TableCell className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: assetConfig.fallbackColor }}
                  >
                    <img
                      src={assetConfig.icon}
                      alt={balance.asset}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span>{balance.asset}</span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {balance.balance}
                </TableCell>
                {!compact && (
                  <>
                    <TableCell className="text-right">{balance.value}</TableCell>
                    <TableCell 
                      className={cn(
                        "text-right",
                        balance.change24h?.startsWith('+') ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {balance.change24h}
                    </TableCell>
                    <TableCell className="text-right">{balance.available}</TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default BalancesWidget; 