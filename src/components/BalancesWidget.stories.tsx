import type { Meta, StoryObj } from '@storybook/react';
import { BalancesWidget } from './BalancesWidget';
import { WidgetContainer } from './WidgetContainer';
import { handlers } from '../mocks/handlers';

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
        <WidgetContainer title="Balances">
          <Story />
        </WidgetContainer>
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