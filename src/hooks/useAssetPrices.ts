import { AssetTicker } from '@/assets/AssetTicker';
import { useState, useEffect } from 'react';

// Storage keys from ExchangeRatesContext
const STORAGE_RATES_KEY = 'cm_exchange_rates';
const STORAGE_PREV_RATES_KEY = 'cm_exchange_rates_prev';
const STORAGE_TIMESTAMP_KEY = 'cm_exchange_rates_timestamp';
const RATES_UPDATED_EVENT = 'cm_rates_updated';

// Fallback market data when neither context nor localStorage is available
const FALLBACK_MARKET_DATA = {
  BTC: { eur: 61500.20 },
  ETH: { eur: 3200.50 },
  DOT: { eur: 8.35 },
  USDT: { eur: 0.92 },
  DOGE: { eur: 0.13 },
  SOL: { eur: 145.00 },
  ADA: { eur: 0.45 },
  HBAR: { eur: 0.07 },
  XCM: { eur: 0.67 }
};

// Global singleton for cached rates
interface GlobalRatesState {
  currentRates: Record<string, any>;
  previousRates: Record<string, any>;
  timestamp: number | null;
  loading: boolean;
}

// Function to get cached data from localStorage
const getCachedRates = (): { 
  rates: Record<string, any> | null, 
  previousRates: Record<string, any> | null, 
  timestamp: number | null 
} => {
  try {
    const cachedRates = localStorage.getItem(STORAGE_RATES_KEY);
    const cachedPrevRates = localStorage.getItem(STORAGE_PREV_RATES_KEY);
    const cachedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    
    return {
      rates: cachedRates ? JSON.parse(cachedRates) : null,
      previousRates: cachedPrevRates ? JSON.parse(cachedPrevRates) : null,
      timestamp: cachedTimestamp ? parseInt(cachedTimestamp, 10) : null
    };
  } catch (error) {
    console.warn('Failed to load cached exchange rates:', error);
    return { rates: null, previousRates: null, timestamp: null };
  }
};

/**
 * Hook to get prices for all assets in EUR with robust fallback options,
 * aligned with the AssetPriceTooltip implementation for consistency
 * @returns Object containing prices for all assets, loading status, and provider info
 */
export const useAssetPrices = () => {
  // Direct state for current rates
  const [currentRates, setCurrentRates] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState<boolean>(false);

  // Create a map of asset ticker to price in EUR
  const getPrices = (rates: Record<string, any>): Record<AssetTicker, number> => {
    return Object.entries(rates).reduce((acc, [asset, currencies]) => {
      const assetTicker = asset.toUpperCase() as AssetTicker;
      // Safely access the EUR price with fallbacks
      acc[assetTicker] = currencies?.eur ?? 0;
      return acc;
    }, {} as Record<AssetTicker, number>);
  };
  
  useEffect(() => {
    let isMounted = true;
    let cleanupListeners: (() => void) | null = null;
    
    // Try to import and use ExchangeRatesContext directly
    const initializeRates = async () => {
      try {
        // First attempt - directly import and use the ExchangeRatesContext if available
        const { useExchangeRates } = await import('@/contexts/ExchangeRatesContext');
        
        // We've successfully imported the context, now get data from it
        try {
          // This is a mock implementation since we can't directly call a hook
          // Instead, we get fresh data from localStorage which should be updated by the context
          const { rates } = getCachedRates();
          
          if (isMounted) {
            if (rates && Object.keys(rates).length > 0) {
              setCurrentRates(rates);
              setLoading(false);
              setError(null);
              setHasProvider(true);
              console.debug('Asset prices loaded from localStorage (maintained by ExchangeRatesContext)');
            } else {
              // If for some reason we don't have rates in localStorage,
              // set up to listen for updates
              setLoading(true);
            }
          }
          
          // Set up listener for rate updates
          const handleRatesUpdated = () => {
            if (!isMounted) return;
            
            const { rates } = getCachedRates();
            if (rates && Object.keys(rates).length > 0) {
              setCurrentRates(rates);
              setLoading(false);
              setError(null);
              setHasProvider(true);
              console.debug('Asset prices updated from event');
            }
          };
          
          // Listen for rate updates
          window.addEventListener(RATES_UPDATED_EVENT, handleRatesUpdated);
          
          cleanupListeners = () => {
            window.removeEventListener(RATES_UPDATED_EVENT, handleRatesUpdated);
          };
        } catch (error) {
          console.warn('Error using ExchangeRatesContext data, falling back to localStorage', error);
          await fallbackToLocalStorage();
        }
      } catch (error) {
        console.warn('ExchangeRatesContext not available, falling back to localStorage', error);
        await fallbackToLocalStorage();
      }
    };
    
    // Fallback to localStorage if context isn't available
    const fallbackToLocalStorage = async () => {
      if (!isMounted) return;
      
      const { rates } = getCachedRates();
      
      if (rates && Object.keys(rates).length > 0) {
        setCurrentRates(rates);
        setLoading(false);
        setError(null);
        setHasProvider(false);
        console.debug('Asset prices loaded from localStorage fallback');
      } else {
        // If localStorage doesn't have rates either, use fallback data
        setCurrentRates(FALLBACK_MARKET_DATA);
        setLoading(false);
        setError('Using fallback price data');
        setHasProvider(false);
        console.debug('Using fallback asset price data');
      }
      
      // Set up listener for rate updates even in fallback mode
      const handleRatesUpdated = () => {
        if (!isMounted) return;
        
        const { rates } = getCachedRates();
        if (rates && Object.keys(rates).length > 0) {
          setCurrentRates(rates);
          console.debug('Asset prices updated from event (fallback mode)');
        }
      };
      
      // Listen for rate updates
      window.addEventListener(RATES_UPDATED_EVENT, handleRatesUpdated);
      
      cleanupListeners = () => {
        window.removeEventListener(RATES_UPDATED_EVENT, handleRatesUpdated);
      };
    };
    
    // Initialize rates
    initializeRates();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (cleanupListeners) {
        cleanupListeners();
      }
    };
  }, []);
  
  return {
    prices: getPrices(currentRates),
    loading,
    error,
    hasProvider
  };
};

export default useAssetPrices; 