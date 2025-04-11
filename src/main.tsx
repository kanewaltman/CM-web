import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { ThemeProvider as ThemeIntensityProvider } from '@/contexts/ThemeContext';
import { ExchangeRatesProvider } from '@/contexts/ExchangeRatesContext';
import App from './App.tsx';
import './index.css';

// Setup a fallback error handler in case error tracking services are blocked
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Call the original handler if it exists
    if (typeof originalOnError === 'function') {
      originalOnError.apply(this, arguments);
    }
    
    // Check if we have ad blocker detected
    const hasAdBlocker = document.documentElement.getAttribute('data-adblocker') === 'true';
    if (hasAdBlocker) {
      console.warn('Error occurred with ad blocker detected, logging locally:', error);
      // You could implement a fallback logging mechanism here
    }
    
    // Return false to allow the error to propagate
    return false;
  };
}

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