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
  // Major pairs
  "ETH/USDC": { price: 2025.80, change24h: -1.1, change7d: 3.5, marketCap: 225000000000, volume: 17000000000, rank: 1, marginMultiplier: 5 },
  "ETH/USDT": { price: 2025.50, change24h: -1.2, change7d: 3.4, marketCap: 225000000000, volume: 16000000000, rank: 2, marginMultiplier: 5 },
  "ETH/EUR": { price: 1875.25, change24h: -1.2, change7d: 3.4, marketCap: 225000000000, volume: 15000000000, rank: 3, marginMultiplier: 5 },
  "USDC/EUR": { price: 0.91, change24h: -0.2, change7d: 0.1, marketCap: 28000000000, volume: 4000000000, rank: 4 },
  "BTC/EUR": { price: 37000.50, change24h: 2.5, change7d: 5.2, marketCap: 720000000000, volume: 25000000000, rank: 5, marginMultiplier: 3 },
  "ETH/USD": { price: 2025.80, change24h: -1.1, change7d: 3.5, marketCap: 225000000000, volume: 17000000000, rank: 6, marginMultiplier: 5 },
  "BTC/USDC": { price: 40100.75, change24h: 2.6, change7d: 5.3, marketCap: 720000000000, volume: 27000000000, rank: 7, marginMultiplier: 3 },
  "BTC/USDT": { price: 40100.50, change24h: 2.5, change7d: 5.2, marketCap: 720000000000, volume: 26000000000, rank: 8, marginMultiplier: 3 },
  "SOL/EUR": { price: 85.00, change24h: 3.2, change7d: 10.5, marketCap: 36000000000, volume: 3000000000, rank: 9 },
  "XRP/EUR": { price: 0.45, change24h: 1.3, change7d: -0.8, marketCap: 24000000000, volume: 1500000000, rank: 10, marginMultiplier: 3 },
  "SOL/USDT": { price: 92.15, change24h: 3.3, change7d: 10.6, marketCap: 36000000000, volume: 3500000000, rank: 11 },
  "SOL/USDC": { price: 92.20, change24h: 3.4, change7d: 10.7, marketCap: 36000000000, volume: 3200000000, rank: 12 },
  "USDC/USDT": { price: 1.001, change24h: 0.01, change7d: -0.01, marketCap: 28000000000, volume: 5000000000, rank: 13 },
  "XRP/USDT": { price: 0.49, change24h: 1.4, change7d: -0.7, marketCap: 24000000000, volume: 1800000000, rank: 14, marginMultiplier: 3 },
  "BTC/USD": { price: 40100.75, change24h: 2.6, change7d: 5.3, marketCap: 720000000000, volume: 27000000000, rank: 15, marginMultiplier: 3 },
  "LTC/EUR": { price: 65.40, change24h: -0.5, change7d: 1.2, marketCap: 4800000000, volume: 320000000, rank: 16 },
  "KDA/EUR": { price: 0.95, change24h: 1.2, change7d: 4.5, marketCap: 250000000, volume: 15000000, rank: 17 },
  "XRP/USD": { price: 0.49, change24h: 1.4, change7d: -0.7, marketCap: 24000000000, volume: 1800000000, rank: 18, marginMultiplier: 3 },
  "DOT/USDT": { price: 10.90, change24h: 0.9, change7d: 2.2, marketCap: 8900000000, volume: 420000000, rank: 19 },
  "USDT/EUR": { price: 0.91, change24h: -0.1, change7d: 0.2, marketCap: 95000000000, volume: 50000000000, rank: 20 },
  "XCM/EUR": { price: 0.50, change24h: -0.8, change7d: 2.5, marketCap: 150000000, volume: 12000000, rank: 21 },
  "QNT/EUR": { price: 105.75, change24h: 1.5, change7d: 4.8, marketCap: 1500000000, volume: 85000000, rank: 22 },
  "THT/USDT": { price: 0.025, change24h: 0.5, change7d: 1.8, marketCap: 75000000, volume: 5000000, rank: 23 },
  "XCM/USDT": { price: 0.55, change24h: -0.7, change7d: 2.6, marketCap: 150000000, volume: 13000000, rank: 24 },
  "ADA/USDT": { price: 0.325, change24h: 0.6, change7d: -1.1, marketCap: 10500000000, volume: 620000000, rank: 25 },
  "SOL/USD": { price: 92.15, change24h: 3.3, change7d: 10.6, marketCap: 36000000000, volume: 3500000000, rank: 26 },
  "XLM/EUR": { price: 0.090, change24h: 0.4, change7d: 1.1, marketCap: 2500000000, volume: 115000000, rank: 27 },
  "CRV/USDT": { price: 0.48, change24h: 0.9, change7d: 3.1, marketCap: 530000000, volume: 58000000, rank: 28 },
  "DOT/USD": { price: 10.90, change24h: 0.9, change7d: 2.2, marketCap: 8900000000, volume: 420000000, rank: 29 },
  "QNT/GBP": { price: 90.50, change24h: 1.4, change7d: 4.7, marketCap: 1500000000, volume: 80000000, rank: 30 },
  "DOT/EUR": { price: 10.05, change24h: 0.8, change7d: 2.1, marketCap: 8900000000, volume: 350000000, rank: 31 },
  "LTC/USD": { price: 70.95, change24h: -0.4, change7d: 1.3, marketCap: 4800000000, volume: 380000000, rank: 32 },
  "ADA/EUR": { price: 0.30, change24h: 0.5, change7d: -1.2, marketCap: 10500000000, volume: 500000000, rank: 33 },
  "USDT/GBP": { price: 0.79, change24h: -0.2, change7d: 0.1, marketCap: 95000000000, volume: 45000000000, rank: 34 },
  "CHZ/USDT": { price: 0.087, change24h: 1.2, change7d: 4.7, marketCap: 680000000, volume: 45000000, rank: 35 },
  "XLM/USDT": { price: 0.098, change24h: 0.5, change7d: 1.2, marketCap: 2800000000, volume: 125000000, rank: 36 },
  "QNT/USD": { price: 115.80, change24h: 1.6, change7d: 4.9, marketCap: 1500000000, volume: 90000000, rank: 37 },
  "LILAI/USDT": { price: 0.015, change24h: 0.8, change7d: 2.5, marketCap: 50000000, volume: 3000000, rank: 38 },
  "HBAR/EUR": { price: 0.062, change24h: 1.2, change7d: 4.2, marketCap: 2000000000, volume: 85000000, rank: 39 },
  "SUSHI/USDT": { price: 1.25, change24h: 1.5, change7d: 5.2, marketCap: 320000000, volume: 45000000, rank: 40 },
  "HTR/USDT": { price: 0.85, change24h: 0.9, change7d: 3.1, marketCap: 180000000, volume: 12000000, rank: 41 },
  "KDA/USDT": { price: 1.05, change24h: 1.3, change7d: 4.6, marketCap: 250000000, volume: 16000000, rank: 42 },
  "LINK/EUR": { price: 13.20, change24h: 2.1, change7d: 5.8, marketCap: 7200000000, volume: 450000000, rank: 43 },
  "USDT/USD": { price: 1.00, change24h: 0.02, change7d: -0.03, marketCap: 95000000000, volume: 55000000000, rank: 44 },
  "HBAR/USD": { price: 0.067, change24h: 1.3, change7d: 4.5, marketCap: 2200000000, volume: 95000000, rank: 45 },
  "USDC/USD": { price: 1.00, change24h: -0.01, change7d: 0.01, marketCap: 28000000000, volume: 5200000000, rank: 46 },
  "ATOM/USDT": { price: 8.50, change24h: -0.2, change7d: 2.0, marketCap: 2900000000, volume: 210000000, rank: 47 },
  "NEAR/USDT": { price: 4.20, change24h: 2.9, change7d: 8.0, marketCap: 3900000000, volume: 240000000, rank: 48 },
  "YFI/USDT": { price: 9723.50, change24h: 2.5, change7d: 8.7, marketCap: 325000000, volume: 42000000, rank: 49 },
  "ETH/BTC": { price: 0.050632, change24h: -3.7, change7d: -1.8, marketCap: 0, volume: 8500000000, rank: 50 },
  "MKR/USDT": { price: 1785.60, change24h: 2.1, change7d: 7.5, marketCap: 1600000000, volume: 92000000, rank: 51 },
  "BCH/USDT": { price: 342.15, change24h: 1.5, change7d: 3.2, marketCap: 6700000000, volume: 210000000, rank: 52 },
  "AAVE/EUR": { price: 82.30, change24h: 0.9, change7d: 4.1, marketCap: 1200000000, volume: 91000000, rank: 53 },
  "AAVE/USDT": { price: 89.20, change24h: 1.0, change7d: 4.2, marketCap: 1200000000, volume: 105000000, rank: 54 },
  "LTC/USDT": { price: 70.95, change24h: -0.4, change7d: 1.3, marketCap: 4800000000, volume: 380000000, rank: 55 },
  "QNT/USDT": { price: 115.80, change24h: 1.6, change7d: 4.9, marketCap: 1500000000, volume: 90000000, rank: 56 },
  "COMP/USDT": { price: 52.80, change24h: 1.3, change7d: 4.5, marketCap: 420000000, volume: 75000000, rank: 57 },
  "AVAX/USDT": { price: 24.65, change24h: 2.4, change7d: 6.8, marketCap: 8100000000, volume: 410000000, rank: 58 },
  "ENS/USDT": { price: 8.75, change24h: 1.2, change7d: 4.5, marketCap: 250000000, volume: 25000000, rank: 59 },
  "KSM/USD": { price: 45.20, change24h: 1.8, change7d: 5.5, marketCap: 420000000, volume: 35000000, rank: 60 },
  "KSM/USDT": { price: 45.20, change24h: 1.8, change7d: 5.5, marketCap: 420000000, volume: 35000000, rank: 61 },
  "LINK/USDT": { price: 14.30, change24h: 2.2, change7d: 5.9, marketCap: 7200000000, volume: 520000000, rank: 62 },
  "NMR/USDT": { price: 25.80, change24h: 1.5, change7d: 4.8, marketCap: 320000000, volume: 28000000, rank: 63 },
  "UNI/USD": { price: 5.36, change24h: 1.3, change7d: 3.9, marketCap: 3700000000, volume: 165000000, rank: 64 },
  "UNI/USDT": { price: 5.36, change24h: 1.3, change7d: 3.9, marketCap: 3700000000, volume: 165000000, rank: 65 },
  "APT/USDT": { price: 6.48, change24h: 0.6, change7d: 2.4, marketCap: 1700000000, volume: 110000000, rank: 66 },
  "RPL/USDT": { price: 28.50, change24h: 1.7, change7d: 5.8, marketCap: 580000000, volume: 42000000, rank: 67 },
  "CVX/USDT": { price: 3.85, change24h: 1.2, change7d: 4.2, marketCap: 320000000, volume: 28000000, rank: 68 },
  "APE/USDT": { price: 1.46, change24h: 2.8, change7d: 9.4, marketCap: 620000000, volume: 135000000, rank: 69 },
  "USDT/AUD": { price: 1.52, change24h: -0.1, change7d: 0.2, marketCap: 95000000000, volume: 42000000000, rank: 70 },
  "DAI/USDT": { price: 0.998, change24h: -0.02, change7d: 0.01, marketCap: 5100000000, volume: 370000000, rank: 71 },
  "LDO/USDT": { price: 1.62, change24h: 1.8, change7d: 5.2, marketCap: 1450000000, volume: 87000000, rank: 72 },
  "BAND/USDT": { price: 1.35, change24h: 1.2, change7d: 4.5, marketCap: 180000000, volume: 15000000, rank: 73 },
  "OP/USDT": { price: 2.21, change24h: 1.9, change7d: 5.3, marketCap: 1800000000, volume: 240000000, rank: 74 },
  "SNX/USDT": { price: 2.84, change24h: 1.4, change7d: 6.3, marketCap: 915000000, volume: 72000000, rank: 75 },
  "ADA/USD": { price: 0.325, change24h: 0.6, change7d: -1.1, marketCap: 10500000000, volume: 620000000, rank: 76 },
  "PRO/USDT": { price: 0.85, change24h: 1.1, change7d: 3.8, marketCap: 120000000, volume: 8500000, rank: 77 },
  "XTZ/USDT": { price: 0.81, change24h: 0.6, change7d: 1.9, marketCap: 780000000, volume: 42000000, rank: 78 },
  "FET/USDT": { price: 0.45, change24h: 1.5, change7d: 5.2, marketCap: 380000000, volume: 32000000, rank: 79 },
  "IMX/USDT": { price: 1.60, change24h: 3.7, change7d: 12.9, marketCap: 2100000000, volume: 195000000, rank: 80 },
  "OCTA/EUR": { price: 0.012, change24h: 0.8, change7d: 2.5, marketCap: 85000000, volume: 5500000, rank: 81 },
  "OCEAN/USDT": { price: 0.38, change24h: 1.2, change7d: 4.5, marketCap: 250000000, volume: 18000000, rank: 82 },
  "VSP/USDT": { price: 0.15, change24h: 0.7, change7d: 2.8, marketCap: 45000000, volume: 3500000, rank: 83 },
  "STORJ/USDT": { price: 0.42, change24h: 1.1, change7d: 3.5, marketCap: 180000000, volume: 12000000, rank: 84 },
  "MANA/USDT": { price: 0.38, change24h: -0.7, change7d: 2.4, marketCap: 830000000, volume: 85000000, rank: 85 },
  "SAND/USD": { price: 0.445, change24h: -1.2, change7d: -0.8, marketCap: 940000000, volume: 95000000, rank: 86 },
  "SAND/USDT": { price: 0.445, change24h: -1.2, change7d: -0.8, marketCap: 940000000, volume: 95000000, rank: 87 },
  "FLUX/USDT": { price: 0.58, change24h: 1.5, change7d: 4.8, marketCap: 180000000, volume: 15000000, rank: 88 },
  "PERP/USDT": { price: 0.85, change24h: 1.2, change7d: 4.2, marketCap: 150000000, volume: 12000000, rank: 89 },
  "MATIC/USD": { price: 0.565, change24h: -1.7, change7d: -3.4, marketCap: 4300000000, volume: 320000000, rank: 90 },
  "ALGO/USDT": { price: 0.13, change24h: -0.6, change7d: -2.2, marketCap: 940000000, volume: 95000000, rank: 91 },
  "MATIC/EUR": { price: 0.52, change24h: -1.8, change7d: -3.5, marketCap: 4300000000, volume: 280000000, rank: 92 },
  "MATIC/USDT": { price: 0.565, change24h: -1.7, change7d: -3.4, marketCap: 4300000000, volume: 320000000, rank: 93 },
  "STG/USDT": { price: 0.38, change24h: 0.9, change7d: 3.2, marketCap: 85000000, volume: 7500000, rank: 94 },
  "1INCH/USDT": { price: 0.32, change24h: 0.8, change7d: 2.5, marketCap: 350000000, volume: 28000000, rank: 95 },
  "HBAR/USDT": { price: 0.067, change24h: 1.3, change7d: 4.5, marketCap: 2200000000, volume: 95000000, rank: 96 },
  "DOGE/USDT": { price: 0.0134, change24h: 1.6, change7d: 4.4, marketCap: 10000000000, volume: 1100000000, rank: 97 },
  "DOGE/EUR": { price: 0.012345, change24h: 1.5, change7d: 4.3, marketCap: 10000000000, volume: 900000000, rank: 98 },
  "BAT/USDT": { price: 0.25, change24h: 0.7, change7d: 2.8, marketCap: 380000000, volume: 25000000, rank: 99 },
  "LMWR/USDT": { price: 0.018, change24h: 0.5, change7d: 1.5, marketCap: 45000000, volume: 3500000, rank: 100 },
  "GRT/USDT": { price: 0.145, change24h: 0.9, change7d: 3.2, marketCap: 1350000000, volume: 78000000, rank: 101 },
  "BLUR/USDT": { price: 0.42, change24h: 1.2, change7d: 4.5, marketCap: 180000000, volume: 15000000, rank: 102 },
  "BST/USDT": { price: 0.85, change24h: 1.1, change7d: 3.8, marketCap: 120000000, volume: 8500000, rank: 103 },
  "REACT/USDT": { price: 0.25, change24h: 0.8, change7d: 2.5, marketCap: 75000000, volume: 5500000, rank: 104 },
  "BST/USD": { price: 0.85, change24h: 1.1, change7d: 3.8, marketCap: 120000000, volume: 8500000, rank: 105 },
  "BST/EUR": { price: 0.78, change24h: 1.0, change7d: 3.7, marketCap: 120000000, volume: 8000000, rank: 106 },
  "NOIA/USDT": { price: 0.15, change24h: 0.6, change7d: 2.2, marketCap: 45000000, volume: 3500000, rank: 107 },
  "AUDIO/USDT": { price: 0.28, change24h: 0.9, change7d: 3.5, marketCap: 120000000, volume: 8500000, rank: 108 },
  "CTSI/USDT": { price: 0.12, change24h: 0.7, change7d: 2.8, marketCap: 85000000, volume: 6500000, rank: 109 },
  "PROPS/EUR": { price: 0.025, change24h: 0.5, change7d: 1.8, marketCap: 35000000, volume: 2500000, rank: 110 },
  "ANKR/USDT": { price: 0.028, change24h: 0.8, change7d: 3.2, marketCap: 280000000, volume: 18000000, rank: 111 },
  "GALA/USDT": { price: 0.018, change24h: 0.9, change7d: 3.1, marketCap: 520000000, volume: 42000000, rank: 112 },
  "NXRA/USDT": { price: 0.045, change24h: 0.7, change7d: 2.5, marketCap: 65000000, volume: 4500000, rank: 113 },
  "DNA/USDT": { price: 0.032, change24h: 0.6, change7d: 2.2, marketCap: 45000000, volume: 3200000, rank: 114 },
  "HOT/USDT": { price: 0.0015, change24h: 0.8, change7d: 2.8, marketCap: 280000000, volume: 18000000, rank: 115 },
  "COVAL/USDT": { price: 0.0085, change24h: 0.5, change7d: 1.8, marketCap: 25000000, volume: 1800000, rank: 116 },
  "LILAI/EUR": { price: 0.014, change24h: 0.7, change7d: 2.4, marketCap: 50000000, volume: 2800000, rank: 117 },
  "FLUX/EUR": { price: 0.53, change24h: 1.4, change7d: 4.7, marketCap: 180000000, volume: 14000000, rank: 118 },
  "TIA/USDT": { price: 17.10, change24h: 4.3, change7d: 12.6, marketCap: 7500000000, volume: 950000000, rank: 119 },
  "OCTA/USDT": { price: 0.013, change24h: 0.9, change7d: 2.6, marketCap: 85000000, volume: 5800000, rank: 120 },
  "XCM/USD": { price: 0.55, change24h: -0.7, change7d: 2.6, marketCap: 150000000, volume: 13000000, rank: 121 },
  "ALPH/EUR": { price: 0.28, change24h: 0.8, change7d: 2.5, marketCap: 95000000, volume: 6500000, rank: 122 },
  "ETHDYDX/USDT": { price: 1.85, change24h: 1.2, change7d: 4.2, marketCap: 280000000, volume: 18000000, rank: 123 },
  "ARB/USDT": { price: 0.90, change24h: 1.2, change7d: 4.3, marketCap: 1300000000, volume: 95000000, rank: 124 },
  "CELO/USDT": { price: 0.48, change24h: 0.9, change7d: 3.2, marketCap: 250000000, volume: 15000000, rank: 125 },
  "LTO/USDT": { price: 0.065, change24h: 0.6, change7d: 2.2, marketCap: 35000000, volume: 2500000, rank: 126 }
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