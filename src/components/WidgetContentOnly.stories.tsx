import type { Meta, StoryObj } from '@storybook/react';
import { WidgetContentOnly } from './WidgetContentOnly';
import * as React from 'react';

const meta: Meta<typeof WidgetContentOnly> = {
  title: 'Components/WidgetContentOnly',
  component: WidgetContentOnly,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    widgetType: {
      control: 'select',
      options: ['market', 'earn', 'performance', 'insight'],
      description: 'The type of widget to render'
    },
    widgetId: {
      control: 'text',
      description: 'A unique ID for the widget instance'
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply'
    },
    viewState: {
      control: 'object',
      description: 'Optional view state for the widget'
    }
  }
};

export default meta;
type Story = StoryObj<typeof WidgetContentOnly>;

export const MarketWidgetContent: Story = {
  args: {
    widgetType: 'market',
    widgetId: 'market-content-only',
    className: 'h-[400px] w-[600px] border rounded-lg'
  },
  parameters: {
    docs: {
      description: {
        story: 'Market overview widget content without the container header.',
      },
    },
  },
};

export const EarnWidgetRippleContent: Story = {
  args: {
    widgetType: 'earn',
    widgetId: 'earn-ripple-content-only',
    className: 'h-[400px] w-[600px] border rounded-lg',
    viewState: { earnViewMode: 'ripple' }
  },
  parameters: {
    docs: {
      description: {
        story: 'Earn widget with ripple view content without the container header.',
      },
    },
  },
};

export const EarnWidgetCardsContent: Story = {
  args: {
    widgetType: 'earn',
    widgetId: 'earn-cards-content-only',
    className: 'h-[400px] w-[600px] border rounded-lg',
    viewState: { earnViewMode: 'cards' }
  },
  parameters: {
    docs: {
      description: {
        story: 'Earn widget with cards view content without the container header.',
      },
    },
  },
};

export const PerformanceWidgetContent: Story = {
  args: {
    widgetType: 'performance',
    widgetId: 'performance-content-only',
    className: 'h-[400px] w-[600px] border rounded-lg',
    viewState: { chartVariant: 'balance' }
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance widget content without the container header.',
      },
    },
  },
}; 