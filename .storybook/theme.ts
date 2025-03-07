import { create } from '@storybook/theming/create';

const brandPrimary = '#FF4D15';
const brandSecondary = '#627EEA';
const darkBg = '#1a1a1a';
const darkBgAlt = '#2f2f2f';
const darkText = '#ffffff';
const darkTextMuted = '#999999';
const darkBorder = 'rgba(255,255,255,0.1)';

export const darkTheme = create({
  base: 'dark',

  // Brand
  brandTitle: 'CM Web',
  brandUrl: '/',
  brandTarget: '_self',

  // Typography
  fontBase: 'system-ui, -apple-system, sans-serif',
  fontCode: 'ui-monospace, monospace',

  // Colors
  colorPrimary: brandPrimary,
  colorSecondary: brandSecondary,

  // UI
  appBg: darkBg,
  appContentBg: darkBg,
  appBorderColor: darkBorder,
  appBorderRadius: 4,

  // Text colors
  textColor: darkText,
  textInverseColor: darkBg,
  textMutedColor: darkTextMuted,

  // Toolbar default and active colors
  barTextColor: darkTextMuted,
  barSelectedColor: darkText,
  barBg: darkBg,
  barBorderColor: darkBorder,
  barHoverColor: brandPrimary,

  // Form colors
  inputBg: darkBgAlt,
  inputBorder: darkBorder,
  inputTextColor: darkText,
  inputBorderRadius: 4,

  // Card colors
  cardBg: darkBgAlt,
  cardBorderColor: darkBorder,

  // Base
  base: 'dark',
  
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