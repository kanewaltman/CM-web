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
  parameters: {
    docs: {
      description: {
        story: 'The default ControlBar with rounded grid style. Provides layout control and appearance customization options.',
      },
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
      description: {
        story: 'ControlBar with rounded grid style, providing a softer visual appearance for the layout.',
      },
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
      description: {
        story: 'ControlBar with dense grid style, optimizing space usage in the layout.',
      },
    },
  },
};

export const EditMenuOpen: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    defaultIsOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Wait for the button to be available and highlight the interaction
    const editButton = await canvas.findByRole('button', { name: /edit/i });
    await userEvent.hover(editButton);
    await new Promise(resolve => setTimeout(resolve, 300));
    await userEvent.unhover(editButton);
  },
  parameters: {
    docs: {
      description: {
        story: 'ControlBar with the Edit menu pre-opened, showing available layout customization options.',
      },
    },
  },
};

export const AppearanceDialogOpen: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    defaultIsOpen: false,
    defaultIsAppearanceOpen: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Wait a bit for initial render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // First find and click the Edit button to open the menu
    const editButton = await canvas.findByRole('button', { name: /edit/i });
    await userEvent.hover(editButton);
    await new Promise(resolve => setTimeout(resolve, 300));
    await userEvent.click(editButton);
    
    // Wait for the dropdown menu to appear and then find the button within it
    await waitFor(async () => {
      const menu = document.querySelector('[role="menu"]');
      if (!menu) throw new Error('Menu not found');
      
      const menuCanvas = within(menu);
      const appearanceButton = await menuCanvas.findByRole('button', {
        name: /edit appearance/i
      });
      
      await userEvent.hover(appearanceButton);
      await new Promise(resolve => setTimeout(resolve, 300));
      await userEvent.click(appearanceButton);
    }, { timeout: 3000 });
  },
  parameters: {
    docs: {
      description: {
        story: 'ControlBar with the Appearance dialog pre-opened, showing theme and visual customization options.',
      },
    },
  },
}; 