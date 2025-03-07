import type { Meta, StoryObj } from '@storybook/react';
import { TopBar } from './TopBar';

const meta: Meta<typeof TopBar> = {
  title: 'Layout/TopBar',
  component: TopBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
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
};

export const SpotPage: Story = {
  args: {
    currentPage: 'spot',
  },
};

export const MarginPage: Story = {
  args: {
    currentPage: 'margin',
  },
};

export const StakePage: Story = {
  args: {
    currentPage: 'stake',
  },
}; 