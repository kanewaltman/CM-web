import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/ui/button';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
  // Add component description at root level
  description: 'A versatile button component with multiple variants and sizes. Use it for all interactive elements that trigger actions.',
};

export default meta;
type Story = StoryObj<typeof Button>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    variant: 'default',
    children: 'Button',
  },
  description: 'The primary button style. Used for main actions and call-to-action elements.',
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
  description: 'A secondary button style. Used for alternative or less prominent actions.',
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
  description: 'A destructive button style. Used for dangerous or irreversible actions.',
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
  description: 'An outlined button style. Used for secondary actions with a subtle appearance.',
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
  description: 'A ghost button style. Used for subtle, text-like actions that don\'t need emphasis.',
};
