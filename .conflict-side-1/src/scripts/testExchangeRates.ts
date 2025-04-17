/**
 * Test script for the CoinGecko exchange rates service
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/testExchangeRates.ts
 */

import coinGeckoService from '../services/coinGeckoService';

const runTest = async () => {
  console.log('🚀 Testing CoinGecko Exchange Rates Service');
  console.log('==========================================');
  
  try {
    // 1. Get mapped assets
    const mappedAssets = coinGeckoService.getMappedCryptoAssets();
    console.log(`\n✅ Found ${mappedAssets.length} mapped crypto assets`);
    console.log('Sample assets:', mappedAssets.slice(0, 5));
    
    // 2. Get CoinGecko IDs
    const coinIds = coinGeckoService.getCoinGeckoIds();
    console.log(`\n✅ Converted to ${coinIds.length} CoinGecko IDs`);
    console.log('Sample IDs:', coinIds.slice(0, 5));
    
    // 3. Fetch exchange rates
    console.log('\n🔄 Fetching exchange rates from CoinGecko...');
    console.time('Fetch time');
    const exchangeRates = await coinGeckoService.fetchExchangeRates();
    console.timeEnd('Fetch time');
    
    const cryptoCount = Object.keys(exchangeRates).length;
    console.log(`\n✅ Successfully fetched rates for ${cryptoCount} cryptocurrencies`);
    
    // 4. Show sample data
    const sampleCrypto = Object.keys(exchangeRates)[0];
    console.log(`\n📊 Sample data for ${sampleCrypto}:`);
    console.log(JSON.stringify(exchangeRates[sampleCrypto], null, 2));
    
    // 5. Fetch a single coin price
    console.log('\n🔄 Fetching single coin price for bitcoin...');
    const btcPrice = await coinGeckoService.fetchCoinPrice('bitcoin');
    console.log('Bitcoin prices:', btcPrice);
    
    console.log('\n✅ All tests completed successfully');
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
};

// Run the test
runTest(); 