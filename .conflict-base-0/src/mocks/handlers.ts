import { http, HttpResponse } from 'msw';
import { getApiUrl } from '@/lib/api-config';

// Mock data for the balances
export const mockBalancesResponse = {
  BTC: {
    BTC: "1.23456789",
    EUR: "45678.90"
  },
  ETH: {
    ETH: "12.3456789",
    EUR: "23456.78"
  },
  SOL: {
    SOL: "123.456789",
    EUR: "12345.67"
  },
  USDT: {
    USDT: "10000.00",
    EUR: "9500.00"
  }
};

// Mock data for prices
export const mockPricesResponse = {
  'BTC/EUR': { price: 45678.90, change24h: 2.5 },
  'ETH/EUR': { price: 2345.67, change24h: -1.2 },
  'SOL/EUR': { price: 123.45, change24h: 5.7 },
  'USDT/EUR': { price: 0.95, change24h: -0.1 }
};

export const handlers = [
  http.get(getApiUrl('open/demo/temp'), () => {
    return HttpResponse.json({
      token: 'mock-token-12345'
    });
  }),
  http.get(getApiUrl('open/users/balances'), () => {
    return HttpResponse.json(mockBalancesResponse);
  }),
  http.get(getApiUrl('exchange/prices'), () => {
    return HttpResponse.json(mockPricesResponse);
  })
]; 