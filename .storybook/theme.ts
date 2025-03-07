import { create } from '@storybook/theming/create';

// Brand colors
const brandPrimary = '#0066FF';
const brandSecondary = '#0052CC';

// Dark theme colors
const darkBg = '#1A1A1A';
const darkBgAlt = '#0F0F0F';
const darkText = '#FFFFFF';
const darkTextMuted = '#A0A0A0';
const darkBorder = '#404040';

export const darkTheme = create({
  // Base theme
  base: 'dark',

  // Brand
  brandTitle: 'CM Web',
  brandUrl: 'https://cm-web.com',
  brandTarget: '_self',
  brandImage: '/assets/coinmetro-storybook-logo.svg',

  // Colors
  colorPrimary: brandPrimary,
  colorSecondary: brandSecondary,

  // UI
  appBg: darkBg,
  appContentBg: darkBgAlt,
  appBorderColor: darkBorder,
  appBorderRadius: 6,

  // Text colors
  textColor: darkText,
  textInverseColor: darkBg,
  textMutedColor: darkTextMuted,

  // Toolbar default and active colors
  barTextColor: darkTextMuted,
  barSelectedColor: brandPrimary,
  barBg: darkBg,

  // Form colors
  inputBg: darkBgAlt,
  inputBorder: darkBorder,
  inputTextColor: darkText,
  inputBorderRadius: 4,

  // Typography
  fontBase: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontCode: 'monospace',

  // Cards and panels
  cardBg: darkBgAlt,
  cardBorderColor: darkBorder,

  // Additional UI
  buttonBg: darkBgAlt,
  buttonBorder: darkBorder,
  booleanBg: darkBgAlt,
  booleanSelectedBg: '#383838',

  // Addon actions theme
  actionBg: darkBg,
  actionBorder: darkBorder,
  actionTextColor: darkText,
  actionTextHoverColor: darkTextMuted,

  // Addon controls theme
  controlBg: darkBgAlt,
  controlBorder: darkBorder,
  controlTextColor: darkText,
  controlTextHoverColor: darkTextMuted,
}); 