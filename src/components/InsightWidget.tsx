import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, parseISO, isToday, startOfDay, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCcw, Link, ArrowUpIcon, ArrowDownIcon, MinusIcon, Type } from 'lucide-react';
import { animate, createScope, waapi, stagger } from 'animejs';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { RemovableWidgetProps } from '@/types/widgets';
import { ASSETS, AssetTicker } from '@/assets/AssetTicker';
import { AssetPriceTooltip } from './AssetPriceTooltip';
import { useTheme } from 'next-themes';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { v4 as uuidv4 } from 'uuid';
import { WidgetContainer } from './WidgetContainer';

// Types from CM-Intel
interface Citation {
  number: number;
  title: string;
  url: string;
  isCited: boolean;
  favicon?: string;
}

type MarketSentiment = 'up' | 'down' | 'neutral';

interface NewsDigest {
  content: string;
  citations: Citation[];
  timestamp: string;
  explicitSentiment?: MarketSentiment;
}

// Fallback data in case the API or database fails
const FALLBACK_DATA: NewsDigest = {
  content: "The cryptocurrency market is showing resilience today with major assets maintaining their positions. Bitcoin continues to demonstrate strength above key support levels, while Ethereum's network activity remains robust. Market sentiment indicators suggest a cautiously optimistic outlook, with institutional interest remaining steady [1]. Technical analysis points to potential consolidation phases for leading cryptocurrencies [2].",
  citations: [
    {
      number: 1,
      title: "CoinGecko Market Analysis",
      url: "https://www.coingecko.com",
      isCited: true,
      favicon: "https://www.coingecko.com/favicon.ico"
    },
    {
      number: 2,
      title: "TradingView Technical Analysis",
      url: "https://www.tradingview.com",
      isCited: true,
      favicon: "https://www.tradingview.com/favicon.ico"
    }
  ],
  timestamp: new Date().toISOString()
};
interface InsightWidgetProps extends Omit<RemovableWidgetProps, 'widgetId'> {
  widgetId: string;
}

// Create a map of token patterns
const cryptoRegexPatterns = [
  { symbol: 'BTC', pattern: /\b(Bitcoin|BTC)\b/g },
  { symbol: 'ETH', pattern: /\b(Ethereum|ETH)\b/g },
  { symbol: 'BNB', pattern: /\b(Binance Coin|BNB)\b/g },
  { symbol: 'SOL', pattern: /\b(Solana|SOL)\b/g },
  { symbol: 'XRP', pattern: /\b(Ripple|XRP)\b/g },
  { symbol: 'ADA', pattern: /\b(Cardano|ADA)\b/g },
  { symbol: 'DOGE', pattern: /\b(Dogecoin|DOGE)\b/g },
  { symbol: 'SHIB', pattern: /\b(Shiba Inu|SHIB)\b/g },
  { symbol: 'AVAX', pattern: /\b(Avalanche|AVAX)\b/g },
  { symbol: 'LINK', pattern: /\b(Chainlink|LINK)\b/g }
];

// Define the TextMatch type with all necessary properties
interface TextMatch {
  startIndex: number;
  endIndex: number;
  asset: string;
  text: string;
  type: 'asset' | 'citation';
}

// Define animation configurations
const blurAnimation = {
  hidden: {
    filter: "blur(8px)",
    opacity: 0,
    translateY: 5,
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    translateY: 0,
  },
  exit: {
    filter: "blur(8px)",
    opacity: 0,
    translateY: -5,
  }
};

const textAnimation = {
  duration: 200,
  easing: 'easeOutQuad'
};

// Type for anime.js delay function
type AnimeDelayFunction = (el: any, i: number, total: number) => number;

