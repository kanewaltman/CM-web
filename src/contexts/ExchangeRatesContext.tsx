import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import coinGeckoService, { ExchangeRateData } from '@/services/coinGeckoService';

// Storage keys
const STORAGE_RATES_KEY = 'cm_exchange_rates';
const STORAGE_TIMESTAMP_KEY = 'cm_exchange_rates_timestamp';

// Custom event for rate updates
export const RATES_UPDATED_EVENT = 'cm_rates_updated';

// Create a custom event to notify components about rate updates
export const dispatchRatesUpdatedEvent = (data: ExchangeRateData) => {
  const event = new CustomEvent(RATES_UPDATED_EVENT, { 
    detail: { timestamp: Date.now() } 
  });
  window.dispatchEvent(event);
};

interface ExchangeRatesContextType {
  rates: ExchangeRateData;
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

// Save data to localStorage
const cacheRates = (rates: ExchangeRateData): void => {
  try {
    const timestamp = Date.now();
    localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(rates));
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
  const { rates: cachedRates, timestamp: cachedTimestamp } = getCachedRates();
  
  const [rates, setRates] = useState<ExchangeRateData>(cachedRates || {});
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
      
      const data = await coinGeckoService.fetchExchangeRates();
      
      // Update state and cache
      setRates(data);
      setLastUpdated(now);
      cacheRates(data);
      
      // Dispatch global event to notify all components
      dispatchRatesUpdatedEvent(data);
      
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
  }, [refreshInterval, maxRetries]);

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