import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { ThemeProvider as ThemeIntensityProvider } from '@/contexts/ThemeContext';
import { ExchangeRatesProvider } from '@/contexts/ExchangeRatesContext';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeIntensityProvider>
        <ExchangeRatesProvider refreshInterval={600000} maxRetries={5}>
          <App />
        </ExchangeRatesProvider>
      </ThemeIntensityProvider>
    </ThemeProvider>
  </StrictMode>
);