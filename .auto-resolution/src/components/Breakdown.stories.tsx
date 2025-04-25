import type { Meta, StoryObj } from '@storybook/react';
import { BreakdownWrapper as Breakdown } from './Breakdown';

const meta = {
  title: 'Components/Breakdown',
  component: Breakdown,
  parameters: {
    layout: 'centered',
  },
  argTypes: {},
  decorators: [
    (Story) => (
      <div className="w-[500px] h-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Breakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithRemoveHandler: Story = {
  args: {
    onRemove: () => alert('Remove Breakdown widget!'),
  },
}; 