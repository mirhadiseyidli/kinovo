import { Event } from '@/types/allTypes';

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Cache configuration
interface CacheConfig {
  maxSize: number;
  ttlMs: number; // Time to live in milliseconds
}

// Cache configurations for different data types
export const CACHE_CONFIGS = {
  UPCOMING_EVENTS: {
    maxSize: 3, // Small cache since we only show 3 events
    ttlMs: 5 * 60 * 1000, // 5 minutes
  },
  ATTENTION_REQUIRED: {
    maxSize: 3, // Small cache since we only show 3 events
    ttlMs: 3 * 60 * 1000, // 3 minutes (more frequent updates needed)
  },
  PAST_EVENTS: {
    maxSize: 3, // Reduced from 50 to be consistent with other event caches
    ttlMs: 15 * 60 * 1000, // 15 minutes (less frequent updates)
  },
  AI_SUMMARY: {
    maxSize: 3, // Increased from 1 to allow caching multiple summaries
    ttlMs: 30 * 60 * 1000, // 30 minutes
  },
} as const;

// Generic cache class
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private accessOrder: string[] = [];

  constructor(config: CacheConfig) {
    this.config = config;
  }

  // Generate cache key with user context
  private generateKey(userId: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${userId}:${paramString}`;
  }

  // Check if cache entry is valid
  private isValid(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.expiresAt;
  }

  // Update access order for LRU
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  // Evict least recently used entries
  private evictLRU(): void {
    while (this.cache.size >= this.config.maxSize && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  // Set cache entry
  set(userId: string, data: T, params?: Record<string, any>): void {
    const key = this.generateKey(userId, params);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.ttlMs,
    };

    this.evictLRU();
    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  // Get cache entry
  get(userId: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(userId, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      return null;
    }

    this.updateAccessOrder(key);
    return entry.data;
  }

  // Check if cache has valid entry
  has(userId: string, params?: Record<string, any>): boolean {
    return this.get(userId, params) !== null;
  }

  // Clear cache for specific user or all
  clear(userId?: string): void {
    if (userId) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(userId));
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
          this.accessOrder.splice(index, 1);
        }
      });
    } else {
      this.cache.clear();
      this.accessOrder = [];
    }
  }

  // Get cache stats
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Could be enhanced with hit/miss tracking
    };
  }

  // Clean expired entries
  cleanExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now >= entry.expiresAt) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    });
  }
}

// Cache instances for different data types
export const upcomingEventsCache = new LRUCache<Event[]>(CACHE_CONFIGS.UPCOMING_EVENTS);
export const attentionRequiredCache = new LRUCache<Event[]>(CACHE_CONFIGS.ATTENTION_REQUIRED);
export const pastEventsCache = new LRUCache<Event[]>(CACHE_CONFIGS.PAST_EVENTS);
export const aiSummaryCache = new LRUCache<string>(CACHE_CONFIGS.AI_SUMMARY);

// Cache manager for cleanup and monitoring
export class HomeScreenCacheManager {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  // Start periodic cleanup
  startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      upcomingEventsCache.cleanExpired();
      attentionRequiredCache.cleanExpired();
      pastEventsCache.cleanExpired();
      aiSummaryCache.cleanExpired();
    }, 2 * 60 * 1000); // Clean every 2 minutes
  }

  // Stop cleanup
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Clear all caches
  clearAll(): void {
    upcomingEventsCache.clear();
    attentionRequiredCache.clear();
    pastEventsCache.clear();
    aiSummaryCache.clear();
  }

  // Clear user-specific caches
  clearUserCaches(userId: string): void {
    upcomingEventsCache.clear(userId);
    attentionRequiredCache.clear(userId);
    pastEventsCache.clear(userId);
    aiSummaryCache.clear(userId);
  }

  // Get overall cache stats
  getAllStats(): Record<string, any> {
    return {
      upcomingEvents: upcomingEventsCache.getStats(),
      attentionRequired: attentionRequiredCache.getStats(),
      pastEvents: pastEventsCache.getStats(),
      aiSummary: aiSummaryCache.getStats(),
    };
  }
}

// Global cache manager instance
export const cacheManager = new HomeScreenCacheManager(); 