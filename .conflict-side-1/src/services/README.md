# Services

This directory contains service modules that handle external API interactions and data processing.

## CoinGecko Exchange Rates Service

The `coinGeckoService.ts` module provides functionality to fetch real-time cryptocurrency exchange rates from the CoinGecko API.

### Features

- Bulk fetching of exchange rates for all cryptocurrencies in the application
- Support for multiple fiat currencies (EUR, USD, GBP, AUD, SEK, CAD)
- Real-time updates via polling
- Mapping between internal asset tickers and CoinGecko IDs
- Individual cryptocurrency price lookup

### Usage

#### Context Provider

The service is wrapped in a React context provider for easy access throughout the application:

```tsx
import { ExchangeRatesProvider } from '@/contexts/ExchangeRatesContext';

function App() {
  return (
    <ExchangeRatesProvider refreshInterval={30000}>
      <YourApp />
    </ExchangeRatesProvider>
  )
}
```

#### Hooks

Use the provided hooks to access exchange rate data:

```tsx
// Get all exchange rates
import { useExchangeRates } from '@/contexts/ExchangeRatesContext';

function Component() {
  const { rates, loading, error, refreshRates, lastUpdated } = useExchangeRates();
  
  // Use data in your component
}

// Get a specific exchange rate
import { useExchangeRate } from '@/hooks/useExchangeRate';

function PriceDisplay({ crypto = 'BTC', fiat = 'usd' }) {
  const { rate, loading, error, available } = useExchangeRate(crypto, fiat);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!available) return <div>Rate not available</div>;
  
  return <div>1 {crypto} = {rate} {fiat.toUpperCase()}</div>;
}

// Convert between assets
import { useAssetConverter } from '@/hooks/useExchangeRate';

function AssetConverter() {
  const { convert, loading, error } = useAssetConverter();
  const convertedAmount = convert(1, 'BTC', 'ETH'); // 1 BTC in ETH
  
  return <div>1 BTC = {convertedAmount} ETH</div>;
}
```

#### Direct Service Usage

You can also use the service directly:

```typescript
import coinGeckoService from '@/services/coinGeckoService';

// Fetch all exchange rates
const rates = await coinGeckoService.fetchExchangeRates();

// Fetch a specific price
const btcPrice = await coinGeckoService.fetchCoinPrice('bitcoin', ['usd', 'eur']);
```

### Testing

A test script is available to verify the service functionality:

```bash
# Run the test script
npx ts-node -r tsconfig-paths/register src/scripts/testExchangeRates.ts
```

### Exchange Rates Tester Component

A test component is available to visualize the exchange rates data:

- Visit `/exchange-rates` in the application to see the tester UI
- View all fetched rates in a table format
- Select specific pairs to view individual rates
- Manually refresh the data

### Implementation Details

- Uses the CoinGecko API v3
- Requires an API key for authenticated requests
- Automatically maps internal asset tickers to CoinGecko IDs
- Handles error states and loading states
- Provides real-time updates through polling 