import type { Meta, StoryObj } from '@storybook/react';
import { WidgetContainer } from './WidgetContainer';

const meta: Meta<typeof WidgetContainer> = {
  title: 'Layout/WidgetContainer',
  component: WidgetContainer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Title of the widget',
    },
    onRemove: { action: 'remove widget' },
  },
};

export default meta;
type Story = StoryObj<typeof WidgetContainer>;

// Example content for the widget
const ExampleContent = () => (
  <div className="p-4">
    <p>This is example content for the widget.</p>
  </div>
);

export const Default: Story = {
  args: {
    title: 'Example Widget',
    children: <ExampleContent />,
  },
  parameters: {
    docs: {
      description: {
        story: 'A basic widget container with a title and content.',
      },
    },
  },
};

export const WithHeaderControls: Story = {
  args: {
    title: 'Widget with Controls',
    children: <ExampleContent />,
    headerControls: (
      <div className="flex items-center space-x-2">
        <button className="px-2 py-1 text-sm bg-primary/10 rounded">Action 1</button>
        <button className="px-2 py-1 text-sm bg-primary/10 rounded">Action 2</button>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Widget container with custom header controls.',
      },
    },
  },
};

export const WithRemoveButton: Story = {
  args: {
    title: 'Removable Widget',
    children: <ExampleContent />,
    onRemove: () => console.log('Widget removed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Widget container with a remove button in the dropdown menu.',
      },
    },
  },
}; 