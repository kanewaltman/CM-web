import type { Meta, StoryObj } from '@storybook/react';
import { BalancesWidget } from './BalancesWidget';
import { WidgetContainer } from './WidgetContainer';
import { handlers } from '../mocks/handlers';
import { DataSourceProvider } from '../lib/DataSourceContext';
import React from 'react';

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
    }
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
      <div className="w-[800px] h-[600px]">
        <DataSourceProvider defaultDataSource="sample">
          <WidgetContainer title="Balances">
            <Story />
          </WidgetContainer>
        </DataSourceProvider>
      </div>
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