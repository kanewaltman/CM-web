import React from 'react';
import { Button } from './ui/button';
import { stakingPlansManager, StakingPlan } from './EarnConfirmationContent';

// Create sample test data
const generateTestData = () => {
  // Current timestamp
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000; // 1 day in milliseconds

  // Active staking plans
  const activePlans: StakingPlan[] = [
    {
      id: 'plan-test-1',
      asset: 'XCM',
      amount: 100,
      timeFrame: '1y',
      estimatedEarnings: 12.5,
      startDate: new Date(now - 15 * day).toISOString(), // Started 15 days ago
      endDate: new Date(now + 350 * day).toISOString(), // Ends in 350 days
      isActive: true
    },
    {
      id: 'plan-test-2',
      asset: 'ETH',
      amount: 1.5,
      timeFrame: '6m',
      estimatedEarnings: 0.075,
      startDate: new Date(now - 30 * day).toISOString(), // Started 30 days ago
      endDate: new Date(now + 150 * day).toISOString(), // Ends in 150 days
      isActive: true
    }
  ];

  // Historical (closed) plans
  const historicPlans: StakingPlan[] = [
    {
      id: 'plan-test-3',
      asset: 'DOT',
      amount: 50,
      timeFrame: '3m',
      estimatedEarnings: 3.25,
      startDate: new Date(now - 100 * day).toISOString(),
      endDate: new Date(now - 10 * day).toISOString(),
      isActive: false,
      actualEarnings: 3.15,
      terminationDate: new Date(now - 10 * day).toISOString()
    },
    {
      id: 'plan-test-4',
      asset: 'ADA',
      amount: 1000,
      timeFrame: '1m',
      estimatedEarnings: 30,
      startDate: new Date(now - 45 * day).toISOString(),
      endDate: new Date(now - 15 * day).toISOString(),
      isActive: false,
      actualEarnings: 25.75,
      terminationFee: 10.5,
      terminationDate: new Date(now - 25 * day).toISOString()
    }
  ];

  return [...activePlans, ...historicPlans];
};

export const TestStakingInit: React.FC = () => {
  const handleInitTestData = () => {
    const testPlans = generateTestData();
    
    // Clear existing plans
    localStorage.removeItem('staking_plans');
    
    // Add each plan
    testPlans.forEach(plan => {
      stakingPlansManager.savePlan(plan);
    });
    
    // Reload page to see changes
    window.location.reload();
  };

  const handleClearData = () => {
    // Clear existing plans
    localStorage.removeItem('staking_plans');
    
    // Reload page to see changes
    window.location.reload();
  };

  return (
    <div className="flex gap-3">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleInitTestData}
      >
        Initialize Test Plans
      </Button>
      <Button 
        variant="destructive" 
        size="sm" 
        onClick={handleClearData}
      >
        Clear All Plans
      </Button>
    </div>
  );
}; 