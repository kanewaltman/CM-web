import type { Meta, StoryObj } from '@storybook/react';
import { TradingViewChart } from './TradingViewChart';
import { WidgetContainer } from './WidgetContainer';

const meta: Meta<typeof TradingViewChart> = {
  title: 'Widgets/TradingViewChart',
  component: TradingViewChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[800px] h-[600px]">
        <WidgetContainer title="Price Chart">
          <Story />
        </WidgetContainer>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TradingViewChart>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default trading view chart widget showing price data with candlestick visualization.',
      },
    },
  },
}; 