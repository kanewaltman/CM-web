import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import React, { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { ThemeProvider as ThemeIntensityProvider } from '../../contexts/ThemeContext';
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

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
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
            <div className="p-4">
              <Story />
            </div>
          </ThemeWrapper>
        </ThemeIntensityProvider>
      </ThemeProvider>
    ),
  ],
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
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

export const Icon: Story = {
  args: {
    size: 'icon',
    children: '🔍',
  },
}; 