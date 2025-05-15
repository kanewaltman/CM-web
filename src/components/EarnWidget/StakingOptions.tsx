import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { openWidgetDialog, resetDialogOpenedState, forceOpenDialog } from '@/lib/widgetDialogService';

// Define the token offerings for staking
const stakingTokens = [
  'XCM', 'LILAI', 'FLUX', 'KDA', 'THT', 'VSP', 'ADA', 
  'DOT', 'KSM', 'LTO', 'MATIC', 'XTZ', 'ETH'
];

// Mock data for staking APY
const getRandomAPY = () => {
  return (3 + Math.random() * 12).toFixed(2) + '%';
};

// Generate token data
const tokenData = stakingTokens.map(token => ({
  symbol: token,
  name: token, // In a real app, we would have the full names
  network: token === 'ETH' || token === 'MATIC' ? 'Ethereum' : 
           token === 'DOT' || token === 'KSM' ? 'Polkadot' : 
           token === 'ADA' ? 'Cardano' : 
           token === 'XTZ' ? 'Tezos' : 'Blockchain',
  apy: getRandomAPY(),
  minStake: Math.floor(Math.random() * 100),
  lockPeriod: Math.floor(Math.random() * 30) + ' days'
}));

// Helper function to check if we're in a dialog
const isInDialog = (): boolean => {
  // Find dialog elements in the DOM
  return !!document.querySelector('[role="dialog"]') || 
         !!document.querySelector('.dialog-content') ||
         !!document.querySelector('.DialogContent') ||
         !!document.querySelector('.DialogOverlay');
};

// Function to more aggressively reset dialog state
const forceResetDialogState = () => {
  // First call the standard reset function
  resetDialogOpenedState();
  
  // Force reset dialog state flags in the DOM
  document.querySelectorAll('[data-dialog-open="true"]').forEach(el => {
    el.setAttribute('data-dialog-open', 'false');
  });
  
  // Remove open dialog classes from body and containers
  document.body.classList.remove('widget-dialog-open');
  document.querySelectorAll('.widget-dialog-open').forEach(el => {
    el.classList.remove('widget-dialog-open');
  });
  
  // Clear any URL hash parameters related to dialogs
  if (window.location.hash.includes('widget=') || window.location.hash.includes('asset=')) {
    const newUrl = new URL(window.location.href);
    newUrl.hash = '';
    window.history.replaceState(
      { dialogClosed: true, timestamp: Date.now() },
      '',
      newUrl.toString()
    );
  }
};

// Helper function to update URL with asset parameter
const updateUrlWithAsset = (asset: string) => {
  if (!asset || !stakingTokens.includes(asset)) return;
  
  try {
    const url = new URL(window.location.href);
    const currentPath = url.pathname;
    const isEarnPage = currentPath === '/earn';
    const isDialogOpen = isInDialog();
    
    // Check if the asset is already in the URL hash
    const currentAsset = url.hash.match(/asset=([^&]*)/)?.[1];
    if (currentAsset === asset) {
      // Asset is already correctly set, don't update URL
      return;
    }
    
    // Don't modify URL on the earn page unless in a dialog
    if (isEarnPage && !isDialogOpen) return;
    
    // On earn page in dialog, use dialog URL format with widget parameter
    if (isEarnPage && isDialogOpen) {
      if (url.hash.includes('widget=earn-stake')) {
        // Preserve the widget parameter if it exists
        const newHash = url.hash.replace(/asset=[^&]*/, `asset=${asset}`);
        if (!newHash.includes('asset=')) {
          // Add asset parameter if it doesn't exist
          history.replaceState(null, '', `${currentPath}${newHash}&asset=${asset}`);
        } else {
          // Just update the existing asset parameter
          history.replaceState(null, '', `${currentPath}${newHash}`);
        }
      } else {
        // Include widget parameter when updating URL
        history.replaceState(null, '', `${currentPath}#widget=earn-stake&asset=${asset}`);
      }
      return;
    }
    
    // Otherwise, use normal URL formatting
    // Parse current hash parts
    const currentHash = url.hash || '#';
    const hashParts = currentHash.substring(1).split('&').filter(part => 
      part && !part.startsWith('asset=')
    );
    
    // Add asset parameter if it's valid
    hashParts.push(`asset=${asset}`);
    
    // Only add widget parameter if we're not on the earn page and it's not already present
    if (!isEarnPage && !hashParts.some(part => part.startsWith('widget='))) {
      hashParts.push('widget=earn-stake');
    }
    
    // Build new hash - ensure it doesn't start with '&'
    let newHash = '#' + hashParts.filter(part => part.length > 0).join('&');
    
    // Fix common URL formatting issues
    if (newHash === '#') newHash = '';
    if (newHash.startsWith('#&')) newHash = '#' + newHash.substring(2);
    
    // Only update if there's an actual change
    if (newHash !== url.hash) {
      history.replaceState(null, '', newHash || url.pathname);
    }
  } catch (error) {
    console.error('Error updating URL with asset parameter:', error);
  }
};