export const InsightWidget: React.FC<InsightWidgetProps> = ({ className, onRemove, widgetId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDigest, setCurrentDigest] = useState<NewsDigest | null>(null);
  const [allDigests, setAllDigests] = useState<NewsDigest[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment>('neutral');
  const { theme, resolvedTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [contentParts, setContentParts] = useState<React.ReactNode[]>([]);
  
  // Height of each date item in the sidebar
  const itemHeight = 32;
  
  // Animation refs
  const animeScope = useRef<any>(null);
  const contentAnimeRef = useRef<HTMLDivElement>(null);
  const sidebarAnimeRef = useRef<HTMLDivElement>(null);
  
  // Refs for scrolling
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Load font size from localStorage with a default of 14px
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const savedFontSize = localStorage.getItem(`insight_font_size_${widgetId}`);
      return savedFontSize ? parseInt(savedFontSize, 10) : 14;
    } catch (e) {
      return 14;
    }
  });
  
  // Load line height from localStorage with a default of 1.5
  const [lineHeight, setLineHeight] = useState<number>(() => {
    try {
      const savedLineHeight = localStorage.getItem(`insight_line_height_${widgetId}`);
      return savedLineHeight ? parseFloat(savedLineHeight) : 1.5;
    } catch (e) {
      return 1.5;
    }
  });
  
  // Fetch all available market digests
  const fetchDigests = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(30);

      if (error) {
        throw error;
      }

      // Process and ensure each digest has valid properties
      const processedDigests = (data || []).map(digest => {
        if (!digest.citations || !Array.isArray(digest.citations)) {
          digest.citations = [];
        }
        
        digest.citations = digest.citations.map((citation: any) => {
          return {
            number: citation.number || 0,
            title: citation.title || `Source ${citation.number || 0}`,
            url: citation.url || '#',
            isCited: true,
            favicon: citation.favicon || ''
          };
        });
        
        return digest as NewsDigest;
      });

      if (processedDigests.length > 0) {
        setAllDigests(processedDigests);
        setCurrentDigest(processedDigests[0]);
        setMarketSentiment(analyzeMarketSentiment(processedDigests[0].content));
        setSelectedIndex(0);
        setUsingFallback(false);
      } else {
        // If no data, use fallback
        setAllDigests([FALLBACK_DATA]);
        setCurrentDigest(FALLBACK_DATA);
        setSelectedIndex(0);
        setUsingFallback(true);
      }
    } catch (err) {
      console.error('Error fetching digests:', err);
      setError('Failed to load insights. Using fallback data.');
      
      // Use fallback data
      setAllDigests([FALLBACK_DATA]);
      setCurrentDigest(FALLBACK_DATA);
      setSelectedIndex(0);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Analyze content to determine market sentiment
  const analyzeMarketSentiment = (content: string): MarketSentiment => {
    const positiveTerms = ['bullish', 'surge', 'soar', 'gain', 'rally', 'rise', 'up', 'growth', 'positive', 'optimistic', 'outperform'];
    const negativeTerms = ['bearish', 'plunge', 'plummet', 'drop', 'fall', 'decline', 'down', 'negative', 'pessimistic', 'underperform'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    // Count occurrences of sentiment terms
    positiveTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\w*\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) positiveCount += matches.length;
    });
    
    negativeTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\w*\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) negativeCount += matches.length;
    });
    
    // Determine sentiment based on counts
    if (positiveCount > negativeCount + 2) return 'up';
    if (negativeCount > positiveCount + 2) return 'down';
    return 'neutral';
  };

  // Detect theme from document class list
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setCurrentTheme(isDark ? 'dark' : 'light');
    };

    // Initial theme detection
    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // New approach: Split text into parts with asset components
  const formatContentWithAssets = useCallback((text: string) => {
    if (!text) return [];
    
    // Split text by '###' to identify sections
    const sections = text.split('###');
    const parts: React.ReactNode[] = [];

    sections.forEach((section, index) => {
      // Trim whitespace
      const trimmedSection = section.trim();

      // If the section is not empty, process it
      if (trimmedSection) {
        // If it's the first section, treat it as a paragraph
        if (index === 0) {
          parts.push(...processText(trimmedSection));
        } else {
          // Otherwise, treat it as a title followed by a paragraph
          const [title, ...paragraphParts] = trimmedSection.split('\n');
          parts.push(
            <h3 
              key={`title-${index}`}
              style={{
                fontSize: `${fontSize * 1.2}px`, // 20% larger than body text
                fontWeight: 'bold',
                margin: '0.5em 0'
              }}
            >
              {title.trim()}
            </h3>
          );
          const paragraph = paragraphParts.join('\n').trim();
          if (paragraph) {
            parts.push(...processText(paragraph));
          }
        }
      }
    });

    // Return the formatted parts
    return parts;
  }, [currentDigest, currentTheme, fontSize]);

  // Helper function to process text for assets and citations
  const processText = (text: string): React.ReactNode[] => {
    // Split text into paragraphs and headers
    const sections = text.split(/\n\n|###/);
    const parts: React.ReactNode[] = [];

    let globalParagraphIndex = 0; // Initialize a global paragraph index

    sections.forEach((section, sectionIndex) => {
      const trimmedSection = section.trim();
      const matches: TextMatch[] = [];

      if (trimmedSection.startsWith('###')) {
        // Handle headers
        parts.push(
          <h3 key={`header-${sectionIndex}`} style={{ fontSize: `${fontSize * 1.2}px`, fontWeight: 'bold', margin: '0.5em 0' }}>
            {trimmedSection.replace('###', '').trim()}
          </h3>
        );
      } else {
        const paragraphParts: React.ReactNode[] = [];

        // Find all crypto token matches
        cryptoRegexPatterns.forEach(({ symbol, pattern }) => {
          let match;
          while ((match = pattern.exec(trimmedSection)) !== null) {
            if (ASSETS[symbol as AssetTicker]) {
              matches.push({
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                asset: symbol,
                text: match[0],
                type: 'asset'
              });
            }
          }
        });

        // Find all citation references like [1]
        const citationPattern = /\[(\d+)\]/g;
        let citMatch;
        
        if (currentDigest?.citations) {
          while ((citMatch = citationPattern.exec(trimmedSection)) !== null) {
            const citationNum = parseInt(citMatch[1], 10);
            const citation = currentDigest.citations.find(c => c.number === citationNum);
            
            if (citation) {
              matches.push({
                startIndex: citMatch.index,
                endIndex: citMatch.index + citMatch[0].length,
                asset: '',
                text: citMatch[0],
                type: 'citation'
              });
            }
          }
        }

        // Sort matches by startIndex
        matches.sort((a, b) => a.startIndex - b.startIndex);

        // Build content parts array
        let lastIndex = 0;
        
        matches.forEach((match, index) => {
          if (match.startIndex > lastIndex) {
            paragraphParts.push(trimmedSection.substring(lastIndex, match.startIndex));
          }
          
          if (match.type === 'asset') {
            const asset = match.asset as AssetTicker;
            const assetConfig = ASSETS[asset];
            const assetColor = currentTheme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light;
            
            paragraphParts.push(
              <AssetPriceTooltip key={`asset-${sectionIndex}-${index}-${match.startIndex}`} asset={asset}>
                <span 
                  className="inline-asset-button font-jakarta rounded-md hover:cursor-pointer"
                  style={{
                    display: 'inline-block',
                    fontWeight: 500,
                    margin: '0 0.05em',
                    padding: '0 0.15em',
                    color: assetColor,
                    backgroundColor: `${assetColor}14`,
                    cursor: 'pointer',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'text',
                    userSelect: 'text'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = assetColor;
                    e.currentTarget.style.color = 'hsl(var(--color-widget-bg))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `${assetColor}14`;
                    e.currentTarget.style.color = assetColor;
                  }}
                  onMouseDown={(e) => {
                    if (e.detail > 1) {
                      e.preventDefault();
                    }
                  }}
                >
                  {match.text}
                </span>
              </AssetPriceTooltip>
            );
          } else if (match.type === 'citation') {
            const citationNum = parseInt(match.text.replace(/\[|\]/g, ''), 10);
            const citation = currentDigest?.citations?.find(c => c.number === citationNum);
            
            if (citation) {
              paragraphParts.push(
                <a 
                  key={`citation-${sectionIndex}-${index}-${match.startIndex}`}
                  href={citation.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {match.text}
                </a>
              );
            } else {
              paragraphParts.push(match.text);
            }
          }
          
          lastIndex = match.endIndex;
        });
        
        if (lastIndex < trimmedSection.length) {
          paragraphParts.push(trimmedSection.substring(lastIndex));
        }

        parts.push(<p key={`paragraph-${uuidv4()}`} style={{ marginBottom: '1em' }}>{paragraphParts}</p>);
        globalParagraphIndex++; // Increment global paragraph index for each paragraph
      }
    });
    
    return parts;
  };

  // Update content parts when digest changes
  useEffect(() => {
    if (currentDigest) {
      // Clear content parts before setting new content
      setContentParts([]);
      const parts = formatContentWithAssets(currentDigest.content);
      setContentParts(parts);
      
      // Ensure the content container is visible after content parts update
      if (contentAnimeRef.current) {
        // Using setTimeout to ensure this runs after React has updated the DOM
        setTimeout(() => {
          if (contentAnimeRef.current) {
            contentAnimeRef.current.style.opacity = '1';
            contentAnimeRef.current.style.transform = 'translateY(0)';
            contentAnimeRef.current.style.filter = 'blur(0px)';

            // Get the content items after parts are updated and force animation
            const contentItems = contentAnimeRef.current.querySelectorAll('.content-item');
            const citationItems = contentAnimeRef.current.querySelectorAll('.citation-item');
            
            if (contentItems.length > 0) {
              contentItems.forEach((el) => {
                (el as HTMLElement).style.opacity = '0';
                (el as HTMLElement).style.transform = 'translateY(3px)';
                (el as HTMLElement).style.filter = 'blur(4px)';
              });
              
              animate(contentItems, {
                opacity: [0, 1],
                translateY: [3, 0],
                filter: ['blur(4px)', 'blur(0px)'],
                duration: 300,
                delay: ((el: any, i: number) => i * 40),
                easing: 'easeOutQuad'
              });
            }
            
            if (citationItems.length > 0) {
              citationItems.forEach((el) => {
                (el as HTMLElement).style.opacity = '0';
                (el as HTMLElement).style.transform = 'translateY(3px)';
                (el as HTMLElement).style.filter = 'blur(4px)';
              });
              
              animate(citationItems, {
                opacity: [0, 1],
                translateY: [3, 0],
                filter: ['blur(4px)', 'blur(0px)'],
                duration: 300,
                delay: ((el: any, i: number) => 400 + (i * 40)),
                easing: 'easeOutQuad'
              });
            }
          }
        }, 20);
      }
    }
  }, [currentDigest, formatContentWithAssets]);

  // Set up anime.js animations
  useEffect(() => {
    // Create a new scope for animations
    if (containerRef.current) {
      animeScope.current = createScope({ root: containerRef.current });
    }
    
    // Set up cleanup
    return () => {
      if (animeScope.current && animeScope.current.revert) {
        animeScope.current.revert();
      }
    };
  }, []);
  
  // Animate sidebar scroll when selectedIndex changes
  useEffect(() => {
    if (!sidebarAnimeRef.current) return;
    
    const yOffset = Math.max(
      0, 
      Math.min(
        allDigests.length * itemHeight - (containerRef.current?.clientHeight || 300), 
        selectedIndex * itemHeight - (containerRef.current?.clientHeight || 300) / 2
      )
    ) * -1;
    
    // Animate the sidebar to scroll to the selected date
    animate(sidebarAnimeRef.current, {
      translateY: yOffset,
      duration: 300,
      easing: 'easeOutQuart'
    });
  }, [selectedIndex, allDigests.length, itemHeight]);

  // Add an additional animation for date items when selected index changes
  useEffect(() => {
    if (!sidebarAnimeRef.current) return;
    
    // Get all date items and the active one
    const dateItems = sidebarAnimeRef.current.querySelectorAll('.date-item');
    const activeItem = sidebarAnimeRef.current.querySelector('.date-item-active');
    
    if (activeItem) {
      // Add a subtle pulse animation to the active date item
      animate(activeItem as HTMLElement, {
        scale: [1, 1.05, 1],
        duration: 400,
        easing: 'easeOutQuad'
      });
    }
  }, [selectedIndex]);

  // Handle pagination navigation with more defensive checks
  const navigateTo = useCallback((index: number) => {
    // Only proceed if we have digests available
    if (allDigests.length === 0) return;
    
    const newIndex = Math.min(allDigests.length - 1, Math.max(0, index));
    
    // Make sure the digest at this index exists
    if (!allDigests[newIndex]) return;
    
    if (newIndex !== selectedIndex) {
      // First, animate the current content out if ref exists
      if (contentAnimeRef.current) {
        // Store the current content height to prevent layout jumps
        const currentHeight = contentAnimeRef.current.clientHeight;
        contentAnimeRef.current.style.height = `${currentHeight}px`;
        
        // Stop any ongoing animations
        if (animeScope.current && animeScope.current.remove) {
          animeScope.current.remove('.content-item');
          animeScope.current.remove('.citation-item');
        }
        
        animate(contentAnimeRef.current, {
          opacity: [1, 0],
          translateY: [0, -5],
          filter: ['blur(0px)', 'blur(8px)'],
          duration: 150,
          easing: 'easeInQuad',
          complete: () => {
            // After animation completes, ensure content is hidden before state update
            if (contentAnimeRef.current) {
              contentAnimeRef.current.style.opacity = '0';
              contentAnimeRef.current.style.transform = 'translateY(5px)';
              contentAnimeRef.current.style.filter = 'blur(8px)';
            }
            
            // Update the state with new content
            setSelectedIndex(newIndex);
            setCurrentDigest(allDigests[newIndex]);
            setMarketSentiment(analyzeMarketSentiment(allDigests[newIndex].content));
            
            // Use setTimeout to ensure state updates are processed before animation
            setTimeout(() => {
              // Reset the height constraint after state update
              if (contentAnimeRef.current) {
                contentAnimeRef.current.style.height = 'auto';
                
                // Explicitly animate the new content back in with a more pronounced animation
                animate(contentAnimeRef.current, {
                  opacity: [0, 1],
                  translateY: [5, 0],
                  filter: ['blur(8px)', 'blur(0px)'],
                  duration: 300,
                  easing: 'easeOutCubic',
                  complete: () => {
                    // Once the main container is visible, animate content items individually
                    if (contentAnimeRef.current) {
                      const contentItems = contentAnimeRef.current.querySelectorAll('.content-item');
                      const citationItems = contentAnimeRef.current.querySelectorAll('.citation-item');
                      
                      if (contentItems.length > 0) {
                        contentItems.forEach((el) => {
                          (el as HTMLElement).style.opacity = '0';
                          (el as HTMLElement).style.transform = 'translateY(3px)';
                          (el as HTMLElement).style.filter = 'blur(4px)';
                        });
                        
                        animate(contentItems, {
                          opacity: [0, 1],
                          translateY: [3, 0],
                          filter: ['blur(4px)', 'blur(0px)'],
                          duration: 300,
                          delay: ((el: any, i: number) => i * 40),
                          easing: 'easeOutQuad'
                        });
                      }
                      
                      if (citationItems.length > 0) {
                        citationItems.forEach((el) => {
                          (el as HTMLElement).style.opacity = '0';
                          (el as HTMLElement).style.transform = 'translateY(3px)';
                          (el as HTMLElement).style.filter = 'blur(4px)';
                        });
                        
                        animate(citationItems, {
                          opacity: [0, 1],
                          translateY: [3, 0],
                          filter: ['blur(4px)', 'blur(0px)'],
                          duration: 300,
                          delay: ((el: any, i: number) => 400 + (i * 40)),
                          easing: 'easeOutQuad'
                        });
                      }
                    }
                  }
                });
              }
              
              // Scroll content back to top when changing days
              if (contentRef.current) {
                contentRef.current.scrollTop = 0;
              }
            }, 50); // Increased delay to ensure state update is processed
          }
        });
      } else {
        // Fallback if no animation ref
        setSelectedIndex(newIndex);
        setCurrentDigest(allDigests[newIndex]);
        setMarketSentiment(analyzeMarketSentiment(allDigests[newIndex].content));
        
        // Scroll content back to top when changing days
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      }
    }
  }, [allDigests, selectedIndex, analyzeMarketSentiment, animeScope]);
  
  // Handle wheel scrolling with debounce to prevent rapid scrolling
  useEffect(() => {
    let isScrolling = false;
    
    const handleWheel = (e: WheelEvent) => {
      // Ignore scrolling on content area
      if (!sidebarRef.current || e.target === contentRef.current || contentRef.current?.contains(e.target as Node)) {
        return;
      }
      
      e.preventDefault();
      
      // Prevent rapid scrolling
      if (isScrolling || loading || allDigests.length <= 1) return;
      
      isScrolling = true;
      
      // Determine scroll direction
      if (e.deltaY > 0) {
        // Make sure we don't go past the end of the array
        if (selectedIndex < allDigests.length - 1) {
          navigateTo(selectedIndex + 1);
        }
      } else {
        // Make sure we don't go before the beginning of the array
        if (selectedIndex > 0) {
          navigateTo(selectedIndex - 1);
        }
      }
      
      // Reset scrolling flag after a short delay
      setTimeout(() => {
        isScrolling = false;
      }, 200);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, [selectedIndex, navigateTo, allDigests.length, loading]);

  // Refresh data
  const handleRefresh = () => {
    fetchDigests();
  };

  // Initial fetch
  useEffect(() => {
    fetchDigests();
  }, [fetchDigests]);

  // Render date with proper formatting
  const renderDate = (timestamp: string) => {
    try {
      const date = parseISO(timestamp);
      
      if (isToday(date)) {
        return 'Today';
      }
      
      return format(date, 'MMM d');
    } catch {
      return 'Unknown date';
    }
  };

  // Render the sentiment indicator
  const renderSentimentIndicator = () => {
    switch (marketSentiment) {
      case 'up':
        return (
          <div className="flex items-center text-green-500">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span className="text-xs font-medium">Bullish</span>
          </div>
        );
      case 'down':
        return (
          <div className="flex items-center text-red-500">
            <ArrowDownIcon className="h-4 w-4 mr-1" />
            <span className="text-xs font-medium">Bearish</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-500">
            <MinusIcon className="h-4 w-4 mr-1" />
            <span className="text-xs font-medium">Neutral</span>
          </div>
        );
    }
  };

  // Add event listener for refresh events
  useEffect(() => {
    const handleRefreshEvent = (event: Event) => {
      // Check if this refresh event is for this widget
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.widgetId === widgetId) {
        fetchDigests();
      }
    };
    
    document.addEventListener('insight-widget-refresh', handleRefreshEvent);
    
    return () => {
      document.removeEventListener('insight-widget-refresh', handleRefreshEvent);
    };
  }, [fetchDigests, widgetId]);

  // Add event listener for font size changes
  useEffect(() => {
    const handleFontSizeEvent = (event: Event) => {
      // Check if this font size change event is for this widget
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.widgetId === widgetId) {
        const newFontSize = customEvent.detail.fontSize;
        setFontSize(newFontSize);
        
        // Save to localStorage
        try {
          localStorage.setItem(`insight_font_size_${widgetId}`, newFontSize.toString());
        } catch (e) {
          console.warn('Failed to save font size preference to localStorage', e);
        }
      }
    };
    
    document.addEventListener('insight-widget-fontsize', handleFontSizeEvent);
    
    return () => {
      document.removeEventListener('insight-widget-fontsize', handleFontSizeEvent);
    };
  }, [widgetId]);
  
  // Add event listener for line height changes
  useEffect(() => {
    const handleLineHeightEvent = (event: Event) => {
      // Check if this line height change event is for this widget
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.widgetId === widgetId) {
        const newLineHeight = customEvent.detail.lineHeight;
        setLineHeight(newLineHeight);
        
        // Save to localStorage
        try {
          localStorage.setItem(`insight_line_height_${widgetId}`, newLineHeight.toString());
        } catch (e) {
          console.warn('Failed to save line height preference to localStorage', e);
        }
      }
    };
    
    document.addEventListener('insight-widget-lineheight', handleLineHeightEvent);
    
    return () => {
      document.removeEventListener('insight-widget-lineheight', handleLineHeightEvent);
    };
  }, [widgetId]);

  // Helper function to analyze market sentiment for a specific digest
  const getDigestSentiment = useCallback((content: string): MarketSentiment => {
    if (!content) return 'neutral';
    const positiveTerms = ['bullish', 'surge', 'soar', 'gain', 'rally', 'rise', 'up', 'growth', 'positive', 'optimistic', 'outperform'];
    const negativeTerms = ['bearish', 'plunge', 'plummet', 'drop', 'fall', 'decline', 'down', 'negative', 'pessimistic', 'underperform'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    // Count occurrences of sentiment terms
    positiveTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\w*\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) positiveCount += matches.length;
    });
    
    negativeTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\w*\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) negativeCount += matches.length;
    });
    
    // Determine sentiment based on counts
    if (positiveCount > negativeCount + 2) return 'up';
    if (negativeCount > positiveCount + 2) return 'down';
    return 'neutral';
  }, []);

  // Render the sentiment icon for date list
  const renderSentimentIcon = (sentiment: MarketSentiment, small: boolean = false) => {
    const size = small ? 'h-3 w-3' : 'h-4 w-4';
    switch (sentiment) {
      case 'up':
        return <ArrowUpIcon className={`${size} text-green-500`} />;
      case 'down':
        return <ArrowDownIcon className={`${size} text-red-500`} />;
      default:
        return <MinusIcon className={`${size} text-gray-400`} />;
    }
  };

  // Calculate sentiment for all digests
  const digestSentiments = useMemo(() => {
    return allDigests.map(digest => getDigestSentiment(digest.content));
  }, [allDigests, getDigestSentiment]);

  // Controls to be passed to WidgetContainer
  const widgetControls = (
    <InsightWidgetControls widgetId={widgetId} />
  );

  return (
    <Card className={`h-full flex flex-col relative container ${className}`} ref={containerRef}>
      {/* Date sidebar */}
      <div 
        ref={sidebarRef}
        className="absolute left-0 top-0 bottom-0 w-16 border-r border-border overflow-hidden z-10"
      >
        <div 
          ref={sidebarAnimeRef}
          className="h-full flex flex-col items-center py-2 px-2"
        >
          {allDigests.map((digest, index) => {
            const isActive = index === selectedIndex;
            const date = parseISO(digest.timestamp);
            const sentiment = digestSentiments[index];
            
            // Check if this is the first day of a new month in the list
            const isNewMonth = index === 0 || 
              format(parseISO(allDigests[index].timestamp), 'MMM') !== 
              format(parseISO(allDigests[index-1].timestamp), 'MMM');
            
            return (
              <React.Fragment key={`date-item-${index}`}>
                {isNewMonth && (
                  <div className="w-full flex items-center justify-center my-1 py-1">
                    <div className="h-px w-4 bg-muted-foreground/40 flex-grow max-w-[10px]"></div>
                    <span className="text-xs font-bold text-muted-foreground px-1">
                      {format(date, 'MMM').toUpperCase()}
                    </span>
                    <div className="h-px w-4 bg-muted-foreground/40 flex-grow max-w-[10px]"></div>
                  </div>
                )}
                <div
                  className={`w-full flex items-center justify-between py-1 px-2 rounded-md cursor-pointer date-item ${isActive ? 'date-item-active' : ''}
                    ${isActive 
                      ? "bg-primary/15 text-primary" 
                      : "text-muted-foreground hover:bg-muted/15 hover:text-foreground focus:bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
                    }`}
                  style={{
                    backgroundColor: isActive ? "hsla(var(--primary) / 0.15)" : "transparent",
                    color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
                  }}
                  tabIndex={0}
                  onClick={() => navigateTo(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigateTo(index);
                    }
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-bold text-right min-w-[14px]">{format(date, 'd')}</span>
                    <div className="ml-1">
                      {renderSentimentIcon(sentiment, true)}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content area with header */}
      <div className="ml-16 h-full flex flex-col">
        {/* Date header now above content */}
        {currentDigest && (
          <div className="p-3 border-b border-border">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="font-medium">
                  {renderDate(currentDigest.timestamp)}
                </div>
                <div className="flex items-center">
                  {renderSentimentIcon(marketSentiment)}
                  <span className="text-xs font-medium ml-1">
                    {marketSentiment === 'up' ? 'Bullish' : marketSentiment === 'down' ? 'Bearish' : 'Neutral'}
                  </span>
                </div>
                {usingFallback && (
                  <span className="text-xs text-muted-foreground">Cached data</span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateTo(selectedIndex - 1)}
                  disabled={selectedIndex === 0 || loading}
                  className="h-7 w-7 rounded-full"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateTo(selectedIndex + 1)}
                  disabled={selectedIndex === allDigests.length - 1 || loading}
                  className="h-7 w-7 rounded-full"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main content - independently scrollable */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto scrollbar-thin p-0"
        >
          {loading ? (
            <div className="flex flex-col space-y-2 p-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-4/5"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-sm p-4">
              {error}
            </div>
          ) : currentDigest ? (
            <div 
              ref={contentAnimeRef}
              className="p-4 space-y-4"
            >
              {/* Content with enhanced asset formatting and dynamic font size */}
              <div 
                className="text-foreground select-text space-y-2"
                style={{ 
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight
                }}
              >
                {contentParts.map((part, index) => (
                  <div 
                    key={`content-part-${selectedIndex}-${index}`}
                    className="content-item"
                  >
                    {part}
                  </div>
                ))}
              </div>
              
              {/* Citations */}
              {currentDigest.citations && currentDigest.citations.length > 0 && (
                <div className="mt-4 pt-2 border-t border-border select-text">
                  <h4 className="text-xs font-medium mb-2">Sources:</h4>
                  <ul className="space-y-1">
                    {currentDigest.citations.map((citation, idx) => (
                      <li 
                        key={`citation-${selectedIndex}-${citation.number}`}
                        className="text-xs flex items-center citation-item"
                      >
                        <span className="mr-1">[{citation.number}]</span>
                        <a 
                          href={citation.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center"
                        >
                          {citation.title}
                          <Link className="h-3 w-3 ml-1 inline" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-4">
              No insight available
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Create a refresh control component to be used in widget header
export const InsightWidgetControls: React.FC<{ widgetId: string }> = ({ widgetId }) => {
  const [open, setOpen] = useState(false);
  
  // Initialize slider value from localStorage or default to 14
  const [fontSizeValue, setFontSizeValue] = useState<number[]>(() => {
    try {
      const savedFontSize = localStorage.getItem(`insight_font_size_${widgetId}`);
      return savedFontSize ? [parseInt(savedFontSize, 10)] : [14];
    } catch (e) {
      return [14];
    }
  });
  
  // Initialize line height value from localStorage or default to 1.5
  const [lineHeightValue, setLineHeightValue] = useState<number[]>(() => {
    try {
      const savedLineHeight = localStorage.getItem(`insight_line_height_${widgetId}`);
      return savedLineHeight ? [parseFloat(savedLineHeight)] : [1.5];
    } catch (e) {
      return [1.5];
    }
  });
  
  const handleRefresh = () => {
    // Dispatch an event to refresh the insight widget with the given ID
    const event = new CustomEvent('insight-widget-refresh', { 
      detail: { widgetId } 
    });
    document.dispatchEvent(event);
  };
  
  const handleFontSizeChange = (newValue: number[]) => {
    setFontSizeValue(newValue);
    
    // Save to localStorage
    try {
      localStorage.setItem(`insight_font_size_${widgetId}`, newValue[0].toString());
    } catch (e) {
      console.warn('Failed to save font size preference to localStorage', e);
    }
    
    // Dispatch an event to update font size in the insight widget with the given ID
    const event = new CustomEvent('insight-widget-fontsize', { 
      detail: { 
        widgetId,
        fontSize: newValue[0]
      } 
    });
    document.dispatchEvent(event);
  };
  
  const handleLineHeightChange = (newValue: number[]) => {
    setLineHeightValue(newValue);
    
    // Save to localStorage
    try {
      localStorage.setItem(`insight_line_height_${widgetId}`, newValue[0].toString());
    } catch (e) {
      console.warn('Failed to save line height preference to localStorage', e);
    }
    
    // Dispatch an event to update line height in the insight widget with the given ID
    const event = new CustomEvent('insight-widget-lineheight', { 
      detail: { 
        widgetId,
        lineHeight: newValue[0]
      } 
    });
    document.dispatchEvent(event);
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleRefresh}
        className="h-8 w-8"
        title="Refresh insight"
      >
        <RefreshCcw className="h-4 w-4" />
      </Button>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            title="Adjust text appearance"
          >
            <Type className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Text Size</h4>
              <div className="px-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Small</span>
                  <span className="text-xs text-muted-foreground">Large</span>
                </div>
                <Slider 
                  min={12} 
                  max={24} 
                  step={1}
                  value={fontSizeValue} 
                  onValueChange={handleFontSizeChange} 
                />
              </div>
              <div className="text-xs text-center text-muted-foreground mt-2">
                {fontSizeValue[0]}px
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Line Spacing</h4>
              <div className="px-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Compact</span>
                  <span className="text-xs text-muted-foreground">Spacious</span>
                </div>
                <Slider 
                  min={1.2} 
                  max={2.0} 
                  step={0.1}
                  value={lineHeightValue} 
                  onValueChange={handleLineHeightChange} 
                />
              </div>
              <div className="text-xs text-center text-muted-foreground mt-2">
                {lineHeightValue[0].toFixed(1)}×
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};

export default InsightWidget;