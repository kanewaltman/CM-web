import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { Check, Filter as FilterIcon, RotateCcw, Coins } from 'lucide-react';
import { ShimmerButton } from '../magicui/shimmer-button';
import NumberFlow, { continuous } from '@number-flow/react';
import { AssetPriceTooltip, AssetButtonWithPrice } from '../AssetPriceTooltip';
import { AssetTicker, ASSETS } from '@/assets/AssetTicker';
import { StakingPlan, stakingPlansManager } from '../EarnConfirmationContent'; // Assuming StakingPlan and stakingPlansManager are here or in a shared types/utils file
import { EarnWidgetState, widgetStateRegistry, createDefaultEarnWidgetState } from '@/lib/widgetState';
import { useAssetPrices } from '@/hooks/useAssetPrices';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

// ActivePlansView component
export const ActivePlansView: React.FC<{ 
  plans: StakingPlan[], 
  onNewPlan: () => void,
  initialShowHistoric?: boolean,
  onShowHistoric?: () => void,
  onReturnToRippleView?: () => void,
  onShowActivePlans?: () => void,
  widgetId?: string,
  inDialog?: boolean
}> = ({ 
  plans, 
  onNewPlan, 
  initialShowHistoric = false,
  onShowHistoric,
  onReturnToRippleView,
  onShowActivePlans,
  widgetId,
  inDialog = false
}) => {
  const { resolvedTheme } = useTheme();
  const [gradientKey, setGradientKey] = useState<number>(Date.now());
  
  // Log whether we're in dialog mode
  useEffect(() => {
    console.log(`ActivePlansView (widgetId=${widgetId}): Rendering in ${inDialog ? 'dialog' : 'normal'} mode`);
  }, [widgetId, inDialog]);
  
  // Get unique assets from plans
  const uniqueAssets = useMemo(() => {
    const assets = new Set<AssetTicker>();
    plans.forEach(plan => {
      assets.add(plan.asset as AssetTicker);
    });
    return Array.from(assets).sort();
  }, [plans]);
  
  // Get widget state or create one if it doesn't exist
  const widgetState = useMemo(() => {
    if (!widgetId) return null;
    
    if (!widgetStateRegistry.has(widgetId)) {
      const newState = createDefaultEarnWidgetState('ripple', widgetId);
      widgetStateRegistry.set(widgetId, newState);
      if (initialShowHistoric) {
        newState.setShowHistoricPlans(true);
      }
      console.log(`ActivePlansView: Created new widget state for widgetId=${widgetId}`);
      return newState;
    }
    
    console.log(`ActivePlansView: Using existing widget state for widgetId=${widgetId}`);
    return widgetStateRegistry.get(widgetId) as EarnWidgetState;
  }, [widgetId, initialShowHistoric]);
  
  // Add state for asset filtering - use widget state if available
  const [localSelectedAssetFilter, setLocalSelectedAssetFilter] = useState<AssetTicker | 'ALL'>('ALL');
  
  // Use widget state if available, otherwise use local state
  const selectedAssetFilter = useMemo(() => {
    const result = widgetState ? widgetState.selectedAssetFilter : localSelectedAssetFilter;
    console.log(`ActivePlansView (widgetId=${widgetId}): Using asset filter: ${result}`);
    return result;
  }, [widgetState, localSelectedAssetFilter, widgetId]);
  
  // Helper function to set asset filter that works with both widget state and local state
  const setSelectedAssetFilter = useCallback((filter: AssetTicker | 'ALL') => {
    console.log(`ActivePlansView (widgetId=${widgetId}): Setting asset filter to ${filter}`);
    if (widgetState) {
      widgetState.setSelectedAssetFilter(filter);
      
      // For dialog view, we need to explicitly update local state as well to ensure UI updates
      // This is needed because the widget state update might not trigger a re-render in the dialog
      if (inDialog) {
        console.log(`ActivePlansView (widgetId=${widgetId}): Dialog mode - explicitly updating local state to ${filter}`);
        setLocalSelectedAssetFilter(filter);
        
        // Force propagation of changes to other instances by adding a small delay
        setTimeout(() => {
          // Re-apply the change to ensure widget state is updated (acts as a safety net)
          widgetState.setSelectedAssetFilter(filter);
        }, 10);
      }
    } else {
      setLocalSelectedAssetFilter(filter);
    }
  }, [widgetState, widgetId, inDialog]);
  
  // Subscribe to widget state changes to ensure both normal and dialog views stay in sync
  useEffect(() => {
    if (!widgetState) return;
    
    console.log(`ActivePlansView (widgetId=${widgetId}): Subscribing to widget state changes`);
    
    // Get initial state from widget state
    if (widgetState.selectedAssetFilter !== localSelectedAssetFilter) {
      console.log(`ActivePlansView (widgetId=${widgetId}): Initial sync from widget state: ${widgetState.selectedAssetFilter}`);
      setLocalSelectedAssetFilter(widgetState.selectedAssetFilter);
    }
    
    // Subscribe to widget state changes
    const unsubscribe = widgetState.subscribe(() => {
      // If the widget state's selectedAssetFilter is different from our local state,
      // update the local state to match
      if (widgetState.selectedAssetFilter !== localSelectedAssetFilter) {
        console.log(`ActivePlansView (widgetId=${widgetId}): Sync local filter from widget state: ${widgetState.selectedAssetFilter}`);
        setLocalSelectedAssetFilter(widgetState.selectedAssetFilter);
        
        // For dialog mode, explicitly re-apply our changes to ensure UI updates
        if (inDialog && widgetState.selectedAssetFilter === 'ALL') {
          console.log(`ActivePlansView (widgetId=${widgetId}): Dialog mode - detected reset to ALL, forcing refresh`);
          
          // Force a refresh of the filtered plans with a short delay
          setTimeout(() => {
            setLocalSelectedAssetFilter('ALL');
          }, 20);
        }
      }
    });
    
    // Set up a periodic check to ensure synchronization in dialog mode
    let syncInterval: NodeJS.Timeout | null = null;
    
    if (inDialog) {
      syncInterval = setInterval(() => {
        if (widgetState.selectedAssetFilter !== localSelectedAssetFilter) {
          console.log(`ActivePlansView (widgetId=${widgetId}): Dialog sync interval - detected state mismatch, fixing`);
          setLocalSelectedAssetFilter(widgetState.selectedAssetFilter);
        }
      }, 500); // Check every 500ms
    }
    
    // Cleanup subscription on unmount
    return () => {
      console.log(`ActivePlansView (widgetId=${widgetId}): Unsubscribing from widget state changes`);
      unsubscribe();
      
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [widgetState, localSelectedAssetFilter, widgetId, inDialog]);
  
  // Filter plans based on selected asset first
  const filteredByAssetPlans = useMemo(() => {
    if (selectedAssetFilter === 'ALL') {
      return plans;
    }
    return plans.filter(plan => plan.asset === selectedAssetFilter);
  }, [plans, selectedAssetFilter]);

  // Add local state for sorting
  const [localSortOption, setLocalSortOption] = useState<string>('default');

  // Use widget state if available, otherwise use local state
  const sortOption = useMemo(() => {
    const result = widgetState ? widgetState.sortOption : localSortOption;
    console.log(`ActivePlansView (widgetId=${widgetId}): Using sort option: ${result}`);
    return result;
  }, [widgetState, localSortOption, widgetId]);

  // Helper function to set sort option that works with both widget state and local state
  const setSortOption = useCallback((option: string) => {
    console.log(`ActivePlansView (widgetId=${widgetId}): Setting sort option to ${option}`);
    if (widgetState) {
      widgetState.setSortOption(option);
      
      // For dialog view, we need to explicitly update local state as well to ensure UI updates
      if (inDialog) {
        console.log(`ActivePlansView (widgetId=${widgetId}): Dialog mode - explicitly updating local sort option to ${option}`);
        setLocalSortOption(option);
        
        // Force propagation of changes to other instances by adding a small delay
        setTimeout(() => {
          // Re-apply the change to ensure widget state is updated (acts as a safety net)
          widgetState.setSortOption(option);
        }, 10);
      }
    } else {
      setLocalSortOption(option);
    }
  }, [widgetState, widgetId, inDialog]);

  // Subscribe to widget state changes for sorting
  useEffect(() => {
    if (!widgetState) return;
    
    console.log(`ActivePlansView (widgetId=${widgetId}): Subscribing to widget state changes for sorting`);
    
    // Get initial state from widget state
    if (widgetState.sortOption !== localSortOption) {
      console.log(`ActivePlansView (widgetId=${widgetId}): Initial sync from widget state for sorting: ${widgetState.sortOption}`);
      setLocalSortOption(widgetState.sortOption);
    }
    
    // Subscribe to widget state changes
    const unsubscribe = widgetState.subscribe(() => {
      // If the widget state's sortOption is different from our local state,
      // update the local state to match
      if (widgetState.sortOption !== localSortOption) {
        console.log(`ActivePlansView (widgetId=${widgetId}): Sync local sort option from widget state: ${widgetState.sortOption}`);
        setLocalSortOption(widgetState.sortOption);
      }
    });
    
    return () => {
      console.log(`ActivePlansView (widgetId=${widgetId}): Unsubscribing from widget state changes for sorting`);
      unsubscribe();
    };
  }, [widgetState, localSortOption, widgetId]);

  // Constants for dynamic height calculation - fine-tuned based on UI
  const ACTIVE_PLAN_CARD_HEIGHT = 75; // Active plans are taller (including margins)
  const HISTORIC_PLAN_CARD_HEIGHT = 160; // Historic plans are more compact
  const HEADER_HEIGHT = 70; // Header with margins
  const FOOTER_HEIGHT = 100; // Footer with margins and padding
  const CONTAINER_PADDING = 32; // Total vertical padding of container
  
  // Get price data with fallback
  const { prices, loading: pricesLoading, hasProvider: hasPriceProvider } = useAssetPrices();
  
  // Create a safer version of the price getter
  const getAssetPrice = useCallback((asset: AssetTicker): number => {
    // If we don't have prices for this asset, return 0 as fallback
    if (!prices || prices[asset] === undefined) {
      return 0;
    }
    return prices[asset];
  }, [prices]);
  
  // Fallback to local state when widgetState is not available
  const [localShowHistoric, setLocalShowHistoric] = useState<boolean>(initialShowHistoric);
  
  // Use widget state if available, otherwise use local state
  const showHistoric = widgetState ? widgetState.showHistoricPlans : localShowHistoric;
  
  // Change from continuous updates to interval-based updates with a key for forcing refresh
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [lastClaimTime, setLastClaimTime] = useState<number>(0);
  // Track if we have active plans to show
  const [showPlans, setShowPlans] = useState<boolean>(plans.length > 0);
  // Keep a local copy of plans for direct updates
  const [userPlans, setUserPlans] = useState<StakingPlan[]>(plans);
  // Add pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Add a container ref and dynamically calculate plans per page
  const containerRef = useRef<HTMLDivElement>(null);
  const [dynamicPlansPerPage, setDynamicPlansPerPage] = useState<number>(3);
  // Track component visibility
  const isVisible = useRef(true);
  // Track interval ID for cleanup
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Add this state at the beginning of the ActivePlansView component (around line ~2746)
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null);

  // Calculate current earnings for a plan with optimized method
  const calculateCurrentEarnings = useCallback((plan: StakingPlan): number => {
    if (!plan.isActive) {
      // For terminated plans, return the actual earnings or a calculated amount
      return plan.actualEarnings || 0;
    }

    const startDate = new Date(plan.startDate).getTime();
    const endDate = new Date(plan.endDate).getTime();
    const now = currentTime; // Use the state time for consistent updates

    // Calculate progress as a percentage (capped at 100%)
    const progress = Math.min(1, (now - startDate) / (endDate - startDate));

    // Calculate the total duration in milliseconds
    const totalDuration = endDate - startDate;

    // Calculate milliseconds elapsed
    const elapsedMs = now - startDate;

    // Calculate earnings per millisecond
    const msEarningRate = plan.estimatedEarnings / totalDuration;

    // Calculate current earnings precisely based on exact time elapsed
    return msEarningRate * elapsedMs;
  }, [currentTime]);

  // Sort the filtered plans based on the sort option
  const { activePlans, historicPlans } = useMemo(() => {
    const active = filteredByAssetPlans.filter(plan => plan.isActive);
    const historic = filteredByAssetPlans.filter(plan => !plan.isActive);

    // Helper function to sort plans
    const sortPlans = (plans: StakingPlan[], sortBy: string) => {
      return [...plans].sort((a, b) => {
        // Active plans sorting
        if (a.isActive && b.isActive) {
          switch (sortBy) {
            case 'current-earnings':
              // Sort by current earnings (high to low)
              return calculateCurrentEarnings(b) - calculateCurrentEarnings(a);
            case 'time-remaining':
              // Sort by time remaining (low to high)
              return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
            case 'staked-amount':
              // Sort by staked amount (high to low)
              return b.amount - a.amount;
            default:
              // Default sort by end date
              return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          }
        }
        // Historic plans sorting
        else if (!a.isActive && !b.isActive) {
          switch (sortBy) {
            case 'final-earnings':
              // Sort by final earnings (high to low)
              return (b.actualEarnings || 0) - (a.actualEarnings || 0);
            case 'termination-date':
              // Sort by termination date (recent first)
              return new Date(b.terminationDate || b.endDate).getTime() - 
                     new Date(a.terminationDate || a.endDate).getTime();
            case 'plan-duration':
              // Sort by plan duration (longest first)
              const aDuration = new Date(a.endDate).getTime() - new Date(a.startDate).getTime();
              const bDuration = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
              return bDuration - aDuration;
            default:
              // Default sort by termination date
              return new Date(b.terminationDate || b.endDate).getTime() - 
                     new Date(a.terminationDate || a.endDate).getTime();
          }
        }
        return 0;
      });
    };

    return {
      activePlans: sortPlans(active, sortOption),
      historicPlans: sortPlans(historic, sortOption)
    };
  }, [filteredByAssetPlans, sortOption, calculateCurrentEarnings]);

  // Create a calculation function outside of useEffect for reuse
  const calculatePlansPerPage = useCallback(() => {
    if (!containerRef.current) return;
    
    // Get container height
    const containerHeight = containerRef.current.clientHeight;
    
    // Calculate available space for plans (accounting for all spacing)
    const availableHeight = containerHeight - HEADER_HEIGHT - FOOTER_HEIGHT - CONTAINER_PADDING;
    
    // Use different card heights based on view type
    const cardHeight = showHistoric ? HISTORIC_PLAN_CARD_HEIGHT : ACTIVE_PLAN_CARD_HEIGHT;
    
    // Calculate how many plans can fit, with a minimum of 1
    // For active plans, use a slight reduction factor to be less aggressive
    // For historic plans, use a slight increase factor to be more aggressive
    const fittingPlans = Math.max(1, Math.floor(availableHeight / cardHeight * (showHistoric ? 1.1 : 0.85)));
    
    // Log calculations in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`View type: ${showHistoric ? 'Historic' : 'Active'}`);
      console.log(`Container height: ${containerHeight}px`);
      console.log(`Available height: ${availableHeight}px`);
      console.log(`Card height: ${cardHeight}px`);
      console.log(`Adjustment factor: ${showHistoric ? '1.1 (more aggressive)' : '0.85 (less aggressive)'}`);
      console.log(`Can fit ${fittingPlans} plans`);
    }
    
    // Update state if different
    if (fittingPlans !== dynamicPlansPerPage) {
      setDynamicPlansPerPage(fittingPlans);
    }
  }, [dynamicPlansPerPage, showHistoric]);

  // Main effect for setting up observers and handlers
  useEffect(() => {
    // Initial calculation with a slight delay to ensure container is properly sized
    const observerTimer = setTimeout(calculatePlansPerPage, 100);
    
    // Add resize observer to recalculate when container size changes
    const resizeObserver = new ResizeObserver(() => {
      calculatePlansPerPage();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Also recalculate on window resize
    window.addEventListener('resize', calculatePlansPerPage);
    
    // Cleanup
    return () => {
      clearTimeout(observerTimer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculatePlansPerPage);
    };
  }, [calculatePlansPerPage]);

  // Effect to recalculate when showHistoric changes
  useEffect(() => {
    // Small delay to ensure UI has updated before recalculating
    const viewChangeTimer = setTimeout(calculatePlansPerPage, 50);
    return () => clearTimeout(viewChangeTimer);
  }, [showHistoric, calculatePlansPerPage]);

  // Memoize current plans based on dynamic pagination
  const currentPlans = useMemo(() => {
    const plansToShow = showHistoric ? historicPlans : activePlans;
    const indexOfLastPlan = currentPage * dynamicPlansPerPage;
    const indexOfFirstPlan = indexOfLastPlan - dynamicPlansPerPage;
    return plansToShow.slice(indexOfFirstPlan, indexOfLastPlan);
  }, [activePlans, historicPlans, showHistoric, currentPage, dynamicPlansPerPage]);

  // If no plans are available in the current view, show the empty state earlier
  const noPlansInCurrentView = useMemo(() => {
    return showHistoric ? historicPlans.length === 0 : activePlans.length === 0;
  }, [showHistoric, historicPlans.length, activePlans.length]);

  // If we're showing active plans but there are none, redirect back to ripple view
  useEffect(() => {
    if (!showHistoric && activePlans.length === 0 && !initialShowHistoric) {
      // Return to ripple view by calling onNewPlan - it will redirect to main view
      onNewPlan();
    }
  }, [showHistoric, activePlans.length, onNewPlan, initialShowHistoric]);

  // Calculate pagination information
  const totalPlans = useMemo(() => 
    showHistoric ? historicPlans.length : activePlans.length, 
    [showHistoric, historicPlans.length, activePlans.length]
  );

  // Update totalPages calculation
  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(totalPlans / dynamicPlansPerPage)),
    [totalPlans, dynamicPlansPerPage]
  );

  // Reset to first page when switching between active/historic
  useEffect(() => {
    setCurrentPage(1);
  }, [showHistoric]);

  // Force update of the gradient when theme changes
  useEffect(() => {
    setGradientKey(Date.now());
  }, [resolvedTheme]);

  // Set up visibility observer to pause updates when component not visible
  useEffect(() => {
    // Use IntersectionObserver if available
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isVisible.current = entry.isIntersecting;
        });
      }, { threshold: 0.1 });

      // Find container element
      const container = document.querySelector('#earn-plans-container');
      if (container) {
        observer.observe(container);
      }

      return () => {
        if (container) {
          observer.unobserve(container);
        }
        observer.disconnect();
      };
    }

    // Fallback to document visibility
    const handleVisibilityChange = () => {
      isVisible.current = document.visibilityState === 'visible';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Use interval instead of requestAnimationFrame for time updates
  useEffect(() => {
    // Update time every second instead of every 2 seconds for smoother countdown
    const updateTime = () => {
      // Only update if visible
      if (isVisible.current) {
        setCurrentTime(Date.now());
      }
    };

    // Initial update
    updateTime();

    // Set interval - reduced to 1000ms (1 second) for more responsive countdown
    timeIntervalRef.current = setInterval(updateTime, 1000);

    // Clean up
    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
    };
  }, []);

  // Force refresh when a claim happens
  useEffect(() => {
    if (lastClaimTime > 0) {
      // Immediately refresh and then after a short delay to ensure UI catches up
      setCurrentTime(Date.now());

      // Force a UI refresh with a minimal delay
      const refreshTimer = setTimeout(() => {
        setCurrentTime(Date.now());
      }, 100);

      return () => clearTimeout(refreshTimer);
    }
  }, [lastClaimTime]);

  // Cleanup button refs when component unmounts
  useEffect(() => {
    return () => {
      if (claimButtonRefs.current) {
        claimButtonRefs.current.clear();
      }
    };
  }, []);

  // Calculate remaining time for a plan - memoized to avoid recalculation
  const formatRemainingTime = useCallback((plan: StakingPlan): string => {
    if (!plan.isActive) {
      return "Completed";
    }

    const endDate = new Date(plan.endDate).getTime();
    const now = currentTime; // Use the state time for consistent updates

    // If plan has ended
    if (now >= endDate) {
      return "Ready to claim";
    }

    const remainingMs = endDate - now;
    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  }, [currentTime]);

  // Check if a plan has earnings available to claim and is not on cooldown
  const isPlanReadyToClaim = useCallback((plan: StakingPlan): boolean => {
    if (!plan.isActive) return false;

    // Check if the plan is on cooldown
    if (plan.claimCooldownUntil) {
      const cooldownUntil = new Date(plan.claimCooldownUntil).getTime();
      if (currentTime < cooldownUntil) {
        return false; // Still on cooldown
      }
    }

    // Check if there are any earnings to claim based on what would actually display
    const currentEarnings = calculateCurrentEarnings(plan);

    // Format the earnings as they would appear in the UI
    const formattedEarnings = currentEarnings < 1 
      ? currentEarnings.toFixed(8)
      : currentEarnings.toFixed(6);

    // Parse back to number and check if it's greater than zero
    // This ensures we only enable claiming if at least one non-zero digit would show in the UI
    const displayValue = parseFloat(formattedEarnings);

    return displayValue > 0;
  }, [currentTime, calculateCurrentEarnings, lastClaimTime]);

  // Calculate termination fee for a plan
  const calculateTerminationFee = useCallback((plan: StakingPlan): number => {
    const startDate = new Date(plan.startDate).getTime();
    const endDate = new Date(plan.endDate).getTime();
    const now = Date.now();

    // Calculate progress as a percentage
    const progress = (now - startDate) / (endDate - startDate);

    // The earlier the termination, the higher the fee
    // Fee ranges from 50% (at the beginning) to 5% (near the end)
    const feePercentage = Math.max(5, 50 - (progress * 45));

    // Calculate fee
    return (plan.amount * feePercentage) / 100;
  }, []);

  // Handle plan termination
  const handleTerminatePlan = useCallback((plan: StakingPlan, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!plan.isActive) return;

    // Calculate the fee
    const fee = calculateTerminationFee(plan);

    // Calculate actual earnings at termination time
    const actualEarnings = calculateCurrentEarnings(plan);

    // Check if this is part of a batch termination
    const isBatchTermination = sessionStorage.getItem('batch_terminate_in_progress') === 'true';
    const showAccumulatedPoints = sessionStorage.getItem('show_accumulated_terminate_points') === 'true';

    // Confirm with user (only if not part of batch termination)
    let shouldTerminate = true;
    if (!isBatchTermination) {
      const earningsDisplay = actualEarnings < 1 ? actualEarnings.toFixed(8) : actualEarnings.toFixed(6);
      shouldTerminate = confirm(`Are you sure you want to terminate this staking plan?

Termination fee: ${fee.toFixed(4)} ${plan.asset}
Current earnings: ${earningsDisplay} ${plan.asset}`);
    }

    if (shouldTerminate) {
      // Update the plan with termination details
      const updatedPlan = {
        ...plan,
        isActive: false,
        terminationDate: new Date().toISOString(),
        terminationFee: fee,
        actualEarnings: actualEarnings
      };

      // Save the updated plan
      stakingPlansManager.updatePlan(updatedPlan);

      // Import and trigger sonner notifications
      import('sonner').then(({ toast }) => {
        // Confirmation toast for termination
        toast(
          `Plan terminated`, 
          {
            description: `${actualEarnings.toFixed(6)} ${plan.asset} earnings added to wallet`,
            duration: 4000,
            className: "termination-toast"
          }
        );
        
        // Only show individual points notification if not part of a batch termination
        if (!isBatchTermination) {
          // Points toast with negative points
          setTimeout(() => {
            toast(
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-base">Points Update</p>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-red-500">-25</p>
                    <p className="text-sm text-muted-foreground">for early termination</p>
                  </div>
                </div>
              </div>,
              {
                className: "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800/30",
                duration: 3500
              }
            );
          }, 1200);
        }
      }).catch(err => console.error('Error showing toast notifications:', err));

      // Notify about plan termination
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('staking-plan-terminated', { 
          detail: { plan: updatedPlan }
        });
        document.dispatchEvent(event);
      }

      // Update local state instead of reloading the page
      setUserPlans(prevPlans => 
        prevPlans.map(p => p.id === plan.id ? updatedPlan : p)
      );
      
      // Check if we still have active plans after this termination
      const remainingActivePlans = userPlans
        .filter(p => p.id !== plan.id)
        .filter(p => p.isActive);
      
      if (remainingActivePlans.length === 0) {
        // No active plans left, return to ripple view
        if (onReturnToRippleView) {
          // First make sure the plans data is up to date 
          const updatedPlans = stakingPlansManager.refreshPlans();
          
          // Dispatch a custom event to notify components about terminated plans
          const event = new CustomEvent('plans-status-update', { 
            detail: { 
              hasHistoric: updatedPlans.some(p => !p.isActive),
              hasActive: updatedPlans.some(p => p.isActive)
            } 
          });
          document.dispatchEvent(event);
          
          // Then return to ripple view
          onReturnToRippleView();
        }
      }
    }
  }, [calculateTerminationFee, calculateCurrentEarnings, userPlans, onReturnToRippleView]);

  // Format date string
  const formatDate = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }, []);

  // Format countdown time in HH:MM:SS format for more responsive feedback
  const formatCooldownTime = useCallback((targetDateStr: string): string => {
    const targetDate = new Date(targetDateStr).getTime();
    const now = currentTime;

    // Calculate time remaining in milliseconds
    let timeRemaining = Math.max(0, targetDate - now);

    // Convert to hours, minutes and seconds
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    timeRemaining -= hoursRemaining * 1000 * 60 * 60;

    const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
    timeRemaining -= minutesRemaining * 1000 * 60;

    const secondsRemaining = Math.floor(timeRemaining / 1000);

    // Format as 00:00:00 with consistent width using monospace font
    return `${String(hoursRemaining).padStart(2, '0')}:${String(minutesRemaining).padStart(2, '0')}:${String(secondsRemaining).padStart(2, '0')}`;
  }, [currentTime]);

  // Render total claimed with immediate updates - desktop version
  const renderTotalClaimedValue = useCallback((plan: StakingPlan) => {
    if (plan.totalClaimed && plan.totalClaimed > 0) {
      return (
        <div className="flex-shrink-0 mr-6">
          <div className="flex flex-col">
            <div className="text-sm text-muted-foreground text-right">Claimed</div>
            <div className="font-medium tabular-nums">
              {plan.totalClaimed.toFixed(4)} {plan.asset}
            </div>
          </div>
        </div>
      );
    }
    return null;
  }, [currentTime, lastClaimTime]); // Use existing state dependencies instead

  // Render total claimed for mobile view
  const renderMobileTotalClaimedValue = useCallback((plan: StakingPlan) => {
    if (plan.totalClaimed && plan.totalClaimed > 0) {
      return (
        <div>
          <div className="text-xs text-muted-foreground text-right">Total Claimed</div>
          <div className="text-sm font-medium tabular-nums">
            {plan.totalClaimed.toFixed(4)} {plan.asset}
          </div>
        </div>
      );
    }
    return null;
  }, [currentTime, lastClaimTime]); // Use existing state dependencies instead

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handler for showing active plans
  const handleShowActiveClick = useCallback(() => {
    console.log('Active Plans click handler called', { activePlans, onShowActivePlans, onReturnToRippleView });
    
    // Reset asset filter when switching views
    setSelectedAssetFilter('ALL');
    
    if (onShowActivePlans) {
      console.log('Calling onShowActivePlans');
      onShowActivePlans();
    } else if (activePlans.length === 0 && onReturnToRippleView) {
      console.log('No active plans, returning to ripple view');
      onReturnToRippleView();
    } else {
      console.log('Setting showHistoric to false');
      if (widgetState) {
        widgetState.setShowHistoricPlans(false);
      } else {
        setLocalShowHistoric(false);
      }
    }
  }, [activePlans, onShowActivePlans, onReturnToRippleView, widgetState, setSelectedAssetFilter]);

  // Handler for showing historic plans
  const handleShowHistoricClick = useCallback(() => {
    console.log('Historic click handler called', { onShowHistoric });
    
    // Reset asset filter when switching views
    setSelectedAssetFilter('ALL');
    
    if (onShowHistoric) {
      console.log('Calling onShowHistoric');
      onShowHistoric();
    } else {
      console.log('Setting showHistoric to true');
      if (widgetState) {
        widgetState.setShowHistoricPlans(true);
      } else {
        setLocalShowHistoric(true);
      }
    }
  }, [onShowHistoric, widgetState, setSelectedAssetFilter]);

  // Add a ref to track button elements
  const claimButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Handle claim rewards button click with immediate UI feedback
  const handleClaimRewards = useCallback((plan: StakingPlan, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isPlanReadyToClaim(plan)) return;

    // Get the button element that was clicked
    const buttonElement = e.currentTarget;

    // Store button reference for immediate updates
    claimButtonRefs.current.set(plan.id, buttonElement);

    // Calculate current earnings
    const currentEarnings = calculateCurrentEarnings(plan);

    // Create a snapshot of the current plan before updating
    const previousPlan = { ...plan };

    // Track the claimed amount for notifications
    const claimedAmount = currentEarnings;

    // Calculate cooldown end time (24 hours from now)
    const now = new Date();
    const cooldownEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Update the plan with a lastClaimed timestamp and set cooldown, but keep it active
    const updatedPlan = {
      ...plan,
      lastClaimedDate: now.toISOString(),
      lastClaimedAmount: currentEarnings,
      totalClaimed: (plan.totalClaimed || 0) + currentEarnings,
      claimCooldownUntil: cooldownEndTime.toISOString(),
    };

    // *** IMMEDIATE UI UPDATE ***
    // 1. Immediately disable the button
    buttonElement.disabled = true;

    // 2. Apply immediate visual update to the button
    buttonElement.classList.remove("bg-[#FF4D15]/10", "text-[#FF4D15]", "hover:bg-[#FF4D15]/90", "hover:text-white");
    buttonElement.classList.add("bg-muted/30", "text-muted-foreground", "cursor-not-allowed");

         // 3. Update button text immediately with cooldown timer
     const startTime = cooldownEndTime.getTime();

     // Function to update the countdown text
     const updateCountdown = () => {
       // Get the latest reference to the button
       const button = claimButtonRefs.current.get(plan.id);
       if (!button) return;

       const timeRemaining = Math.max(0, startTime - Date.now());

       // If countdown finished, reset button
       if (timeRemaining <= 0) {
         return;
       }

       // Calculate hours, minutes, seconds
       const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
       const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
       const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

               // Update button text - ensure it stays monospace
        button.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Ensure the button stays monospaced
        button.classList.add('font-mono');

       // Schedule next update
       if (timeRemaining > 0) {
         // Update more frequently for a more responsive countdown
         setTimeout(updateCountdown, 500);
       }
     };

     // Start countdown immediately
     updateCountdown();

    // 4. Update the React state for future renders
    setUserPlans(prevPlans => prevPlans.map(p => p.id === plan.id ? updatedPlan : p));
    // Update both time states to force immediate refresh of the total claimed display
    setCurrentTime(Date.now());
    setLastClaimTime(Date.now());

    // Save the updated plan
    stakingPlansManager.updatePlan(updatedPlan);

    // Notify about rewards claimed
    if (typeof window !== 'undefined') {
      // First send the claiming event
      const claimEvent = new CustomEvent('staking-rewards-claimed', { 
        detail: { 
          plan: updatedPlan, 
          claimedAmount: claimedAmount,
          previousPlan: previousPlan
        }
      });
      document.dispatchEvent(claimEvent);

      // Import and trigger sonner notifications like when creating a plan
      import('sonner').then(({ toast }) => {
        // Confirmation toast similar to when creating a plan
        toast.success(
          `Successfully claimed ${claimedAmount.toFixed(6)} ${plan.asset}`, 
          {
            description: "Your rewards have been added to your wallet.",
            duration: 4000,
            className: "reward-toast"
          }
        );

        // Check if we're in a batch claim process
        const isBatchClaim = sessionStorage.getItem('batch_claim_in_progress') === 'true';
        const showAccumulatedPoints = sessionStorage.getItem('show_accumulated_points') === 'true';
        
        // Only show individual points notification if not part of a batch claim
        // or if this is the last item and we need to show accumulated points
        if (!isBatchClaim) {
          // Points toast, styled and delayed like ConfirmationDialogContent
          setTimeout(() => {
            toast(
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-base">Points Earned!</p>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-orange-500">+50</p>
                    <p className="text-sm text-muted-foreground">for claiming rewards</p>
                  </div>
                </div>
              </div>,
              {
                className: "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800/30",
                duration: 3500
              }
            );
          }, 1200);
        }
        
        // If this is the last item in a batch claim and showAccumulatedPoints is true,
        // the accumulated points notification will be shown by handleClaimAllRewards
        if (showAccumulatedPoints) {
          // Remove the flag as it's been handled
          sessionStorage.removeItem('show_accumulated_points');
        }
      }).catch(err => console.error('Error showing toast notifications:', err));
    }
  }, [isPlanReadyToClaim, calculateCurrentEarnings]);

  // Render current earnings with optimized NumberFlow
  const renderCurrentEarnings = useCallback((plan: StakingPlan) => {
    if (!plan.isActive) {
      return (
        <div className="font-medium text-emerald-500 flex justify-end tabular-nums">
          <span className="flex items-center">
            {plan.actualEarnings ? (plan.actualEarnings < 1 ? plan.actualEarnings.toFixed(8) : plan.actualEarnings.toFixed(6)) : '0.00'} 
            <span className="ml-1">{plan.asset}</span>
          </span>
        </div>
      );
    }

    // Calculate actual current earnings considering last claim time
    const calculateEffectiveEarnings = () => {
      const fullEarnings = calculateCurrentEarnings(plan);

      // If the plan has a lastClaimedDate, calculate earnings since that date
      if (plan.lastClaimedDate) {
        const lastClaimTime = new Date(plan.lastClaimedDate).getTime();
        const startTime = new Date(plan.startDate).getTime();
        const endTime = new Date(plan.endDate).getTime();
        const now = currentTime;

        // Calculate earnings rate per millisecond
        const totalDuration = endTime - startTime;
        const msEarningRate = plan.estimatedEarnings / totalDuration;

        // Calculate time since last claim
        const timeSinceClaim = now - lastClaimTime;

        // Calculate earnings since last claim
        return msEarningRate * timeSinceClaim;
      }

      // Otherwise return the full calculated earnings
      return fullEarnings;
    };

    const effectiveEarnings = calculateEffectiveEarnings();
    const eurValue = effectiveEarnings * getAssetPrice(plan.asset as AssetTicker);

    // Only use animated NumberFlow for active plans that are visible
    if (isVisible.current) {
      return (
        <div className="font-semibold text-emerald-500 flex justify-end items-center">
          <div className="flex items-center tabular-nums">
            <NumberFlow
              key={`earnings-${plan.id}-${plan.lastClaimedDate || 'initial'}`}
              value={effectiveEarnings}
              format={{
                minimumFractionDigits: plan.estimatedEarnings < 1 ? 8 : 6,
                maximumFractionDigits: plan.estimatedEarnings < 1 ? 8 : 6
              }}
              plugins={[continuous]}
              animated={true}
            />
            <span className="ml-1">{plan.asset}</span>
          </div>
        </div>
      );
    } else {
      // When not visible, use a static display to save resources
      return (
        <div className="font-semibold text-emerald-500 flex justify-end items-center">
          <div className="flex items-center tabular-nums">
            {effectiveEarnings < 1 ? effectiveEarnings.toFixed(8) : effectiveEarnings.toFixed(6)}
            <span className="ml-1">{plan.asset}</span>
          </div>
        </div>
      );
    }
  }, [calculateCurrentEarnings, isVisible, currentTime, hasPriceProvider, getAssetPrice]);

  // Calculate total staked amount across all active plans - with safe price access
  const totalStakedInfo = useMemo(() => {
    if (activePlans.length === 0) {
      return { amount: 0, valueInEUR: 0 };
    }

    const total = activePlans.reduce((acc, plan) => {
      // Get the price safely using our getter
      const price = getAssetPrice(plan.asset as AssetTicker);
      const valueInEUR = plan.amount * price;
      return {
        amount: acc.amount + plan.amount,
        valueInEUR: acc.valueInEUR + valueInEUR
      };
    }, { amount: 0, valueInEUR: 0 });

    return total;
  }, [activePlans, getAssetPrice]);

  // Calculate total earnings across all active plans - with safe price access
  const totalEarningsInfo = useMemo(() => {
    if (activePlans.length === 0) {
      return { amount: 0, valueInEUR: 0 };
    }

    const total = activePlans.reduce((acc, plan) => {
      const currentEarnings = calculateCurrentEarnings(plan);
      // Calculate EUR value if price data is available
      const price = getAssetPrice(plan.asset as AssetTicker);
      const valueInEUR = currentEarnings * price;
      
      return {
        amount: acc.amount + currentEarnings,
        valueInEUR: acc.valueInEUR + valueInEUR
      };
    }, { amount: 0, valueInEUR: 0 });

    return total;
  }, [activePlans, calculateCurrentEarnings, getAssetPrice, currentTime]);

  // Add handler for duplicating a plan
  const handleDuplicatePlan = useCallback((plan: StakingPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Create a new plan object based on the existing one
    const duplicatedPlan = {
      ...plan,
      id: undefined, // Remove ID so a new one will be generated
      startDate: undefined, // Remove start date so it will be set when confirmed
      endDate: undefined, // Remove end date so it will be recalculated
      isActive: true, // Ensure it's marked as active
      lastClaimedDate: undefined,
      lastClaimedAmount: undefined,
      totalClaimed: undefined,
      claimCooldownUntil: undefined,
      terminationDate: undefined,
      terminationFee: undefined,
      actualEarnings: undefined
    };

    // Dispatch event to trigger confirmation dialog
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('duplicate-staking-plan', {
        detail: { plan: duplicatedPlan }
      });
      document.dispatchEvent(event);
    }
  }, []);

  // Handle claim all rewards
  const handleClaimAllRewards = useCallback(() => {
    // Filter only plans that are ready to claim
    const readyToClaimPlans = activePlans.filter(plan => isPlanReadyToClaim(plan));
    
    if (readyToClaimPlans.length === 0) {
      alert("No plans ready to claim");
      return;
    }

    // Confirm with user
    if (confirm(`Are you sure you want to claim rewards from all ${readyToClaimPlans.length} eligible plans?`)) {
      // Calculate total points (50 points per claim)
      const totalPoints = readyToClaimPlans.length * 50;
      
      // Flag to prevent individual points notifications
      const isMultipleClaim = readyToClaimPlans.length > 1;
      
      // Process all claims
      readyToClaimPlans.forEach((plan, index) => {
        // Create a synthetic event for the handler
        const syntheticEvent = {
          currentTarget: claimButtonRefs.current?.get(plan.id) || document.createElement('button'),
          stopPropagation: () => {}
        } as React.MouseEvent<HTMLButtonElement>;
        
        // For the last plan, we'll want to show the accumulated points notification
        const isLastPlan = index === readyToClaimPlans.length - 1;
        
        // Modify the behavior of handleClaimRewards for batch processing
        // Instead of creating a local function, we'll use a custom event
        if (isMultipleClaim) {
          // Set a flag in sessionStorage to control points notification behavior
          if (index === 0) {
            // First claim: disable individual points notifications
            sessionStorage.setItem('batch_claim_in_progress', 'true');
            sessionStorage.setItem('batch_claim_total_points', totalPoints.toString());
          }
          
          // For the last claim, we'll need to show the accumulated points
          if (isLastPlan) {
            sessionStorage.setItem('show_accumulated_points', 'true');
          }
        }
        
        // Process the claim
        handleClaimRewards(plan, syntheticEvent);
        
        // If this is the last plan and we have multiple claims, show the accumulated points notification
        if (isLastPlan && isMultipleClaim) {
          // Import and trigger sonner for accumulated points
          import('sonner').then(({ toast }) => {
            // Short delay to ensure it appears after the last transaction notification
            setTimeout(() => {
              toast(
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-base">Points Earned!</p>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-orange-500">+{totalPoints}</p>
                      <p className="text-sm text-muted-foreground">for claiming rewards</p>
                    </div>
                  </div>
                </div>,
                {
                  className: "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800/30",
                  duration: 3500
                }
              );
            }, 1500);
            
            // Clean up session storage
            sessionStorage.removeItem('batch_claim_in_progress');
            sessionStorage.removeItem('batch_claim_total_points');
            sessionStorage.removeItem('show_accumulated_points');
          }).catch(err => console.error('Error showing points notification:', err));
        }
      });
    }
  }, [activePlans, isPlanReadyToClaim, handleClaimRewards]);

  // Handle terminate all plans
  const handleTerminateAllPlans = useCallback(() => {
    if (activePlans.length === 0) {
      alert("No active plans to terminate");
      return;
    }

    // Calculate total fees and prepare termination summary
    const totalFee = activePlans.reduce((sum, plan) => {
      return sum + calculateTerminationFee(plan);
    }, 0);
    
    // Calculate total current earnings at termination time
    const totalCurrentEarnings = activePlans.reduce((sum, plan) => {
      return sum + calculateCurrentEarnings(plan);
    }, 0);

    // Get the asset type (assuming all plans use the same asset)
    const assetType = activePlans.length > 0 ? activePlans[0].asset : "";

    // Confirm with user
    if (confirm(`Are you sure you want to terminate all ${activePlans.length} active plans?

Total termination fees: ${totalFee.toFixed(4)} ${assetType}
Total current earnings: ${totalCurrentEarnings.toFixed(6)} ${assetType}`)) {
      // Calculate total points (-25 points per termination)
      const totalPoints = activePlans.length * 25;
      
      // Flag to prevent individual points notifications
      const isMultipleTermination = activePlans.length > 1;
      
      // Process all terminations
      activePlans.forEach((plan, index) => {
        // Create a synthetic event for the handler
        const syntheticEvent = {
          stopPropagation: () => {}
        } as React.MouseEvent<HTMLButtonElement>;
        
        // For the last plan, we'll want to show the accumulated points notification
        const isLastPlan = index === activePlans.length - 1;
        
        // Modify the behavior of handleTerminatePlan for batch processing
        if (isMultipleTermination) {
          // Set a flag in sessionStorage to control points notification behavior
          if (index === 0) {
            // First termination: disable individual points notifications
            sessionStorage.setItem('batch_terminate_in_progress', 'true');
            sessionStorage.setItem('batch_terminate_total_points', totalPoints.toString());
          }
          
          // For the last plan, we'll need to show the accumulated points
          if (isLastPlan) {
            sessionStorage.setItem('show_accumulated_terminate_points', 'true');
          }
        }
        
        // Process the termination
        handleTerminatePlan(plan, syntheticEvent);
        
        // If this is the last plan and we have multiple terminations, show the accumulated points notification
        if (isLastPlan && isMultipleTermination) {
          // Import and trigger sonner for accumulated points
          import('sonner').then(({ toast }) => {
            // Short delay to ensure it appears after the last transaction notification
            setTimeout(() => {
              toast(
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-base">Points Update</p>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-red-500">-{totalPoints}</p>
                      <p className="text-sm text-muted-foreground">for early termination</p>
                    </div>
                  </div>
                </div>,
                {
                  className: "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800/30",
                  duration: 3500
                }
              );
            }, 1500);
            
            // Clean up session storage
            sessionStorage.removeItem('batch_terminate_in_progress');
            sessionStorage.removeItem('batch_terminate_total_points');
            sessionStorage.removeItem('show_accumulated_terminate_points');
          }).catch(err => console.error('Error showing points notification:', err));
        }
      });
    }
  }, [activePlans, calculateTerminationFee, calculateCurrentEarnings, handleTerminatePlan]);

  // Handle start new plan
  const handleStartNewPlan = useCallback(() => {
    onNewPlan();
  }, [onNewPlan]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" ref={containerRef}>
      <div key={gradientKey} className="absolute inset-0 -z-10 radial-gradient-bg"></div>
      <div id="earn-plans-container" className="z-10 w-full h-full flex flex-col p-4">
        <div className="mb-4 flex items-center justify-between w-full">
          <div className="text-lg font-semibold">
            {showHistoric ? 'Historic Plans' : (
              <div>
                {/* Desktop version */}
                <div className="hidden md:flex md:items-center md:flex-wrap md:justify-start">
                  <div className="flex items-center flex-nowrap ml-1">
                    <span>Actively staking</span>
                    <span className="flex items-center font-bold tabular-nums ml-1">
                      <NumberFlow
                        className="translate-y-[1px]"
                        value={totalStakedInfo.valueInEUR}
                        format={{
                          style: 'decimal',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }}
                        plugins={[continuous]}
                        animated={true}
                      />
                      <span className="ml-1">EUR</span>
                    </span>
                  </div>
                  <div className="flex items-center flex-nowrap">
                    <span className="ml-1">earning a total of</span>
                    <span className="flex items-center font-bold text-emerald-500 tabular-nums ml-1">
                      <NumberFlow
                        className="translate-y-[1px]"
                        value={totalEarningsInfo.valueInEUR}
                        format={{
                          style: 'decimal',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }}
                        plugins={[continuous]}
                        animated={true}
                      />
                      <span className="ml-1">EUR</span>
                    </span>
                  </div>
                </div>
                {/* Mobile version */}
                <div className="md:hidden flex flex-col text-left">
                  <div className="flex items-center gap-1">
                    <span>Actively staking</span>
                    <span className="flex items-center font-bold tabular-nums">
                      <NumberFlow
                        className="translate-y-[1px]"
                        value={totalStakedInfo.valueInEUR}
                        format={{
                          style: 'decimal',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }}
                        plugins={[continuous]}
                        animated={true}
                      />
                      <span className="ml-1">EUR</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Earning a total of</span>
                    <span className="flex items-center font-bold text-emerald-500 tabular-nums">
                      <NumberFlow
                        className="translate-y-[1px]"
                        value={totalEarningsInfo.valueInEUR}
                        format={{
                          style: 'decimal',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }}
                        plugins={[continuous]}
                        animated={true}
                      />
                      <span className="ml-1">EUR</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showHistoric ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleShowActiveClick}
                  className="h-7 px-2.5 text-xs"
                >
                  {plans.some(plan => plan.isActive) ? "Show Active Plans" : "Return to Earn View"}
                </Button>
                
                {/* Add Plans dropdown with filter for historic view */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                    >
                      Plans
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-fit">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer text-xs">
                        <FilterIcon className="mr-2 h-3.5 w-3.5" />
                        <span>Filter</span>
                        {selectedAssetFilter !== 'ALL' && (
                          <div className="ml-2 py-0.5 px-1.5 rounded-sm bg-primary/10 text-[10px] font-medium">
                            {selectedAssetFilter}
                          </div>
                        )}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="min-w-[200px]">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-xs px-2 py-1.5 text-muted-foreground">
                            Filter by Asset
                          </DropdownMenuLabel>
                          <DropdownMenuItem 
                            className="text-xs cursor-pointer"
                            onClick={() => setSelectedAssetFilter('ALL')}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                <Coins className="mr-2 h-3.5 w-3.5 opacity-80" />
                                <span>Show all assets</span>
                              </div>
                              <Check 
                                className={cn(
                                  "h-3.5 w-3.5 ml-2",
                                  selectedAssetFilter === 'ALL' ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </div>
                          </DropdownMenuItem>
                          
                          {/* Show all assets that have plans in historic view */}
                          {uniqueAssets
                            .filter(asset => {
                              // Filter based on the original unfiltered plans
                              const relevantPlans = plans.filter(plan => !plan.isActive); // All historic plans
                              return relevantPlans.some(plan => plan.asset === asset);
                            })
                            .map(asset => (
                              <DropdownMenuItem 
                                key={asset} 
                                className="text-xs cursor-pointer"
                                onClick={() => setSelectedAssetFilter(asset)}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center">
                                    {ASSETS[asset]?.icon ? (
                                      <img 
                                        src={ASSETS[asset].icon} 
                                        alt={asset} 
                                        className="w-4 h-4 mr-2 rounded-full" 
                                      />
                                    ) : (
                                      <div className="w-4 h-4 mr-2 rounded-full bg-primary/20 flex items-center justify-center">
                                        <span className="text-[10px] font-medium">{asset.charAt(0)}</span>
                                      </div>
                                    )}
                                    <span>{asset}</span>
                                  </div>
                                  <Check 
                                    className={cn(
                                      "h-3.5 w-3.5 ml-2",
                                      selectedAssetFilter === asset ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </div>
                              </DropdownMenuItem>
                            ))}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className={cn(
                              "text-xs cursor-pointer",
                              selectedAssetFilter === 'ALL' ? "opacity-50" : "opacity-100"
                            )}
                            onClick={() => {
                              console.log(`ActivePlansView (widgetId=${widgetId}): Reset filters clicked in ${inDialog ? 'dialog' : 'normal'} mode`);
                              
                              // Special handling for dialog mode
                              if (inDialog) {
                                // First update local state for immediate UI feedback
                                setLocalSelectedAssetFilter('ALL');
                                
                                // Then update widget state with a delay to ensure propagation
                                setTimeout(() => {
                                  if (widgetState) {
                                    widgetState.setSelectedAssetFilter('ALL');
                                  }
                                }, 10);
                              } else {
                                // Normal flow
                                setSelectedAssetFilter('ALL');
                              }
                            }}
                            disabled={selectedAssetFilter === 'ALL'}
                          >
                            <RotateCcw className="mr-2 h-3.5 w-3.5 opacity-80" />
                            <span>Reset filters</span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {plans.some(plan => !plan.isActive) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleShowHistoricClick}
                    className="h-7 px-2.5 text-xs"
                  >
                    Show Historic
                  </Button>
                )}
                {activePlans.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                      >
                        Plans
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-fit">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer text-xs">
                          <FilterIcon className="mr-2 h-3.5 w-3.5" />
                          <span>Filter</span>
                          {selectedAssetFilter !== 'ALL' && (
                            <div className="ml-2 py-0.5 px-1.5 rounded-sm bg-primary/10 text-[10px] font-medium">
                              {selectedAssetFilter}
                            </div>
                          )}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="min-w-[200px]">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs px-2 py-1.5 text-muted-foreground">
                              Filter by Asset
                            </DropdownMenuLabel>
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer"
                              onClick={() => setSelectedAssetFilter('ALL')}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center">
                                  <Coins className="mr-2 h-3.5 w-3.5 opacity-80" />
                                  <span>Show all assets</span>
                                </div>
                                <Check 
                                  className={cn(
                                    "h-3.5 w-3.5 ml-2",
                                    selectedAssetFilter === 'ALL' ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </div>
                            </DropdownMenuItem>
                            
                            {/* Show all assets that have plans in either active or historic view */}
                            {uniqueAssets
                              .filter(asset => {
                                // Filter based on the original unfiltered plans
                                const relevantPlans = showHistoric 
                                  ? plans.filter(plan => !plan.isActive) // All historic plans
                                  : plans.filter(plan => plan.isActive);  // All active plans
                                
                                return relevantPlans.some(plan => plan.asset === asset);
                              })
                              .map(asset => (
                                <DropdownMenuItem 
                                  key={asset} 
                                  className="text-xs cursor-pointer"
                                  onClick={() => setSelectedAssetFilter(asset)}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                      {ASSETS[asset]?.icon ? (
                                        <img 
                                          src={ASSETS[asset].icon} 
                                          alt={asset} 
                                          className="w-4 h-4 mr-2 rounded-full" 
                                        />
                                      ) : (
                                        <div className="w-4 h-4 mr-2 rounded-full bg-primary/20 flex items-center justify-center">
                                          <span className="text-[10px] font-medium">{asset.charAt(0)}</span>
                                        </div>
                                      )}
                                      <span>{asset}</span>
                                    </div>
                                    <Check 
                                      className={cn(
                                        "h-3.5 w-3.5 ml-2",
                                        selectedAssetFilter === asset ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs px-2 py-1.5 text-muted-foreground">
                              Sort By
                            </DropdownMenuLabel>
                            
                            {/* Different sort options based on active vs historic view */}
                            {showHistoric ? (
                              <>
                                {/* Historic Plans Sort Options */}
                                <DropdownMenuItem 
                                  className="text-xs cursor-pointer"
                                  onClick={() => setSortOption('final-earnings')}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>Final earnings</span>
                                    <Check 
                                      className={cn(
                                        "h-3.5 w-3.5 ml-2",
                                        sortOption === 'final-earnings' ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-xs cursor-pointer"
                                  onClick={() => setSortOption('termination-date')}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>Termination date</span>
                                    <Check 
                                      className={cn(
                                        "h-3.5 w-3.5 ml-2",
                                        sortOption === 'termination-date' ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-xs cursor-pointer"
                                  onClick={() => setSortOption('plan-duration')}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>Plan duration</span>
                                    <Check 
                                      className={cn(
                                        "h-3.5 w-3.5 ml-2",
                                        sortOption === 'plan-duration' ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                {/* Active Plans Sort Options */}
                                <DropdownMenuItem 
                                  className="text-xs cursor-pointer"
                                  onClick={() => setSortOption('current-earnings')}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>Current earnings</span>
                                    <Check 
                                      className={cn(
                                        "h-3.5 w-3.5 ml-2",
                                        sortOption === 'current-earnings' ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-xs cursor-pointer"
                                  onClick={() => setSortOption('time-remaining')}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>Time remaining</span>
                                    <Check 
                                      className={cn(
                                        "h-3.5 w-3.5 ml-2", 
                                        sortOption === 'time-remaining' ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-xs cursor-pointer"
                                  onClick={() => setSortOption('staked-amount')}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>Staked amount</span>
                                    <Check 
                                      className={cn(
                                        "h-3.5 w-3.5 ml-2",
                                        sortOption === 'staked-amount' ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className={cn(
                                "text-xs cursor-pointer",
                                selectedAssetFilter === 'ALL' && sortOption === 'default' ? "opacity-50" : "opacity-100"
                              )}
                              onClick={() => {
                                console.log(`ActivePlansView (widgetId=${widgetId}): Reset filters clicked in ${inDialog ? 'dialog' : 'normal'} mode`);
                                
                                // Reset both filter and sort options
                                // Special handling for dialog mode
                                if (inDialog) {
                                  // First update local state for immediate UI feedback
                                  setLocalSelectedAssetFilter('ALL');
                                  setLocalSortOption('default');
                                  
                                  // Then update widget state with a delay to ensure propagation
                                  setTimeout(() => {
                                    if (widgetState) {
                                      widgetState.setSelectedAssetFilter('ALL');
                                      widgetState.setSortOption('default');
                                    }
                                  }, 10);
                                } else {
                                  // Normal flow
                                  setSelectedAssetFilter('ALL');
                                  setSortOption('default');
                                }
                              }}
                              disabled={selectedAssetFilter === 'ALL' && sortOption === 'default'}
                            >
                              <RotateCcw className="mr-2 h-3.5 w-3.5 opacity-80" />
                              <span>Reset all</span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem
                        className="cursor-pointer transition-colors hover:bg-[hsl(var(--primary-foreground))] hover:text-white focus:bg-[hsl(var(--primary-foreground))] focus:text-white whitespace-nowrap"
                        onClick={handleStartNewPlan}
                      >
                        Start new plan
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer transition-colors hover:bg-[#FF4D15] hover:text-white focus:bg-[#FF4D15] focus:text-white whitespace-nowrap"
                        onClick={handleClaimAllRewards}
                      >
                        Claim all rewards
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer transition-colors hover:bg-destructive hover:text-white focus:bg-destructive focus:text-white whitespace-nowrap"
                        onClick={handleTerminateAllPlans}
                      >
                        Terminate all plans
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main content area - adjusted to precisely control height */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Plans list without scrollbar - will only show what fits */}
          <div className="space-y-4 flex-1">
            {currentPlans.length > 0 ? (
              currentPlans.map(plan => (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "overflow-hidden bg-[hsl(var(--primary-foreground))] text-left",
                    "border-[hsl(var(--color-widget-inset-border))]",
                    "transition-opacity duration-200",
                    hoveredPlanId && hoveredPlanId !== plan.id ? "opacity-60" : "opacity-100"
                  )}
                  onMouseEnter={() => setHoveredPlanId(plan.id)}
                  onMouseLeave={() => setHoveredPlanId(null)}
                >
                  <div className="p-4 flex items-center">
                    {/* Token Icon and Amount */}
                    <div className="flex items-center">
                      <div className="w-12 h-12 flex items-center justify-center overflow-hidden mr-4">
                        <img 
                          src={`/assets/symbols/${plan.asset}.svg`} 
                          alt={plan.asset}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.outerHTML = `<div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">${plan.asset.charAt(0)}</div>`;
                          }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-sm text-muted-foreground cursor-help">
                                <span className="border-b border-dotted border-muted-foreground/30 inline-block">Staked</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-background text-foreground border border-border">
                              <div className="flex flex-col gap-1">
                                <div className="text-xs text-muted-foreground flex items-center">
                                  <span className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center mr-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 w-3 h-3">
                                      <path d="M12 2v20M2 12h20"></path>
                                    </svg>
                                  </span>
                                  Value on creation: ≈ {(plan.amount * getAssetPrice(plan.asset as AssetTicker)).toFixed(2)} EUR
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center">
                                  <span className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center mr-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500 w-3 h-3">
                                      <circle cx="12" cy="12" r="10"></circle>
                                      <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                  </span>
                                  Current value: ≈ {(plan.amount * getAssetPrice(plan.asset as AssetTicker)).toFixed(2)} EUR
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="font-medium flex items-center gap-1">
                          <span>{plan.amount}</span>
                          <AssetButtonWithPrice asset={plan.asset as AssetTicker} />
                        </div>
                      </div>
                    </div>

                    {/* Ends Date */}
                    <div className="flex-shrink-0 ml-8 mr-6">
                      <div className="flex flex-col">
                        <div className="text-sm text-muted-foreground">Ends</div>
                        <div className="font-medium">{formatDate(plan.endDate)}</div>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex-shrink-0 mr-6">
                      <div className="flex flex-col">
                        <div className="text-sm text-muted-foreground">Duration</div>
                        <div className="font-medium">
                          {Math.ceil((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto"></div>

                    {/* Total claimed - only show if there have been claims */}
                    {renderTotalClaimedValue(plan)}

                    {/* Earnings */}
                    <div className="flex-shrink-0 mr-6">
                      <div className="flex flex-col">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-sm text-muted-foreground text-right cursor-help">
                                <span className="border-b border-dotted border-muted-foreground/30 inline-block">Earnings</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-background text-foreground border border-border">
                              {hasPriceProvider && (
                                <div className="flex flex-col gap-1">
                                  <div className="text-xs text-muted-foreground flex items-center">
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center mr-1.5">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 w-3 h-3">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    </span>
                                    {plan.isActive ? 'Current:' : 'Final earnings:'} ≈ {((plan.isActive 
                                      ? calculateCurrentEarnings(plan) 
                                      : (plan.actualEarnings || 0)) * getAssetPrice(plan.asset as AssetTicker)).toFixed(2)} EUR
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center mr-1.5">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 w-3 h-3">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                      </svg>
                                    </span>
                                    {plan.isActive ? 'Total at completion:' : 'Potential at completion:'} ≈ {(plan.estimatedEarnings * getAssetPrice(plan.asset as AssetTicker)).toFixed(2)} EUR
                                  </div>
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {renderCurrentEarnings(plan)}
                      </div>
                    </div>

                    {/* Claim Button */}
                    <div className="flex-shrink-0">
                      {plan.isActive ? (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={!isPlanReadyToClaim(plan)}
                            className={cn(
                              "h-8 text-sm font-bold border-transparent",
                              isPlanReadyToClaim(plan) 
                                ? "bg-[#FF4D15]/10 text-[#FF4D15] hover:bg-[#FF4D15]/90 hover:text-white"
                                : "bg-muted/30 text-muted-foreground cursor-not-allowed",
                              plan.claimCooldownUntil && new Date(plan.claimCooldownUntil).getTime() > currentTime ? "font-mono" : ""
                            )}
                            onClick={(e) => handleClaimRewards(plan, e)}
                          >
                            {plan.claimCooldownUntil && new Date(plan.claimCooldownUntil).getTime() > currentTime 
                              ? formatCooldownTime(plan.claimCooldownUntil)
                              : "Claim"}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                              >
                                <span className="sr-only">Open menu</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-4 h-4"
                                >
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="12" cy="5" r="1" />
                                  <circle cx="12" cy="19" r="1" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-fit">
                              <DropdownMenuItem
                                className={cn(
                                  "cursor-pointer transition-colors whitespace-nowrap",
                                  isPlanReadyToClaim(plan)
                                    ? "hover:bg-[#FF4D15] hover:text-white focus:bg-[#FF4D15] focus:text-white"
                                    : "text-muted-foreground cursor-not-allowed hover:bg-muted/30 focus:bg-muted/30"
                                )}
                                onClick={(e) => handleClaimRewards(plan, e as unknown as React.MouseEvent<HTMLButtonElement>)}
                                disabled={!isPlanReadyToClaim(plan)}
                              >
                                Claim rewards
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground whitespace-nowrap"
                                onClick={(e) => handleDuplicatePlan(plan, e)}
                              >
                                Duplicate plan
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer transition-colors hover:bg-destructive hover:text-white focus:bg-destructive focus:text-white whitespace-nowrap"
                                onClick={(e) => handleTerminatePlan(plan, e as unknown as React.MouseEvent<HTMLButtonElement>)}
                              >
                                Terminate early
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                              >
                                <span className="sr-only">Open menu</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-4 h-4"
                                >
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="12" cy="5" r="1" />
                                  <circle cx="12" cy="19" r="1" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-fit">
                              <DropdownMenuItem
                                className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground whitespace-nowrap"
                                onClick={(e) => handleDuplicatePlan(plan, e)}
                              >
                                Restart plan
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile view - Collapse to stacked layout on small screens */}
                  <div className="md:hidden border-t p-4 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Ends</div>
                      <div className="text-sm font-medium">{formatDate(plan.endDate)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                      <div className="text-sm font-medium">
                        {Math.ceil((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                      </div>
                    </div>
                    {renderMobileTotalClaimedValue(plan)}
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs text-muted-foreground cursor-help">
                              <span className="border-b border-dotted border-muted-foreground/30 inline-block">Staked</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-background text-foreground border border-border">
                            <div className="flex flex-col gap-1">
                              <div className="text-xs flex items-center">
                                <span className="w-4 h-4 rounded-full bg-indigo-500/10 flex items-center justify-center mr-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 w-2.5 h-2.5">
                                    <path d="M12 2v20M2 12h20"></path>
                                  </svg>
                                </span>
                                Created: ≈ {(plan.amount * getAssetPrice(plan.asset as AssetTicker)).toFixed(2)} EUR
                              </div>
                              <div className="text-xs flex items-center">
                                <span className="w-4 h-4 rounded-full bg-violet-500/10 flex items-center justify-center mr-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500 w-2.5 h-2.5">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                  </svg>
                                </span>
                                Current: ≈ {(plan.amount * getAssetPrice(plan.asset as AssetTicker)).toFixed(2)} EUR
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="text-sm font-medium">
                        {plan.amount} {plan.asset}
                      </div>
                    </div>
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs text-muted-foreground cursor-help">
                              <span className="border-b border-dotted border-muted-foreground/30 inline-block">Earnings</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-background text-foreground border border-border">
                            {hasPriceProvider && (
                              <div className="flex flex-col gap-1">
                                <div className="text-xs flex items-center">
                                  <span className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center mr-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 w-2.5 h-2.5">
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  </span>
                                  {plan.isActive ? 'Current:' : 'Final:'} ≈ {((plan.isActive 
                                    ? calculateCurrentEarnings(plan) 
                                    : (plan.actualEarnings || 0)) * getAssetPrice(plan.asset as AssetTicker)).toFixed(2)} EUR
                                </div>
                                <div className="text-xs flex items-center">
                                  <span className="w-4 h-4 rounded-full bg-blue-500/10 flex items-center justify-center mr-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 w-2.5 h-2.5">
                                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                    </svg>
                                  </span>
                                  {plan.isActive ? 'Total:' : 'Potential:'} ≈ {(plan.estimatedEarnings * getAssetPrice(plan.asset as AssetTicker)).toFixed(2)} EUR
                                </div>
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div>
                        {renderCurrentEarnings(plan)}
                      </div>
                    </div>
                    <div className="flex justify-end items-center">
                      {plan.isActive ? (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={!isPlanReadyToClaim(plan)}
                            className={cn(
                              "h-7 text-xs font-bold border-transparent",
                              isPlanReadyToClaim(plan) 
                                ? "bg-[#FF4D15]/10 text-[#FF4D15] hover:bg-[#FF4D15]/90 hover:text-white"
                                : "bg-muted/30 text-muted-foreground cursor-not-allowed",
                              plan.claimCooldownUntil && new Date(plan.claimCooldownUntil).getTime() > currentTime ? "font-mono" : ""
                            )}
                            onClick={(e) => handleClaimRewards(plan, e)}
                          >
                            {plan.claimCooldownUntil && new Date(plan.claimCooldownUntil).getTime() > currentTime 
                              ? formatCooldownTime(plan.claimCooldownUntil)
                              : "Claim"}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleTerminatePlan(plan, e)}
                          >
                            <span className="sr-only">Terminate plan</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:bg-muted"
                          onClick={(e) => handleDuplicatePlan(plan, e)}
                        >
                          <span className="sr-only">Restart plan</span>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                            <path d="M16 21h5v-5" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Show additional info for historic plans if there is termination fee */}
                  {showHistoric && plan.terminationFee !== undefined && (
                    <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t p-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Termination Fee</p>
                        <div className="font-medium text-amber-500 tabular-nums flex items-center gap-1">
                          <span>{plan.terminationFee.toFixed(4)}</span>
                          <span className="ml-1">{plan.asset}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Terminated On</p>
                        <p className="font-medium">
                          {plan.terminationDate ? formatDate(plan.terminationDate) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <div className="flex flex-col justify-center items-center h-full text-center text-muted-foreground py-8">
                {showHistoric ? (
                  <>
                    <span>No historic plans found</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowActiveClick}
                      className="mt-4"
                    >
                      {activePlans.length > 0 ? "Show Active Plans" : "Return to Earn View"}
                    </Button>
                  </>
                ) : (
                  <>
                    <span>No active staking plans found</span>
                    <ShimmerButton
                      className="mt-4 px-4 py-2 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold w-fit min-w-0"
                      shimmerColor="rgba(16, 185, 129, 0.5)"
                      shimmerDuration="4s"
                      borderRadius="8px"
                      background="rgba(16,185,129,0.08)"
                      onClick={onNewPlan}
                    >
                      Start Earning
                    </ShimmerButton>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with pagination and action button - fixed height */}
        <div className="mt-4 border-t pt-4">
          {/* Pagination - only show if needed */}
          {totalPages > 1 && (
            <div className="flex justify-center mb-4">
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  &lt;
                </Button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  // Show max 5 page buttons, calculate which ones to show based on current page
                  let pageToShow;
                  if (totalPages <= 5) {
                    // Show all pages if 5 or fewer
                    pageToShow = i + 1;
                  } else if (currentPage <= 3) {
                    // Show first 5 pages if current page is near the beginning
                    pageToShow = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    // Show last 5 pages if current page is near the end
                    pageToShow = totalPages - 4 + i;
                  } else {
                    // Show 2 before current page, current page, and 2 after current page
                    pageToShow = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageToShow}
                      variant={currentPage === pageToShow ? "default" : "outline"}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handlePageChange(pageToShow)}
                    >
                      {pageToShow}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </Button>
              </div>
            </div>
          )}

          {/* Add a new plan button */}
          {!showHistoric && (
            <div className="flex justify-center">
              <Button
                className="px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-semibold w-fit min-w-0"
                onClick={onNewPlan}
                style={{ width: 'fit-content' }}
              >
                Start new plan
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivePlansView; 