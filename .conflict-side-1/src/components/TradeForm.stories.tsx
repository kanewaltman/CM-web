import type { Meta, StoryObj } from '@storybook/react';
import { TradeForm } from './TradeForm';
import { WidgetContainer } from './WidgetContainer';

const meta: Meta<typeof TradeForm> = {
  title: 'Widgets/TradeForm',
  component: TradeForm,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[800px] h-[600px]">
        <WidgetContainer title="Trade">
          <Story />
        </WidgetContainer>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TradeForm>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default trade form widget with limit, market, and stop order options.',
      },
    },
  },
}; 