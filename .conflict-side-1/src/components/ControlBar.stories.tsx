import type { Meta, StoryObj } from '@storybook/react';
import { ControlBar } from './ControlBar';
import { Toaster } from './ui/sonner';
import { WIDGET_REGISTRY } from '@/lib/widgetRegistry';
import { userEvent, waitFor, within } from '@storybook/test';
import React, { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { ThemeProvider as ThemeIntensityProvider } from '../contexts/ThemeContext';
import { getThemeValues } from '@/lib/utils';

// Theme wrapper component to handle theme initialization
const ThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const root = document.documentElement;
    const darkColors = getThemeValues('dark');
    const lightColors = getThemeValues('light');

    // Set both light and dark mode variables
    Object.entries(lightColors.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Set dark mode variables with proper scoping
    const darkStyles = document.createElement('style');
    darkStyles.textContent = `.dark {\n${Object.entries(darkColors.cssVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')}\n}`;
    document.head.appendChild(darkStyles);

    return () => {
      // Clean up
      Object.keys(lightColors.cssVariables).forEach((key) => {
        root.style.removeProperty(key);
      });
      darkStyles.remove();
    };
  }, []);

  return children;
};

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
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'dark',
          value: 'hsl(0 0% 0%)',
        },
        {
          name: 'light',
          value: 'hsl(0 0% 100%)',
        },
      ],
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
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ThemeIntensityProvider>
          <ThemeWrapper>
            <div className="w-full">
              <Story />
              <Toaster />
            </div>
          </ThemeWrapper>
        </ThemeIntensityProvider>
      </ThemeProvider>
    ),
  ],
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Wait a bit for initial render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Find and hover over the Main button
    const mainButton = await canvas.findByRole('button', { name: /main/i });
    await userEvent.hover(mainButton);
    await new Promise(resolve => setTimeout(resolve, 300));
    await userEvent.unhover(mainButton);
  },
};

export const WithGridStyleRounded: Story = {
  render: BaseStory,
  args: {
    ...mockHandlers,
    initialGridStyle: 'rounded',
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
    
    // Wait for the dropdown menu to appear and click Edit Appearance
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
    
    // Wait for dialog to appear and click the Rounded option
    await waitFor(async () => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) throw new Error('Dialog not found');
      
      const dialogCanvas = within(dialog);
      // Look for the grid style section
      const gridStyleSection = await dialogCanvas.findByText('Grid Style');
      const gridStyleContainer = gridStyleSection.parentElement;
      if (!gridStyleContainer) throw new Error('Grid style container not found');
      
      // Find the Rounded option within the grid style container
      const roundedContainer = await within(gridStyleContainer).findByText(/24px radius/i);
      const roundedButton = roundedContainer.closest('div[class*="cursor-pointer"]');
      if (!roundedButton) throw new Error('Rounded button not found');
      
      await userEvent.hover(roundedButton);
      await new Promise(resolve => setTimeout(resolve, 300));
      await userEvent.click(roundedButton);
      
      // Close dialog using ESC key
      await userEvent.keyboard('{Escape}');
    }, { timeout: 3000 });
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Wait a bit for initial render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // First find and click the Edit button to open the menu
    const editButton = await canvas.findByRole('button', { name: /edit/i });
    await userEvent.hover(editButton);
    await new Promise(resolve => setTimeout(resolve, 300));
    await userEvent.click(editButton);
    
    // Wait for the dropdown menu to appear and click Edit Appearance
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
    
    // Wait for dialog to appear and click the Dense option
    await waitFor(async () => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) throw new Error('Dialog not found');
      
      const dialogCanvas = within(dialog);
      // Look for the grid style section
      const gridStyleSection = await dialogCanvas.findByText('Grid Style');
      const gridStyleContainer = gridStyleSection.parentElement;
      if (!gridStyleContainer) throw new Error('Grid style container not found');
      
      // Find the Dense option within the grid style container
      const denseContainer = await within(gridStyleContainer).findByText(/16px radius/i);
      const denseButton = denseContainer.closest('div[class*="cursor-pointer"]');
      if (!denseButton) throw new Error('Dense button not found');
      
      await userEvent.hover(denseButton);
      await new Promise(resolve => setTimeout(resolve, 300));
      await userEvent.click(denseButton);
      
      // Close dialog using ESC key
      await userEvent.keyboard('{Escape}');
    }, { timeout: 3000 });
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