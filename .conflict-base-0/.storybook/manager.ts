import { addons } from '@storybook/manager-api';
import { darkTheme } from './theme';

addons.setConfig({
  theme: darkTheme,
  sidebar: {
    showRoots: false,
  },
  enableShortcuts: true,
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
  darkMode: {
    dark: darkTheme,
    current: 'dark'
  }
}); 