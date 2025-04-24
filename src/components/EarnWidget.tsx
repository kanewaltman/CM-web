import React from 'react';
import { cn } from '@/lib/utils';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { useTheme } from 'next-themes';
import { ChevronRight } from './ui-icons';
import { EarnWidgetProps } from '@/types/widgets';
import { AssetPriceTooltip } from './AssetPriceTooltip';

interface StakingOption {
  asset: AssetTicker;
  apr?: string;
  amount?: string;
  earnRate?: string;
  isEarning?: boolean;
}

const EarnWidget: React.FC<EarnWidgetProps> = ({ className, widgetId }) => {
  const { theme } = useTheme();
  const [currentTheme, setCurrentTheme] = React.useState<'light' | 'dark'>('light');

  // Effect to detect theme
  React.useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setCurrentTheme(isDark ? 'dark' : 'light');
    };

    // Initial theme detection
    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Sample data - in a real implementation this would come from an API
  const summaryData = {
    lifetimeEarnings: '€53,244.74',
    pendingEarnings: '€22.16',
    avgRate: '3.43%',
    claimable: 4
  };

  const stakingOptions: StakingOption[] = [
    { asset: 'ETH', apr: '2.86% APR', amount: '0.0101 ETH', isEarning: true },
    { asset: 'XCM', apr: '4.00% APR', amount: '15.32 XCM', isEarning: true },
    { asset: 'LILAI', earnRate: 'earn 7.00%', isEarning: false },
    { asset: 'FLUX', earnRate: 'earn 4.38%', isEarning: false },
    { asset: 'KDA', earnRate: 'earn 8.15%', isEarning: false },
    { asset: 'THT', earnRate: 'earn 5.40%', isEarning: false },
    { asset: 'VSP', earnRate: 'earn 9.55%', isEarning: false },
    { asset: 'ADA', earnRate: 'earn 5.12%', isEarning: false },
    { asset: 'DOT', earnRate: 'earn 10.19%', isEarning: false },
    { asset: 'KSM', earnRate: 'earn 12.62%', isEarning: false },
    { asset: 'LTO', earnRate: 'earn 6.80%', isEarning: false },
    { asset: 'MATIC', earnRate: 'earn 7.95%', isEarning: false },
    { asset: 'XTZ', earnRate: 'earn 5.70%', isEarning: false }
  ];

  const earningAssets = stakingOptions.filter(option => option.isEarning);
  const readyToEarnAssets = stakingOptions.filter(option => !option.isEarning);

  const renderAssetItem = (option: StakingOption, index: number, total: number) => {
    const assetConfig = ASSETS[option.asset];
    const isLast = index === total - 1;
    const assetColor = currentTheme === 'dark' ? assetConfig?.theme.dark : assetConfig?.theme.light;
    
    return (
      <div key={option.asset}>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
              <img 
                src={assetConfig?.icon} 
                alt={option.asset} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <AssetPriceTooltip asset={option.asset} inTableCell={true}>
                  <button 
                    type="button"
                    className="font-jakarta font-bold text-sm rounded-md px-1"
                    style={{ 
                      color: assetColor,
                      backgroundColor: `${assetColor}14`,
                      cursor: 'pointer',
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'text',
                      userSelect: 'text'
                    }}
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
                    onMouseDown={(e) => {
                      if (e.detail > 1) {
                        e.preventDefault();
                      }
                    }}
                  >
                    {option.asset}
                  </button>
                </AssetPriceTooltip>
                {option.apr && <span className="text-sm text-muted-foreground">{option.apr}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {option.amount ? (
              <span className="text-green-500 font-bold text-sm">{option.amount}</span>
            ) : (
              <span className="text-green-500 font-bold text-sm">{option.earnRate}</span>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        {!isLast && <div className="border-t border-border" />}
      </div>
    );
  };

  return (
    <div className={cn(
      "h-full relative overflow-auto scrollbar-thin rounded-lg",
      "border border-[hsl(var(--color-widget-inset-border))] widget-inset",
      className
    )}>
      {/* Sticky Summary Statistics Section */}
      <div className="sticky top-0 z-10 widget-inset px-3 pb-1">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-2 p-3 bg-card rounded-md">
          <div className="flex flex-col justify-start">
            <span className="text-sm text-muted-foreground truncate">Lifetime Earnings</span>
            <span className="text-xl font-semibold text-green-500 truncate">{summaryData.lifetimeEarnings}</span>
          </div>
          <div className="flex flex-col justify-start">
            <span className="text-sm text-muted-foreground truncate">Pending Earnings</span>
            <span className="text-xl font-semibold truncate">{summaryData.pendingEarnings}</span>
          </div>
          <div className="flex flex-col justify-start">
            <span className="text-sm text-muted-foreground truncate">Avg Rate</span>
            <span className="text-xl font-semibold truncate">{summaryData.avgRate}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-6 p-3">
        {/* Earning Section */}
        {earningAssets.length > 0 && (
          <div className="flex flex-col space-y-1">
            <h3 className="text-base font-medium mb-2 pl-3">Earning</h3>
            <div className="rounded-md px-3">
              {earningAssets.map((option, index) => renderAssetItem(option, index, earningAssets.length))}
            </div>
          </div>
        )}

        {/* Ready to Earn Section */}
        {readyToEarnAssets.length > 0 && (
          <div className="flex flex-col space-y-1">
            <h3 className="text-base font-medium mb-2 pl-3">Ready to Earn</h3>
            <div className="rounded-md px-3">
              {readyToEarnAssets.map((option, index) => renderAssetItem(option, index, readyToEarnAssets.length))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EarnWidget; 