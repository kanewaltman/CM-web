import { AssetTicker } from '@/assets/AssetTicker';

const COINGECKO_API_KEY = 'CG-bc3TbY6Y8XbV9PoDZX5BZgtQ';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// Map asset tickers to CoinGecko IDs
const TICKER_TO_COINGECKO_ID: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'DOT': 'polkadot',
  'USDT': 'tether',
  'DOGE': 'dogecoin',
  'XCM': 'coinmetro', // If available
  'SOL': 'solana',
  'ADA': 'cardano',
  'HBAR': 'hedera-hashgraph',
  'USDC': 'usd-coin',
  'XRP': 'ripple',
  'AVAX': 'avalanche-2',
  'MATIC': 'matic-network',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'AAVE': 'aave',
  'ALGO': 'algorand',
  'XLM': 'stellar',
};

/**
 * Get the current price of an asset in a specified currency
 */
export async function getCurrentPrice(assetTicker: string, currency = 'eur'): Promise<number | null> {
  try {
    const coinId = TICKER_TO_COINGECKO_ID[assetTicker];
    if (!coinId) {
      console.error(`No CoinGecko ID found for asset ticker: ${assetTicker}`);
      return null;
    }

    const response = await fetch(
      `${COINGECKO_API_URL}/simple/price?ids=${coinId}&vs_currencies=${currency}&x_cg_demo_api_key=${COINGECKO_API_KEY}`
    );

    if (!response.ok) {
      console.error(`Error fetching price for ${assetTicker}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data[coinId]?.[currency] || null;
  } catch (error) {
    console.error(`Error fetching price for ${assetTicker}:`, error);
    return null;
  }
}

/**
 * Get historical market data for an asset
 * @param assetTicker The asset ticker symbol
 * @param days Number of days of data to retrieve (1, 7, 14, 30, 90, 180, 365, max)
 * @param currency Currency to get prices in
 * @returns Array of [timestamp, price] pairs
 */
export async function getHistoricalMarketData(
  assetTicker: string, 
  days: number | 'max' = 30,
  currency = 'eur'
): Promise<[number, number][] | null> {
  try {
    const coinId = TICKER_TO_COINGECKO_ID[assetTicker];
    if (!coinId) {
      console.error(`No CoinGecko ID found for asset ticker: ${assetTicker}`);
      return null;
    }

    const response = await fetch(
      `${COINGECKO_API_URL}/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}&x_cg_demo_api_key=${COINGECKO_API_KEY}`
    );

    if (!response.ok) {
      console.error(`Error fetching historical data for ${assetTicker}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.prices || null;
  } catch (error) {
    console.error(`Error fetching historical data for ${assetTicker}:`, error);
    return null;
  }
}

/**
 * Get price data for multiple assets at once
 */
export async function getMultiplePrices(
  assetTickers: string[], 
  currency = 'eur'
): Promise<Record<string, number>> {
  try {
    // Filter out tickers that don't have a CoinGecko ID mapping
    const validTickers = assetTickers.filter(ticker => TICKER_TO_COINGECKO_ID[ticker]);
    
    if (validTickers.length === 0) {
      console.error('No valid asset tickers provided');
      return {};
    }

    const coinIds = validTickers.map(ticker => TICKER_TO_COINGECKO_ID[ticker]).join(',');
    
    const response = await fetch(
      `${COINGECKO_API_URL}/simple/price?ids=${coinIds}&vs_currencies=${currency}&x_cg_demo_api_key=${COINGECKO_API_KEY}`
    );

    if (!response.ok) {
      console.error(`Error fetching multiple prices: ${response.statusText}`);
      return {};
    }

    const data = await response.json();
    
    // Convert CoinGecko IDs back to asset tickers
    const result: Record<string, number> = {};
    for (const ticker of validTickers) {
      const coinId = TICKER_TO_COINGECKO_ID[ticker];
      if (data[coinId]?.[currency]) {
        result[ticker] = data[coinId][currency];
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching multiple prices:', error);
    return {};
  }
}

/**
 * Convert a date range to the appropriate "days" parameter for CoinGecko API
 */
export function dateRangeToDays(from: Date, to: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const days = Math.ceil((to.getTime() - from.getTime()) / millisecondsPerDay);
  
  // CoinGecko has specific days options: 1, 7, 14, 30, 90, 180, 365, max
  if (days <= 1) return 1;
  if (days <= 7) return 7;
  if (days <= 14) return 14;
  if (days <= 30) return 30;
  if (days <= 90) return 90;
  if (days <= 180) return 180;
  if (days <= 365) return 365;
  return 365; // Use 'max' when needed for very long ranges
}

/**
 * Get historical market data for multiple assets based on a date range
 * @returns Object mapping asset tickers to arrays of [timestamp, price] pairs
 */
export async function getMultipleHistoricalData(
  assetTickers: string[], 
  from: Date, 
  to: Date,
  currency = 'eur'
): Promise<Record<string, [number, number][]>> {
  const days = dateRangeToDays(from, to);
  const result: Record<string, [number, number][]> = {};
  
  // We need to make separate requests for each asset
  const requests = assetTickers.map(async (ticker) => {
    const data = await getHistoricalMarketData(ticker, days, currency);
    if (data) {
      // Filter data to match the exact date range
      const fromTimestamp = from.getTime();
      const toTimestamp = to.getTime();
      const filteredData = data.filter(
        ([timestamp]) => timestamp >= fromTimestamp && timestamp <= toTimestamp
      );
      result[ticker] = filteredData;
    }
  });
  
  await Promise.all(requests);
  return result;
} 