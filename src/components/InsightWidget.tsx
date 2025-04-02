import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isToday, startOfDay, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCcw, Link, ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem 
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { RemovableWidgetProps } from '@/types/widgets';

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

// Extend RemovableWidgetProps to include widgetId
interface InsightWidgetProps extends RemovableWidgetProps {
  widgetId?: string;
}

export const InsightWidget: React.FC<InsightWidgetProps> = ({ className, onRemove, widgetId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDigest, setCurrentDigest] = useState<NewsDigest | null>(null);
  const [allDigests, setAllDigests] = useState<NewsDigest[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment>('neutral');

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
        setUsingFallback(false);
      } else {
        // If no data, use fallback
        setAllDigests([FALLBACK_DATA]);
        setCurrentDigest(FALLBACK_DATA);
        setUsingFallback(true);
      }
    } catch (err) {
      console.error('Error fetching digests:', err);
      setError('Failed to load market insights. Using fallback data.');
      
      // Use fallback data
      setAllDigests([FALLBACK_DATA]);
      setCurrentDigest(FALLBACK_DATA);
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

  // Format crypto symbols in text
  const formatCryptoTokens = (text: string) => {
    // First sanitize the input text to prevent HTML injection and raw tags from showing
    let sanitizedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
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

    // Replace crypto tokens with styled versions
    let formattedText = sanitizedText;
    let citations: {index: number, citation: Citation}[] = [];
    
    // Find citation references like [1] and store them
    if (currentDigest?.citations) {
      const citationPattern = /\[(\d+)\]/g;
      let match;
      
      while ((match = citationPattern.exec(sanitizedText)) !== null) {
        const citationNum = parseInt(match[1], 10);
        const citation = currentDigest.citations.find(c => c.number === citationNum);
        
        if (citation) {
          citations.push({
            index: match.index,
            citation
          });
        }
      }
    }
    
    // Format crypto tokens first
    cryptoRegexPatterns.forEach(({ symbol, pattern }) => {
      formattedText = formattedText.replace(pattern, (match) => {
        return `<span class="font-semibold text-primary">${match}</span>`;
      });
    });
    
    // Now replace citation references with styled links, careful to maintain indices
    // Sort citations by index in descending order to avoid messing up indices
    citations.sort((a, b) => b.index - a.index);
    
    citations.forEach(({ index, citation }) => {
      const before = formattedText.substring(0, index);
      const after = formattedText.substring(index + `[${citation.number}]`.length);
      formattedText = `${before}<a href="${citation.url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">[${citation.number}]</a>${after}`;
    });

    return formattedText;
  };

  // Handle pagination navigation
  const goToNext = () => {
    if (selectedIndex < allDigests.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setCurrentDigest(allDigests[newIndex]);
      setMarketSentiment(analyzeMarketSentiment(allDigests[newIndex].content));
    }
  };

  const goToPrevious = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setCurrentDigest(allDigests[newIndex]);
      setMarketSentiment(analyzeMarketSentiment(allDigests[newIndex].content));
    }
  };

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
      
      return format(date, 'MMM d, yyyy');
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

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Main content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex flex-col space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-4/5"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        ) : currentDigest ? (
          <div className="space-y-4">
            {/* Date and sentiment indicator */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">
                {renderDate(currentDigest.timestamp)}
              </div>
              {renderSentimentIndicator()}
              {usingFallback && (
                <span className="text-xs text-muted-foreground">Using cached data</span>
              )}
            </div>
            
            {/* Content */}
            <div className="text-sm leading-relaxed select-text">
              <p dangerouslySetInnerHTML={{ __html: formatCryptoTokens(currentDigest.content) }}></p>
            </div>
            
            {/* Citations */}
            {currentDigest.citations && currentDigest.citations.length > 0 && (
              <div className="mt-4 pt-2 border-t border-border select-text">
                <h4 className="text-xs font-medium mb-2">Sources:</h4>
                <ul className="space-y-1">
                  {currentDigest.citations.map((citation) => (
                    <li key={citation.number} className="text-xs flex items-center">
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
          <div className="text-center text-muted-foreground">
            No market insight available
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="border-t border-border p-2">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                size="icon"
                variant="outline"
                onClick={goToPrevious}
                disabled={selectedIndex === 0 || loading}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <div className="flex items-center px-2 text-xs text-muted-foreground">
              {selectedIndex + 1} / {allDigests.length}
            </div>
            <PaginationItem>
              <Button
                size="icon"
                variant="outline"
                onClick={goToNext}
                disabled={selectedIndex === allDigests.length - 1 || loading}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};

// Create a refresh control component to be used in widget header
export const InsightWidgetControls: React.FC<{ widgetId: string }> = ({ widgetId }) => {
  const handleRefresh = () => {
    // Dispatch an event to refresh the insight widget with the given ID
    const event = new CustomEvent('insight-widget-refresh', { 
      detail: { widgetId } 
    });
    document.dispatchEvent(event);
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleRefresh}
      className="h-8 w-8"
      title="Refresh market insight"
    >
      <RefreshCcw className="h-4 w-4" />
    </Button>
  );
};

export default InsightWidget; 