import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { useDataSource } from '@/lib/DataSourceContext';
import { useTheme } from 'next-themes';

// Get the current market price for an asset from the markets data
const MARKET_DATA = {
  "BTC/EUR": { price: 79000.50, change24h: 2.5 },
  "ETH/EUR": { price: 4200.25, change24h: -1.2 },
  "DOT/EUR": { price: 10.05, change24h: 0.8 },
  "USDT/EUR": { price: 0.91, change24h: -0.1 },
  "DOGE/EUR": { price: 0.012345, change24h: 1.5 },
  "SOL/EUR": { price: 85.00, change24h: 3.2 },
  "ADA/EUR": { price: 0.30, change24h: 0.5 },
  "HBAR/EUR": { price: 0.05, change24h: -1.0 }
};

interface AssetPriceTooltipProps {
  asset: AssetTicker;
  children: React.ReactNode;
}

export const AssetPriceTooltip: React.FC<AssetPriceTooltipProps> = ({ asset, children }) => {
  const { theme } = useTheme();
  const { dataSource } = useDataSource();
  const assetConfig = ASSETS[asset];
  const marketData = MARKET_DATA[`${asset}/EUR`];

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else if (price >= 100) {
      return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toLocaleString(undefined, { maximumFractionDigits: 4 });
    } else if (price >= 0.01) {
      return price.toLocaleString(undefined, { maximumFractionDigits: 6 });
    } else {
      return price.toLocaleString(undefined, { maximumFractionDigits: 8 });
    }
  };

  if (!marketData) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="py-2 px-3 bg-background text-foreground border border-border">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full overflow-hidden">
              <img
                src={assetConfig.icon}
                alt={asset}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="text-[13px] font-medium">
                €{formatPrice(marketData.price)}
              </div>
              <div className={`text-xs ${marketData.change24h > 0 ? 'text-price-up' : marketData.change24h < 0 ? 'text-price-down' : 'text-muted-foreground/80'}`}>
                {marketData.change24h > 0 ? '+' : ''}{marketData.change24h.toFixed(2)}%
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export interface AssetButtonWithPriceProps {
  asset: AssetTicker;
  onClick?: () => void;
}

export const AssetButtonWithPrice: React.FC<AssetButtonWithPriceProps> = ({ asset, onClick }) => {
  const { theme } = useTheme();
  const assetConfig = ASSETS[asset];
  const assetColor = theme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light;

  return (
    <AssetPriceTooltip asset={asset}>
      <button
        type="button"
        className="font-jakarta font-bold text-sm rounded-md px-1 transition-all duration-150"
        style={{ 
          color: assetColor,
          backgroundColor: `${assetColor}14`,
          cursor: 'pointer'
        }}
        onClick={onClick}
        onMouseEnter={(e) => {
          const target = e.currentTarget;
          target.style.backgroundColor = assetColor;
          target.style.color = 'hsl(var(--color-widget-bg))';
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget;
          target.style.backgroundColor = `${assetColor}14`;
          target.style.color = assetColor;
        }}
      >
        {assetConfig.name}
      </button>
    </AssetPriceTooltip>
  );
}; 