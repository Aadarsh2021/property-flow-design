/**
 * Enhanced API Cache Utility
 * 
 * Advanced in-memory cache for API responses with performance monitoring
 * and intelligent cache management
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalSize: number;
  entries: number;
  hitRate: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, Promise<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    totalSize: 0,
    maxSize: 50 * 1024 * 1024, // 50MB max cache size
    maxEntries: 1000 // Max number of cache entries
  };

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const dataSize = JSON.stringify(data).length;
    
    // Check if we need to evict entries
    this.evictIfNeeded(dataSize);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      lastAccessed: Date.now(),
      size: dataSize
    });
    
    this.stats.totalSize += dataSize;
    console.log(`💾 Cache stored: ${key} (${(dataSize / 1024).toFixed(2)}KB)`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.stats.totalSize -= entry.size;
      this.cache.delete(key);
      this.stats.misses++;
      console.log(`⏰ Cache expired: ${key}`);
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = now;
    this.stats.hits++;
    
    return entry.data;
  }

  // Enhanced eviction strategy
  private evictIfNeeded(newEntrySize: number): void {
    // Check if we exceed size limits
    if (this.stats.totalSize + newEntrySize > this.stats.maxSize || 
        this.cache.size >= this.stats.maxEntries) {
      
      // Sort entries by access pattern (LRU + hit rate)
      const entries = Array.from(this.cache.entries())
        .map(([key, entry]) => ({
          key,
          score: entry.hits / (Date.now() - entry.lastAccessed + 1), // Hits per millisecond
          size: entry.size,
          lastAccessed: entry.lastAccessed
        }))
        .sort((a, b) => a.score - b.score); // Lower score = evict first
      
      // Evict entries until we have enough space
      let freedSize = 0;
      const targetFreeSize = Math.max(newEntrySize, this.stats.maxSize * 0.1); // Free at least 10%
      
      for (const entry of entries) {
        if (freedSize >= targetFreeSize) break;
        
        this.cache.delete(entry.key);
        this.stats.totalSize -= entry.size;
        freedSize += entry.size;
        console.log(`🗑️ Cache evicted: ${entry.key} (${(entry.size / 1024).toFixed(2)}KB)`);
      }
    }
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
    this.stats.totalSize = 0;
    console.log('🗑️ Cache cleared completely');
  }

  clearExpired(): number {
    const now = Date.now();
    let clearedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.stats.totalSize -= entry.size;
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      console.log(`⏰ Cleared ${clearedCount} expired cache entries`);
    }
    
    return clearedCount;
  }

  // Clear specific cache entry
  clearKey(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.totalSize -= entry.size;
      this.cache.delete(key);
      console.log(`🗑️ Cache entry cleared: ${key}`);
    }
  }

  // Clear all cache entries
  clearAll(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    console.log('🗑️ All cache entries cleared');
  }

  // Clear cache entries by pattern
  clearByPattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let clearedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (regex.test(key)) {
        this.stats.totalSize -= entry.size;
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      console.log(`🗑️ Cleared ${clearedCount} cache entries matching pattern: ${pattern}`);
    }
    
    return clearedCount;
  }

  // Get cache statistics
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalSize: this.stats.totalSize,
      entries: this.cache.size,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    };
  }

  // Get cache health information
  getHealth(): {
    isHealthy: boolean;
    utilization: number;
    recommendations: string[];
  } {
    const utilization = (this.stats.totalSize / this.stats.maxSize) * 100;
    const recommendations: string[] = [];
    
    if (utilization > 80) {
      recommendations.push('Consider increasing cache TTL or clearing old entries');
    }
    
    if (this.cache.size > this.stats.maxEntries * 0.8) {
      recommendations.push('Consider reducing number of cached items');
    }
    
    const hitRate = this.getStats().hitRate;
    if (hitRate < 50) {
      recommendations.push('Low cache hit rate - consider optimizing cache keys or TTL');
    }
    
    return {
      isHealthy: utilization < 90 && this.cache.size < this.stats.maxEntries,
      utilization,
      recommendations
    };
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

// Enhanced cache management functions
export const clearCache = (key: string) => apiCache.clearKey(key);
export const clearAllCache = () => apiCache.clearAll();
export const clearCacheByPattern = (pattern: string) => apiCache.clearByPattern(pattern);
export const getCacheStats = () => apiCache.getStats();
export const getCacheHealth = () => apiCache.getHealth();

// Global cache management functions for debugging and monitoring
if (typeof window !== 'undefined') {
  (window as any).clearApiCache = () => {
    apiCache.clearAll();
  };
  
  (window as any).getApiCacheStats = () => {
    return apiCache.getStats();
  };
  
  (window as any).getApiCacheHealth = () => {
    return apiCache.getHealth();
  };
  
  (window as any).clearApiCacheByPattern = (pattern: string) => {
    return apiCache.clearByPattern(pattern);
  };
}

// Note: apiCall function is imported from api.ts to avoid duplication
// This file only contains cache-related functionality
