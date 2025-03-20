import type { Meta, StoryObj } from '@storybook/react';
import { TreeMapWidget } from './TreeMapWidget';

const meta = {
  title: 'Components/TreeMapWidget',
  component: TreeMapWidget,
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
} satisfies Meta<typeof TreeMapWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithRemoveHandler: Story = {
  args: {
    onRemove: () => alert('Remove TreeMap widget!'),
  },
}; 