import React, { useState, useEffect, useRef } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { useDataSource } from '@/lib/DataSourceContext';
import { useTheme } from 'next-themes';
import { ExchangeRateData } from '@/services/coinGeckoService';
import { RATES_UPDATED_EVENT } from '@/contexts/ExchangeRatesContext';
import NumberFlow, { continuous } from '@number-flow/react';

// Storage keys from ExchangeRatesContext
const STORAGE_RATES_KEY = 'cm_exchange_rates';
const STORAGE_PREV_RATES_KEY = 'cm_exchange_rates_prev';
const STORAGE_TIMESTAMP_KEY = 'cm_exchange_rates_timestamp';
const STORAGE_LAST_SEEN_PRICES_KEY = 'cm_last_seen_prices';

// Fallback market data when neither context nor localStorage is available
const FALLBACK_MARKET_DATA = {
  BTC: { eur: 61500.20 },
  ETH: { eur: 3200.50 },
  DOT: { eur: 8.35 },
  USDT: { eur: 0.92 },
  DOGE: { eur: 0.13 },
  SOL: { eur: 145.00 },
  ADA: { eur: 0.45 },
  HBAR: { eur: 0.07 },
  XCM: { eur: 0.67 }  // Add XCM fallback data
};

// Create a global singleton for cached rates that all tooltip instances will share
interface GlobalRatesState {
  currentRates: ExchangeRateData;
  previousRates: ExchangeRateData;
  timestamp: number | null;
  loading: boolean;
}

// Global rates that all tooltip components will share
let globalRates: GlobalRatesState = {
  currentRates: {},
  previousRates: {},
  timestamp: null,
  loading: false
};

// Flag to track if we've already loaded data
let hasInitialized = false;

// Function to get cached data from localStorage - same as in ExchangeRatesContext
const getCachedRates = (): { rates: ExchangeRateData | null, previousRates: ExchangeRateData | null, timestamp: number | null } => {
  try {
    const cachedRates = localStorage.getItem(STORAGE_RATES_KEY);
    const cachedPrevRates = localStorage.getItem(STORAGE_PREV_RATES_KEY);
    const cachedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    
    return {
      rates: cachedRates ? JSON.parse(cachedRates) : null,
      previousRates: cachedPrevRates ? JSON.parse(cachedPrevRates) : null,
      timestamp: cachedTimestamp ? parseInt(cachedTimestamp, 10) : null
    };
  } catch (error) {
    console.warn('Failed to load cached exchange rates:', error);
    return { rates: null, previousRates: null, timestamp: null };
  }
};

// Initialize the global rates from localStorage if needed
const initializeGlobalRates = (): void => {
  if (!hasInitialized) {
    const { rates, previousRates, timestamp } = getCachedRates();
    if (rates) {
      globalRates.currentRates = rates;
      globalRates.previousRates = previousRates || {};
      globalRates.timestamp = timestamp;
      console.log('Initialized global rates from localStorage cache');
    } else {
      globalRates.currentRates = FALLBACK_MARKET_DATA;
      globalRates.previousRates = {};
      console.log('Initialized global rates with fallback data');
    }
    hasInitialized = true;
  }
};

// Try to use context if available
let useExchangeRates: any = null;
try {
  // Dynamic import to avoid errors when context isn't available
  const ExchangeRatesContext = require('@/contexts/ExchangeRatesContext');
  useExchangeRates = ExchangeRatesContext.useExchangeRates;
} catch (error) {
  console.warn('ExchangeRatesContext not available, will try localStorage cache');
}

// Initialize rates on module load
initializeGlobalRates();

// Load last seen prices from localStorage
const loadLastSeenPrices = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(STORAGE_LAST_SEEN_PRICES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn('Failed to load last seen prices', e);
    return {};
  }
};

// Save last seen prices to localStorage
const saveLastSeenPrices = (prices: Record<string, number>) => {
  try {
    localStorage.setItem(STORAGE_LAST_SEEN_PRICES_KEY, JSON.stringify(prices));
  } catch (e) {
    console.warn('Failed to save last seen prices', e);
  }
};

