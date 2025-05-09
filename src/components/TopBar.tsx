import { Search, Moon, Sun, ChevronDown, Menu } from '../components/ui-icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useTheme } from 'next-themes';
import { cn, getThemeValues } from '@/lib/utils';
import { CoinmetroLogo } from './icons/CoinmetroLogo';
import { CoinmetroText } from './icons/CoinmetroText';
import { useEffect, useState } from 'react';
import { ThemeIntensity } from './ThemeIntensity';
import { useThemeIntensity } from '@/contexts/ThemeContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface TopBarProps {
  currentPage: 'dashboard' | 'spot' | 'margin' | 'earn';
  onPageChange: (page: 'dashboard' | 'spot' | 'margin' | 'earn') => void;
}

export function TopBar({ currentPage, onPageChange }: TopBarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { backgroundIntensity, widgetIntensity, borderIntensity, foregroundOpacity } = useThemeIntensity();
  const colors = getThemeValues(resolvedTheme, backgroundIntensity, widgetIntensity, borderIntensity, foregroundOpacity);
  const [isScrolled, setIsScrolled] = useState(false);

  // Apply CSS variables when theme or intensities change
  useEffect(() => {
    const root = document.documentElement;
    const styleTag = document.createElement('style');
    styleTag.textContent = `:root {\n${Object.entries(colors.cssVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')}\n}`;
    document.head.appendChild(styleTag);

    return () => {
      styleTag.remove();
    };
  }, [theme, backgroundIntensity, widgetIntensity, borderIntensity, foregroundOpacity]);

  const handlePageClick = (page: 'dashboard' | 'spot' | 'margin' | 'earn') => (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (page === currentPage) {
      console.log('📌 Already on the current page:', page);
      return;
    }
    
    console.log('🔄 Navigation clicked:', { from: currentPage, to: page });
    onPageChange(page);
  };

  useEffect(() => {
    console.log('📍 TopBar mounted with page:', currentPage);
    const handleScroll = () => {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        setIsScrolled(mainContent.scrollTop > 0);
      }
    };

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
      return () => mainContent.removeEventListener('scroll', handleScroll);
    }
  }, [currentPage]);

  useEffect(() => {
    console.log('📍 Current page updated:', currentPage);
  }, [currentPage]);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm transition-all duration-300",
      isScrolled ? "border-border" : "border-transparent"
    )}>
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left Section - with 6px left padding */}
        <div className="flex items-center space-x-6 lg:space-x-8 [padding-left:0.5rem]">
          {/* Logo and Brand */}
          <a 
            className="flex items-center space-x-2 shrink-0" 
            href="#"
            onClick={handlePageClick('dashboard')}
          >
            <CoinmetroLogo />
            <CoinmetroText className="text-foreground" />
          </a>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <a 
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-bold transition-colors",
                currentPage === 'spot' 
                  ? "bg-[#FF4D15]/10 text-[#FF4D15] hover:bg-[#FF4D15]/90 hover:text-[#FFFFFF]"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )} 
              href="#"
              onClick={handlePageClick('spot')}
            >
              Spot
            </a>
            <a 
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-bold transition-colors",
                currentPage === 'margin'
                  ? "bg-[#FF4D15]/10 text-[#FF4D15] hover:bg-[#FF4D15]/90 hover:text-[#FFFFFF]"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )} 
              href="#"
              onClick={handlePageClick('margin')}
            >
              Margin
            </a>
            <a 
              className={cn(
                "px-3 py-2 text-sm font-bold transition-colors rounded-lg",
                currentPage === 'earn'
                  ? "bg-[#FF4D15]/10 text-[#FF4D15] hover:bg-[#FF4D15]/90 hover:text-[#FFFFFF]"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )} 
              href="#"
              onClick={handlePageClick('earn')}
            >
              Earn
            </a>
            <button 
              className={cn(
                "flex items-center space-x-1 px-3 py-2 text-sm font-bold transition-colors rounded-lg",
                "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <span>Explore</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </nav>
          
          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" className="md:hidden text-foreground">
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
                "border border-border",
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
        <div className="flex items-center space-x-4 [padding-right:1rem]">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent 
                className="tooltip-content w-64 p-4" 
                side="bottom" 
                align="center"
                alignOffset={-20}
                sideOffset={8}
              >
                <div className="space-y-4">
                  <ThemeIntensity />
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button 
            variant="ghost" 
            className={cn(
              "font-bold hidden sm:flex whitespace-nowrap transition-colors",
              "bg-[#00C26E]/10 text-[#00C26E]",
              "hover:bg-[#00C26E]/90 hover:text-white"
            )}
          >
            Deposit
          </Button>
          <Button 
            variant="ghost" 
            className={cn(
              "font-bold hidden sm:flex whitespace-nowrap transition-colors",
              "bg-[#627EEA]/10 text-[#627EEA]",
              "hover:bg-[#627EEA]/90 hover:text-white"
            )}
          >
            Withdraw
          </Button>
          <Button 
            variant="ghost" 
            className={cn(
              "font-bold hidden md:flex whitespace-nowrap transition-colors",
              "bg-[#FF4D15]/10 text-[#FF4D15]",
              "hover:bg-[#FF4D15]/90 hover:text-white"
            )}
          >
            Level 6
          </Button>
          <Button 
            variant="ghost" 
            className={cn(
              "w-[43px] h-[42px] rounded-full shrink-0 transition-colors",
              "bg-[#FF4D15]/10 text-[#FF4D15]",
              "hover:bg-[#FF4D15]/90 hover:text-white"
            )}
          >
            K
          </Button>
        </div>
      </div>
    </header>
  );
}