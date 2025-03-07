import type { Meta, StoryObj } from '@storybook/react';
import { ControlBar } from './ControlBar';
import { Toaster } from './ui/sonner';
import { WIDGET_REGISTRY } from '@/App';
import { userEvent, waitFor, within } from '@storybook/test';

// Mock WIDGET_REGISTRY if it's not available in stories
const mockWidgetRegistry = {
  'chart': { title: 'Chart Widget' },
  'orderbook': { title: 'Order Book' },
  'trades': { title: 'Recent Trades' },
};

// @ts-ignore - Mock the registry for Storybook
global.WIDGET_REGISTRY = mockWidgetRegistry;

const meta: Meta<typeof ControlBar> = {
  title: 'Layout/ControlBar',
  component: ControlBar,
  parameters: {
    chromatic: { delay: 500 }, // Add delay for interactions to complete
    layout: 'padded',
    viewport: {
      defaultViewport: 'responsive',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onResetLayout: { action: 'reset layout' },
    onCopyLayout: { action: 'copy layout' },
    onPasteLayout: { action: 'paste layout' },
    initialGridStyle: {
      control: 'radio',
      options: ['rounded', 'dense'],
      description: 'Initial grid style setting',
    },
    defaultIsOpen: {
      control: 'boolean',
      description: 'Initial state of the Edit menu',
    },
    defaultIsAppearanceOpen: {
      control: 'boolean',
      description: 'Initial state of the Appearance dialog',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ControlBar>;

// Mock functions for the handlers
const mockHandlers = {
  onResetLayout: () => console.log('Reset layout clicked'),
  onCopyLayout: () => JSON.stringify([{ id: '1', x: 0, y: 0, w: 2, h: 2 }]),
  onPasteLayout: (layout: string) => console.log('Paste layout:', layout),
};

// Base story with all handlers
const BaseStory = (args: any) => (
  <div className="w-full">
    <ControlBar {...args} />
    <Toaster />
  </div>
);

export const Default: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    initialGridStyle: 'rounded',
  },
};

export const WithGridStyleRounded: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    initialGridStyle: 'rounded',
  },
};

export const WithGridStyleDense: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    initialGridStyle: 'dense',
  },
};

export const EditMenuOpen: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    defaultIsOpen: true,
  },
};

export const AppearanceDialogOpen: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    defaultIsOpen: true,
    defaultIsAppearanceOpen: true,
  },
}; 