// Store last seen prices for each asset to ensure animations happen
let lastSeenPrices: Record<string, number> = loadLastSeenPrices();

// Find an artificial difference if prices are too similar
const getAnimationStartValue = (currentValue: number, lastValue: number): number => {
  const diff = Math.abs(currentValue - lastValue);
  const minDiffPercent = 0.01; // Reduced to 1% to create more subtle but visible animations
  
  // Even if the actual difference is tiny, always ensure a minimum visual difference
  if (diff / currentValue < minDiffPercent) {
    // If current greater than last (or virtually identical), start a bit lower
    if (currentValue >= lastValue * 0.9999) {
      return currentValue * (1 - minDiffPercent);
    } 
    // If current less than last, start a bit higher
    else {
      return currentValue * (1 + minDiffPercent);
    }
  }
  
  // For larger differences, use actual last seen value
  return lastValue;
};

// Custom NumberFlow wrapper that handles animation between values
const AnimatedPrice = ({ 
  currentValue, 
  startValue, 
  format, 
  shouldAnimate,
  duration = 1500 
}: { 
  currentValue: number, 
  startValue: number, 
  format: Record<string, any>,
  shouldAnimate: boolean,
  duration?: number
}) => {
  const [value, setValue] = useState(shouldAnimate ? startValue : currentValue);
  const [key, setKey] = useState(0);
  
  // Only animate if values are different
  useEffect(() => {
    if (shouldAnimate) {
      setValue(startValue);
      
      // Force a re-render to start from the beginning
      setKey(prev => prev + 1);
      
      // After a tiny delay, update to the current value to trigger animation
      const timeout = setTimeout(() => {
        setValue(currentValue);
      }, 50);
      
      return () => clearTimeout(timeout);
    }
  }, [startValue, currentValue, shouldAnimate]);
  
  const formattedNumber = (
    <NumberFlow
      key={key}
      value={value}
      format={format}
      transformTiming={{ duration, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      opacityTiming={{ duration: 300 }}
      plugins={[continuous]}
      animated={shouldAnimate}
      willChange={shouldAnimate}
    />
  );
  
  return formattedNumber;
};

// Helper function to create a single component for both static and animated display
const PriceDisplay = ({
  price,
  format,
  isAnimated = false,
  startValue = null,
  duration = 1200
}: {
  price: number,
  format: Record<string, any>,
  isAnimated?: boolean,
  startValue?: number | null,
  duration?: number
}) => {
  // Manage animation state
  const [displayValue, setDisplayValue] = useState(price);
  const [key, setKey] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const animationTimer = useRef<NodeJS.Timeout | null>(null);
  const colorFadeTimer = useRef<NodeJS.Timeout | null>(null);
  const [showColor, setShowColor] = useState(false);
  
  // Track if price increased or decreased for color styling
  const priceIncreasing = startValue !== null && isAnimated ? price > startValue : false;
  const priceDecreasing = startValue !== null && isAnimated ? price < startValue : false;
  
  // Clean up any timers when component unmounts
  useEffect(() => {
    return () => {
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
      }
      if (colorFadeTimer.current) {
        clearTimeout(colorFadeTimer.current);
      }
    };
  }, []);
  
  // Update animation when props change
  useEffect(() => {
    // Clear any existing timers
    if (animationTimer.current) {
      clearTimeout(animationTimer.current);
      animationTimer.current = null;
    }
    if (colorFadeTimer.current) {
      clearTimeout(colorFadeTimer.current);
      colorFadeTimer.current = null;
    }
    
    // Only show color if we're animating and there's a meaningful difference
    const shouldShowColor = isAnimated && 
      startValue !== null && 
      Math.abs(price - startValue) / price > 0.0001;
    
    setShowColor(shouldShowColor);
    
    if (isAnimated && startValue !== null) {
      // Reset animation state
      setAnimationComplete(false);
      
      // Start from the initial value
      setDisplayValue(startValue);
      
      // Force component re-render with new key
      setKey(prev => prev + 1);
      
      // After a small delay, update to target value to trigger animation
      const animationTimeout = setTimeout(() => {
        setDisplayValue(price);
      }, 50);
      
      return () => clearTimeout(animationTimeout);
    } else {
      setDisplayValue(price);
      setAnimationComplete(true);
      setShowColor(false); // Don't show color if not animating
    }
  }, [price, startValue, isAnimated]);
  
  // Handle animation completion
  const handleAnimationsFinish = () => {
    // Store the timer reference so we can clear it if needed
    animationTimer.current = setTimeout(() => {
      setAnimationComplete(true);
      animationTimer.current = null;
      
      // Keep the color for a bit after animation completes, then fade it
      if (showColor) {
        colorFadeTimer.current = setTimeout(() => {
          setShowColor(false);
          colorFadeTimer.current = null;
        }, 1500);
      }
    }, 800); // A bit shorter than 1s, but still gives time for visual settling
  };
  
  // Format static display the same way
  const formattedStatic = price.toLocaleString(undefined, format);
  
  // Determine color style based on price movement
  const getDynamicColor = () => {
    if (!showColor) return '';
    if (priceIncreasing) return 'text-[#00C853]'; // Green for increasing
    if (priceDecreasing) return 'text-[#FF5252]'; // Red for decreasing
    return '';
  };
  
  return (
    <div className="font-tabular-nums" style={{ display: 'flex', alignItems: 'center', height: '1.2em' }}>
      <div style={{ paddingRight: '2px', display: 'flex', alignItems: 'center' }}>€</div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}>
        {/* Animated version */}
        {isAnimated && startValue !== null && !animationComplete && (
          <div style={{ 
            position: 'relative', 
            zIndex: 2,
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }}
          className={getDynamicColor()}>
            <NumberFlow
              key={key}
              value={displayValue}
              format={format}
              transformTiming={{ 
                duration,
                easing: 'cubic-bezier(0.16, 1.36, 0.64, 1)'
              }}
              opacityTiming={{ 
                duration: 300,
                easing: 'ease-out'
              }}
              plugins={[continuous]}
              willChange={true}
              animated={true}
              onAnimationsFinish={handleAnimationsFinish}
            />
          </div>
        )}
        
        {/* Static version (shown after animation completes) */}
        <div style={{ 
          opacity: animationComplete ? 1 : 0,
          position: !animationComplete ? 'absolute' : 'static',
          inset: 0,
          zIndex: 1,
          transition: 'opacity 300ms ease-in, color 500ms ease-out',
          display: 'flex',
          alignItems: 'center',
          height: '100%'
        }}
        className={getDynamicColor()}>
          {formattedStatic}
        </div>
      </div>
    </div>
  );
};

