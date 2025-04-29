/**
 * Rate Limiter Service
 * Provides centralized rate limiting and batching for API requests
 */

// Constants
const MAX_REQUESTS_PER_MINUTE = 30;
const BATCH_WINDOW_MS = 60000; // 1 minute

// Singleton instance for the rate limiter
let instance: RateLimiterService | null = null;

// Pending request queue
interface QueuedRequest<T> {
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  timestamp: number;
}

export class RateLimiterService {
  private requestCount: number = 0;
  private windowStart: number = Date.now();
  private lastBatchTime: number = 0;
  private batchTimer: NodeJS.Timeout | null = null;
  private pendingRequests: Map<string, Array<QueuedRequest<any>>> = new Map();
  private inProgress: Set<string> = new Set();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 60000; // Default 1 minute cache

  private constructor() {
    // Reset window every minute
    setInterval(() => {
      this.windowStart = Date.now();
      this.requestCount = 0;
    }, BATCH_WINDOW_MS);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RateLimiterService {
    if (!instance) {
      instance = new RateLimiterService();
    }
    return instance;
  }

  /**
   * Set cache TTL in milliseconds
   */
  public setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }

  /**
   * Check if we can make a request now
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    
    // If window has expired, reset counter
    if (now - this.windowStart >= BATCH_WINDOW_MS) {
      this.windowStart = now;
      this.requestCount = 0;
      return true;
    }
    
    // Check if we're under the limit
    return this.requestCount < MAX_REQUESTS_PER_MINUTE;
  }

  /**
   * Schedule the next batch
   */
  private scheduleBatch(): void {
    if (this.batchTimer) return; // Already scheduled
    
    const now = Date.now();
    const timeSinceLastBatch = now - this.lastBatchTime;
    
    // If we've recently run a batch, wait longer for the next one
    const delay = Math.max(1000, Math.min(10000, BATCH_WINDOW_MS / MAX_REQUESTS_PER_MINUTE));
    
    this.batchTimer = setTimeout(() => {
      this.processBatch();
      this.batchTimer = null;
    }, delay);
  }

  /**
   * Process a batch of requests
   */
  private async processBatch(): Promise<void> {
    if (this.pendingRequests.size === 0) return;
    
    // Track batch time
    this.lastBatchTime = Date.now();
    
    // Process one request type at a time to avoid exceeding rate limits
    for (const [key, requests] of this.pendingRequests.entries()) {
      // Skip if already being processed
      if (this.inProgress.has(key)) continue;
      
      // Skip if we can't make more requests
      if (!this.canMakeRequest()) {
        this.scheduleBatch();
        return;
      }
      
      // Mark as in progress
      this.inProgress.add(key);
      
      try {
        // Increment request counter
        this.requestCount++;
        
        // Get the first request to determine the fetcher function
        const request = requests[0];
        if (!request) {
          this.inProgress.delete(key);
          continue;
        }
        
        // Execute the actual API request (this will be provided by the caller)
        const fetcherFn = this.getFetcherFunction(key);
        const result = await fetcherFn();
        
        // Update cache
        this.cache.set(key, { data: result, timestamp: Date.now() });
        
        // Resolve all pending requests for this key
        while (requests.length > 0) {
          const req = requests.shift();
          if (req) req.resolve(result);
        }
      } catch (error) {
        // Reject all pending requests for this key
        while (requests.length > 0) {
          const req = requests.shift();
          if (req) req.reject(error);
        }
      } finally {
        this.inProgress.delete(key);
      }
    }
    
    // Remove empty request queues
    for (const [key, requests] of this.pendingRequests.entries()) {
      if (requests.length === 0) {
        this.pendingRequests.delete(key);
      }
    }
    
    // Schedule next batch if there are still pending requests
    if (this.pendingRequests.size > 0) {
      this.scheduleBatch();
    }
  }

  /**
   * Get the appropriate fetcher function for a request key
   */
  private getFetcherFunction(key: string): () => Promise<any> {
    // This would be implemented by specific API services
    throw new Error(`No fetcher function registered for key: ${key}`);
  }

  /**
   * Register a fetcher function for a specific request type
   */
  public registerFetcher(key: string, fetcher: () => Promise<any>): void {
    const originalFetcher = this.getFetcherFunction;
    
    this.getFetcherFunction = (requestKey: string) => {
      if (requestKey === key) {
        return fetcher;
      }
      return originalFetcher.call(this, requestKey);
    };
  }

  /**
   * Queue a request to be processed in a batch
   */
  public async queueRequest<T>(key: string, skipCache = false): Promise<T> {
    // Check cache first
    if (!skipCache) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data as T;
      }
    }
    
    return new Promise<T>((resolve, reject) => {
      // Create a new request
      const request: QueuedRequest<T> = {
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      // Add to queue
      if (!this.pendingRequests.has(key)) {
        this.pendingRequests.set(key, []);
      }
      this.pendingRequests.get(key)!.push(request);
      
      // Schedule processing
      this.scheduleBatch();
    });
  }

  /**
   * Clear cache for a specific key or all keys
   */
  public clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Export singleton instance
export const rateLimiter = RateLimiterService.getInstance();

export default rateLimiter;
