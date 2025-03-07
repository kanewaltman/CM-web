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
      disable: false,
      grid: {
        disable: false,
        cellSize: 20,
        opacity: 0.2,
        cellAmount: 5
      },
      default: 'dark',
      values: [
        { name: 'dark', value: '#0A0A0A'  },
        { name: 'light', value: '#F5F5F5' },
        { name: 'transparent', value: 'transparent' }
      ]
    },
    layout: 'padded',
    toolbar: {
      position: 'right',
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
      },
      defaultViewport: 'desktop',
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
        >
          <div className={`w-full min-h-screen ${selectedTheme === 'dark' ? 'bg-zinc-900' : 'bg-white'} text-foreground ${selectedTheme}`}>
            <div className="p-4">
              <Story />
            </div>
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