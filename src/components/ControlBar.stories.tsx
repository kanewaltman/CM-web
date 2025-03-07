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
    docs: {
      description: {
        component: 'A control bar component that provides layout and appearance controls for the grid system. Supports both rounded and dense styling variants.',
      },
      story: {
        height: '100px', // Control the height of stories in docs
        inline: true, // Display stories inline with the docs
      },
    },
  },
  tags: ['autodocs'],
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
    initialGridStyle: 'rounded',
  },
  parameters: {
    docs: {
      description: {
        story: 'The default ControlBar component with rounded grid style.',
      },
    },
  },
};

export const WithGridStyleRounded: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    // Start with dense to show the switch to rounded
    initialGridStyle: 'dense',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Wait for initial mount
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 1. Click the Edit button to open the menu
    const editButton = await canvas.findByRole('button', { name: /edit/i });
    await userEvent.click(editButton);
    
    // 2. Wait for the dropdown menu and click Edit Appearance
    await waitFor(async () => {
      const menu = document.querySelector('[role="menu"]');
      if (!menu) throw new Error('Menu not found');
      
      const menuCanvas = within(menu);
      const appearanceButton = await menuCanvas.findByText(/edit appearance/i);
      await userEvent.click(appearanceButton);
    });

    // 3. Wait for the dialog to open and click the Rounded option
    await waitFor(async () => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) throw new Error('Dialog not found');

      const dialogCanvas = within(dialog);
      const roundedButton = await dialogCanvas.findByText('Rounded');
      await userEvent.click(roundedButton);
    }, { timeout: 2000 });

    // 4. Wait longer to ensure state change is applied
    await new Promise(resolve => setTimeout(resolve, 1000));
    await waitFor(async () => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) throw new Error('Dialog not found');

      const dialogCanvas = within(dialog);
      const closeButton = await dialogCanvas.findByRole('button', { name: /close/i });
      await userEvent.click(closeButton);
    });
  },
};

export const WithGridStyleDense: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    initialGridStyle: 'rounded',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Wait for initial mount
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 1. Click the Edit button to open the menu
    const editButton = await canvas.findByRole('button', { name: /edit/i });
    await userEvent.click(editButton);
    
    // 2. Wait for the dropdown menu and click Edit Appearance
    await waitFor(async () => {
      const menu = document.querySelector('[role="menu"]');
      if (!menu) throw new Error('Menu not found');
      
      const menuCanvas = within(menu);
      const appearanceButton = await menuCanvas.findByText(/edit appearance/i);
      await userEvent.click(appearanceButton);
    });

    // 3. Wait for the dialog to open and click the Dense option
    await waitFor(async () => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) throw new Error('Dialog not found');

      const dialogCanvas = within(dialog);
      const denseButton = await dialogCanvas.findByText('Dense');
      await userEvent.click(denseButton);
    }, { timeout: 2000 });

    // 4. Wait longer to ensure state change is applied
    await new Promise(resolve => setTimeout(resolve, 1000));
    await waitFor(async () => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) throw new Error('Dialog not found');

      const dialogCanvas = within(dialog);
      const closeButton = await dialogCanvas.findByRole('button', { name: /close/i });
      await userEvent.click(closeButton);
    });
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