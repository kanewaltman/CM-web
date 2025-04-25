import type { Meta, StoryObj } from '@storybook/react';
import { TopBar } from './TopBar';
import { ThemeProvider, useTheme } from 'next-themes';
import { ThemeProvider as ThemeIntensityProvider, useThemeIntensity } from '@/contexts/ThemeContext';
import React, { useEffect } from 'react';
import { getThemeValues } from '@/lib/utils';

// Theme intensity initialization wrapper
const ThemeIntensityWrapper = ({ children }: { children: React.ReactNode }) => {
  const {
    setBackgroundIntensity,
    setWidgetIntensity,
    setBorderIntensity,
  } = useThemeIntensity();

  useEffect(() => {
    // Initialize with default values if no saved values exist
    const defaultIntensities = { background: 0, widget: 0, border: 0 };
    
    const getSavedIntensities = (theme: string) => {
      if (typeof window === 'undefined') return defaultIntensities;
      const saved = localStorage.getItem(`theme-intensities-${theme}`);
      return saved ? JSON.parse(saved) : defaultIntensities;
    };

    // Set initial values in localStorage and context
    if (typeof window !== 'undefined') {
      const lightIntensities = getSavedIntensities('light');
      const darkIntensities = getSavedIntensities('dark');
      
      localStorage.setItem('theme-intensities-light', JSON.stringify(lightIntensities));
      localStorage.setItem('theme-intensities-dark', JSON.stringify(darkIntensities));

      // Set initial context values
      setBackgroundIntensity(lightIntensities.background);
      setWidgetIntensity(lightIntensities.widget);
      setBorderIntensity(lightIntensities.border);
    }
  }, [setBackgroundIntensity, setWidgetIntensity, setBorderIntensity]);

  return children;
};

// Theme wrapper component to handle theme initialization
const ThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const { backgroundIntensity, widgetIntensity, borderIntensity } = useThemeIntensity();

  useEffect(() => {
    const root = document.documentElement;
    
    // Get saved intensities for both themes
    const getSavedIntensities = (theme: string) => {
      if (typeof window === 'undefined') return { background: 0, widget: 0, border: 0 };
      const saved = localStorage.getItem(`theme-intensities-${theme}`);
      return saved ? JSON.parse(saved) : { background: 0, widget: 0, border: 0 };
    };

    const lightIntensities = getSavedIntensities('light');
    const darkIntensities = getSavedIntensities('dark');

    // Create and append light theme styles
    const lightColors = getThemeValues('light', 
      lightIntensities.background,
      lightIntensities.widget,
      lightIntensities.border
    );
    const lightStyles = document.createElement('style');
    lightStyles.textContent = `:root {\n${Object.entries(lightColors.cssVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')}\n}`;
    document.head.appendChild(lightStyles);

    // Create and append dark theme styles
    const darkColors = getThemeValues('dark',
      darkIntensities.background,
      darkIntensities.widget,
      darkIntensities.border
    );
    const darkStyles = document.createElement('style');
    darkStyles.textContent = `.dark {\n${Object.entries(darkColors.cssVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')}\n}`;
    document.head.appendChild(darkStyles);

    return () => {
      lightStyles.remove();
      darkStyles.remove();
    };
  }, [resolvedTheme, backgroundIntensity, widgetIntensity, borderIntensity]);

  return children;
};

const meta = {
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
    (Story: React.ComponentType) => (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ThemeIntensityProvider>
          <ThemeIntensityWrapper>
            <ThemeWrapper>
              <div className="min-h-screen bg-background">
                <Story />
              </div>
            </ThemeWrapper>
          </ThemeIntensityWrapper>
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
} satisfies Meta<typeof TopBar>;

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