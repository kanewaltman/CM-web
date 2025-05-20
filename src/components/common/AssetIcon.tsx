import React from 'react';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';

interface AssetIconProps {
  asset: AssetTicker;
  iconPosition?: 'before' | 'after';
  iconSize?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
}

export const AssetIcon: React.FC<AssetIconProps> = ({ 
  asset, 
  iconPosition = 'after',
  iconSize = 'small',
  showText = true,
  className = '' 
}) => {
  const assetConfig = ASSETS[asset];
  
  // Determine size class based on iconSize prop
  const sizeClass = iconSize === 'large' ? 'w-6 h-6' : 
                   iconSize === 'medium' ? 'w-5 h-5' : 'w-4 h-4';
  
  const iconElement = assetConfig?.icon ? (
    <img
      src={assetConfig.icon}
      alt={asset}
      className={`${sizeClass} object-contain`}
      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        // Replace with letter placeholder on image load error
        const target = e.target as HTMLImageElement;
        target.outerHTML = `<span class="${sizeClass} rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">${asset.charAt(0)}</span>`;
      }}
    />
  ) : (
    <span className={`${sizeClass} rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold`}>
      {asset.charAt(0)}
    </span>
  );
  
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {iconPosition === 'before' && iconElement}
      {showText && <span>{asset}</span>}
      {iconPosition === 'after' && iconElement}
    </span>
  );
};

export default AssetIcon; 