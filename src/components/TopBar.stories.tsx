import type { Meta, StoryObj } from '@storybook/react';
import { TopBar } from './TopBar';
import { ThemeProvider } from 'next-themes';
import { ThemeProvider as ThemeIntensityProvider } from '../contexts/ThemeContext';
import React, { useEffect } from 'react';
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

const meta: Meta<typeof TopBar> = {
  title: 'Layout/TopBar',
  component: TopBar,
  parameters: {
    layout: 'fullscreen',
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
            <div className="min-h-screen bg-background">
              <Story />
            </div>
          </ThemeWrapper>
        </ThemeIntensityProvider>
      </ThemeProvider>
    ),
  ],
  argTypes: {
    currentPage: {
      control: 'select',
      options: ['dashboard', 'spot', 'margin', 'stake'],
    },
    onPageChange: { action: 'page changed' },
  },
};

export default meta;
type Story = StoryObj<typeof TopBar>;

export const Default: Story = {
  args: {
    currentPage: 'dashboard',
  },
  parameters: {
    docs: {
      description: {
        story: 'The default TopBar state showing the dashboard page as active.',
      },
    },
  },
};

export const SpotPage: Story = {
  args: {
    currentPage: 'spot',
  },
  parameters: {
    docs: {
      description: {
        story: 'TopBar with the Spot trading page selected.',
      },
    },
  },
};

export const MarginPage: Story = {
  args: {
    currentPage: 'margin',
  },
  parameters: {
    docs: {
      description: {
        story: 'TopBar with the Margin trading page selected.',
      },
    },
  },
};

export const StakePage: Story = {
  args: {
    currentPage: 'stake',
  },
  parameters: {
    docs: {
      description: {
        story: 'TopBar with the Staking page selected.',
      },
    },
  },
}; 