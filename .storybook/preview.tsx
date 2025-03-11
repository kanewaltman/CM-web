import type { Preview } from '@storybook/react';
import { ThemeProvider } from 'next-themes';
import React from 'react';
import './styles.css';
import { DocsContainer, DocsPage } from '@storybook/blocks';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { darkTheme } from './theme';

// Initialize MSW
initialize();

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true, // Disable the background addon as we handle theming via CSS
    },
    layout: 'padded',
    darkMode: {
      dark: { ...darkTheme },
      current: 'dark'
    },
    themes: {
      default: 'dark',
      list: [
        { name: 'dark', class: 'dark', color: '#0A0A0A' },
        { name: 'light', class: 'light', color: '#F5F5F5' }
      ],
    },
    docs: {
      theme: darkTheme,
      container: DocsContainer,
      page: DocsPage,
      story: { inline: true }
    },
  },
  loaders: [mswLoader],
  decorators: [
    (Story, context) => {
      const selectedTheme = context.globals.theme || 'dark';
      return (
        <ThemeProvider 
          attribute="class" 
          defaultTheme={selectedTheme} 
          enableSystem={false}
          value={{ light: 'light', dark: 'dark' }}
          key={selectedTheme}
          forcedTheme={selectedTheme}
        >
          <div 
            className={`w-full min-h-screen ${selectedTheme}`} 
            data-theme={selectedTheme}
            style={{
              backgroundColor: `hsl(var(--color-bg-base))`,
              color: `hsl(var(--color-foreground-default))`,
              fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif'
            }}
          >
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        icon: 'circlehollow',
        items: ['light', 'dark'],
        title: 'Theme',
        dynamicTitle: true,
      },
    },
  },
};

export default preview; 