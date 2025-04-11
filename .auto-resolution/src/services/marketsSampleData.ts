import { AssetTicker } from '@/assets/AssetTicker';

export interface SampleMarketDataItem {
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume: number;
  rank: number;
  marginMultiplier?: number;
}

export const SAMPLE_MARKET_DATA: Record<string, SampleMarketDataItem> = {
  // BTC pairs
  "BTC/EUR": { price: 37000.50, change24h: 2.5, change7d: 5.2, marketCap: 720000000000, volume: 25000000000, rank: 1, marginMultiplier: 3 },
  "BTC/USD": { price: 40100.75, change24h: 2.6, change7d: 5.3, marketCap: 720000000000, volume: 27000000000, rank: 2, marginMultiplier: 3 },
  
  // ETH pairs
  "ETH/EUR": { price: 1875.25, change24h: -1.2, change7d: 3.4, marketCap: 225000000000, volume: 15000000000, rank: 3, marginMultiplier: 5 },
  "ETH/USD": { price: 2025.80, change24h: -1.1, change7d: 3.5, marketCap: 225000000000, volume: 17000000000, rank: 4, marginMultiplier: 5 },
  "ETH/BTC": { price: 0.050632, change24h: -3.7, change7d: -1.8, marketCap: 0, volume: 8500000000, rank: 5 },
  
  // Stablecoins - EUR
  "USDT/EUR": { price: 0.91, change24h: -0.1, change7d: 0.2, marketCap: 95000000000, volume: 50000000000, rank: 6 },
  "USDC/EUR": { price: 0.91, change24h: -0.2, change7d: 0.1, marketCap: 28000000000, volume: 4000000000, rank: 7 },
  "DAI/EUR": { price: 0.905, change24h: -0.15, change7d: 0.05, marketCap: 5100000000, volume: 320000000, rank: 71 },
  
  // Stablecoins - USD
  "USDT/USD": { price: 1.00, change24h: 0.02, change7d: -0.03, marketCap: 95000000000, volume: 55000000000, rank: 8 },
  "USDC/USD": { price: 1.00, change24h: -0.01, change7d: 0.01, marketCap: 28000000000, volume: 5200000000, rank: 9 },
  "DAI/USD": { price: 0.998, change24h: -0.02, change7d: 0.01, marketCap: 5100000000, volume: 370000000, rank: 72 },
  "TUSD/USD": { price: 0.999, change24h: 0.01, change7d: -0.01, marketCap: 2200000000, volume: 115000000, rank: 73 },
  "BUSD/USD": { price: 1.001, change24h: 0.02, change7d: -0.01, marketCap: 1700000000, volume: 125000000, rank: 74 },
  
  // Major altcoins - EUR
  "BNB/EUR": { price: 260.50, change24h: 0.8, change7d: -2.1, marketCap: 39000000000, volume: 2000000000, rank: 10 },
  "SOL/EUR": { price: 85.00, change24h: 3.2, change7d: 10.5, marketCap: 36000000000, volume: 3000000000, rank: 11 },
  "XRP/EUR": { price: 0.45, change24h: 1.3, change7d: -0.8, marketCap: 24000000000, volume: 1500000000, rank: 12, marginMultiplier: 3 },
  "ADA/EUR": { price: 0.30, change24h: 0.5, change7d: -1.2, marketCap: 10500000000, volume: 500000000, rank: 13 },
  
  // Major altcoins - USD
  "BNB/USD": { price: 282.30, change24h: 0.9, change7d: -2.0, marketCap: 39000000000, volume: 2300000000, rank: 14 },
  "SOL/USD": { price: 92.15, change24h: 3.3, change7d: 10.6, marketCap: 36000000000, volume: 3500000000, rank: 15 },
  "XRP/USD": { price: 0.49, change24h: 1.4, change7d: -0.7, marketCap: 24000000000, volume: 1800000000, rank: 16, marginMultiplier: 3 },
  "ADA/USD": { price: 0.325, change24h: 0.6, change7d: -1.1, marketCap: 10500000000, volume: 620000000, rank: 17 },
  "TON/USD": { price: 7.65, change24h: 2.3, change7d: 6.8, marketCap: 26500000000, volume: 1100000000, rank: 75 },
  "MEME/USD": { price: 0.0000092, change24h: 0.7, change7d: 5.2, marketCap: 3800000000, volume: 820000000, rank: 76 },
  "WIF/USD": { price: 0.23, change24h: 1.8, change7d: 7.1, marketCap: 1100000000, volume: 280000000, rank: 77 },
  
  // BTC trading pairs
  "SOL/BTC": { price: 0.002297, change24h: 0.7, change7d: 5.2, marketCap: 0, volume: 1200000000, rank: 18 },
  "XRP/BTC": { price: 0.00001125, change24h: -1.2, change7d: -6.3, marketCap: 0, volume: 450000000, rank: 19 },
  "ADA/BTC": { price: 0.000008125, change24h: -2.5, change7d: -4.3, marketCap: 0, volume: 650000000, rank: 20 },
  
  // Mid-cap altcoins - EUR
  "DOGE/EUR": { price: 0.012345, change24h: 1.5, change7d: 4.3, marketCap: 10000000000, volume: 900000000, rank: 21 },
  "DOT/EUR": { price: 10.05, change24h: 0.8, change7d: 2.1, marketCap: 8900000000, volume: 350000000, rank: 22 },
  "TIA/EUR": { price: 15.75, change24h: 4.2, change7d: 12.5, marketCap: 7500000000, volume: 850000000, rank: 23 },
  "LTC/EUR": { price: 65.40, change24h: -0.5, change7d: 1.2, marketCap: 4800000000, volume: 320000000, rank: 24 },
  "MATIC/EUR": { price: 0.52, change24h: -1.8, change7d: -3.5, marketCap: 4300000000, volume: 280000000, rank: 25 },
  "LINK/EUR": { price: 13.20, change24h: 2.1, change7d: 5.8, marketCap: 7200000000, volume: 450000000, rank: 26 },
  "ATOM/EUR": { price: 7.85, change24h: -0.3, change7d: 1.9, marketCap: 2900000000, volume: 180000000, rank: 27 },
  "XMR/EUR": { price: 145.60, change24h: 1.1, change7d: 3.7, marketCap: 2700000000, volume: 120000000, rank: 28 },
  
  // Mid-cap altcoins - USD
  "DOGE/USD": { price: 0.0134, change24h: 1.6, change7d: 4.4, marketCap: 10000000000, volume: 1100000000, rank: 29 },
  "DOT/USD": { price: 10.90, change24h: 0.9, change7d: 2.2, marketCap: 8900000000, volume: 420000000, rank: 30 },
  "TIA/USD": { price: 17.10, change24h: 4.3, change7d: 12.6, marketCap: 7500000000, volume: 950000000, rank: 31 },
  "LTC/USD": { price: 70.95, change24h: -0.4, change7d: 1.3, marketCap: 4800000000, volume: 380000000, rank: 32 },
  "MATIC/USD": { price: 0.565, change24h: -1.7, change7d: -3.4, marketCap: 4300000000, volume: 320000000, rank: 33 },
  "LINK/USD": { price: 14.30, change24h: 2.2, change7d: 5.9, marketCap: 7200000000, volume: 520000000, rank: 34 },
  "ATOM/USD": { price: 8.50, change24h: -0.2, change7d: 2.0, marketCap: 2900000000, volume: 210000000, rank: 35 },
  "XMR/USD": { price: 157.80, change24h: 1.2, change7d: 3.8, marketCap: 2700000000, volume: 145000000, rank: 36 },
  "BCH/USD": { price: 342.15, change24h: 1.5, change7d: 3.2, marketCap: 6700000000, volume: 210000000, rank: 78 },
  "ETC/USD": { price: 19.25, change24h: 0.7, change7d: 1.9, marketCap: 2800000000, volume: 175000000, rank: 79 },
  "HBAR/USD": { price: 0.067, change24h: 1.3, change7d: 4.5, marketCap: 2200000000, volume: 95000000, rank: 80 },
  "XLM/USD": { price: 0.098, change24h: 0.5, change7d: 1.2, marketCap: 2800000000, volume: 125000000, rank: 81 },
  "VET/USD": { price: 0.027, change24h: 0.8, change7d: 2.3, marketCap: 1900000000, volume: 85000000, rank: 82 },
  
  // DeFi tokens - EUR
  "AVAX/EUR": { price: 22.75, change24h: 2.3, change7d: 6.7, marketCap: 8100000000, volume: 350000000, rank: 37 },
  "ALGO/EUR": { price: 0.12, change24h: -0.7, change7d: -2.3, marketCap: 940000000, volume: 83000000, rank: 38 },
  "UNI/EUR": { price: 4.95, change24h: 1.2, change7d: 3.8, marketCap: 3700000000, volume: 140000000, rank: 39 },
  "AAVE/EUR": { price: 82.30, change24h: 0.9, change7d: 4.1, marketCap: 1200000000, volume: 91000000, rank: 40 },
  
  // DeFi tokens - USD
  "AVAX/USD": { price: 24.65, change24h: 2.4, change7d: 6.8, marketCap: 8100000000, volume: 410000000, rank: 41 },
  "ALGO/USD": { price: 0.13, change24h: -0.6, change7d: -2.2, marketCap: 940000000, volume: 95000000, rank: 42 },
  "UNI/USD": { price: 5.36, change24h: 1.3, change7d: 3.9, marketCap: 3700000000, volume: 165000000, rank: 43 },
  "AAVE/USD": { price: 89.20, change24h: 1.0, change7d: 4.2, marketCap: 1200000000, volume: 105000000, rank: 44 },
  "MKR/USD": { price: 1785.60, change24h: 2.1, change7d: 7.5, marketCap: 1600000000, volume: 92000000, rank: 83 },
  "COMP/USD": { price: 52.80, change24h: 1.3, change7d: 4.5, marketCap: 420000000, volume: 75000000, rank: 84 },
  "CRV/USD": { price: 0.48, change24h: 0.9, change7d: 3.1, marketCap: 530000000, volume: 58000000, rank: 85 },
  "LDO/USD": { price: 1.62, change24h: 1.8, change7d: 5.2, marketCap: 1450000000, volume: 87000000, rank: 86 },
  "SNX/USD": { price: 2.84, change24h: 1.4, change7d: 6.3, marketCap: 915000000, volume: 72000000, rank: 87 },
  "YFI/USD": { price: 9723.50, change24h: 2.5, change7d: 8.7, marketCap: 325000000, volume: 42000000, rank: 88 },
  
  // Exchange tokens
  "CRO/EUR": { price: 0.074, change24h: -0.4, change7d: 1.0, marketCap: 2000000000, volume: 32000000, rank: 45 },
  "CRO/USD": { price: 0.080, change24h: -0.3, change7d: 1.1, marketCap: 2000000000, volume: 38000000, rank: 46 },
  "FTX/USD": { price: 282.30, change24h: 0.9, change7d: -2.0, marketCap: 39000000000, volume: 2300000000, rank: 89 },
  "OKB/USD": { price: 43.75, change24h: 0.7, change7d: 1.8, marketCap: 2600000000, volume: 21000000, rank: 90 },
  "KCS/USD": { price: 8.05, change24h: 0.5, change7d: 1.3, marketCap: 560000000, volume: 12000000, rank: 91 },
  
  // L1/L2 platforms - EUR
  "NEAR/EUR": { price: 3.87, change24h: 2.8, change7d: 7.9, marketCap: 3900000000, volume: 210000000, rank: 47 },
  "FTM/EUR": { price: 0.38, change24h: 1.5, change7d: 5.2, marketCap: 1100000000, volume: 180000000, rank: 48 },
  "OP/EUR": { price: 2.04, change24h: 1.8, change7d: 5.2, marketCap: 1800000000, volume: 210000000, rank: 49 },
  "ARB/EUR": { price: 0.83, change24h: 1.1, change7d: 4.2, marketCap: 1300000000, volume: 84000000, rank: 50 },
  
  // L1/L2 platforms - USD
  "NEAR/USD": { price: 4.20, change24h: 2.9, change7d: 8.0, marketCap: 3900000000, volume: 240000000, rank: 51 },
  "FTM/USD": { price: 0.41, change24h: 1.6, change7d: 5.3, marketCap: 1100000000, volume: 205000000, rank: 52 },
  "OP/USD": { price: 2.21, change24h: 1.9, change7d: 5.3, marketCap: 1800000000, volume: 240000000, rank: 53 },
  "ARB/USD": { price: 0.90, change24h: 1.2, change7d: 4.3, marketCap: 1300000000, volume: 95000000, rank: 54 },
  "SEI/USD": { price: 0.445, change24h: 0.9, change7d: 3.2, marketCap: 1050000000, volume: 78000000, rank: 92 },
  "SUI/USD": { price: 0.73, change24h: 1.5, change7d: 5.4, marketCap: 950000000, volume: 85000000, rank: 93 },
  "STRK/USD": { price: 1.83, change24h: 2.1, change7d: 6.5, marketCap: 780000000, volume: 65000000, rank: 94 },
  "RNDR/USD": { price: 2.35, change24h: 2.2, change7d: 6.7, marketCap: 1320000000, volume: 112000000, rank: 95 },
  "EGLD/USD": { price: 35.20, change24h: 1.1, change7d: 3.8, marketCap: 920000000, volume: 45000000, rank: 96 },
  "FLOW/USD": { price: 0.75, change24h: 0.8, change7d: 2.5, marketCap: 825000000, volume: 38000000, rank: 97 },
  "ZIL/USD": { price: 0.028, change24h: 1.2, change7d: 4.1, marketCap: 450000000, volume: 25000000, rank: 98 },
  
  // Metaverse/gaming - EUR
  "SAND/EUR": { price: 0.41, change24h: -1.3, change7d: -0.9, marketCap: 940000000, volume: 83000000, rank: 55 },
  "MANA/EUR": { price: 0.35, change24h: -0.8, change7d: 2.3, marketCap: 830000000, volume: 76000000, rank: 56 },
  "APE/EUR": { price: 1.35, change24h: 2.7, change7d: 9.3, marketCap: 620000000, volume: 120000000, rank: 57 },
  
  // Metaverse/gaming - USD
  "SAND/USD": { price: 0.445, change24h: -1.2, change7d: -0.8, marketCap: 940000000, volume: 95000000, rank: 58 },
  "MANA/USD": { price: 0.38, change24h: -0.7, change7d: 2.4, marketCap: 830000000, volume: 85000000, rank: 59 },
  "APE/USD": { price: 1.46, change24h: 2.8, change7d: 9.4, marketCap: 620000000, volume: 135000000, rank: 60 },
  "ILV/USD": { price: 67.75, change24h: 1.8, change7d: 5.9, marketCap: 235000000, volume: 18000000, rank: 99 },
  "ENJ/USD": { price: 0.315, change24h: 0.4, change7d: 1.8, marketCap: 335000000, volume: 27000000, rank: 100 },
  "AXS/USD": { price: 5.78, change24h: 3.2, change7d: 8.5, marketCap: 795000000, volume: 62000000, rank: 101 },
  "GALA/USD": { price: 0.018, change24h: 0.9, change7d: 3.1, marketCap: 520000000, volume: 42000000, rank: 102 },
  
  // Meme coins - EUR/USD
  "SHIB/EUR": { price: 0.0000185, change24h: 0.9, change7d: 3.1, marketCap: 11000000000, volume: 430000000, rank: 61 },
  "SHIB/USD": { price: 0.0000201, change24h: 1.0, change7d: 3.2, marketCap: 11000000000, volume: 490000000, rank: 62 },
  "BONK/EUR": { price: 0.0000141, change24h: 1.8, change7d: 7.5, marketCap: 890000000, volume: 110000000, rank: 63 },
  "BONK/USD": { price: 0.0000153, change24h: 1.9, change7d: 7.6, marketCap: 890000000, volume: 125000000, rank: 64 },
  "ELON/USD": { price: 0.0134, change24h: 1.6, change7d: 4.4, marketCap: 10000000000, volume: 1100000000, rank: 103 },
  "FLOKI/USD": { price: 0.0001253, change24h: 2.1, change7d: 7.2, marketCap: 1250000000, volume: 135000000, rank: 104 },
  "WOJAK/USD": { price: 0.0000092, change24h: 2.3, change7d: 8.4, marketCap: 3800000000, volume: 680000000, rank: 105 },
  "BABYDOGE/USD": { price: 0.000000001453, change24h: 1.2, change7d: 4.3, marketCap: 240000000, volume: 32000000, rank: 106 },
  
  // Other popular altcoins
  "APT/EUR": { price: 5.97, change24h: 0.5, change7d: 2.3, marketCap: 1700000000, volume: 98000000, rank: 65 },
  "APT/USD": { price: 6.48, change24h: 0.6, change7d: 2.4, marketCap: 1700000000, volume: 110000000, rank: 66 },
  "IMX/EUR": { price: 1.48, change24h: 3.6, change7d: 12.8, marketCap: 2100000000, volume: 175000000, rank: 67 },
  "IMX/USD": { price: 1.60, change24h: 3.7, change7d: 12.9, marketCap: 2100000000, volume: 195000000, rank: 68 },
  "STX/EUR": { price: 1.32, change24h: 2.3, change7d: 7.8, marketCap: 1900000000, volume: 102000000, rank: 69 },
  "STX/USD": { price: 1.43, change24h: 2.4, change7d: 7.9, marketCap: 1900000000, volume: 115000000, rank: 70 },
  "ICP/USD": { price: 6.35, change24h: 1.1, change7d: 3.6, marketCap: 1450000000, volume: 85000000, rank: 107 },
  "FIL/USD": { price: 4.68, change24h: 1.5, change7d: 5.3, marketCap: 1350000000, volume: 95000000, rank: 108 },
  "XTZ/USD": { price: 0.81, change24h: 0.6, change7d: 1.9, marketCap: 780000000, volume: 42000000, rank: 109 },
  "EOS/USD": { price: 0.63, change24h: 0.4, change7d: 1.5, marketCap: 710000000, volume: 38000000, rank: 110 },
  "GRT/USD": { price: 0.145, change24h: 0.9, change7d: 3.2, marketCap: 1350000000, volume: 78000000, rank: 111 },
  "CHZ/USD": { price: 0.087, change24h: 1.2, change7d: 4.7, marketCap: 680000000, volume: 45000000, rank: 112 },
  "ROSE/USD": { price: 0.057, change24h: 1.5, change7d: 5.1, marketCap: 420000000, volume: 32000000, rank: 113 },
  "ONE/USD": { price: 0.0115, change24h: 1.3, change7d: 4.7, marketCap: 155000000, volume: 15000000, rank: 114 },
  "THETA/USD": { price: 0.96, change24h: 0.7, change7d: 2.6, marketCap: 980000000, volume: 52000000, rank: 115 }
};

