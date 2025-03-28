import React, { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { useDataSource } from '@/lib/DataSourceContext';
import { useTheme } from 'next-themes';
import { ExchangeRateData } from '@/services/coinGeckoService';
import { RATES_UPDATED_EVENT } from '@/contexts/ExchangeRatesContext';

// Storage keys from ExchangeRatesContext
const STORAGE_RATES_KEY = 'cm_exchange_rates';
const STORAGE_TIMESTAMP_KEY = 'cm_exchange_rates_timestamp';

// Fallback market data when neither context nor localStorage is available
const FALLBACK_MARKET_DATA = {
  BTC: { eur: 61500.20 },
  ETH: { eur: 3200.50 },
  DOT: { eur: 8.35 },
  USDT: { eur: 0.92 },
  DOGE: { eur: 0.13 },
  SOL: { eur: 145.00 },
  ADA: { eur: 0.45 },
  HBAR: { eur: 0.07 }
};

// Create a global singleton for cached rates that all tooltip instances will share
interface GlobalRatesState {
  rates: ExchangeRateData;
  timestamp: number | null;
  loading: boolean;
}

// Global rates that all tooltip components will share
let globalRates: GlobalRatesState = {
  rates: {},
  timestamp: null,
  loading: false
};

// Flag to track if we've already loaded data
let hasInitialized = false;

// Function to get cached data from localStorage - same as in ExchangeRatesContext
const getCachedRates = (): { rates: ExchangeRateData | null, timestamp: number | null } => {
  try {
    const cachedRates = localStorage.getItem(STORAGE_RATES_KEY);
    const cachedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    
    return {
      rates: cachedRates ? JSON.parse(cachedRates) : null,
      timestamp: cachedTimestamp ? parseInt(cachedTimestamp, 10) : null
    };
  } catch (error) {
    console.warn('Failed to load cached exchange rates:', error);
    return { rates: null, timestamp: null };
  }
};

// Initialize the global rates from localStorage if needed
const initializeGlobalRates = (): void => {
  if (!hasInitialized) {
    const { rates, timestamp } = getCachedRates();
    if (rates) {
      globalRates.rates = rates;
      globalRates.timestamp = timestamp;
      console.log('Initialized global rates from localStorage cache');
    } else {
      globalRates.rates = FALLBACK_MARKET_DATA;
      console.log('Initialized global rates with fallback data');
    }
    hasInitialized = true;
  }
};

// Try to use context if available
let useExchangeRates: any = null;
try {
  // Dynamic import to avoid errors when context isn't available
  const ExchangeRatesContext = require('@/contexts/ExchangeRatesContext');
  useExchangeRates = ExchangeRatesContext.useExchangeRates;
} catch (error) {
  console.warn('ExchangeRatesContext not available, will try localStorage cache');
}

// Initialize rates on module load
initializeGlobalRates();

interface AssetPriceTooltipProps {
  asset: AssetTicker;
  children: React.ReactNode;
}

export const AssetPriceTooltip: React.FC<AssetPriceTooltipProps> = ({ asset, children }) => {
  const { theme } = useTheme();
  const { dataSource } = useDataSource();
  const assetConfig = ASSETS[asset];
  
  // Local state that will be synchronized with global state
  const [localRates, setLocalRates] = useState<ExchangeRateData>(globalRates.rates);
  const [loading, setLoading] = useState<boolean>(globalRates.loading);
  const [lastUpdated, setLastUpdated] = useState<number | null>(globalRates.timestamp);
  const [error, setError] = useState<string | null>(null);
  
  // Use context if available, otherwise use shared global state
  useEffect(() => {
    let cleanup: () => void = () => {};
    
    try {
      if (useExchangeRates) {
        // If context is available, use it as the source of truth
        const exchangeRatesData = useExchangeRates();
        setLocalRates(exchangeRatesData.rates);
        setLoading(exchangeRatesData.loading);
        setError(exchangeRatesData.error);
        setLastUpdated(exchangeRatesData.lastUpdated);
        
        // Update global rates for components that don't have context
        globalRates.rates = exchangeRatesData.rates;
        globalRates.timestamp = exchangeRatesData.lastUpdated;
        globalRates.loading = exchangeRatesData.loading;
      } else {
        // Otherwise use localStorage synchronized global state
        if (!hasInitialized) {
          initializeGlobalRates();
          setLocalRates(globalRates.rates);
          setLastUpdated(globalRates.timestamp);
        }
      }
      
      // Listen for the custom event for rates updates
      const handleRatesUpdated = () => {
        const { rates, timestamp } = getCachedRates();
        if (rates) {
          setLocalRates(rates);
          setLastUpdated(timestamp);
          setLoading(false);
          setError(null);
        }
      };
      
      window.addEventListener(RATES_UPDATED_EVENT, handleRatesUpdated);
      
      cleanup = () => {
        window.removeEventListener(RATES_UPDATED_EVENT, handleRatesUpdated);
      };
    } catch (e) {
      console.error('Error setting up exchange rates:', e);
      setError('Failed to load price data');
    }
    
    return cleanup;
  }, []);
  
  const assetData = localRates[asset];
  
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

  // If no price data and not loading, don't render tooltip content
  if (!assetData && !loading) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="py-2 px-3 bg-background text-foreground border border-border">
          {loading ? (
            <div className="text-xs text-muted-foreground">Loading price...</div>
          ) : error ? (
            <div className="text-xs text-red-500">Failed to load price</div>
          ) : assetData && assetData.eur ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full overflow-hidden">
                <img
                  src={assetConfig.icon}
                  alt={asset}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <div className="text-[13px] font-medium">
                  €{formatPrice(assetData.eur)}
                </div>
                {assetData.last_updated || lastUpdated ? 
                  !isRecentUpdate(((assetData.last_updated || lastUpdated) || 0) * 1000) && (
                    <div className="text-xs text-muted-foreground/80">
                      Updated: {formatTimeSince(((assetData.last_updated || lastUpdated) || 0) * 1000)}
                    </div>
                  )
                : null}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Price unavailable</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Check if the update is very recent (less than a minute)
const isRecentUpdate = (timestamp: number): boolean => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  return seconds < 60;
};

// Helper function to format time in a user-friendly way
const formatTimeSince = (timestamp: number): string => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 60) {
    return 'Just now'; // This shouldn't be used directly anymore
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  } else {
    return new Date(timestamp).toLocaleTimeString();
  }
};

export interface AssetButtonWithPriceProps {
  asset: AssetTicker;
  onClick?: () => void;
}

export const AssetButtonWithPrice: React.FC<AssetButtonWithPriceProps> = ({ asset, onClick }) => {
  const { theme } = useTheme();
  const assetConfig = ASSETS[asset];
  const assetColor = theme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light;

  return (
    <AssetPriceTooltip asset={asset}>
      <button
        type="button"
        className="font-jakarta font-bold text-sm rounded-md px-1 transition-all duration-150"
        style={{ 
          color: assetColor,
          backgroundColor: `${assetColor}14`,
          cursor: 'pointer'
        }}
        onClick={onClick}
        onMouseEnter={(e) => {
          const target = e.currentTarget;
          target.style.backgroundColor = assetColor;
          target.style.color = 'hsl(var(--color-widget-bg))';
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget;
          target.style.backgroundColor = `${assetColor}14`;
          target.style.color = assetColor;
        }}
      >
        {assetConfig.name}
      </button>
    </AssetPriceTooltip>
  );
}; 