// For special handling in CardGridView
const isStaticWidget = (widgetId: string): boolean => {
  return widgetId.includes('-static');
};

// Card Grid View component for token browsing
const EarnWidgetStakingOptions: React.FC<{ forcedTheme?: 'light' | 'dark', widgetId?: string }> = ({ forcedTheme, widgetId }) => {
  // Function to open stake view with a specific asset
  const handleStakeClick = (token: string) => {
    // Clear any recent closure protection
    sessionStorage.removeItem('dialog_last_closed');
    
    // Always force reset dialog state first
    forceResetDialogState();
    
    // Create a cleanup event
    const closeEvent = new CustomEvent('close-widget-dialogs', {
      bubbles: true
    });
    
    // Dispatch the close event
    document.dispatchEvent(closeEvent);
    
    // Set a flag in sessionStorage to indicate the exact asset we want to maintain
    sessionStorage.setItem('selected_stake_asset', token);
    
    // When on earn page, update URL properly
    if (window.location.pathname === '/earn') {
      // Use proper format with widget parameter
      window.history.replaceState(
        null, 
        '', 
        `${window.location.pathname}#widget=earn-stake&asset=${token}`
      );
    } else {
      // Not on earn page, use updateUrlWithAsset
      updateUrlWithAsset(token);
    }
    
    // Put a small delay to ensure everything is cleared
    setTimeout(() => {
      // Force open the dialog
      forceOpenDialog('earn-stake', token);
    }, 250);
  };
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    const token = target.alt;
    // Replace with letter placeholder on image load error
    target.outerHTML = `<div class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">${token.charAt(0)}</div>`;
  };
  
  // Check if this is a static widget (on EarnPage)
  const isOnStaticPage = widgetId ? isStaticWidget(widgetId) : false;
  
  // Log rendering mode
  useEffect(() => {
    console.log(`CardGridView rendering with widgetId: ${widgetId}, isStatic: ${isOnStaticPage}`);
  }, [widgetId, isOnStaticPage]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tokenData.map((token) => (
        <Card 
          key={token.symbol} 
          className={cn(
            "overflow-hidden hover:shadow-md transition-shadow bg-[hsl(var(--primary-foreground))]",
            forcedTheme === 'dark' ? "border-border" : "border-border"
          )}
        >
          <CardHeader className="p-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 mr-4 flex items-center justify-center overflow-hidden">
                  <img 
                    src={`/assets/symbols/${token.symbol}.svg`} 
                    alt={token.symbol}
                    className="w-full h-full object-contain"
                    onError={handleImageError}
                  />
                </div>
                <div>
                  <CardTitle className="text-xl">{token.symbol}</CardTitle>
                  <p className="text-xs text-muted-foreground">on {token.network}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">${(token.minStake * 23.5).toFixed(2)}M</div>
                <div className="text-xs text-muted-foreground">TVL</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 pb-2">
            <div className="space-y-1 ">
              <div className="flex justify-between bg-[hsl(var(--color-widget-inset))] border border-[hsl(var(--color-widget-inset-border))] rounded-lg p-6">
                <span className="text-md text-muted-foreground">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="border-b border-dotted border-muted-foreground">APY</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Annual Percentage Yield - the yearly return on your staked assets.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
                <span className="text-md text-emerald-500 font-medium">{token.apy}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="bg-[hsl(var(--color-widget-inset))] border border-[hsl(var(--color-widget-inset-border))] rounded-lg p-6 pt-4 pb-4 flex flex-col items-left">
                  <span className="text-sm text-muted-foreground pb-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="border-b border-dotted border-muted-foreground">30d Avg APY</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Average Annual Percentage Yield over the last 30 days.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <span className="text-md font-medium">8.97%</span>
                </div>
                <div className="bg-[hsl(var(--color-widget-inset))] border border-[hsl(var(--color-widget-inset-border))] rounded-lg p-6 pt-4 pb-4 flex flex-col items-left">
                  <span className="text-sm text-muted-foreground pb-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="border-b border-dotted border-muted-foreground">30d Prediction</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Estimated APY for the next 30 days based on recent trends.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <div className="flex flex-col items-left">
                    <span className="text-md font-medium text-emerald-500">&gt;7.45%</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 pb-3 bg-[hsl(var(--color-widget-inset))] border border-[hsl(var(--color-widget-inset-border))] rounded-lg p-6">
                <div className="text-sm text-muted-foreground mt-2 pb-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="border-b border-dotted border-muted-foreground">Historical APY</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Past APY performance over different time periods.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex justify-between">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">24h</span>
                    <span className="text-sm">-</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">7d</span>
                    <span className="text-sm text-emerald-500">9.53%</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">30d</span>
                    <span className="text-sm text-emerald-500">9.57%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-2">
            <Button 
              className="w-full bg-primary/10 text-primary hover:bg-primary/20 font-medium text-base py-6" 
              size="lg"
              onClick={() => handleStakeClick(token.symbol)}
            >
              Earn {token.symbol}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export { EarnWidgetStakingOptions, stakingTokens, tokenData, isStaticWidget }; 