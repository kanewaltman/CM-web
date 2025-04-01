import type { Meta, StoryObj } from '@storybook/react';
import { OrderBook } from './OrderBook';
import { WidgetContainer } from './WidgetContainer';

const meta: Meta<typeof OrderBook> = {
  title: 'Widgets/OrderBook',
  component: OrderBook,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[800px] h-[600px]">
        <WidgetContainer title="Order Book">
          <Story />
        </WidgetContainer>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OrderBook>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default order book widget showing buy and sell orders for a trading pair.',
      },
    },
  },
}; 