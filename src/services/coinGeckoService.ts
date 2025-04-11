import { AssetTicker, ASSETS } from "@/assets/AssetTicker";
import { ASSET_TYPE } from "@/assets/common";
import { rateLimiter } from './rateLimit';

/**
 * Base URL for CoinGecko API v3
 */
const COINGECKO_API_URL = import.meta.env.PROD 
  ? 'https://api.coingecko.com/api/v3' 
  : '/coingecko'; // Use Vite proxy in development, direct URL in production

/**
 * API key for CoinGecko API
 * Uses environment variable for security, but hard-coded for testing
 */
const API_KEY = 'CG-bc3TbY6Y8XbV9PoDZX5BZgtQ';
// In production would use: import.meta.env.VITE_COINGECKO_API_KEY || '';

/**
 * Fiat currencies to get exchange rates for
 */
const FIAT_CURRENCIES = ['eur', 'usd', 'gbp', 'aud', 'sek', 'cad'];

/**
 * Interface for coin price response from CoinGecko
 */
interface CoinPriceResponse {
  [coinId: string]: {
    [currency: string]: number;
  } & {
    last_updated_at?: number;
  };
}

/**
 * Interface for exchange rate data
 */
export interface ExchangeRateData {
  [cryptoSymbol: string]: {
    [fiatCurrency: string]: number;
  } & {
    last_updated?: number; // This way it doesn't conflict with the index signature
  };
}

/**
 * Map asset tickers to CoinGecko IDs
 * This mapping is necessary because CoinGecko uses different IDs than our internal tickers
 */
const ASSET_TICKER_TO_COINGECKO_ID: Record<string, string> = {
  // Major cryptocurrencies
  BTC: 'bitcoin',
  ETH: 'ethereum',
  XRP: 'ripple',
  LTC: 'litecoin',
  BCH: 'bitcoin-cash',
  ADA: 'cardano',
  DOT: 'polkadot',
  LINK: 'chainlink',
  XLM: 'stellar',
  DOGE: 'dogecoin',
  SOL: 'solana',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  POL: 'polygon-ecosystem-token',
  ATOM: 'cosmos',
  NEAR: 'near',
  
  // DeFi tokens
  AAVE: 'aave',
  UNI: 'uniswap',
  COMP: 'compound-governance-token',
  MKR: 'maker',
  SNX: 'havven',
  SUSHI: 'sushi',
  '1INCH': '1inch',
  CRV: 'curve-dao-token',
  LDO: 'lido-dao',
  CVX: 'convex-finance',
  YFI: 'yearn-finance',
  PERP: 'perpetual-protocol',
  STG: 'stargate-finance',
  ANKR: 'ankr',
  FET: 'fetch-ai',
  DYDX: 'dydx-chain',
  CHZ: 'chiliz',
  
  // Stablecoins
  DAI: 'dai',
  USDC: 'usd-coin',
  USDT: 'tether',
  UST: 'terrausd',
  
  // NFT & Metaverse tokens
  APE: 'apecoin',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  IMX: 'immutable-x',
  ENS: 'ethereum-name-service',
  GALA: 'gala',
  AUDIO: 'audius',
  
  // Layer 2 & Scaling
  LRC: 'loopring',
  OP: 'optimism',
  ARB: 'arbitrum',
  AXL: 'axelar',
  
  // Other notable tokens
  TIA: 'celestia',
  RPL: 'rocket-pool',
  ALPH: 'alephium',
  APT: 'aptos',
  CELO: 'celo',
  HBAR: 'hedera-hashgraph',
  ALGO: 'algorand',
  KSM: 'kusama',
  KDA: 'kadena',
  WKDA: 'wrapped-kadena',
  XTZ: 'tezos',
  FLUX: 'zelcash',
  HOT: 'holotoken',
  STORJ: 'storj',
  CTSI: 'cartesi',
  GRT: 'the-graph',
  LTO: 'lto-network',
  NMR: 'numeraire',
  RNDR: 'render-token',
  LUNA: 'terra-luna',
  OCTA: 'octopus-network',
  NOIA: 'synternet-synt',
  VXV: 'vectorspace',
  QRDO: 'qredo',
  OCEAN: 'ocean-protocol',
  BLUR: 'blur',
  BST: 'blocksquare',
  RIO: 'realio-network',
  PRO: 'propy',
  COVAL: 'circuits-of-value',
  ENJ: 'enjincoin',
  UOS: 'ultra',
  HTR: 'hathor',
  LILAI: 'lilai',
  BAT: 'basic-attention-token',
  OMG: 'omisego',
  BAND: 'band-protocol',
  MIR: 'mirror-protocol',
  LMWR: 'limewire-token',
  XCM: 'coinmetro',
  VSP: 'vesper-finance',
  WHL: 'whaleroom',
  ENA: 'ethena',
  THT: 'thought',
  QNT: 'quant-network',
  PRQ: 'parsiq',
  DNA: 'encrypgen',
  ALBT: 'allianceblock-nexera',
  PROPS: 'propbase',
  
  // Add any missing assets with corresponding CoinGecko IDs
};

