import type { Meta, StoryObj } from '@storybook/react';
import { PerformanceWidget } from './PerformanceWidget';
import { WidgetContainer } from '../WidgetContainer';
import { userEvent, within } from '@storybook/test';
import React, { useEffect } from 'react';
import { DataSourceProvider } from '../../lib/DataSourceContext';
import { ThemeProvider } from 'next-themes';
import { ThemeProvider as ThemeIntensityProvider } from '@/contexts/ThemeContext';
import { getThemeValues } from '@/lib/utils';

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
  },
  "DOGE": {
    "DOGE": "100000.00",
    "EUR": "1234.56"
  },
  "XCM": {
    "XCM": "5000.00",
    "EUR": "2500.00"
  },
  "SOL": {
    "SOL": "100.00",
    "EUR": "8500.00"
  },
  "ADA": {
    "ADA": "50000.00",
    "EUR": "15000.00"
  },
  "HBAR": {
    "HBAR": "25000.00",
    "EUR": "1250.00"
  }
};

// Mock the fetch function for sample data
const originalFetch = global.fetch;
global.fetch = async (url: string) => {
  if (url.includes('open/users/balances')) {
    return new Response(JSON.stringify(SAMPLE_BALANCES), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (url.includes('open/demo/temp')) {
    return new Response(JSON.stringify({ token: 'sample-token' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return originalFetch(url);
};

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

const meta: Meta<typeof PerformanceWidget> = {
  title: 'Widgets/PerformanceWidget',
  component: PerformanceWidget,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
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
    darkMode: {
      current: 'dark',
    },
    docs: {
      description: {
        component: 'A widget that displays various performance charts with the ability to switch between different visualizations.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <ThemeIntensityProvider>
          <ThemeWrapper>
            <div className="w-[800px] h-[600px]">
              <Story />
            </div>
          </ThemeWrapper>
        </ThemeIntensityProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PerformanceWidget>;

// Base story with WidgetContainer
const BaseStory = (args: any) => {
  const [headerControls, setHeaderControls] = React.useState<React.ReactNode>(null);
  
  return (
    <DataSourceProvider defaultDataSource="sample">
      <WidgetContainer 
        title="Performance Metrics" 
        headerControls={
          <PerformanceWidget 
            {...args} 
            headerControls={true}
            onVariantChange={(variant) => {
              console.log('Variant changed to:', variant);
            }}
          />
        }
      >
        <PerformanceWidget 
          {...args} 
          onVariantChange={(variant) => {
            console.log('Variant changed to:', variant);
          }}
        />
      </WidgetContainer>
    </DataSourceProvider>
  );
};

export const Default: Story = {
  render: BaseStory,
  args: {
    defaultVariant: 'revenue',
  },
  parameters: {
    docs: {
      description: {
        story: 'The default PerformanceWidget showing the Performance chart.',
      },
    },
  },
};

export const WithSubscribersChart: Story = {
  render: BaseStory,
  args: {
    defaultVariant: 'subscribers',
  },
  parameters: {
    docs: {
      description: {
        story: 'PerformanceWidget showing the Subscribers chart.',
      },
    },
  },
};

export const WithMRRGrowthChart: Story = {
  render: BaseStory,
  args: {
    defaultVariant: 'mrr-growth',
  },
  parameters: {
    docs: {
      description: {
        story: 'PerformanceWidget showing the MRR Growth chart.',
      },
    },
  },
};

export const WithRefundsChart: Story = {
  render: BaseStory,
  args: {
    defaultVariant: 'refunds',
  },
  parameters: {
    docs: {
      description: {
        story: 'PerformanceWidget showing the Refunds chart.',
      },
    },
  },
};

export const WithSubscriptionsChart: Story = {
  render: BaseStory,
  args: {
    defaultVariant: 'subscriptions',
  },
  parameters: {
    docs: {
      description: {
        story: 'PerformanceWidget showing the Subscriptions chart.',
      },
    },
  },
};

export const WithUpgradesChart: Story = {
  render: BaseStory,
  args: {
    defaultVariant: 'upgrades',
  },
  parameters: {
    docs: {
      description: {
        story: 'PerformanceWidget showing the Upgrades chart.',
      },
    },
  },
};

export const Interactive: Story = {
  render: BaseStory,
  args: {
    defaultVariant: 'revenue',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Wait for the select to be available
    const select = await canvas.findByRole('combobox');
    
    // Click the select to open it
    await userEvent.click(select);
    
    // Wait for the dropdown to appear and select a different option
    const subscribersOption = await canvas.findByText('Subscribers');
    await userEvent.click(subscribersOption);
    
    // Wait a bit to see the change
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Select another option
    await userEvent.click(select);
    const mrrOption = await canvas.findByText('MRR Growth');
    await userEvent.click(mrrOption);
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demonstration of the PerformanceWidget with chart switching.',
      },
    },
  },
}; 