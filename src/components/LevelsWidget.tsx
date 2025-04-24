import React from 'react';
import { cn } from '@/lib/utils';
import { RemovableWidgetProps } from '@/types/widgets';
import { Progress } from './ui/progress';
import { useTheme } from 'next-themes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { InfoIcon } from 'lucide-react';

interface TierInfo {
  currentTier: number;
  nextTier: number;
  xp: number;
  maxXp: number;
  progress: number;
  pointsDecayRate: number;
  daysUntilDecay: number;
}

export interface LevelsWidgetProps extends RemovableWidgetProps {
  // Add any specific props for LevelsWidget if needed
}

const LevelsWidget: React.FC<LevelsWidgetProps> = ({ className, widgetId }) => {
  const { theme } = useTheme();
  
  // Level color - using a more subtle version for UI elements
  const levelColor = 'rgb(255, 77, 21)';
  const levelColorSoft = 'rgba(255, 77, 21, 0.8)';
  const levelColorBg = 'rgba(255, 77, 21, 0.05)';
  
  // Sample tier data - in a real implementation this would come from an API
  const tierInfo: TierInfo = {
    currentTier: 1,
    nextTier: 2,
    xp: 742,
    maxXp: 4600,
    progress: 52.2,
    pointsDecayRate: 50,
    daysUntilDecay: 45
  };

  const pointsForNextTier = tierInfo.maxXp - tierInfo.xp;

  const tiers = [
    { value: 0, label: '0' },
    { value: 1, label: '1', current: true },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5' },
    { value: 6, label: '6' },
    { value: 7, label: '7' },
    { value: 8, label: '8' }
  ];

  return (
    <div className={cn(
      "h-full relative overflow-auto scrollbar-thin rounded-lg p-4",
      "border border-[hsl(var(--color-widget-inset-border))] widget-inset",
      className
    )}>
      <div className="flex flex-col h-full min-w-[280px]">
        {/* Header with Current Tier info */}
        <div className="flex items-center gap-2 mb-1">
          <div className="text-sm text-muted-foreground">Current Tier</div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 text-muted-foreground opacity-70 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Your tier determines your benefits and status</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="ml-auto">
            <div className="text-sm text-muted-foreground">
              {tierInfo.xp} <span className="text-xs font-normal text-muted-foreground">XP</span>
            </div>
          </div>
        </div>
        
        {/* Tier progression with progress bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-3">
            <div className="text-4xl font-bold">Tier {tierInfo.currentTier}</div>
            <div className="text-4xl font-bold text-muted-foreground">
              Tier {tierInfo.nextTier}
            </div>
          </div>
          
          {/* Progress bar with proper padding container */}
          <div className="p-2 rounded-full border border-gray-800/60 bg-transparent">
            <div className="relative h-2 rounded-full overflow-hidden bg-muted/40">
              <div 
                className="absolute top-0 left-0 h-full rounded-full"
                style={{ 
                  width: `${tierInfo.progress}%`,
                  backgroundColor: levelColor
                }}
              />
            </div>
          </div>
        </div>

        {/* Decay Info Card - Fixed sizing */}
        <div className="w-full mb-5">
          <div className="bg-card/50 backdrop-blur-sm border border-amber-500/20 rounded-xl overflow-hidden shadow-sm w-full">
            <div className="p-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center bg-amber-500/10">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.2679 4L3.33975 16C2.56998 17.3333 3.53223 19 5.07183 19Z" 
                      stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-medium text-sm">Tier Decay Warning</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="whitespace-nowrap">{tierInfo.pointsDecayRate}<span className="text-muted-foreground"> pts/day</span></div>
                    <div className="text-amber-500 whitespace-nowrap">
                      {tierInfo.daysUntilDecay} days until tier decay
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Points Grid - Enhanced with better visual design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 min-w-[280px]">
          {/* Earn Points Card */}
          <div className="bg-card/50 backdrop-blur-sm border border-muted/30 rounded-xl overflow-hidden shadow-sm min-w-[130px]">
            <div className="p-3.5">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center" 
                     style={{ backgroundColor: levelColorBg }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6V18M18 12H6" stroke={levelColor} strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4 className="font-medium text-sm">Earn Points</h4>
              </div>
              
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="py-1 px-2 rounded bg-muted/20 font-semibold text-xs" style={{ color: levelColor }}>1 pt</div>
                  <span className="text-xs">per EUR on Exchange & Margin</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="py-1 px-2 rounded bg-muted/20 font-semibold text-xs" style={{ color: levelColor }}>2 pts</div>
                  <span className="text-xs">per EUR from Swap</span>
                </div>
              </div>
            </div>
          </div>

          {/* Boost Info Card */}
          <div className="bg-card/50 backdrop-blur-sm border border-muted/30 rounded-xl overflow-hidden shadow-sm min-w-[130px]">
            <div className="p-3.5">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center" 
                     style={{ backgroundColor: levelColorBg }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke={levelColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h4 className="font-medium text-sm">Boost Info</h4>
              </div>
              
              <div className="space-y-1.5">
                <div className="text-xs font-medium">Stake XCM to activate Points multiplier</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>Multiplies all earned points globally</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelsWidget; 