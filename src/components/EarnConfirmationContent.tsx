import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ConfirmationDialogContent } from './ConfirmationDialogContent';
import { cn } from '@/lib/utils';

// Define the staking plan interface to ensure consistent data structure
export interface StakingPlan {
  id: string;
  asset: string;
  amount: number;
  timeFrame: string;
  estimatedEarnings: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  actualEarnings?: number;
  terminationFee?: number;
  terminationDate?: string;
}

interface EarnConfirmationContentProps {
  asset: string;
  amount: string | number;
  timeFrame: string;
  estimatedEarnings: string;
  onConfirm: () => void;
  onCancel: () => void;
  onBack: () => void;
}

// Helper function to manage staking plans in localStorage
export const stakingPlansManager = {
  getPlans: (): StakingPlan[] => {
    if (typeof window === 'undefined') return [];
    const plans = localStorage.getItem('staking_plans');
    return plans ? JSON.parse(plans) : [];
  },
  
  savePlan: (plan: StakingPlan): void => {
    if (typeof window === 'undefined') return;
    const plans = stakingPlansManager.getPlans();
    plans.push(plan);
    localStorage.setItem('staking_plans', JSON.stringify(plans));
  },
  
  updatePlan: (updatedPlan: StakingPlan): void => {
    if (typeof window === 'undefined') return;
    const plans = stakingPlansManager.getPlans();
    const index = plans.findIndex(plan => plan.id === updatedPlan.id);
    if (index !== -1) {
      plans[index] = updatedPlan;
      localStorage.setItem('staking_plans', JSON.stringify(plans));
    }
  },
  
  terminatePlan: (planId: string, terminationFee: number): void => {
    if (typeof window === 'undefined') return;
    const plans = stakingPlansManager.getPlans();
    const index = plans.findIndex(plan => plan.id === planId);
    if (index !== -1) {
      plans[index].isActive = false;
      plans[index].terminationDate = new Date().toISOString();
      plans[index].terminationFee = terminationFee;
      localStorage.setItem('staking_plans', JSON.stringify(plans));
    }
  }
};

// Calculate timeframe in milliseconds for date calculations
const getTimeframeMs = (timeFrame: string): number => {
  switch (timeFrame) {
    case '1m': return 30 * 24 * 60 * 60 * 1000; // 30 days
    case '3m': return 90 * 24 * 60 * 60 * 1000; // 90 days
    case '6m': return 180 * 24 * 60 * 60 * 1000; // 180 days
    case '1y': return 365 * 24 * 60 * 60 * 1000; // 365 days
    case '2y': return 730 * 24 * 60 * 60 * 1000; // 730 days
    default: return 30 * 24 * 60 * 60 * 1000; // default to 30 days
  }
};

function EarnConfirmationContent({
  asset,
  amount,
  timeFrame,
  estimatedEarnings,
  onConfirm,
  onCancel,
  onBack
}: EarnConfirmationContentProps) {
  // Format time frame display
  const formattedTimeFrame = 
    timeFrame === "1m" ? "1 Month" :
    timeFrame === "3m" ? "3 Months" :
    timeFrame === "6m" ? "6 Months" :
    timeFrame === "1y" ? "1 Year" : "2 Years";
    
  // Calculate points based on staking parameters
  const calculatePoints = () => {
    // Parse amount to number
    const stakeAmount = parseFloat(amount.toString()) || 0;
    
    // Base points calculation (10 points per unit staked)
    let basePoints = Math.round(stakeAmount * 10);
    
    // Time frame multiplier
    const timeFrameMultiplier = 
      timeFrame === "1m" ? 1.0 :    // 1 month (base)
      timeFrame === "3m" ? 1.2 :    // 3 months (20% bonus)
      timeFrame === "6m" ? 1.5 :    // 6 months (50% bonus)
      timeFrame === "1y" ? 2.0 :    // 1 year (100% bonus)
      timeFrame === "2y" ? 3.0 :    // 2 years (200% bonus)
      1.0;                          // default fallback
      
    // Premium asset bonus (certain assets give bonus points)
    const assetBonus = 
      asset === "XCM" ? 1.5 :       // XCM gets 50% bonus
      asset === "ETH" ? 1.2 :       // ETH gets 20% bonus
      asset === "DOT" ? 1.3 :       // DOT gets 30% bonus
      1.0;                          // other assets get no bonus
    
    // Calculate final points
    const finalMultiplier = timeFrameMultiplier * assetBonus;
    const finalPoints = Math.floor(basePoints * finalMultiplier);
    
    return {
      amount: basePoints,
      multiplier: finalMultiplier,
      reason: `for staking ${asset} for ${formattedTimeFrame}`
    };
  };
  
  // Get points data
  const pointsData = calculatePoints();

  // Handle the confirmation and save the staking plan
  const handleConfirm = () => {
    // Convert amount and earnings to numbers
    const amountValue = parseFloat(amount.toString());
    const earningsValue = parseFloat(estimatedEarnings);
    
    // Create timestamps for start and end dates
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + getTimeframeMs(timeFrame));
    
    // Create a new staking plan
    const newPlan: StakingPlan = {
      id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      asset,
      amount: amountValue,
      timeFrame,
      estimatedEarnings: earningsValue,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true
    };
    
    // Save the plan to localStorage
    stakingPlansManager.savePlan(newPlan);
    
    // Notify listeners that a new plan was created
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('staking-plan-created', { 
        detail: { plan: newPlan }
      });
      document.dispatchEvent(event);
    }
    
    // Call the original onConfirm callback
    onConfirm();
  };

  return (
    <ConfirmationDialogContent 
      title={`Stake ${asset}`}
      onBack={onBack}
      primaryAction={{
        label: "Confirm Staking",
        onClick: handleConfirm,
        className: cn("bg-emerald-500 hover:bg-emerald-600 text-white"),
        toast: {
          type: 'success',
          title: 'Staking Confirmed',
          description: `${amount} ${asset} staked for ${formattedTimeFrame} with estimated earnings of ${estimatedEarnings} ${asset}`,
          duration: 5000
        },
        pointsEarned: pointsData
      }}
      secondaryAction={{
        label: "Cancel",
        onClick: onCancel
      }}
    >
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold mb-6">Confirm Staking</h1>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Staking Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Asset</p>
                <p className="font-medium">{asset}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">{amount} {asset}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Frame</p>
                <p className="font-medium">{formattedTimeFrame}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Earnings</p>
                <p className="font-medium text-emerald-500">{estimatedEarnings} {asset}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Your assets will be locked for the selected period</li>
              <li>• Early withdrawals may incur penalties</li>
              <li>• Estimated earnings are not guaranteed</li>
              <li>• Rates may change based on market conditions</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ConfirmationDialogContent>
  );
}

export default EarnConfirmationContent; 