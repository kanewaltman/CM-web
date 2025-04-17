import { useExchangeRates } from '@/contexts/ExchangeRatesContext';
import { AssetTicker } from '@/assets/AssetTicker';

/**
 * Hook to get the exchange rate for a specific crypto/fiat pair
 * @param cryptoTicker The cryptocurrency ticker symbol
 * @param fiatCurrency The fiat currency code (default: 'usd')
 * @returns An object containing the rate, loading status, and error
 */
export const useExchangeRate = (
  cryptoTicker: string,
  fiatCurrency: string = 'usd'
) => {
  const { rates, loading, error } = useExchangeRates();
  
  // Normalize fiat currency to lowercase
  const normalizedFiat = fiatCurrency.toLowerCase();
  
  // Get rate for the specific pair
  const rate = rates[cryptoTicker]?.[normalizedFiat] ?? null;
  
  return {
    rate,
    loading,
    error,
    available: rate !== null && !loading && !error
  };
};

/**
 * Hook to get the exchange rates for all cryptocurrencies in a specific fiat currency
 * @param fiatCurrency The fiat currency code (default: 'usd')
 * @returns An object containing rates for all cryptos in the specified fiat
 */
export const useFiatRates = (fiatCurrency: string = 'usd') => {
  const { rates, loading, error } = useExchangeRates();
  
  // Normalize fiat currency to lowercase
  const normalizedFiat = fiatCurrency.toLowerCase();
  
  // Create a map of crypto ticker to rate in the specified fiat
  const fiatRates = Object.entries(rates).reduce((acc, [crypto, currencies]) => {
    acc[crypto] = currencies[normalizedFiat] ?? null;
    return acc;
  }, {} as Record<string, number | null>);
  
  return {
    rates: fiatRates,
    loading,
    error
  };
};

/**
 * Convert an amount from one asset to another using the latest exchange rates
 * @param amount The amount to convert
 * @param fromTicker The source asset ticker
 * @param toTicker The target asset ticker
 * @returns The converted amount or null if conversion is not possible
 */
export const useAssetConverter = () => {
  const { rates, loading, error } = useExchangeRates();
  
  const convert = (
    amount: number,
    fromTicker: string,
    toTicker: string
  ): number | null => {
    // If converting to the same asset, return the original amount
    if (fromTicker === toTicker) {
      return amount;
    }
    
    // For direct conversion between two non-USD assets, we need to convert
    // to USD first and then to the target asset
    
    // Get USD rates for both assets
    const fromUsdRate = rates[fromTicker]?.['usd'];
    const toUsdRate = rates[toTicker]?.['usd'];
    
    // If either rate is missing, return null
    if (fromUsdRate === undefined || toUsdRate === undefined) {
      return null;
    }
    
    // Convert: from asset → USD → to asset
    const usdAmount = amount * fromUsdRate;
    return usdAmount / toUsdRate;
  };
  
  return {
    convert,
    loading,
    error
  };
};

export default useExchangeRate; 