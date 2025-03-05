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
import { getApiUrl } from '@/lib/api-config';

const formatBalance = (value: number, decimals: number) => {
  // First format with full decimals to ensure we don't lose precision
  const fullFormatted = value.toFixed(decimals);
  
  // Split into whole and decimal parts
  const [whole, decimal] = fullFormatted.split('.');
  
  // Add thousand separators to whole part
  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  if (!decimal) return wholeWithCommas;
  
  // Find last non-zero digit
  const lastNonZeroIndex = decimal.split('').reverse().findIndex(char => char !== '0');
  
  if (lastNonZeroIndex === -1) {
    // If all decimals are zeros, show just one zero
    return `${wholeWithCommas}.0`;
  }
  
  // Keep all digits up to and including the last non-zero digit, plus one more
  const keepLength = decimal.length - lastNonZeroIndex + 1;
  const trimmedDecimal = decimal.slice(0, keepLength);
  
  return `${wholeWithCommas}.${trimmedDecimal}`;
};

interface PriceData {
  [key: string]: {
    price: number;
    change24h: number;
  };
}

interface BalanceData {
  asset: AssetTicker;
  balance: string;
  valueInEuro: string;
  change24h: string;
  availablePercentage: string;
}

interface BalancesWidgetProps {
  className?: string;
  compact?: boolean;
}

export const BalancesWidget: React.FC<BalancesWidgetProps> = ({ className, compact = false }) => {
  const [balances, setBalances] = useState<BalanceData[]>([]);
  const [prices, setPrices] = useState<PriceData>({});
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch price data
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch(getApiUrl('exchange/prices'));
        if (!response.ok) {
          throw new Error(`Prices request failed with status ${response.status}`);
        }
        const data = await response.json();
        console.log('Price data:', data);
        setPrices(data);
      } catch (err) {
        console.error('Error fetching prices:', err);
        // Don't set error state for price fetching as it's not critical
      }
    };

    fetchPrices();
    // Set up polling for price updates every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch balances
  useEffect(() => {
    const fetchDemoBalances = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching demo token...');
        
        // First get a demo token
        const tokenResponse = await fetch(getApiUrl('open/demo/temp'));
        const tokenData = await tokenResponse.json();
        console.log('Token response:', tokenData);
        
        if (!tokenData.token) {
          throw new Error('Failed to get demo token');
        }

        console.log('Fetching balances...');
        // Use the token to fetch balances
        const balancesResponse = await fetch(getApiUrl('open/users/balances'), {
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

        // Convert object response to array format with real price data
        if (data && typeof data === 'object') {
          const balancesArray = Object.entries(data)
            .filter(([asset]) => asset !== 'TOTAL') // Exclude the TOTAL entry
            .map(([asset, details]: [string, any]) => {
              const balance = parseFloat(details[asset]?.toString() || '0');
              // Use the EUR value directly from the balance data if available
              const valueInEuro = details.EUR?.toString() || '0';
              
              // Get price data for the asset
              const priceData = prices[`${asset}/EUR`] || { price: 0, change24h: 0 };
              
              return {
                asset: asset as AssetTicker,
                balance: balance.toString(),
                valueInEuro: parseFloat(valueInEuro).toFixed(2),
                change24h: priceData.change24h.toFixed(2),
                availablePercentage: '100' // This would come from the API if available
              };
            })
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
  }, [prices]); // Re-fetch balances when prices update

  return (
    <div className={cn(
      "h-full flex flex-col p-2",
      "border border-[hsl(var(--color-widget-inset-border))] widget-inset",
      className
    )}>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">Loading balances...</div>
        </div>
      ) : error ? (
        <div className="p-3">
          <div className="text-red-500">
            <div>{error}</div>
            <div className="mt-2 text-sm text-muted-foreground">Raw Response:</div>
            <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </div>
        </div>
      ) : balances.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">No balances found</div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 top-0 bg-[hsl(var(--color-widget-bg))] z-20 whitespace-nowrap">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[hsl(var(--color-widget-bg))]"></div>
                    <div className="relative z-10 px-0 py-1">Asset</div>
                  </div>
                </TableHead>
                <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-bg))] z-10 text-right whitespace-nowrap">Balance</TableHead>
                <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-bg))] z-10 text-right whitespace-nowrap">Value (EUR)</TableHead>
                <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-bg))] z-10 text-right whitespace-nowrap">24h Change</TableHead>
                <TableHead className="sticky top-0 bg-[hsl(var(--color-widget-bg))] z-10 text-right whitespace-nowrap">Available %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((balance) => {
                const assetConfig = ASSETS[balance.asset];
                return (
                  <TableRow key={balance.asset} className="group">
                    <TableCell className="sticky left-0 bg-[hsl(var(--color-widget-bg))] z-10 whitespace-nowrap">
                      <div className="relative">
                        <div className="absolute inset-0 bg-[hsl(var(--color-widget-bg))]"></div>
                        <div className="absolute inset-0 bg-[hsl(var(--color-widget-hover))] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex items-center gap-2">
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
                          <div 
                            className="font-jakarta font-medium text-sm rounded-md px-1"
                            style={{ 
                              color: assetConfig.fallbackColor,
                              backgroundColor: `${assetConfig.fallbackColor}14` // 14 in hex = 8% opacity
                            }}
                          >
                            {assetConfig.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="font-jakarta font-semibold text-sm leading-[150%]">
                        {formatBalance(parseFloat(balance.balance), assetConfig.decimalPlaces)}
                      </span>
                      <span className="font-jakarta font-bold text-sm leading-[150%] text-muted-foreground ml-1">
                        {balance.asset}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-mono">
                      {balance.valueInEuro}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right whitespace-nowrap font-mono",
                      parseFloat(balance.change24h) >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {balance.change24h}%
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-mono">
                      {balance.availablePercentage}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default BalancesWidget; 