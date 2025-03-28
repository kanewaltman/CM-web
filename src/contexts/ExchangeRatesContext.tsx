import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import coinGeckoService, { ExchangeRateData } from '@/services/coinGeckoService';

// Storage keys
const STORAGE_RATES_KEY = 'cm_exchange_rates';
const STORAGE_PREV_RATES_KEY = 'cm_exchange_rates_prev';
const STORAGE_TIMESTAMP_KEY = 'cm_exchange_rates_timestamp';

// Custom event for rate updates
export const RATES_UPDATED_EVENT = 'cm_rates_updated';

// Create a custom event to notify components about rate updates
export const dispatchRatesUpdatedEvent = (data: ExchangeRateData, prevData: ExchangeRateData) => {
  const event = new CustomEvent(RATES_UPDATED_EVENT, { 
    detail: { timestamp: Date.now(), hasChanges: hasRateChanges(data, prevData) } 
  });
  window.dispatchEvent(event);
};

// Helper to detect if rates have actually changed
const hasRateChanges = (newRates: ExchangeRateData, prevRates: ExchangeRateData): boolean => {
  // If no previous rates, consider it changed
  if (!prevRates || Object.keys(prevRates).length === 0) return true;
  
  // Check a few major currencies for changes
  const currencies = ['BTC', 'ETH', 'USDT', 'SOL'];
  for (const currency of currencies) {
    if (
      newRates[currency]?.eur !== prevRates[currency]?.eur ||
      newRates[currency]?.usd !== prevRates[currency]?.usd
    ) {
      return true;
    }
  }
  
  return false;
};

interface ExchangeRatesContextType {
  rates: ExchangeRateData;
  previousRates: ExchangeRateData;
  loading: boolean;
  error: string | null;
  refreshRates: () => Promise<void>;
  lastUpdated: number | null;
}

const ExchangeRatesContext = createContext<ExchangeRatesContextType | undefined>(undefined);

interface ExchangeRatesProviderProps {
  children: React.ReactNode;
  refreshInterval?: number;
  maxRetries?: number;
}

// Function to implement exponential backoff for retries
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get cached data from localStorage
const getCachedRates = (): { 
  rates: ExchangeRateData | null, 
  previousRates: ExchangeRateData | null,
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

// Save data to localStorage
const cacheRates = (rates: ExchangeRateData, previousRates: ExchangeRateData): void => {
  try {
    const timestamp = Date.now();
    localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(rates));
    localStorage.setItem(STORAGE_PREV_RATES_KEY, JSON.stringify(previousRates));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, timestamp.toString());
  } catch (error) {
    console.warn('Failed to cache exchange rates:', error);
  }
};

// Global request tracker to prevent duplicate requests across components
let isRequestInProgress = false;
let lastRequestTime = 0;

export const ExchangeRatesProvider: React.FC<ExchangeRatesProviderProps> = ({ 
  children, 
  refreshInterval = 60000, // Default refresh every minute
  maxRetries = 3 // Default max retries
}) => {
  // Load initial state from cache
  const { rates: cachedRates, previousRates: cachedPrevRates, timestamp: cachedTimestamp } = getCachedRates();
  
  const [rates, setRates] = useState<ExchangeRateData>(cachedRates || {});
  const [previousRates, setPreviousRates] = useState<ExchangeRateData>(cachedPrevRates || {});
  const [loading, setLoading] = useState<boolean>(cachedRates ? false : true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(cachedTimestamp);
  const [retryCount, setRetryCount] = useState<number>(0);

  const fetchRates = useCallback(async (retry = 0, force = false): Promise<void> => {
    // Check if a request is already in progress globally
    if (isRequestInProgress && !force) {
      console.log('Exchange rates request already in progress, skipping');
      return;
    }
    
    // Check if enough time has passed since the last request
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (lastRequestTime > 0 && timeSinceLastRequest < refreshInterval && !force) {
      console.log(`Skipping exchange rates request, next refresh in ${Math.floor((refreshInterval - timeSinceLastRequest) / 1000)}s`);
      return;
    }
    
    try {
      // Mark request as in progress
      isRequestInProgress = true;
      setLoading(true);
      
      // Update the last request time
      lastRequestTime = now;
      
      let newRates: ExchangeRateData = {};
      
      try {
        newRates = await coinGeckoService.fetchExchangeRates();
      } catch (fetchError) {
        console.error('Error fetching exchange rates from CoinGecko:', fetchError);
        
        // If we have cached rates and this wasn't a forced refresh, use the cached rates
        if (Object.keys(rates).length > 0 && !force) {
          console.log('Using cached exchange rates as fallback');
          return;
        }
        
        // Otherwise, propagate the error to be handled by the outer catch block
        throw fetchError;
      }
      
      // Only update if we actually received data
      if (Object.keys(newRates).length === 0) {
        console.warn('Received empty exchange rates data');
        if (Object.keys(rates).length > 0) {
          console.log('Keeping existing rates instead of using empty data');
          return;
        }
        throw new Error('Received empty exchange rates data');
      }
      
      // Store previous rates before updating with new ones
      setPreviousRates(rates);
      
      // Update state and cache
      setRates(newRates);
      setLastUpdated(now);
      cacheRates(newRates, rates);
      
      // Dispatch global event to notify all components
      dispatchRatesUpdatedEvent(newRates, rates);
      
      setError(null);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch exchange rates';
      console.error('Error fetching exchange rates:', err);
      
      // Handle rate limiting or temporary errors with exponential backoff
      if (retry < maxRetries) {
        const nextRetry = retry + 1;
        const delay = Math.min(2 ** nextRetry * 1000, 30000); // Exponential backoff with 30s max
        
        console.log(`Retrying in ${delay}ms (attempt ${nextRetry}/${maxRetries})...`);
        setRetryCount(nextRetry);
        
        // Wait and retry
        await sleep(delay);
        return fetchRates(nextRetry, true); // Force retry
      }
      
      setError(errorMessage);
    } finally {
      // Mark request as complete
      isRequestInProgress = false;
      setLoading(false);
    }
  }, [refreshInterval, maxRetries, rates]);

  // Initial fetch - only if cache is old or missing
  useEffect(() => {
    const now = Date.now();
    
    // Skip initial fetch if we have recent cached data
    if (cachedRates && cachedTimestamp && now - cachedTimestamp < refreshInterval) {
      console.log(`Using cached exchange rates from ${new Date(cachedTimestamp).toLocaleTimeString()}`);
      return;
    }
    
    // Otherwise fetch fresh data
    fetchRates();
  }, [fetchRates, refreshInterval]); 

  // Set up polling for real-time updates
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchRates();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [fetchRates, refreshInterval]);

  const refreshRates = useCallback(async () => {
    await fetchRates(0, true);
  }, [fetchRates]);

  const value = {
    rates,
    previousRates,
    loading,
    error,
    refreshRates,
    lastUpdated
  };

  return (
    <ExchangeRatesContext.Provider value={value}>
      {children}
    </ExchangeRatesContext.Provider>
  );
};

export const useExchangeRates = (): ExchangeRatesContextType => {
  const context = useContext(ExchangeRatesContext);
  
  if (context === undefined) {
    throw new Error('useExchangeRates must be used within an ExchangeRatesProvider');
  }
  
  return context;
};

export default ExchangeRatesContext; 