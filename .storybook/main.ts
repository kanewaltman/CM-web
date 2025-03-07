import type { StorybookConfig } from "@storybook/react-vite";
import theme from './theme';

interface CustomStorybookConfig extends StorybookConfig {
  theme?: any; // Using any since the theme type is not exported from @storybook/theming
}

const config: CustomStorybookConfig = {
  stories: [
    "../src/**/*.mdx",
    "../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../src/components/ui/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@storybook/addon-styling",
    "@storybook/addon-viewport",
    "@storybook/addon-docs",
    "storybook-dark-mode",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: true,
  },
  core: {
    disableTelemetry: true,
  },
  viteFinal: async (config) => {
    return {
      ...config,
      define: {
        ...config.define,
        'process.env': {},
      },
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': '/src',
        },
      },
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [
          ...(config.optimizeDeps?.include ?? []),
          "storybook-dark-mode",
        ],
      },
    };
  },
};

// Apply custom theme
config.theme = theme;

export default config; 