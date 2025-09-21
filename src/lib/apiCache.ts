/**
 * API Cache Utility
 * 
 * Simple in-memory cache for API responses to improve performance
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, Promise<any>>();

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    // Cache stored
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      // Cache miss
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      // Cache expired
      return null;
    }

    // Cache hit
    return entry.data;
  }

  setPending<T>(key: string, promise: Promise<T>): void {
    this.pending.set(key, promise);
  }

  getPending<T>(key: string): Promise<T> | null {
    return this.pending.get(key) || null;
  }

  clearPending(key: string): void {
    this.pending.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Clear specific cache entry
  clearKey(key: string): void {
    this.cache.delete(key);
    // Cache cleared
  }

  // Clear all cache entries
  clearAll(): void {
    this.cache.clear();
    // All cache cleared
  }

  // Clear cache entries by pattern
  clearByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    // Looking for cache pattern
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        // Pattern cleared
      }
    }
  }
}

const apiCache = new ApiCache();

// Auto-cleanup expired entries every 5 minutes
setInterval(() => {
  apiCache.clearExpired();
}, 5 * 60 * 1000);

/**
 * Cached API call wrapper
 */
export const cachedApiCall = async <T>(
  key: string,
  apiCall: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  // Check cache first
  const cached = apiCache.get<T>(key);
  if (cached) {
    // Cache hit
    return cached;
  }

  // Check if request is already pending
  const pending = apiCache.getPending<T>(key);
  if (pending) {
    // Pending request
    return pending;
  }

  // Make new request
  // New request
  const promise = apiCall().then(data => {
    apiCache.set(key, data, ttl);
    apiCache.clearPending(key);
    return data;
  }).catch(error => {
    apiCache.clearPending(key);
    throw error;
  });

  apiCache.setPending(key, promise);
  return promise;
};

// Export cache management functions
export const clearCache = (key: string) => apiCache.clearKey(key);
export const clearAllCache = () => apiCache.clearAll();
export const clearCacheByPattern = (pattern: string) => apiCache.clearByPattern(pattern);

// Global cache clearing function for debugging
if (typeof window !== 'undefined') {
  (window as any).clearApiCache = () => {
    apiCache.clearAll();
  };
}

/**
 * Simple API call function
 */
export const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api';
