import { Search, Moon, Sun, ChevronDown, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useTheme } from 'next-themes';
import { cn, getThemeValues } from '@/lib/utils';
import { CoinmetroLogo } from './icons/CoinmetroLogo';
import { CoinmetroText } from './icons/CoinmetroText';
import { useEffect, useState } from 'react';

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const colors = getThemeValues(theme);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "bg-[hsl(var(--color-bg-base))]",
        isScrolled ? "border-b border-[hsl(var(--color-border-default))]" : ""
      )}
    >
      <div className="max-w-[1920px] mx-auto flex h-16 items-center justify-between">
        {/* Left Section - with 6px left padding */}
        <div className="flex items-center space-x-6 lg:space-x-8 pl-6">
          {/* Logo and Brand */}
          <a className="flex items-center space-x-2 shrink-0" href="/">
            <CoinmetroLogo />
            <CoinmetroText className={colors.text} />
          </a>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <a 
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-bold",
                "bg-[#FF4D15]/10 text-[#FF4D15] ", // Changed to use brand orange color
                "hover:bg-[#FF4D15]/90 hover:text-[#FFFFFF]"
              )} 
              href="/spot"
            >
              Spot
            </a>
            <a 
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-bold",
                colors.textMuted,
                colors.hover
              )} 
              href="/margin"
            >
              Margin
            </a>
            <a 
              className={cn(
                "px-3 py-2 text-sm font-bold",
                colors.textMuted,
                colors.hover
              )} 
              href="/stake"
            >
              Stake
            </a>
            <button 
              className={cn(
                "flex items-center space-x-1 px-3 py-2 text-sm font-bold",
                colors.textMuted,
                colors.hover
              )}
            >
              <span>Explore</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </nav>
          
          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" className={cn("md:hidden", colors.text)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 flex justify-center max-w-[480px] px-4 mx-4">
          <div className="w-full relative hidden sm:block">
            <div className="absolute inset-y-0 left-3 flex items-center">
              <Search className={cn("h-4 w-4", colors.textMuted)} />
            </div>
            <Input 
              placeholder="Search markets" 
              className={cn(
                "w-full pl-9 pr-8 py-2 text-sm",
                "bg-[hsl(var(--color-widget-content))]",
                colors.text,
                colors.searchPlaceholder,
                "border border-[hsl(var(--color-border-default)]",
              )}
            />
            <div className="absolute inset-y-0 right-3 flex items-center">
              <kbd className={cn(
                "hidden sm:flex text-[10px] font-medium px-1.5 h-5 items-center rounded",
                colors.textMuted,
                "bg-[hsl(var(--color-bg-subtle))]"
              )}>
                K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Section - with 6px right padding */}
        <div className="flex items-center space-x-2 pr-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "w-10 h-10 rounded-full hidden sm:flex items-center justify-center",
              "text-muted-foreground/60 hover:text-foreground",
              "hover:bg-[hsl(var(--color-bg-subtle))]"
            )}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 opacity-70" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 opacity-70" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button 
            variant="ghost" 
            className="bg-[#00C26E]/10 text-[#00C26E] hover:bg-[#00C26E]/20 font-bold hidden sm:flex whitespace-nowrap"
          >
            Deposit
          </Button>
          <Button 
            variant="ghost" 
            className="bg-[#627EEA]/10 text-[#627EEA] hover:bg-[#627EEA]/20 font-bold hidden sm:flex whitespace-nowrap"
          >
            Withdraw
          </Button>
          <Button 
            variant="ghost" 
            className="bg-[#FF4D15]/10 text-[#FF4D15] hover:bg-[#FF4D15]/20 font-bold hidden md:flex whitespace-nowrap"
          >
            Level 6
          </Button>
          <Button 
            variant="ghost" 
            className={cn(
              "w-[43px] h-[42px] rounded-full shrink-0 ",
              "bg-[#FF4D15]/20 text-white bg-[#FF4D15]/10 text-[#FF4D15]", // Changed to use brand orange color
              "hover:bg-[#FF4D15]/90 hover:text-[#FFFFFF]"
            )}
          >
            K
          </Button>
        </div>
      </div>
    </div>
  );
}