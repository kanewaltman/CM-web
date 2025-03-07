import type { Meta, StoryObj } from '@storybook/react';
import { ControlBar } from './ControlBar';
import { Toaster } from './ui/sonner';

const meta: Meta<typeof ControlBar> = {
  title: 'Layout/ControlBar',
  component: ControlBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onResetLayout: { action: 'reset layout' },
    onCopyLayout: { action: 'copy layout' },
    onPasteLayout: { action: 'paste layout' },
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
  <>
    <ControlBar {...args} />
    <Toaster />
  </>
);

export const Default: Story = {
  render: BaseStory,
  args: mockHandlers,
};

export const WithGridStyleRounded: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    gridStyle: 'rounded',
  },
};

export const WithGridStyleDense: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    gridStyle: 'dense',
  },
};

// Story showing the Edit dropdown menu open
export const EditMenuOpen: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    isOpen: true,
  },
};

// Story showing the Appearance dialog open
export const AppearanceDialogOpen: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    isAppearanceOpen: true,
  },
}; 