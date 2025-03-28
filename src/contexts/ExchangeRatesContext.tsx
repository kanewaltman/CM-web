import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import coinGeckoService, { ExchangeRateData } from '@/services/coinGeckoService';

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
}

export const ExchangeRatesProvider: React.FC<ExchangeRatesProviderProps> = ({ 
  children, 
  refreshInterval = 60000 // Default refresh every minute
}) => {
  const [rates, setRates] = useState<ExchangeRateData>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await coinGeckoService.fetchExchangeRates();
      setRates(data);
      setLastUpdated(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch exchange rates');
      console.error('Error fetching exchange rates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Set up polling for real-time updates
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchRates();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [fetchRates, refreshInterval]);

  const refreshRates = useCallback(async () => {
    await fetchRates();
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