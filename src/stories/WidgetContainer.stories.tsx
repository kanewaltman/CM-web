import type { Meta, StoryObj } from '@storybook/react';
import { WidgetContainer } from '../components/WidgetContainer';
import { Button } from '../components/ui/button';

const meta = {
  title: 'Components/WidgetContainer',
  component: WidgetContainer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A container component for widgets that supports expansion to a new window in both Tauri and web environments.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WidgetContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const ExampleContent = () => (
  <div className="p-4 space-y-4">
    <h3 className="text-lg font-semibold">Widget Content</h3>
    <p className="text-gray-600">
      This is an example of widget content that can be expanded into its own window.
      Click the expand button in the header to try it out!
    </p>
    <div className="bg-gray-100 p-4 rounded-md">
      <pre className="text-sm">Sample data or visualization could go here</pre>
    </div>
  </div>
);

export const Default: Story = {
  args: {
    title: 'Default Widget',
    children: <ExampleContent />,
  },
};

export const WithHeaderControls: Story = {
  args: {
    title: 'Widget with Controls',
    headerControls: (
      <Button variant="outline" size="sm" className="mr-2">
        Refresh
      </Button>
    ),
    children: <ExampleContent />,
  },
};

export const WithRemoveHandler: Story = {
  args: {
    title: 'Removable Widget',
    onRemove: () => alert('Widget removed!'),
    children: <ExampleContent />,
  },
}; 