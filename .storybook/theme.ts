import { create } from '@storybook/theming';

export default create({
  base: 'light',
  
  // Brand
  brandTitle: 'CM Web',
  brandUrl: 'https://example.com',
  brandTarget: '_self',

  // Typography
  fontBase: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
  fontCode: 'monospace',

  // Colors
  colorPrimary: 'hsl(222.2 47.4% 11.2%)',
  colorSecondary: 'hsl(215.4 16.3% 46.9%)',

  // UI
  appBg: 'hsl(0 0% 96%)',
  appContentBg: 'hsl(0 0% 96%)',
  appPreviewBg: 'hsl(0 0% 96%)',
  appBorderColor: 'hsl(214.3 31.8% 91.4%)',
  appBorderRadius: 0.5,

  // Text colors
  textColor: 'hsl(222.2 84% 4.9%)',
  textInverseColor: 'hsl(210 40% 98%)',

  // Toolbar
  barTextColor: 'hsl(215.4 16.3% 46.9%)',
  barSelectedColor: 'hsl(222.2 47.4% 11.2%)',
  barHoverColor: 'hsl(222.2 47.4% 11.2%)',
  barBg: 'hsl(0 0% 96%)',

  // Form colors
  inputBg: 'hsl(0 0% 100%)',
  inputBorder: 'hsl(214.3 31.8% 91.4%)',
  inputTextColor: 'hsl(222.2 84% 4.9%)',
  inputBorderRadius: 0.5,
}); 