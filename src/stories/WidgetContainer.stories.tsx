import type { Meta, StoryObj } from '@storybook/react';
import { WidgetContainer } from '../components/WidgetContainer';

const meta = {
  title: 'Components/WidgetContainer',
  component: WidgetContainer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WidgetContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Default Widget',
    children: <div className="p-4">Widget Content</div>,
  },
};

export const WithHeaderControls: Story = {
  args: {
    title: 'Widget with Controls',
    headerControls: <button className="px-2 py-1 text-sm bg-blue-500 text-white rounded">Custom Control</button>,
    children: <div className="p-4">Widget with Custom Header Controls</div>,
  },
};

export const WithRemoveHandler: Story = {
  args: {
    title: 'Removable Widget',
    onRemove: () => alert('Widget removed!'),
    children: <div className="p-4">Click the menu to remove this widget</div>,
  },
}; 