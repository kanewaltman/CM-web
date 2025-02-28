import React, { useState, useEffect } from 'react';
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
  available?: string;
  reserved?: string;
}

interface BalancesWidgetProps {
  className?: string;
  compact?: boolean;
}

export const BalancesWidget: React.FC<BalancesWidgetProps> = ({ className, compact = false }) => {
  const [balances, setBalances] = useState<BalanceData[]>([]);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDemoBalances = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching demo token...');
        
        // First get a demo token
        const tokenResponse = await fetch('https://api.coinmetro.com/open/demo/temp');
        const tokenData = await tokenResponse.json();
        console.log('Token response:', tokenData);
        
        if (!tokenData.token) {
          throw new Error('Failed to get demo token');
        }

        console.log('Fetching balances...');
        // Use the token to fetch balances
        const balancesResponse = await fetch('https://api.coinmetro.com/open/users/balances', {
          headers: {
            'Authorization': `Bearer ${tokenData.token}`
          }
        });
        
        if (!balancesResponse.ok) {
          throw new Error(`Balances request failed with status ${balancesResponse.status}`);
        }
        
        const data = await balancesResponse.json();
        console.log('Balances response:', data);

        // Store raw response for debugging
        setRawResponse(data);

        // Convert object response to array format
        if (data && typeof data === 'object') {
          const balancesArray = Object.entries(data)
            .filter(([asset]) => asset !== 'TOTAL') // Exclude the TOTAL entry
            .map(([asset, details]: [string, any]) => ({
              asset: asset as AssetTicker,
              // The balance is stored with the asset as the key
              balance: details[asset]?.toString() || '0',
              // We don't have available/reserved in demo data, so we'll set balance as available
              available: details[asset]?.toString() || '0',
              reserved: '0'
            }))
            .filter(balance => 
              // Only show assets that are defined in our ASSETS configuration
              balance.asset in ASSETS && 
              // Only show non-zero balances
              parseFloat(balance.balance) > 0
            );

          console.log('Processed balances:', balancesArray);
          setBalances(balancesArray);
          setError(null);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching balances:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDemoBalances();
  }, []); // Only fetch once on component mount

  return (
    <div className={cn(
      "h-full overflow-auto scrollbar-thin p-3",
      "border border-[hsl(var(--color-widget-inset-border))] widget-inset",
      className
    )}>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">Loading balances...</div>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4">
          <div>{error}</div>
          <div className="mt-2 text-sm text-muted-foreground">Raw Response:</div>
          <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </div>
      ) : balances.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">No balances found</div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              {!compact && (
                <>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((balance) => {
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
                    {parseFloat(balance.balance).toFixed(assetConfig.decimalPlaces)}
                  </TableCell>
                  {!compact && (
                    <>
                      <TableCell className="text-right font-mono">
                        {parseFloat(balance.available || '0').toFixed(assetConfig.decimalPlaces)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(balance.reserved || '0').toFixed(assetConfig.decimalPlaces)}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default BalancesWidget; 