// Export the mapping for use in other components
export { ASSET_TICKER_TO_COINGECKO_ID };

/**
 * Debug function to log assets without mappings
 */
export const logUnmappedAssets = (): void => {
  const allAssets = Object.keys(ASSETS).filter(ticker => {
    const asset = ASSETS[ticker as keyof typeof ASSETS];
    return asset?.type === ASSET_TYPE.Crypto;
  });
  
  const mappedAssets = Object.keys(ASSET_TICKER_TO_COINGECKO_ID);
  const unmappedAssets = allAssets.filter(asset => !mappedAssets.includes(asset));
  
  console.log('Total crypto assets:', allAssets.length);
  console.log('Mapped assets:', mappedAssets.length);
  console.log('Unmapped assets:', unmappedAssets.length);
  console.log('Unmapped asset list:', unmappedAssets);
};

/**
 * Get all crypto assets from ASSETS that have CoinGecko mappings
 */
export const getMappedCryptoAssets = (): string[] => {
  // Filter crypto assets that have CoinGecko ID mappings
  return Object.keys(ASSETS)
    .filter(ticker => {
      const asset = ASSETS[ticker as keyof typeof ASSETS];
      return asset?.type === ASSET_TYPE.Crypto && 
        ASSET_TICKER_TO_COINGECKO_ID[ticker];
    });
};

/**
 * Get all crypto assets regardless of mapping
 */
export const getAllCryptoAssets = (): string[] => {
  return Object.keys(ASSETS).filter(ticker => {
    const asset = ASSETS[ticker as keyof typeof ASSETS];
    return asset?.type === ASSET_TYPE.Crypto;
  });
};

/**
 * Get CoinGecko IDs for all mapped crypto assets
 */
export const getCoinGeckoIds = (): string[] => {
  const cryptoAssets = getMappedCryptoAssets();
  return cryptoAssets
    .map(ticker => ASSET_TICKER_TO_COINGECKO_ID[ticker])
    .filter(Boolean);
};

// Register the exchange rates fetcher with the rate limiter
const EXCHANGE_RATES_KEY = 'coingecko_exchange_rates';

// Initialize the rate limiter with our fetcher function
rateLimiter.registerFetcher(EXCHANGE_RATES_KEY, async () => {
  try {
    const coinIds = getCoinGeckoIds().join(',');
    const currencies = FIAT_CURRENCIES.join(',');
    
    const url = `${COINGECKO_API_URL}/simple/price?ids=${coinIds}&vs_currencies=${currencies}&include_last_updated_at=true&x_cg_api_key=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      // Check if we're getting HTML instead of JSON (error page)
      if (contentType.includes('text/html')) {
        throw new Error(`CoinGecko API returned HTML instead of JSON. Rate limit may have been reached or API key may be invalid.`);
      }
      
      // Try to parse error as JSON, fallback to statusText if that fails
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`CoinGecko API error: ${errorData.error || response.statusText}`);
    }
    
    // Check content type before parsing to avoid JSON parse errors
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`CoinGecko API returned non-JSON response: ${contentType}`);
    }
    
    const responseText = await response.text();
    let data: CoinPriceResponse;
    
    try {
      data = JSON.parse(responseText);
      
      // Validate response format
      if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
        console.error('Invalid API response format:', responseText.substring(0, 100));
        throw new Error('Invalid API response format: Expected non-empty object');
      }
      
      // Check if at least one entry has the expected structure
      const hasValidFormat = Object.values(data).some(entry => {
        return entry && typeof entry === 'object' && !Array.isArray(entry) && 
               Object.keys(entry).some(key => typeof entry[key] === 'number');
      });
      
      if (!hasValidFormat) {
        console.error('Invalid API response structure:', responseText.substring(0, 100));
        throw new Error('Invalid API response structure: Missing price data');
      }
    } catch (e: unknown) {
      console.error('Failed to parse or validate CoinGecko response:', e);
      if (e instanceof Error && e.message.includes('Invalid API response')) {
        throw e; // Re-throw validation errors
      }
      throw new Error('Failed to parse CoinGecko response');
    }
    
    // Transform the data into our ExchangeRateData format
    return transformCoinGeckoResponse(data);
  } catch (error) {
    console.error('Error in CoinGecko exchange rates fetcher:', error);
    throw error;
  }
});

/**
 * Fetch exchange rates for multiple cryptocurrencies at once
 */
export const fetchExchangeRates = async (): Promise<ExchangeRateData> => {
  try {
    // Use the rate limiter to handle batching and caching
    return await rateLimiter.queueRequest<ExchangeRateData>(EXCHANGE_RATES_KEY);
  } catch (error) {
    console.error('Error fetching exchange rates through rate limiter:', error);
    throw error;
  }
};

/**
 * Fetch current price of a single cryptocurrency in specified currencies
 */
export const fetchCoinPrice = async (coinId: string, currencies: string[] = FIAT_CURRENCIES): Promise<Record<string, number>> => {
  try {
    const url = `${COINGECKO_API_URL}/simple/price?ids=${coinId}&vs_currencies=${currencies.join(',')}&x_cg_api_key=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      // Check if we're getting HTML instead of JSON (error page)
      if (contentType.includes('text/html')) {
        throw new Error(`CoinGecko API returned HTML instead of JSON. Rate limit may have been reached or API key may be invalid.`);
      }
      
      // Try to parse error as JSON, fallback to statusText if that fails
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`CoinGecko API error: ${errorData.error || response.statusText}`);
    }
    
    // Check content type before parsing to avoid JSON parse errors
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`CoinGecko API returned non-JSON response: ${contentType}`);
    }
    
    const responseText = await response.text();
    let data: CoinPriceResponse;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse CoinGecko response as JSON:', responseText.substring(0, 100));
      throw new Error(`Invalid JSON response from CoinGecko API`);
    }
    
    return data[coinId] || {};
  } catch (error) {
    console.error(`Error fetching price for ${coinId}:`, error);
    throw error;
  }
};

