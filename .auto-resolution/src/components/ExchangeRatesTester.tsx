import React, { useState, useEffect } from 'react';
import { useExchangeRates } from '@/contexts/ExchangeRatesContext';
import { coinGeckoService } from '@/services/coinGeckoService';
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from './ui/table';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { ASSETS } from '@/assets/AssetTicker';
import { ASSET_TYPE } from '@/assets/common';

// Format price to match the MarketsWidget pattern
const formatPrice = (price: number) => {
  if (price >= 1000) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else if (price >= 100) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } else if (price >= 0.01) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 6 });
  } else {
    return price.toLocaleString(undefined, { maximumFractionDigits: 8 });
  }
};

const ExchangeRatesTester: React.FC = () => {
  const { rates, loading, error, refreshRates, lastUpdated } = useExchangeRates();
  const [selectedCrypto, setSelectedCrypto] = useState<string>('BTC');
  const [selectedFiat, setSelectedFiat] = useState<string>('usd');
  const [showUnmappedAssets, setShowUnmappedAssets] = useState<boolean>(false);
  const [assetCoverage, setAssetCoverage] = useState<{
    mapped: string[];
    unmapped: string[];
    total: number;
    percentage: number;
  }>({ mapped: [], unmapped: [], total: 0, percentage: 0 });
  
  const { resolvedTheme } = useTheme();
  
  const mappedCryptoAssets = coinGeckoService.getMappedCryptoAssets();
  const allCryptoAssets = coinGeckoService.getAllCryptoAssets();
  const fiatCurrencies = coinGeckoService.FIAT_CURRENCIES;
  
  // Calculate asset coverage on mount
  useEffect(() => {
    const allAssets = Object.keys(ASSETS).filter(ticker => ASSETS[ticker].type === ASSET_TYPE.Crypto);
    const mappedAssets = Object.keys(rates);
    const unmappedAssets = allAssets.filter(asset => !mappedAssets.includes(asset));
    
    setAssetCoverage({
      mapped: mappedAssets,
      unmapped: unmappedAssets,
      total: allAssets.length,
      percentage: Math.round((mappedAssets.length / allAssets.length) * 100)
    });
  }, [rates]);
  
  const formatDateTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  // Skeleton rows for loading state
  const SkeletonRow = () => (
    <TableRow isHeader={false}>
      <TableCell className="sticky left-0 bg-[hsl(var(--color-widget-header))] z-10 whitespace-nowrap">
        <div className="w-20 h-5 rounded bg-white/5 animate-pulse" />
      </TableCell>
      {fiatCurrencies.map((fiat, index) => (
        <TableCell key={fiat} className="text-right">
          <div className="w-24 h-5 ml-auto rounded bg-white/5 animate-pulse" />
        </TableCell>
      ))}
    </TableRow>
  );

  return (
    <div className="w-full h-full flex flex-col bg-[hsl(var(--color-widget-bg))] rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--color-widget-border))]">
        <h2 className="text-lg font-medium text-[hsl(var(--color-widget-header-text))]">Exchange Rates from CoinGecko</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-[hsl(var(--color-widget-muted-text))]">
            Last updated: {formatDateTime(lastUpdated)}
          </span>
          <button 
            onClick={() => refreshRates()} 
            disabled={loading}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-medium transition-colors",
              "bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-text))] hover:bg-[hsl(var(--color-primary-hover))]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="m-4 p-3 bg-[hsl(var(--color-error-bg))] text-[hsl(var(--color-error-text))] rounded border border-[hsl(var(--color-error-border))]">
          Error: {error}
        </div>
      )}
      
      {/* Asset coverage indicator */}
      <div className="p-4 mx-4 mt-4 bg-[hsl(var(--color-widget-highlight-bg))] rounded">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <h3 className="text-sm font-medium mb-2 text-[hsl(var(--color-widget-header-text))]">Asset Coverage</h3>
            <div className="text-sm text-[hsl(var(--color-widget-text))]">
              {loading ? (
                <div className="h-5 w-32 rounded bg-white/5 animate-pulse" />
              ) : (
                <>
                  <div className="flex items-center">
                    <div className="w-full h-2 bg-[hsl(var(--color-widget-muted))] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[hsl(var(--color-primary))]" 
                        style={{ width: `${assetCoverage.percentage}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 font-medium">{assetCoverage.percentage}%</span>
                  </div>
                  <p className="mt-1">
                    {assetCoverage.mapped.length} of {assetCoverage.total} crypto assets mapped 
                    ({assetCoverage.unmapped.length} unmapped)
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setShowUnmappedAssets(!showUnmappedAssets)}
              className="text-sm px-3 py-1.5 rounded bg-[hsl(var(--color-widget-secondary))] text-[hsl(var(--color-widget-text))] hover:bg-[hsl(var(--color-widget-secondary-hover))]"
            >
              {showUnmappedAssets ? "Hide" : "Show"} Unmapped Assets
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-[hsl(var(--color-widget-text))]">Cryptocurrency</label>
          <select 
            value={selectedCrypto} 
            onChange={(e) => setSelectedCrypto(e.target.value)}
            className="w-full p-2 bg-[hsl(var(--color-widget-input-bg))] border border-[hsl(var(--color-widget-border))] rounded text-[hsl(var(--color-widget-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--color-primary))]"
          >
            {mappedCryptoAssets.map(crypto => (
              <option key={crypto} value={crypto}>{crypto}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block mb-2 text-sm font-medium text-[hsl(var(--color-widget-text))]">Fiat Currency</label>
          <select 
            value={selectedFiat} 
            onChange={(e) => setSelectedFiat(e.target.value)}
            className="w-full p-2 bg-[hsl(var(--color-widget-input-bg))] border border-[hsl(var(--color-widget-border))] rounded text-[hsl(var(--color-widget-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--color-primary))]"
          >
            {fiatCurrencies.map(fiat => (
              <option key={fiat} value={fiat}>{fiat.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="p-4 mx-4 mb-4 bg-[hsl(var(--color-widget-highlight-bg))] rounded">
        <h3 className="text-sm font-medium mb-2 text-[hsl(var(--color-widget-header-text))]">Selected Rate</h3>
        {loading ? (
          <div className="h-8 w-48 rounded bg-white/5 animate-pulse" />
        ) : rates[selectedCrypto] && rates[selectedCrypto][selectedFiat] ? (
          <div className="text-2xl font-semibold text-[hsl(var(--color-widget-text))]">
            1 {selectedCrypto} = {formatPrice(rates[selectedCrypto][selectedFiat])} {selectedFiat.toUpperCase()}
          </div>
        ) : (
          <p className="text-[hsl(var(--color-widget-muted-text))]">No data available for this pair</p>
        )}
      </div>
      
      <div className="p-4 flex-1 overflow-hidden">
        <h3 className="text-sm font-medium mb-2 text-[hsl(var(--color-widget-header-text))]">
          {showUnmappedAssets ? "Unmapped Assets" : "Available Exchange Rates"}
        </h3>
        
        {showUnmappedAssets ? (
          <div className="bg-[hsl(var(--color-widget-bg-alt))] p-4 rounded border border-[hsl(var(--color-widget-border))]">
            <p className="text-sm text-[hsl(var(--color-widget-muted-text))] mb-3">
              The following assets from AssetTicker.ts don't have CoinGecko mappings yet:
            </p>
            <div className="flex flex-wrap gap-2">
              {assetCoverage.unmapped.map(asset => (
                <span key={asset} className="px-2 py-1 text-xs bg-[hsl(var(--color-widget-tag))] text-[hsl(var(--color-widget-tag-text))] rounded">
                  {asset}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow isHeader>
                <TableHead className="sticky left-0 bg-[hsl(var(--color-widget-header))] z-10 whitespace-nowrap">
                  Crypto
                </TableHead>
                {fiatCurrencies.map(fiat => (
                  <TableHead key={fiat} className="text-right">
                    {fiat.toUpperCase()}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <SkeletonRow key={index} />
                ))
              ) : (
                Object.keys(rates).map(crypto => (
                  <TableRow 
                    key={crypto} 
                    className={cn(
                      selectedCrypto === crypto ? 
                      "bg-[hsl(var(--color-widget-selected))]" : 
                      ""
                    )}
                  >
                    <TableCell className="sticky left-0 bg-[hsl(var(--color-widget-bg))] z-10 font-medium whitespace-nowrap">
                      {crypto}
                    </TableCell>
                    {fiatCurrencies.map(fiat => (
                      <TableCell key={`${crypto}-${fiat}`} className="text-right">
                        {rates[crypto]?.[fiat] ? formatPrice(rates[crypto][fiat]) : 'N/A'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default ExchangeRatesTester; 