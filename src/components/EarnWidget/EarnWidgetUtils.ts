import React from 'react';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { resetDialogOpenedState } from '@/lib/widgetDialogService';
// Re-export AssetIcon from its own file
export { AssetIcon } from '@/components/common/AssetIcon';

// Define the token offerings for staking
export const stakingTokens = [
  'XCM', 'LILAI', 'FLUX', 'KDA', 'THT', 'VSP', 'ADA', 
  'DOT', 'KSM', 'LTO', 'MATIC', 'XTZ', 'ETH'
];

// Mock data for staking APY
export const getRandomAPY = () => {
  return (3 + Math.random() * 12).toFixed(2) + '%';
};

// Generate token data
export const tokenData = stakingTokens.map(token => ({
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
export const isInDialog = (): boolean => {
  // Find dialog elements in the DOM
  return !!document.querySelector('[role="dialog"]') || 
         !!document.querySelector('.dialog-content') ||
         !!document.querySelector('.DialogContent') ||
         !!document.querySelector('.DialogOverlay');
};

// Function to more aggressively reset dialog state
export const forceResetDialogState = () => {
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
export const updateUrlWithAsset = (asset: string) => {
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

// Helper function to read asset parameter from URL
export const getAssetFromUrl = (): string | undefined => {
  try {
    const url = new URL(window.location.href);
    
    // If the hash starts with just '#&', it's malformed and should be ignored
    if (url.hash.startsWith('#&')) {
      return undefined;
    }
    
    // Check if we have a widget=earn-stake parameter first
    if (url.hash.includes('widget=earn-stake')) {
      // Then look for the asset parameter
      const assetParam = url.hash.match(/asset=([^&]*)/)?.[1];
      if (assetParam && stakingTokens.includes(assetParam)) {
        console.log('📱 Found valid asset in URL:', assetParam);
        return assetParam;
      }
    } else if (url.hash.includes('asset=')) {
      // Also check for standalone asset parameter
      const assetParam = url.hash.match(/asset=([^&]*)/)?.[1];
      if (assetParam && stakingTokens.includes(assetParam)) {
        console.log('📱 Found valid standalone asset in URL:', assetParam);
        return assetParam;
      }
    }
  } catch (error) {
    console.error('Error parsing URL for asset parameter:', error);
  }
  return undefined;
}; 