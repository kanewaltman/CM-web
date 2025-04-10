import type { Meta, StoryObj } from "@storybook/react";
import { AssetPriceTooltip, AssetButtonWithPrice } from "./AssetPriceTooltip";
import { AssetTicker } from "@/assets/AssetTicker";

const meta: Meta<typeof AssetPriceTooltip> = {
  title: "Components/AssetPriceTooltip",
  component: AssetPriceTooltip,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AssetPriceTooltip>;

export const Default: Story = {
  args: {
    asset: "BTC" as AssetTicker,
    children: (
      <div className="p-2 border rounded cursor-pointer">
        Hover over me to see BTC price
      </div>
    ),
  },
};

export const WithCustomButton: Story = {
  args: {
    asset: "ETH" as AssetTicker,
    children: (
      <button className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        ETH Price
      </button>
    ),
  },
};

export const WithMultipleAssets: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {["BTC", "ETH", "XRP", "LTC", "ADA", "DOT"].map((asset) => (
        <AssetButtonWithPrice
          key={asset}
          asset={asset as AssetTicker}
        />
      ))}
    </div>
  ),
};

export const AssetButtonsWithPrices: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {["BTC", "ETH", "SOL", "AVAX", "DOT", "XRP", "ADA", "LINK", "MATIC", "UNI"].map((asset) => (
        <AssetButtonWithPrice
          key={asset}
          asset={asset as AssetTicker}
          onClick={() => console.log(`Clicked on ${asset}`)}
        />
      ))}
    </div>
  ),
}; 