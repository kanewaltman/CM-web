import type { Meta, StoryObj } from '@storybook/react';
import { MarketOverview } from './MarketOverview';
import { WidgetContainer } from './WidgetContainer';

const meta: Meta<typeof MarketOverview> = {
  title: 'Widgets/MarketOverview',
  component: MarketOverview,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[800px] h-[600px]">
        <WidgetContainer title="Market Overview">
          <Story />
        </WidgetContainer>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MarketOverview>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default market overview widget showing key market pairs and their performance.',
      },
    },
  },
}; 