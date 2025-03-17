import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { ThemeProvider as ThemeIntensityProvider } from '@/contexts/ThemeContext';
import { DataSourceProvider } from './lib/DataSourceContext';
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
        <DataSourceProvider>
          <App />
        </DataSourceProvider>
      </ThemeIntensityProvider>
    </ThemeProvider>
  </StrictMode>
);