/**
 * Fetch market data for a coin including price, market cap and volume
 */
export const fetchCoinMarketData = async (coinId: string, vsCurrencies: string[] = FIAT_CURRENCIES): Promise<{
  prices: Record<string, number>;
  marketCaps: Record<string, number>;
  volumes: Record<string, number>;
}> => {
  try {
    // Include market cap and 24h volume data in the request
    const url = `${COINGECKO_API_URL}/simple/price?ids=${coinId}&vs_currencies=${vsCurrencies.join(',')}&include_market_cap=true&include_24hr_vol=true&x_cg_api_key=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      // Check if we're getting HTML instead of JSON (error page)
      if (contentType.includes('text/html')) {
        throw new Error(`CoinGecko API returned HTML instead of JSON. Rate limit may have been reached or API key may be invalid.`);
      }
      
      // Try to parse error as JSON, fallback to statusText if that fails
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`CoinGecko API error: ${errorData.error || response.statusText}`);
    }
    
    // Check content type before parsing to avoid JSON parse errors
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`CoinGecko API returned non-JSON response: ${contentType}`);
    }
    
    const responseText = await response.text();
    let data: any;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse CoinGecko response as JSON:', responseText.substring(0, 100));
      throw new Error(`Invalid JSON response from CoinGecko API`);
    }
    
    if (!data[coinId]) {
      throw new Error(`No data returned for coin ID: ${coinId}`);
    }
    
    // Extract prices, market caps and volumes
    const result = {
      prices: {},
      marketCaps: {},
      volumes: {}
    };
    
    for (const currency of vsCurrencies) {
      // Format: data[coinId][usd] = price, data[coinId][usd_market_cap] = market cap, etc.
      result.prices[currency] = data[coinId][currency] || 0;
      result.marketCaps[currency] = data[coinId][`${currency}_market_cap`] || 0;
      result.volumes[currency] = data[coinId][`${currency}_24h_vol`] || 0;
    }
    
    return result;
  } catch (error) {
    console.error(`Error fetching market data for ${coinId}:`, error);
    throw error;
  }
};

/**
 * Fetch market data for multiple coins at once
 */
export const fetchMultipleCoinsMarketData = async (coinIds: string[], vsCurrencies: string[] = FIAT_CURRENCIES) => {
  try {
    // Include market cap and 24h volume data in the request
    const url = `${COINGECKO_API_URL}/simple/price?ids=${coinIds.join(',')}&vs_currencies=${vsCurrencies.join(',')}&include_market_cap=true&include_24h_vol=true&x_cg_api_key=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching market data for multiple coins:`, error);
    throw error;
  }
};

/**
 * Service for interacting with the CoinGecko API
 */
export const coinGeckoService = {
  fetchExchangeRates,
  fetchCoinPrice,
  fetchCoinMarketData,
  fetchMultipleCoinsMarketData,
  FIAT_CURRENCIES,
  getMappedCryptoAssets,
  getAllCryptoAssets,
  getCoinGeckoIds,
  logUnmappedAssets,
};

export default coinGeckoService; 

/**
 * Transform CoinGecko response to our ExchangeRateData format
 */
function transformCoinGeckoResponse(data: CoinPriceResponse): ExchangeRateData {
  const exchangeRates: ExchangeRateData = {};
  
  // Reverse mapping from CoinGecko ID to asset ticker
  const coinGeckoIdToAssetTicker = Object.entries(ASSET_TICKER_TO_COINGECKO_ID)
    .reduce((acc, [ticker, id]) => {
      acc[id] = ticker;
      return acc;
    }, {} as Record<string, string>);
  
  // Transform the data
  Object.entries(data).forEach(([coinId, rates]) => {
    const ticker = coinGeckoIdToAssetTicker[coinId];
    if (ticker) {
      const rateObj: Record<string, number> = {};
      
      // Process exchange rates separately from last_updated
      Object.entries(rates).forEach(([currency, rate]) => {
        if (currency !== 'last_updated_at') {
          rateObj[currency] = rate as number;
        }
      });
      
      // Add to the exchange rates with the last_updated property
      exchangeRates[ticker] = {
        ...rateObj,
        last_updated: rates.last_updated_at || Date.now() / 1000
      };
    }
  });
  
  return exchangeRates;
}