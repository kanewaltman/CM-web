import type { Meta, StoryObj } from '@storybook/react';
import { BalancesWidget } from './BalancesWidget';
import { WidgetContainer } from './WidgetContainer';
import { handlers } from '../mocks/handlers';
import { DataSourceProvider } from '../lib/DataSourceContext';
import React, { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { ThemeProvider as ThemeIntensityProvider } from '../contexts/ThemeContext';
import { getThemeValues } from '@/lib/utils';

// Theme wrapper component to handle theme initialization
const ThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const root = document.documentElement;
    const darkColors = getThemeValues('dark');
    const lightColors = getThemeValues('light');

    // Set both light and dark mode variables
    Object.entries(lightColors.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Set dark mode variables with proper scoping
    const darkStyles = document.createElement('style');
    darkStyles.textContent = `.dark {\n${Object.entries(darkColors.cssVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')}\n}`;
    document.head.appendChild(darkStyles);

    return () => {
      // Clean up
      Object.keys(lightColors.cssVariables).forEach((key) => {
        root.style.removeProperty(key);
      });
      darkStyles.remove();
    };
  }, []);

  return children;
};

// Sample data that matches the platform's sample data
const SAMPLE_BALANCES = {
  "BTC": {
    "BTC": "1.23456789",
    "EUR": "45678.90"
  },
  "ETH": {
    "ETH": "15.432109",
    "EUR": "28901.23"
  },
  "DOT": {
    "DOT": "1234.5678",
    "EUR": "12345.67"
  },
  "USDT": {
    "USDT": "50000.00",
    "EUR": "45678.90"
  }
};

const meta: Meta<typeof BalancesWidget> = {
  title: 'Widgets/BalancesWidget',
  component: BalancesWidget,
  parameters: {
    layout: 'padded',
    msw: {
      handlers: handlers
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'dark',
          value: 'hsl(0 0% 0%)',
        },
        {
          name: 'light',
          value: 'hsl(0 0% 100%)',
        },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
    compact: {
      control: 'boolean',
      description: 'Whether to display in compact mode',
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ThemeIntensityProvider>
          <ThemeWrapper>
            <div className="w-[800px] h-[600px]">
              <DataSourceProvider defaultDataSource="sample">
                <WidgetContainer title="Balances">
                  <Story />
                </WidgetContainer>
              </DataSourceProvider>
            </div>
          </ThemeWrapper>
        </ThemeIntensityProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BalancesWidget>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default balances widget showing asset balances and their values.',
      },
    },
  },
};

export const Compact: Story = {
  args: {
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Balances widget in compact mode for space-constrained layouts.',
      },
    },
  },
};

export const WithCustomClass: Story = {
  args: {
    className: 'bg-primary/5',
  },
  parameters: {
    docs: {
      description: {
        story: 'Balances widget with custom background styling.',
      },
    },
  },
}; 