interface AssetPriceTooltipProps {
  asset: AssetTicker;
  children: React.ReactNode;
  delayDuration?: number;
}

export const AssetPriceTooltip: React.FC<AssetPriceTooltipProps> = ({ 
  asset, 
  children,
  delayDuration = 0
}) => {
  const { theme } = useTheme();
  const { dataSource } = useDataSource();
  const assetConfig = ASSETS[asset];
  
  // Local state that will be synchronized with global state
  const [currentRates, setCurrentRates] = useState<ExchangeRateData>(globalRates.currentRates);
  const [previousRates, setPreviousRates] = useState<ExchangeRateData>(globalRates.previousRates);
  const [loading, setLoading] = useState<boolean>(globalRates.loading);
  const [lastUpdated, setLastUpdated] = useState<number | null>(globalRates.timestamp);
  const [error, setError] = useState<string | null>(null);
  
  // Track whether the tooltip is open
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  
  // Track the starting value for animation
  const [animationStartValue, setAnimationStartValue] = useState(0);

  // Track whether we should animate
  const [shouldAnimate, setShouldAnimate] = useState(false);
  
  // Get current asset data and price
  const currentAssetData = currentRates[asset];
  const currentPrice = currentAssetData?.eur || 0;
  
  // Reference to track if this is the first time opening
  const isFirstOpen = useRef(true);
  
  // Reference to track if the animation has been started
  const animationStarted = useRef(false);
  
  // Track if we've actually shown an animation this session
  const animationPlayed = useRef(false);
  
  // Handle tooltip open state changes
  const handleTooltipOpenChange = (open: boolean) => {
    if (open && currentPrice > 0 && !animationStarted.current) {
      // Only set up animation if it hasn't been started yet
      const lastPrice = lastSeenPrices[asset];
      
      if (!lastPrice) {
        setShouldAnimate(true);
        const startingValue = currentPrice * 0.9;
        setAnimationStartValue(startingValue);
        animationPlayed.current = true;
        console.log(`First view of ${asset}, starting from ${startingValue}`);
      } else {
        // Use a much smaller threshold to trigger animations more frequently
        // 0.0001 = 0.01% difference which should animate almost every time there's any price change
        const priceDiff = Math.abs(currentPrice - lastPrice) / currentPrice;
        const shouldAnimatePrice = priceDiff > 0.0001; 
        
        setShouldAnimate(shouldAnimatePrice);
        
        if (shouldAnimatePrice) {
          const startingValue = getAnimationStartValue(currentPrice, lastPrice);
          setAnimationStartValue(startingValue);
          animationPlayed.current = true;
          console.log(`Animating ${asset} from ${startingValue} to ${currentPrice} (diff: ${priceDiff.toFixed(6)})`);
        } else {
          console.log(`No significant change for ${asset}, skipping animation (diff: ${priceDiff.toFixed(6)})`);
          // Explicitly set to not animate without color
          setShouldAnimate(false);
          setAnimationStartValue(currentPrice); // Same as current to prevent color
        }
      }
      
      // Mark that animation has been initialized for this tooltip session
      animationStarted.current = true;
    }
    
    // Reset animation state when tooltip closes
    if (!open) {
      // Only update the lastSeenPrices if we actually played an animation this session
      if (currentPrice > 0 && animationPlayed.current) {
        lastSeenPrices[asset] = currentPrice;
        saveLastSeenPrices(lastSeenPrices);
        console.log(`Updating last seen price for ${asset} to ${currentPrice}`);
      }
      
      // Reset animation state for next open
      animationStarted.current = false;
      animationPlayed.current = false;
    }
    
    setIsTooltipOpen(open);
  };
  
  // Ensure all asset tickers have proper configuration
  const validateAssetConfig = () => {
    const missingAssets = [];
    for (const ticker of Object.keys(ASSETS)) {
      if (!ASSETS[ticker as AssetTicker]?.icon) {
        missingAssets.push(ticker);
        console.warn(`Missing icon configuration for asset: ${ticker}`);
      }
    }
    
    // Also check if all fallback data assets have configurations
    for (const ticker of Object.keys(FALLBACK_MARKET_DATA)) {
      if (!ASSETS[ticker as AssetTicker]) {
        missingAssets.push(ticker);
        console.warn(`Asset ${ticker} has fallback data but no configuration in ASSETS`);
      }
    }
    
    return missingAssets.length === 0;
  };

  // Validate asset configuration on load
  const assetsValid = validateAssetConfig();
  if (!assetsValid) {
    console.error('Some assets have invalid configuration. Tooltips may not display correctly.');
  }

  // Use context if available, otherwise use shared global state
  useEffect(() => {
    let cleanup: () => void = () => {};
    
    try {
      if (useExchangeRates) {
        // If context is available, use it as the source of truth
        const exchangeRatesData = useExchangeRates();
        setCurrentRates(exchangeRatesData.rates);
        setPreviousRates(exchangeRatesData.previousRates);
        setLoading(exchangeRatesData.loading);
        setError(exchangeRatesData.error);
        setLastUpdated(exchangeRatesData.lastUpdated);
        
        // Update global rates for components that don't have context
        globalRates.currentRates = exchangeRatesData.rates;
        globalRates.previousRates = exchangeRatesData.previousRates;
        globalRates.timestamp = exchangeRatesData.lastUpdated;
        globalRates.loading = exchangeRatesData.loading;
        
        // Log available assets for debugging
        console.debug(`Available rates from context: ${Object.keys(exchangeRatesData.rates).join(', ')}`);
      } else {
        // Otherwise use localStorage synchronized global state
        if (!hasInitialized) {
          initializeGlobalRates();
          setCurrentRates(globalRates.currentRates);
          setPreviousRates(globalRates.previousRates);
          setLastUpdated(globalRates.timestamp);
        }
        
        // Log available assets for debugging
        console.debug(`Available rates from global/local: ${Object.keys(globalRates.currentRates).join(', ')}`);
      }
      
      // Listen for the custom event for rates updates
      const handleRatesUpdated = () => {
        const { rates, previousRates, timestamp } = getCachedRates();
        if (rates) {
          setCurrentRates(rates);
          setPreviousRates(previousRates || {});
          setLastUpdated(timestamp);
          setLoading(false);
          setError(null);
          
          // Log updates for debugging
          console.debug(`Rates updated event. Assets: ${Object.keys(rates).join(', ')}`);
        }
      };
      
      window.addEventListener(RATES_UPDATED_EVENT, handleRatesUpdated);
      
      cleanup = () => {
        window.removeEventListener(RATES_UPDATED_EVENT, handleRatesUpdated);
      };
      
      // Always ensure specific asset exists in currentRates if not present
      if (!currentRates[asset] && !loading) {
        console.warn(`Asset ${asset} not found in current rates, ensuring fallback data is available`);
        // Handle access to FALLBACK_MARKET_DATA more safely with type checking
        if (Object.prototype.hasOwnProperty.call(FALLBACK_MARKET_DATA, asset)) {
          setCurrentRates(prev => ({
            ...prev, 
            [asset]: FALLBACK_MARKET_DATA[asset as keyof typeof FALLBACK_MARKET_DATA]
          }));
        }
      }
    } catch (e) {
      console.error('Error setting up exchange rates:', e);
      setError('Failed to load price data');
    }
    
    return cleanup;
  }, [asset]);
  
  // Helper for formatting in NumberFlow component
  const getNumberFormat = (price: number) => {
    if (price >= 1000) {
      return { maximumFractionDigits: 2 };
    } else if (price >= 100) {
      return { maximumFractionDigits: 2 };
    } else if (price >= 1) {
      return { maximumFractionDigits: 4 };
    } else if (price >= 0.01) {
      return { maximumFractionDigits: 6 };
    } else {
      return { maximumFractionDigits: 8 };
    }
  };

  // Improved check for missing data - always show tooltip but with appropriate state
  // If no currentAssetData, set a longer initial loading state to give API time to respond
  useEffect(() => {
    if (!currentAssetData && !loading && !error) {
      // Set temporary loading state if data isn't available yet
      setLoading(true);
      
      // Set a timeout to clear loading state if data never arrives
      const timeout = setTimeout(() => {
        if (!currentRates[asset]) {
          setLoading(false);
          setError(`Price data unavailable for ${asset}`);
          console.warn(`Failed to load price data for ${asset}`);
        }
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [currentAssetData, loading, error, asset, currentRates]);

  // Always render tooltip content, but show appropriate state
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip onOpenChange={handleTooltipOpenChange}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="py-2 px-3 bg-background text-foreground border border-border">
          {loading ? (
            <div className="text-xs text-muted-foreground">Loading price...</div>
          ) : error ? (
            <div className="text-xs text-red-500">Failed to load price</div>
          ) : currentAssetData && currentAssetData.eur ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full overflow-hidden">
              <img
                src={assetConfig.icon}
                alt={asset}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
                <div className="text-[13px] font-medium font-tabular-nums">
                  <PriceDisplay
                    price={currentPrice}
                    format={getNumberFormat(currentPrice)}
                    isAnimated={isTooltipOpen && shouldAnimate}
                    startValue={animationStartValue}
                  />
              </div>
                {/* Timestamp display remains commented out */}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Price unavailable</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Check if the update is very recent (less than a minute)
const isRecentUpdate = (timestamp: number): boolean => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  return seconds < 60;
};

// Helper function to format time in a user-friendly way
const formatTimeSince = (timestamp: number): string => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 60) {
    return 'Just now'; // This shouldn't be used directly anymore
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  } else {
    return new Date(timestamp).toLocaleTimeString();
  }
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