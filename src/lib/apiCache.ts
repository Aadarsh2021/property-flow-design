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
    console.log(`💾 CACHE: Stored ${key} with TTL ${ttl}ms`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      console.log(`💾 CACHE: Miss - ${key}`);
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      console.log(`💾 CACHE: Expired - ${key}`);
      return null;
    }

    console.log(`💾 CACHE: Hit - ${key}`);
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
    console.log(`💾 CACHE: Cleared ${key}`);
  }

  // Clear all cache entries
  clearAll(): void {
    this.cache.clear();
    console.log(`💾 CACHE: Cleared all entries`);
  }

  // Clear cache entries by pattern
  clearByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    console.log(`💾 CACHE: Looking for pattern ${pattern}`);
    console.log(`💾 CACHE: Current cache keys:`, Array.from(this.cache.keys()));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        console.log(`💾 CACHE: Cleared ${key} (pattern: ${pattern})`);
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
    console.log(`✅ Cache hit: ${key}`);
    return cached;
  }

  // Check if request is already pending
  const pending = apiCache.getPending<T>(key);
  if (pending) {
    console.log(`⏳ Pending request: ${key}`);
    return pending;
  }

  // Make new request
  console.log(`🔄 New request: ${key}`);
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
