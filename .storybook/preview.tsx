import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import { ThemeProvider } from 'next-themes';
import React from 'react';
import './styles.css';
import {
  Title,
  Subtitle,
  Description,
  Primary,
  Controls,
} from '@storybook/blocks';
import { initialize, mswLoader } from 'msw-storybook-addon';

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
      disable: true,
      grid: {
        disable: true
      }
    },
    layout: 'padded',
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
      page: () => (
        <>
          <Title />
          <Subtitle />
          <Description />
          <Primary />
          <Controls />
        </>
      ),
    },
  },
  loaders: [mswLoader],
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    (Story, context) => {
      const theme = context.globals.theme;
      return (
        <ThemeProvider 
          attribute="class" 
          defaultTheme={theme} 
          enableSystem={false}
          forcedTheme={theme}
        >
          <div className="w-full min-h-screen bg-background text-foreground">
            <div className="p-4">
              <Story />
            </div>
          </div>
        </ThemeProvider>
      );
    },
  ],
};

export default preview; 