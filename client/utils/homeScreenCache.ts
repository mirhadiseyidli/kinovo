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

  // Clear specific event from cache
  clearEvent(eventId: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      // Check if this cache entry contains the specific event
      if (Array.isArray(entry.data)) {
        const hasEvent = entry.data.some((event: any) => 
          event._id === eventId || event.originalEventId === eventId
        );
        if (hasEvent) {
          keysToDelete.push(key);
        }
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    });
  }

  // Update specific event in cache
  updateEvent(eventId: string, updatedEvent: Event, userId: string): boolean {
    const key = this.generateKey(userId);
    const entry = this.cache.get(key);
    
    if (!entry || !Array.isArray(entry.data)) {
      return false;
    }

    let updated = false;
    const updatedData = (entry.data as Event[]).map((event: Event) => {
      if (event._id === eventId || event.originalEventId === eventId) {
        updated = true;
        return { ...updatedEvent };
      }
      return event;
    });

    if (updated) {
      this.cache.set(key, { ...entry, data: updatedData as T });
      this.updateAccessOrder(key);
    }

    return updated;
  }

  // Remove specific event from cache
  removeEventFromCache(eventId: string, userId: string): boolean {
    const key = this.generateKey(userId);
    const entry = this.cache.get(key);
    
    if (!entry || !Array.isArray(entry.data)) {
      return false;
    }

    const originalData = entry.data as Event[];
    const originalLength = originalData.length;
    const filteredData = originalData.filter((event: Event) => 
      event._id !== eventId && event.originalEventId !== eventId
    );

    const removed = filteredData.length < originalLength;
    if (removed) {
      this.cache.set(key, { ...entry, data: filteredData as T });
      this.updateAccessOrder(key);
    }

    return removed;
  }

  // Add event to cache
  addEventToCache(event: Event, userId: string): boolean {
    const key = this.generateKey(userId);
    const entry = this.cache.get(key);
    
    if (!entry || !Array.isArray(entry.data)) {
      return false;
    }

    const currentData = entry.data as Event[];
    // Check if event already exists
    const exists = currentData.some((existingEvent: Event) => 
      existingEvent._id === event._id || existingEvent.originalEventId === event._id
    );

    if (!exists) {
      const newData = [...currentData, event];
      // Sort by start_time to maintain order
      newData.sort((a: Event, b: Event) => {
        const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
        return aTime - bTime;
      });
      this.cache.set(key, { ...entry, data: newData as T });
      this.updateAccessOrder(key);
      return true;
    }

    return false;
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

// Event categorization helper functions
export function getEventCacheCategory(event: Event): 'upcoming' | 'attention' | 'past' | 'none' {
  const userStatus = event.userStatus;
  const now = new Date();
  const eventEndTime = event.end_time ? new Date(event.end_time) : null;
  
  // Check if event is in the past
  if (eventEndTime && eventEndTime < now) {
    return userStatus === 'accepted' ? 'past' : 'none';
  }
  
  // Check if event needs attention
  if (userStatus === undefined || 
      userStatus === null || 
      userStatus === 'pending' || 
      userStatus === 'rejected') {
    return 'attention';
  }
  
  // Check if event is upcoming
  if (userStatus === 'accepted' || userStatus === 'maybe') {
    return 'upcoming';
  }
  
  return 'none';
}

export function shouldEventBeInCache(event: Event, cacheType: 'upcoming' | 'attention' | 'past'): boolean {
  return getEventCacheCategory(event) === cacheType;
}

// Cache manager for cleanup and monitoring
export class HomeScreenCacheManager {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private eventClearCallbacks = new Set<(eventId: string) => void>();
  private eventUpdateCallbacks = new Set<(eventId: string, updatedEvent: Event, cacheChanges: Array<{ cache: string; action: 'updated' | 'removed' | 'added' }>) => void>();

  // Register callback for when events are cleared
  onEventCleared(callback: (eventId: string) => void): () => void {
    this.eventClearCallbacks.add(callback);
    return () => this.eventClearCallbacks.delete(callback);
  }

  // Register callback for when events are updated
  onEventUpdated(callback: (eventId: string, updatedEvent: Event, cacheChanges: Array<{ cache: string; action: 'updated' | 'removed' | 'added' }>) => void): () => void {
    this.eventUpdateCallbacks.add(callback);
    return () => this.eventUpdateCallbacks.delete(callback);
  }

  // Notify all callbacks when an event is cleared
  private notifyEventCleared(eventId: string): void {
    this.eventClearCallbacks.forEach(callback => {
      try {
        callback(eventId);
      } catch (error) {
        console.error('Error in event clear callback:', error);
      }
    });
  }

  // Notify all callbacks when an event is updated
  private notifyEventUpdated(eventId: string, updatedEvent: Event, cacheChanges: Array<{ cache: string; action: 'updated' | 'removed' | 'added' }>): void {
    this.eventUpdateCallbacks.forEach(callback => {
      try {
        callback(eventId, updatedEvent, cacheChanges);
      } catch (error) {
        console.error('Error in event update callback:', error);
      }
    });
  }

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

  // Update event across all relevant caches
  updateEventAcrossCaches(eventId: string, updatedEvent: Event, userId: string): void {
    const newCategory = getEventCacheCategory(updatedEvent);
    
    // Track which caches were affected
    const cacheChanges: Array<{ cache: string; action: 'updated' | 'removed' | 'added' }> = [];
    
    // Update in current caches and track changes
    const updatedInUpcoming = upcomingEventsCache.updateEvent(eventId, updatedEvent, userId);
    const updatedInAttention = attentionRequiredCache.updateEvent(eventId, updatedEvent, userId);
    const updatedInPast = pastEventsCache.updateEvent(eventId, updatedEvent, userId);
    
    if (updatedInUpcoming) cacheChanges.push({ cache: 'upcoming', action: 'updated' });
    if (updatedInAttention) cacheChanges.push({ cache: 'attention', action: 'updated' });
    if (updatedInPast) cacheChanges.push({ cache: 'past', action: 'updated' });
    
    // Remove from caches where event no longer belongs
    if (!shouldEventBeInCache(updatedEvent, 'upcoming') && updatedInUpcoming) {
      upcomingEventsCache.removeEventFromCache(eventId, userId);
      cacheChanges.push({ cache: 'upcoming', action: 'removed' });
    }
    
    if (!shouldEventBeInCache(updatedEvent, 'attention') && updatedInAttention) {
      attentionRequiredCache.removeEventFromCache(eventId, userId);
      cacheChanges.push({ cache: 'attention', action: 'removed' });
    }
    
    if (!shouldEventBeInCache(updatedEvent, 'past') && updatedInPast) {
      pastEventsCache.removeEventFromCache(eventId, userId);
      cacheChanges.push({ cache: 'past', action: 'removed' });
    }
    
    // Add to appropriate cache if event belongs there and wasn't already there
    if (newCategory === 'upcoming' && !updatedInUpcoming) {
      const added = upcomingEventsCache.addEventToCache(updatedEvent, userId);
      if (added) cacheChanges.push({ cache: 'upcoming', action: 'added' });
    }
    
    if (newCategory === 'attention' && !updatedInAttention) {
      const added = attentionRequiredCache.addEventToCache(updatedEvent, userId);
      if (added) cacheChanges.push({ cache: 'attention', action: 'added' });
    }
    
    if (newCategory === 'past' && !updatedInPast) {
      const added = pastEventsCache.addEventToCache(updatedEvent, userId);
      if (added) cacheChanges.push({ cache: 'past', action: 'added' });
    }
    
    // Notify callbacks about the changes
    this.notifyEventUpdated(eventId, updatedEvent, cacheChanges);
  }

  // Clear specific event from all relevant caches
  clearEventFromCaches(eventId: string): void {
    upcomingEventsCache.clearEvent(eventId);
    attentionRequiredCache.clearEvent(eventId);
    pastEventsCache.clearEvent(eventId);
    
    // Notify all registered callbacks
    this.notifyEventCleared(eventId);
  }
}

// Global cache manager instance
export const cacheManager = new HomeScreenCacheManager(); 