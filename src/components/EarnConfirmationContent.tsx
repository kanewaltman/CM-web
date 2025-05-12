import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ConfirmationDialogContent } from './ConfirmationDialogContent';
import { cn } from '@/lib/utils';

interface EarnConfirmationContentProps {
  asset: string;
  amount: string;
  timeFrame: string;
  estimatedEarnings: string;
  onConfirm: () => void;
  onCancel: () => void;
  onBack: () => void;
}

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
    const stakeAmount = parseFloat(amount) || 0;
    
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

  return (
    <ConfirmationDialogContent 
      title={`Stake ${asset}`}
      onBack={onBack}
      primaryAction={{
        label: "Confirm Staking",
        onClick: onConfirm,
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