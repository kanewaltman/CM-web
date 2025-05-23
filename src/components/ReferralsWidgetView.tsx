import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Copy,
  Share2,
  UserRoundPlus,
  Users,
  RotateCcw,
  Loader2,
  Check,
  Info,
  GlobeIcon,
} from "lucide-react";
import NumberFlow, { continuous } from "@number-flow/react";
import { cn } from "@/lib/utils";
import { TextShimmer } from "../../components/motion-primitives/text-shimmer";

interface ReferralEntry {
  id: string;
  email: string;
  joinDate: string;
  commission: number;
  tier: number;
  verified: boolean;
  needsDeposit: boolean;
}

export interface ReferralsWidgetViewProps {
  onBack: () => void;
  effectiveTheme: "light" | "dark";
  className?: string;
}

export const ReferralsWidgetView: React.FC<ReferralsWidgetViewProps> = ({
  onBack,
  effectiveTheme,
  className,
}) => {
  const [step, setStep] = useState<"generate" | "share">("generate");
  const [referralCode, setReferralCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFastShimmer, setIsFastShimmer] = useState(false);

  // Claiming functionality state
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [lastClaimTime, setLastClaimTime] = useState<number>(0);
  const [claimCooldownUntil, setClaimCooldownUntil] = useState<string | null>(
    null
  );
  const claimButtonRef = useRef<HTMLButtonElement>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set up time updates for cooldown timer
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(Date.now());
    };

    // Initial update
    updateTime();

    // Set interval
    timeIntervalRef.current = setInterval(updateTime, 1000);

    // Clean up
    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
    };
  }, []);

  // Check if claiming is available (not on cooldown and has balance)
  const isReadyToClaim = useCallback((): boolean => {
    if (totalEarned === 0) return false;

    // Check if on cooldown
    if (claimCooldownUntil) {
      const cooldownTime = new Date(claimCooldownUntil).getTime();
      if (currentTime < cooldownTime) {
        return false; // Still on cooldown
      }
    }

    return true;
  }, [totalEarned, claimCooldownUntil, currentTime]);

  // Format cooldown time in HH:MM:SS format
  const formatCooldownTime = useCallback(
    (targetDateStr: string): string => {
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
      return `${String(hoursRemaining).padStart(2, "0")}:${String(
        minutesRemaining
      ).padStart(2, "0")}:${String(secondsRemaining).padStart(2, "0")}`;
    },
    [currentTime]
  );

  // Handle claim button click
  const handleClaimRewards = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!isReadyToClaim()) return;

      // Get the button element that was clicked
      const buttonElement = e.currentTarget;

      // Track the claimed amount
      const claimedAmount = totalEarned;

      // Calculate cooldown end time (15 seconds from now)
      const now = new Date();
      const cooldownEndTime = new Date(now.getTime() + 15 * 1000); // 15 seconds

      // *** IMMEDIATE UI UPDATE ***
      // 1. Immediately disable the button
      buttonElement.disabled = true;

      // 2. Apply immediate visual update to the button
      buttonElement.classList.remove(
        "bg-[#FF4D15]/10",
        "text-[#FF4D15]",
        "hover:bg-[#FF4D15]/90",
        "hover:text-white"
      );
      buttonElement.classList.add(
        "bg-muted/30",
        "text-muted-foreground",
        "cursor-not-allowed"
      );

      // 3. Update button text immediately with cooldown timer
      const startTime = cooldownEndTime.getTime();

      // Function to update the countdown text
      const updateCountdown = () => {
        if (!buttonElement) return;

        const timeRemaining = Math.max(0, startTime - Date.now());

        // If countdown finished, reset button
        if (timeRemaining <= 0) {
          return;
        }

        // Calculate hours, minutes, seconds
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor(
          (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        // Update button text - ensure it stays monospace
        buttonElement.textContent = `${String(hours).padStart(2, "0")}:${String(
          minutes
        ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

        // Ensure the button stays monospaced
        buttonElement.classList.add("font-mono");

        // Schedule next update
        if (timeRemaining > 0) {
          setTimeout(updateCountdown, 500);
        }
      };

      // Start countdown immediately
      updateCountdown();

      // 4. Update the React state
      setClaimCooldownUntil(cooldownEndTime.toISOString());
      setTotalBalance((prev) => prev + claimedAmount); // Move to balance
      setTotalEarned(0); // Reset claimable to 0
      setLastClaimTime(Date.now());

      // 5. Show success notifications
      if (typeof window !== "undefined") {
        // Import and trigger sonner notifications
        import("sonner")
          .then(({ toast }) => {
            // Confirmation toast
            toast.success(
              `Successfully claimed ${claimedAmount.toFixed(2)} XCM`,
              {
                description:
                  "Your commission rewards have been added to your wallet.",
                duration: 4000,
                className: "reward-toast",
              }
            );

            // Points toast with delay
            setTimeout(() => {
              toast(
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-base">Points Earned!</p>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-orange-500">+75</p>
                      <p className="text-sm text-muted-foreground">
                        for claiming referral rewards
                      </p>
                    </div>
                  </div>
                </div>,
                {
                  className:
                    "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800/30",
                  duration: 3500,
                }
              );
            }, 1200);
          })
          .catch((err) =>
            console.error("Error showing toast notifications:", err)
          );
      }
    },
    [isReadyToClaim, totalEarned]
  );

  // Generate fake referral data
  const generateFakeReferrals = () => {
    const fakeUsers = [
      {
        name: "66583e8cd8",
        tier: 1,
        verified: true,
        needsDeposit: false, // This one completed deposit
        date: "05-30",
      },
      {
        name: "newnonuk",
        tier: 1,
        verified: true,
        needsDeposit: true,
        date: "05-30",
      },
      {
        name: "nohukyes",
        tier: 1,
        verified: true,
        needsDeposit: false, // This one completed deposit
        date: "05-30",
      },
      {
        name: "niok",
        tier: 1,
        verified: true,
        needsDeposit: true,
        date: "05-30",
      },
      {
        name: "66504ae410",
        tier: 1,
        verified: false, // 30% chance of unverified
        needsDeposit: true,
        date: "05-24",
      },
      {
        name: "66505041bd",
        tier: 1,
        verified: true,
        needsDeposit: false, // This one completed deposit
        date: "05-24",
      },
      {
        name: "nonuk4",
        tier: 1,
        verified: false, // 30% chance of unverified
        needsDeposit: true,
        date: "05-24",
      },
      {
        name: "uk3",
        tier: 1,
        verified: true,
        needsDeposit: false, // This one completed deposit
        date: "05-24",
      },
      {
        name: "crypto_user1",
        tier: 1,
        verified: false, // 30% chance of unverified
        needsDeposit: true,
        date: "05-23",
      },
      {
        name: "trader_pro",
        tier: 1,
        verified: false, // 30% chance of unverified
        needsDeposit: true,
        date: "05-22",
      },
    ];

    const newReferrals: ReferralEntry[] = [];
    const count = Math.floor(Math.random() * 4) + 3; // 3-6 referrals

    for (let i = 0; i < count; i++) {
      const userData = fakeUsers[Math.floor(Math.random() * fakeUsers.length)];

      // 30% chance of being unverified
      const isVerified = Math.random() > 0.3; // 70% verified, 30% unverified

      const commission =
        isVerified && !userData.needsDeposit ? Math.random() * 50 + 10 : 0;

      newReferrals.push({
        id: `ref-${Date.now()}-${i}`,
        email: userData.name,
        joinDate: userData.date,
        commission,
        tier: userData.tier,
        verified: isVerified,
        needsDeposit: userData.needsDeposit,
      });
    }

    // Add with animation delay
    newReferrals.forEach((referral, index) => {
      setTimeout(() => {
        setReferrals((prev) => [referral, ...prev]);
        setTotalEarned((prev) => prev + referral.commission);
        setTotalBalance((prev) => prev + referral.commission);
      }, index * 200); // Stagger animations
    });
  };

  // Generate a mock referral code
  const generateReferralCode = () => {
    const code = `CM-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    setReferralCode(code);
    setStep("share");
  };

  // Copy referral code to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(
        `https://go.coinmetro.com/?ref=${referralCode}`
      );
      setCopied(true);
      setIsFastShimmer(true);

      setTimeout(() => setCopied(false), 500);
      setTimeout(() => setIsFastShimmer(false), 500);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  // Restart the process
  const restart = () => {
    setStep("generate");
    setReferralCode("");
    setInputValue("");
    setCopied(false);
    setReferrals([]);
    setTotalBalance(0);
    setTotalEarned(0);
    setClaimCooldownUntil(null);
    setLastClaimTime(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className={`h-full w-full flex flex-col ${className}`}
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {step === "generate" ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-md">
              {/* Header Section */}
              <div className="text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <UserRoundPlus className="h-8 w-8 text-primary" />
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-semibold mb-3"
                >
                  Create your Code
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-muted-foreground"
                >
                  Choose a custom name for your referral code.
                </motion.p>
              </div>

              {/* Input Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="rounded-xl p-6 space-y-4">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inputValue.trim() && !isGenerating) {
                        setIsGenerating(true);
                        setTimeout(() => {
                          const code = `CM-${inputValue.trim().toUpperCase()}`;
                          setReferralCode(code);
                          setStep("share");
                          setIsGenerating(false);
                        }, 1500);
                      }
                    }}
                    placeholder="Enter your custom code"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />

                  <div className="h-[20px] relative">
                    {inputValue.trim() && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          y: 10,
                          rotateX: -15,
                          scale: 0.95,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          rotateX: 0,
                          scale: isGenerating ? 0.98 : 1,
                        }}
                        whileTap={{ scale: 0.96 }}
                        exit={{ opacity: 0, y: -10, rotateX: 15 }}
                        transition={{
                          duration: 0.3,
                          opacity: { duration: 0.25 },
                          scale: {
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                          },
                        }}
                        className="absolute w-full"
                      >
                        <Button
                          onClick={() => {
                            setIsGenerating(true);
                            // Simulate loading time
                            setTimeout(() => {
                              const code = `CM-${inputValue
                                .trim()
                                .toUpperCase()}`;
                              setReferralCode(code);
                              setStep("share");
                              setIsGenerating(false);
                            }, 1500);
                          }}
                          disabled={isGenerating}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-5 rounded-lg disabled:opacity-80 disabled:cursor-not-allowed"
                        >
                          {isGenerating ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            "Generate"
                          )}
                        </Button>
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 1, y: 0 }}
                      animate={{
                        opacity: inputValue.trim() ? 0 : 1,
                        y: inputValue.trim() ? 10 : 0,
                        rotateX: inputValue.trim() ? 15 : 0,
                      }}
                      transition={{
                        duration: 0.3,
                        opacity: { duration: 0.25 },
                      }}
                      className={`absolute w-full ${
                        inputValue.trim() ? "pointer-events-none" : ""
                      }`}
                    >
                      <div className="text-sm text-muted-foreground">
                        You will not be able to change your code later.
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Link Display and Copy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-muted/50 rounded-lg p-4 border-2 border-dashed border-border">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <TextShimmer
                      className="font-mono text-base break-all"
                      duration={isFastShimmer ? 0.5 : 10}
                    >
                      {`https://go.coinmetro.com/?ref=${referralCode}`}
                    </TextShimmer>
                  </div>
                  <motion.button
                    onClick={copyToClipboard}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                      "border border-border/50 bg-background/50 hover:bg-muted/80",
                      "hover:border-border active:bg-muted",
                      copied &&
                        "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30"
                    )}
                  >
                    <motion.div
                      animate={
                        copied
                          ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }
                          : {}
                      }
                      transition={{ duration: 0.3 }}
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors duration-200" />
                      )}
                    </motion.div>
                  </motion.button>
                </div>
              </div>

              {/* XCM Balance Card - ActivePlansView Style */}
              <div className="space-y-4">
                <div className="bg-[hsl(var(--primary-foreground))] border border-[hsl(var(--color-widget-inset-border))] rounded-lg overflow-hidden">
                  <div className="p-4 flex items-center">
                    {/* Token Icon and Balance */}
                    <div className="flex items-center">
                      <div className="w-12 h-12 flex items-center justify-center overflow-hidden mr-4">
                        <img
                          src="/assets/symbols/XCM.svg"
                          alt="XCM"
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.outerHTML = `<div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">XCM</div>`;
                          }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="text-sm text-muted-foreground">
                          Total Earned
                        </div>
                        <div className="font-medium flex items-center gap-1">
                          <NumberFlow
                            value={totalBalance}
                            format={{
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }}
                            plugins={[continuous]}
                            animated={true}
                          />
                          <span>XCM</span>
                        </div>
                      </div>
                    </div>

                    {/* Referrals Count */}
                    <div className="flex-shrink-0 ml-8 mr-6">
                      <div className="flex flex-col">
                        <div className="text-sm text-muted-foreground">
                          Referrals
                        </div>
                        <div className="text-sm font-medium">
                          <NumberFlow
                            value={referrals.length}
                            animated={true}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto"></div>

                    {/* Claimable */}
                    <div className="flex-shrink-0 mr-6">
                      <div className="flex flex-col">
                        <div className="text-sm text-muted-foreground text-right">
                          Claimable
                        </div>
                        <div className="font-medium text-emerald-500 flex justify-end tabular-nums">
                          <span className="flex items-center">
                            <NumberFlow
                              value={totalEarned}
                              format={{
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }}
                              plugins={[continuous]}
                              animated={true}
                            />
                            <span className="ml-1">XCM</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Claim Button */}
                    <div className="flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isReadyToClaim()}
                        className={cn(
                          "h-8 text-sm font-bold border-transparent",
                          isReadyToClaim()
                            ? "bg-[#FF4D15]/10 text-[#FF4D15] hover:bg-[#FF4D15]/90 hover:text-white"
                            : "bg-muted/30 text-muted-foreground cursor-not-allowed",
                          claimCooldownUntil &&
                            new Date(claimCooldownUntil).getTime() > currentTime
                            ? "font-mono"
                            : ""
                        )}
                        ref={claimButtonRef}
                        onClick={handleClaimRewards}
                      >
                        {claimCooldownUntil &&
                        new Date(claimCooldownUntil).getTime() > currentTime
                          ? formatCooldownTime(claimCooldownUntil)
                          : "Claim"}
                      </Button>
                    </div>
                  </div>

                  {/* Mobile view - Collapse to stacked layout on small screens */}
                  <div className="md:hidden border-t p-4 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Referrals
                      </div>
                      <div className="text-sm font-medium">
                        <NumberFlow value={referrals.length} animated={true} />{" "}
                        users
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Commission
                      </div>
                      <div className="text-sm font-medium">100%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Total Earned
                      </div>
                      <div className="text-sm font-medium">
                        <NumberFlow
                          value={totalBalance}
                          format={{
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }}
                          plugins={[continuous]}
                          animated={true}
                        />{" "}
                        XCM
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Claimable
                      </div>
                      <div className="text-sm font-medium text-emerald-500">
                        <NumberFlow
                          value={totalEarned}
                          format={{
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }}
                          plugins={[continuous]}
                          animated={true}
                        />{" "}
                        XCM
                      </div>
                    </div>
                    <div className="flex justify-end items-center col-span-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isReadyToClaim()}
                        className={cn(
                          "h-7 text-xs font-bold border-transparent",
                          isReadyToClaim()
                            ? "bg-[#FF4D15]/10 text-[#FF4D15] hover:bg-[#FF4D15]/90 hover:text-white"
                            : "bg-muted/30 text-muted-foreground cursor-not-allowed",
                          claimCooldownUntil &&
                            new Date(claimCooldownUntil).getTime() > currentTime
                            ? "font-mono"
                            : ""
                        )}
                        onClick={handleClaimRewards}
                      >
                        {claimCooldownUntil &&
                        new Date(claimCooldownUntil).getTime() > currentTime
                          ? formatCooldownTime(claimCooldownUntil)
                          : "Claim"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Referrals History */}
            <div className="px-8">
              {referrals.length === 0 ? (
                <div className="relative">
                  {/* Skeleton Table Background */}
                  <div
                    className="space-y-0 opacity-40 relative"
                    style={{
                      maskImage:
                        "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)",
                    }}
                  >
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 py-2 text-xs font-medium text-foreground/70 border-b border-border/50">
                      <div className="col-span-1">Tier</div>
                      <div className="col-span-4">Name</div>
                      <div className="col-span-2">Date</div>
                      <div className="col-span-3">Status</div>
                      <div className="col-span-2 text-right">Commission</div>
                    </div>

                    {/* Skeleton Rows */}
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-4 py-3 text-sm border-b border-border/30 last:border-b-0"
                      >
                        {/* Tier */}
                        <div className="col-span-1 flex items-center">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-foreground/30"></div>
                            <div className="w-6 h-4 bg-foreground/30 rounded"></div>
                          </div>
                        </div>

                        {/* Name */}
                        <div className="col-span-4 flex items-center">
                          <div
                            className={`h-4 bg-foreground/30 rounded ${
                              index % 3 === 0
                                ? "w-24"
                                : index % 3 === 1
                                ? "w-20"
                                : "w-28"
                            }`}
                          ></div>
                        </div>

                        {/* Date */}
                        <div className="col-span-2 flex items-center">
                          <div className="w-12 h-4 bg-foreground/30 rounded"></div>
                        </div>

                        {/* Status */}
                        <div className="col-span-3 flex items-center gap-2">
                          <div
                            className={`h-4 bg-foreground/30 rounded ${
                              index % 2 === 0 ? "w-20" : "w-16"
                            }`}
                          ></div>
                          {index % 3 !== 0 && (
                            <div className="w-24 h-4 bg-foreground/30 rounded"></div>
                          )}
                        </div>

                        {/* Commission */}
                        <div className="col-span-2 flex items-center justify-end">
                          <div
                            className={`h-4 bg-foreground/30 rounded ${
                              index % 2 === 0 ? "w-16" : "w-14"
                            }`}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Centered Benefits Overlay */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                    }}
                  >
                    <div className="">
                      <motion.div
                        className="text-lg font-bold text-foreground mb-2 text-center"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                      >
                        Start Earning
                      </motion.div>

                      {/* Benefits List */}
                      <motion.div
                        className="space-y-2 text-center"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                      >
                        <div className="text-sm text-foreground">
                          <span className="font-semibold text-emerald-600">
                            40%
                          </span>{" "}
                          commission from trading fees
                        </div>
                        <div className="text-sm text-foreground">
                          <span className="font-semibold text-emerald-600">
                            10%
                          </span>{" "}
                          from sub-referrals
                        </div>
                        <div className="text-sm text-foreground">
                          <span className="font-semibold text-emerald-600">
                            €10 + €25
                          </span>{" "}
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help underline decoration-dotted underline-offset-2">
                                  cashback
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="dark py-3">
                                <div className="flex gap-3">
                                  <GlobeIcon
                                    className="text-muted-foreground mt-0.5 shrink-0 opacity-60"
                                    size={16}
                                    aria-hidden="true"
                                  />
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground text-base font-medium">
                                      Referral Bonus
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                      €10 for you when someone signs up with your link.
                                      <br />
                                      Plus €25 cashback for them on trading fees.
                                    </p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-0">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 py-2 text-xs font-medium text-foreground/70 border-b border-border/50">
                    <div className="col-span-1">Tier</div>
                    <div className="col-span-4">Name</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-3">Status</div>
                    <div className="col-span-2 text-right">Commission</div>
                  </div>

                  {/* Table Body */}
                  <AnimatePresence initial={false}>
                    {referrals.map((referral, index) => (
                      <motion.div
                        key={referral.id}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{
                          duration: 0.4,
                          delay: index * 0.1,
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                        }}
                        className="grid grid-cols-12 gap-4 py-3 text-sm border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors"
                      >
                        {/* Tier */}
                        <motion.div
                          className="col-span-1 flex items-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.1 }}
                        >
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="font-medium text-foreground">
                              T{referral.tier}
                            </span>
                          </div>
                        </motion.div>

                        {/* Name */}
                        <motion.div
                          className="col-span-4 flex items-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.15 }}
                        >
                          <span className="font-medium text-foreground">
                            {referral.email}
                          </span>
                        </motion.div>

                        {/* Date */}
                        <motion.div
                          className="col-span-2 flex items-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.2 }}
                        >
                          <span className="text-foreground/80">
                            {referral.joinDate}
                          </span>
                        </motion.div>

                        {/* Status */}
                        <motion.div
                          className="col-span-3 flex items-center gap-2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.25 }}
                        >
                          <span
                            className={cn(
                              "text-xs font-medium",
                              referral.verified
                                ? "text-emerald-500"
                                : "text-orange-500"
                            )}
                          >
                            {referral.verified
                              ? "Fully Verified"
                              : "Not Verified"}
                          </span>
                          {referral.needsDeposit && (
                            <span className="text-xs text-foreground/70">
                              Needs to Deposit
                            </span>
                          )}
                          {!referral.needsDeposit && referral.verified && (
                            <span className="text-xs text-emerald-500">
                              Active
                            </span>
                          )}
                        </motion.div>

                        {/* Commission */}
                        <motion.div
                          className="col-span-2 flex items-center justify-end"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.3 }}
                        >
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              referral.commission > 0
                                ? "text-emerald-500"
                                : "text-foreground/50"
                            )}
                          >
                            {referral.commission > 0
                              ? `+${referral.commission.toFixed(2)}`
                              : "0.00"}{" "}
                            XCM
                          </span>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dev Tools Footer - Only show in share step */}
      {step === "share" && (
        <div className="border-t px-4 py-2 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="font-mono">DEV</span>
            <div className="w-px h-3 bg-slate-600"></div>
            <Button
              variant="ghost"
              size="sm"
              onClick={restart}
              className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-mono"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
            <div className="w-px h-3 bg-slate-600"></div>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateFakeReferrals}
              className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-mono"
            >
              <Users className="h-3 w-3 mr-1" />
              Add Referrals
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