// Helper to get a balanced subset for testing with fewer entries
export const getBalancedSampleData = (count: number = 20): Record<string, SampleMarketDataItem> => {
  const entries = Object.entries(SAMPLE_MARKET_DATA);
  if (count >= entries.length) return SAMPLE_MARKET_DATA;
  
  // Ensure we have both EUR and USD pairs
  const eurPairs = entries.filter(([pair]) => pair.includes('/EUR'));
  const usdPairs = entries.filter(([pair]) => pair.includes('/USD'));
  const btcPairs = entries.filter(([pair]) => pair.includes('/BTC'));
  
  // Count all available pairs
  console.log('Available pairs by currency:', {
    EUR: eurPairs.length,
    USD: usdPairs.length,
    BTC: btcPairs.length,
    Total: entries.length
  });
  
  // Calculate how many of each to include for a balanced result
  // Adjust distribution to ensure we get a good number of USD pairs
  const eurCount = Math.floor(count * 0.35); // ~35% EUR pairs
  const usdCount = Math.floor(count * 0.55); // ~55% USD pairs (increased)
  const btcCount = count - eurCount - usdCount;  // remainder for BTC pairs
  
  console.log('Target distribution:', {
    EUR: eurCount,
    USD: usdCount,
    BTC: btcCount
  });
  
  const selectedEurPairs = eurPairs.slice(0, Math.min(eurCount, eurPairs.length));
  const selectedUsdPairs = usdPairs.slice(0, Math.min(usdCount, usdPairs.length));
  const selectedBtcPairs = btcPairs.slice(0, Math.min(btcCount, btcPairs.length));
  
  const selectedPairs = [...selectedEurPairs, ...selectedUsdPairs, ...selectedBtcPairs];
  
  // Log the actual distribution
  const result = Object.fromEntries(selectedPairs);
  console.log('Final distribution:', {
    EUR: Object.keys(result).filter(pair => pair.includes('/EUR')).length,
    USD: Object.keys(result).filter(pair => pair.includes('/USD')).length,
    BTC: Object.keys(result).filter(pair => pair.includes('/BTC')).length,
    Total: Object.keys(result).length
  });
  
  return result;
}; 