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
    chromatic: { delay: 500 },
    layout: 'padded',
    viewport: {
      defaultViewport: 'responsive',
    },
    docs: {
      description: {
        component: 'A control bar component that provides layout and appearance controls for the grid system. Supports both rounded and dense styling variants.',
      },
      canvas: {
        sourceState: 'shown',
        autoplay: false,
      },
      story: {
        height: '120px',
        inline: true,
      },
      primaryStory: 'Default',
    },
  },
  tags: ['autodocs'],
  args: {
    initialGridStyle: 'rounded',
    defaultIsOpen: false,
    defaultIsAppearanceOpen: false,
  },
  argTypes: {
    onResetLayout: { 
      action: 'reset layout',
      description: 'Callback function triggered when resetting the layout',
    },
    onCopyLayout: { 
      action: 'copy layout',
      description: 'Callback function triggered when copying the layout',
    },
    onPasteLayout: { 
      action: 'paste layout',
      description: 'Callback function triggered when pasting a layout',
    },
    initialGridStyle: {
      control: 'radio',
      options: ['rounded', 'dense'],
      description: 'Initial grid style setting for the layout',
    },
    defaultIsOpen: {
      control: 'boolean',
      description: 'Controls whether the Edit menu is open by default',
    },
    defaultIsAppearanceOpen: {
      control: 'boolean',
      description: 'Controls whether the Appearance dialog is open by default',
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
  },
  parameters: {
    docs: {
      description: {
        story: 'The default ControlBar component with rounded grid style. Use the controls below to try different configurations.',
      },
      primary: true,
    },
  },
};

export const WithGridStyleRounded: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    initialGridStyle: 'rounded',
  },
  parameters: {
    docs: {
      canvas: { autoplay: false },
    },
  },
};

export const WithGridStyleDense: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    initialGridStyle: 'dense',
  },
  parameters: {
    docs: {
      canvas: { autoplay: false },
    },
  },
};

export const EditMenuOpen: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    defaultIsOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ControlBar with the Edit menu open by default.',
      },
      canvas: { hidden: true },
    },
  },
};

export const AppearanceDialogOpen: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    defaultIsOpen: true,
    defaultIsAppearanceOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ControlBar with both the Edit menu and Appearance dialog open.',
      },
      canvas: { hidden: true },
    },
  },
}; 