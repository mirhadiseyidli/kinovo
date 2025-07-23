import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import api from './api';
import { 
  invalidateInfiniteQueries, 
  updateInfiniteQueryCache, 
  removeFromInfiniteQueryCache, 
  updateInfiniteQueryCacheItem 
} from './infiniteQueryUtils';

/**
 * Advanced Cache Invalidation Strategies
 * 
 * This module provides sophisticated cache invalidation patterns for
 * maintaining consistency across related queries and optimizing
 * performance by invalidating only what's necessary.
 */

export interface CacheInvalidationContext {
  eventId?: string;
  userId?: string;
  eventType?: string;
  location?: { latitude: number; longitude: number; distance: number };
  category?: string;
  isPublic?: boolean;
  participants?: string[];
  createdBy?: string;
}

export interface InvalidationStrategy {
  name: string;
  description: string;
  execute: (queryClient: QueryClient, context: CacheInvalidationContext) => Promise<void>;
}

/**
 * Strategy 1: Targeted Event Invalidation
 * 
 * Invalidates only queries that are directly related to the specific event
 */
export const targetedEventInvalidation: InvalidationStrategy = {
  name: 'Targeted Event Invalidation',
  description: 'Invalidates only queries directly related to the specific event',
  
  execute: async (queryClient: QueryClient, context: CacheInvalidationContext) => {
    const { eventId, userId, eventType, location, category, isPublic, participants, createdBy } = context;
    
    if (!eventId) return;
    
    // Invalidate specific event query
    await queryClient.invalidateQueries({
      queryKey: queryKeys.eventById(eventId),
    });
    
    // Invalidate user's events if they're involved
    if (userId) {
      if (createdBy === userId) {
        // User created the event - invalidate their upcoming events
        await queryClient.invalidateQueries({
          queryKey: queryKeys.invalidation.allUserQueries(userId),
        });
      }
      
      if (participants?.includes(userId)) {
        // User is participating - invalidate their upcoming events
        await queryClient.invalidateQueries({
          queryKey: queryKeys.upcomingEvents(userId, false),
        });
      }
    }
    
    // Invalidate location-based queries if location is provided
    if (location) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.nearbyEvents(location.latitude, location.longitude, location.distance),
      });
    }
    
    // Invalidate category-based queries if category is provided
    if (category) {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.all, 'category', category],
      });
    }
    
    console.log(`✅ Targeted invalidation completed for event ${eventId}`);
  },
};

/**
 * Strategy 2: Cascading Invalidation
 * 
 * Invalidates queries in a cascading manner based on relationships
 */
export const cascadingInvalidation: InvalidationStrategy = {
  name: 'Cascading Invalidation',
  description: 'Invalidates queries in a cascading manner based on relationships',
  
  execute: async (queryClient: QueryClient, context: CacheInvalidationContext) => {
    const { eventId, userId, eventType, location, isPublic, participants, createdBy } = context;
    
    // Level 1: Direct event invalidation
    if (eventId) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.eventById(eventId),
      });
    }
    
    // Level 2: User-related invalidation
    if (userId) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.invalidation.allUserQueries(userId),
      });
      
      // Invalidate infinite queries for this user
      await invalidateInfiniteQueries({ queryClient, userId });
    }
    
    // Level 3: Creator-related invalidation
    if (createdBy && createdBy !== userId) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.invalidation.allUserQueries(createdBy),
      });
    }
    
    // Level 4: Participants-related invalidation
    if (participants) {
      for (const participantId of participants) {
        if (participantId !== userId && participantId !== createdBy) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.upcomingEvents(participantId, false),
          });
        }
      }
    }
    
    // Level 5: Location-based invalidation
    if (location) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.invalidation.allLocationQueries(),
      });
    }
    
    // Level 6: Public event invalidation
    if (isPublic) {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.all, 'public'],
      });
    }
    
    console.log(`✅ Cascading invalidation completed for event ${eventId}`);
  },
};

/**
 * Strategy 3: Selective Invalidation
 * 
 * Invalidates only specific query types based on the operation
 */
export const selectiveInvalidation: InvalidationStrategy = {
  name: 'Selective Invalidation',
  description: 'Invalidates only specific query types based on the operation',
  
  execute: async (queryClient: QueryClient, context: CacheInvalidationContext) => {
    const { eventId, userId, eventType, location } = context;
    
    // Determine which queries to invalidate based on event type
    const queriesToInvalidate = new Set<string>();
    
    if (eventType === 'create') {
      queriesToInvalidate.add('upcoming');
      queriesToInvalidate.add('recommended');
      queriesToInvalidate.add('count');
    } else if (eventType === 'update') {
      queriesToInvalidate.add('upcoming');
      queriesToInvalidate.add('past');
      queriesToInvalidate.add('nearby');
    } else if (eventType === 'delete') {
      queriesToInvalidate.add('upcoming');
      queriesToInvalidate.add('past');
      queriesToInvalidate.add('nearby');
      queriesToInvalidate.add('count');
    } else if (eventType === 'join' || eventType === 'leave') {
      queriesToInvalidate.add('upcoming');
      queriesToInvalidate.add('friends');
    }
    
    // Execute selective invalidation
    for (const queryType of queriesToInvalidate) {
      if (queryType === 'upcoming' && userId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.upcomingEvents(userId, false),
        });
      } else if (queryType === 'past' && userId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.pastEvents(userId),
        });
      } else if (queryType === 'nearby' && location) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.nearbyEvents(location.latitude, location.longitude, location.distance),
        });
      } else if (queryType === 'friends' && userId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.friendsEvents(userId),
        });
      } else if (queryType === 'recommended' && userId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.recommendedEvents(userId),
        });
      } else if (queryType === 'count' && userId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.eventCount(userId),
        });
      }
    }
    
    console.log(`✅ Selective invalidation completed for ${Array.from(queriesToInvalidate).join(', ')}`);
  },
};

/**
 * Strategy 4: Smart Invalidation with Dependency Tracking
 * 
 * Uses dependency tracking to determine which queries need invalidation
 */
export const smartInvalidation: InvalidationStrategy = {
  name: 'Smart Invalidation',
  description: 'Uses dependency tracking to determine which queries need invalidation',
  
  execute: async (queryClient: QueryClient, context: CacheInvalidationContext) => {
    const { eventId, userId, eventType, location, category, isPublic, participants, createdBy } = context;
    
    // Build dependency graph
    const dependencies = new Map<string, Set<string>>();
    
    // Add direct dependencies
    if (eventId) {
      dependencies.set(eventId, new Set());
    }
    
    // Add user dependencies
    if (userId) {
      if (!dependencies.has(userId)) {
        dependencies.set(userId, new Set());
      }
      dependencies.get(userId)!.add('upcoming');
      dependencies.get(userId)!.add('count');
    }
    
    // Add creator dependencies
    if (createdBy) {
      if (!dependencies.has(createdBy)) {
        dependencies.set(createdBy, new Set());
      }
      dependencies.get(createdBy)!.add('upcoming');
      dependencies.get(createdBy)!.add('created');
    }
    
    // Add participant dependencies
    if (participants) {
      for (const participantId of participants) {
        if (!dependencies.has(participantId)) {
          dependencies.set(participantId, new Set());
        }
        dependencies.get(participantId)!.add('upcoming');
        dependencies.get(participantId)!.add('friends');
      }
    }
    
    // Add location dependencies
    if (location) {
      const locationKey = `location:${location.latitude},${location.longitude}`;
      if (!dependencies.has(locationKey)) {
        dependencies.set(locationKey, new Set());
      }
      dependencies.get(locationKey)!.add('nearby');
    }
    
    // Add category dependencies
    if (category) {
      if (!dependencies.has(category)) {
        dependencies.set(category, new Set());
      }
      dependencies.get(category)!.add('category');
    }
    
    // Execute invalidation based on dependencies
    for (const [key, queryTypes] of dependencies) {
      for (const queryType of queryTypes) {
        if (queryType === 'upcoming' && key !== 'location' && key !== category) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.upcomingEvents(key, false),
          });
        } else if (queryType === 'nearby' && key.startsWith('location:')) {
          const [lat, lng] = key.split(':')[1].split(',').map(Number);
          await queryClient.invalidateQueries({
            queryKey: queryKeys.nearbyEvents(lat, lng, location?.distance || 10),
          });
        } else if (queryType === 'friends' && key !== 'location' && key !== category) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.friendsEvents(key),
          });
        } else if (queryType === 'count' && key !== 'location' && key !== category) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.eventCount(key),
          });
        }
      }
    }
    
    console.log(`✅ Smart invalidation completed for ${dependencies.size} dependencies`);
  },
};

/**
 * Strategy 5: Optimistic Update with Fallback Invalidation
 * 
 * Attempts optimistic updates first, falls back to invalidation if needed
 */
export const optimisticInvalidation: InvalidationStrategy = {
  name: 'Optimistic Update with Fallback',
  description: 'Attempts optimistic updates first, falls back to invalidation if needed',
  
  execute: async (queryClient: QueryClient, context: CacheInvalidationContext) => {
    const { eventId, userId, eventType, location } = context;
    
    try {
      // Attempt optimistic updates first
      if (eventType === 'create' && userId && eventId) {
        // Try to add to infinite query cache
        const optimisticEvent = queryClient.getQueryData(queryKeys.eventById(eventId));
        if (optimisticEvent) {
          updateInfiniteQueryCache(queryClient, 'upcoming', optimisticEvent, userId);
          console.log(`✅ Optimistic update successful for event ${eventId}`);
          return;
        }
      } else if (eventType === 'delete' && userId && eventId) {
        // Try to remove from infinite query cache
        removeFromInfiniteQueryCache(queryClient, 'upcoming', eventId, userId);
        console.log(`✅ Optimistic removal successful for event ${eventId}`);
        return;
      } else if (eventType === 'update' && userId && eventId) {
        // Try to update in infinite query cache
        const updatedEvent = queryClient.getQueryData(queryKeys.eventById(eventId));
        if (updatedEvent) {
          updateInfiniteQueryCacheItem(queryClient, 'upcoming', eventId, updatedEvent, userId);
          console.log(`✅ Optimistic update successful for event ${eventId}`);
          return;
        }
      }
      
      // Fall back to invalidation if optimistic updates fail
      throw new Error('Optimistic update not possible');
    } catch (error) {
      console.warn('Optimistic update failed, falling back to invalidation:', error);
      
      // Fall back to targeted invalidation
      await targetedEventInvalidation.execute(queryClient, context);
    }
  },
};

/**
 * Strategy 6: Tag-Based Invalidation
 * 
 * Uses query tags to group related queries and invalidate them together
 */
export const tagBasedInvalidation: InvalidationStrategy = {
  name: 'Tag-Based Invalidation',
  description: 'Uses query tags to group related queries and invalidate them together',
  
  execute: async (queryClient: QueryClient, context: CacheInvalidationContext) => {
    const { eventId, userId, eventType, location, category, isPublic, participants, createdBy } = context;
    
    // Define tags based on context
    const tags = new Set<string>();
    
    if (eventId) tags.add(`event:${eventId}`);
    if (userId) tags.add(`user:${userId}`);
    if (createdBy) tags.add(`creator:${createdBy}`);
    if (category) tags.add(`category:${category}`);
    if (isPublic) tags.add('public');
    if (location) tags.add(`location:${Math.round(location.latitude)},${Math.round(location.longitude)}`);
    
    // Add participant tags
    if (participants) {
      participants.forEach(participantId => {
        tags.add(`participant:${participantId}`);
      });
    }
    
    // Add operation-specific tags
    if (eventType) {
      tags.add(`operation:${eventType}`);
    }
    
    // Invalidate queries by predicate matching tags
    const promises = Array.from(tags).map(tag => 
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryTags = (query.meta as any)?.tags || [];
          return queryTags.some((queryTag: string) => queryTag.includes(tag));
        },
      })
    );
    
    await Promise.all(promises);
    
    console.log(`✅ Tag-based invalidation completed for tags: ${Array.from(tags).join(', ')}`);
  },
};

/**
 * Strategy 7: Dependency-Based Invalidation
 * 
 * Maintains a dependency graph and invalidates based on relationships
 */
export const dependencyBasedInvalidation: InvalidationStrategy = {
  name: 'Dependency-Based Invalidation',
  description: 'Maintains a dependency graph and invalidates based on relationships',
  
  execute: async (queryClient: QueryClient, context: CacheInvalidationContext) => {
    const { eventId, userId, eventType, location, category, isPublic, participants, createdBy } = context;
    
    // Build dependency graph
    const dependencyGraph = new Map<string, Set<string>>();
    
    // Helper to add dependency
    const addDependency = (source: string, target: string) => {
      if (!dependencyGraph.has(source)) {
        dependencyGraph.set(source, new Set());
      }
      dependencyGraph.get(source)!.add(target);
    };
    
    // Build dependencies based on context
    if (eventId) {
      // Event depends on itself
      addDependency(eventId, eventId);
      
      // Event depends on creator's queries
      if (createdBy) {
        addDependency(eventId, `user:${createdBy}:upcoming`);
        addDependency(eventId, `user:${createdBy}:count`);
      }
      
      // Event depends on participants' queries
      if (participants) {
        participants.forEach(participantId => {
          addDependency(eventId, `user:${participantId}:upcoming`);
          addDependency(eventId, `user:${participantId}:friends`);
        });
      }
      
      // Event depends on category queries
      if (category) {
        addDependency(eventId, `category:${category}`);
      }
      
      // Event depends on location queries
      if (location) {
        addDependency(eventId, `location:${location.latitude},${location.longitude}`);
      }
      
      // Event depends on public queries
      if (isPublic) {
        addDependency(eventId, 'public:events');
        addDependency(eventId, 'recommended:events');
      }
    }
    
    // Resolve dependencies and invalidate
    const resolvedDependencies = new Set<string>();
    
    const resolveDependencies = (source: string) => {
      if (resolvedDependencies.has(source)) return;
      resolvedDependencies.add(source);
      
      const dependencies = dependencyGraph.get(source);
      if (dependencies) {
        dependencies.forEach(dep => resolveDependencies(dep));
      }
    };
    
    // Start resolution from the main context
    if (eventId) resolveDependencies(eventId);
    if (userId) resolveDependencies(`user:${userId}`);
    
    // Invalidate resolved dependencies
    const invalidationPromises = Array.from(resolvedDependencies).map(async (dep) => {
      if (dep.startsWith('user:')) {
        const [, userId, queryType] = dep.split(':');
        if (queryType === 'upcoming') {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.upcomingEvents(userId, false),
          });
        } else if (queryType === 'count') {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.eventCount(userId),
          });
        } else if (queryType === 'friends') {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.friendsEvents(userId),
          });
        }
      } else if (dep.startsWith('category:')) {
        const category = dep.split(':')[1];
        await queryClient.invalidateQueries({
          queryKey: [...queryKeys.all, 'category', category],
        });
      } else if (dep.startsWith('location:')) {
        const [lat, lng] = dep.split(':')[1].split(',').map(Number);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.nearbyEvents(lat, lng, 10),
        });
      } else if (dep === 'public:events') {
        await queryClient.invalidateQueries({
          queryKey: [...queryKeys.all, 'public'],
        });
      } else if (dep === 'recommended:events') {
        await queryClient.invalidateQueries({
          queryKey: [...queryKeys.all, 'recommended'],
        });
      } else if (eventId && dep === eventId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.eventById(eventId),
        });
      }
    });
    
    await Promise.all(invalidationPromises);
    
    console.log(`✅ Dependency-based invalidation completed for ${resolvedDependencies.size} dependencies`);
  },
};

/**
 * Strategy 8: Smart Prefetching with Invalidation
 * 
 * Combines invalidation with smart prefetching of related data
 */
export const smartPrefetchingInvalidation: InvalidationStrategy = {
  name: 'Smart Prefetching with Invalidation',
  description: 'Combines invalidation with smart prefetching of related data',
  
  execute: async (queryClient: QueryClient, context: CacheInvalidationContext) => {
    const { eventId, userId, eventType, location, category, isPublic, participants, createdBy } = context;
    
    // First, perform standard invalidation
    await targetedEventInvalidation.execute(queryClient, context);
    
    // Then, prefetch related data that user is likely to need
    const prefetchPromises: Promise<any>[] = [];
    
    // Prefetch user's upcoming events if they're involved
    if (userId) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.upcomingEvents(userId, false),
          queryFn: async () => {
            const response = await api.get(`/api/manageevents/eventslist/get/my/upcoming/events?userId=${userId}`);
            return response.data;
          },
          staleTime: 5 * 60 * 1000, // 5 minutes
        })
      );
    }
    
    // Prefetch nearby events if location is available
    if (location) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.nearbyEvents(location.latitude, location.longitude, location.distance),
          queryFn: async () => {
            const response = await api.get(`/api/manageevents/eventslist/get/nearby/events?lat=${location.latitude}&lng=${location.longitude}&distance=${location.distance}`);
            return response.data;
          },
          staleTime: 10 * 60 * 1000, // 10 minutes
        })
      );
    }
    
    // Prefetch category events if category is specified
    if (category && userId) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: [...queryKeys.all, 'category', category, userId],
          queryFn: async () => {
            const response = await api.get(`/api/search/events?category=${category}&userId=${userId}`);
            return response.data;
          },
          staleTime: 15 * 60 * 1000, // 15 minutes
        })
      );
    }
    
    // Prefetch related events for participants
    if (participants && participants.length > 0) {
      participants.slice(0, 3).forEach(participantId => {
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: queryKeys.upcomingEvents(participantId, false),
            queryFn: async () => {
              const response = await api.get(`/api/manageevents/eventslist/get/my/upcoming/events?userId=${participantId}`);
              return response.data;
            },
            staleTime: 5 * 60 * 1000, // 5 minutes
          })
        );
      });
    }
    
    // Prefetch recommended events if this is a public event
    if (isPublic && userId) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.recommendedEvents(userId),
          queryFn: async () => {
            const response = await api.get(`/api/manageevents/eventslist/get/recommended?userId=${userId}`);
            return response.data;
          },
          staleTime: 30 * 60 * 1000, // 30 minutes
        })
      );
    }
    
    // Execute prefetches in parallel (don't wait for completion)
    Promise.all(prefetchPromises).catch(error => {
      console.warn('Some prefetch operations failed:', error);
    });
    
    console.log(`✅ Smart prefetching invalidation completed with ${prefetchPromises.length} prefetch operations`);
  },
};

/**
 * Strategy 9: Cache Warming with Invalidation
 * 
 * Invalidates stale data and immediately warms cache with fresh data
 */
export const cacheWarmingInvalidation: InvalidationStrategy = {
  name: 'Cache Warming with Invalidation',
  description: 'Invalidates stale data and immediately warms cache with fresh data',
  
  execute: async (queryClient: QueryClient, context: CacheInvalidationContext) => {
    const { eventId, userId, eventType, location, category, isPublic, participants, createdBy } = context;
    
    // Identify critical queries that need immediate refresh
    const criticalQueries = new Set<string>();
    
    if (userId) {
      criticalQueries.add(`upcoming:${userId}`);
      criticalQueries.add(`count:${userId}`);
    }
    
    if (createdBy && createdBy !== userId) {
      criticalQueries.add(`upcoming:${createdBy}`);
    }
    
    if (location) {
      criticalQueries.add(`nearby:${location.latitude},${location.longitude}`);
    }
    
    if (category) {
      criticalQueries.add(`category:${category}`);
    }
    
    // Invalidate and immediately refetch critical queries
    const warmingPromises = Array.from(criticalQueries).map(async (query) => {
      const [queryType, param] = query.split(':');
      
      if (queryType === 'upcoming') {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.upcomingEvents(param, false),
        });
        
        // Immediately refetch
        return queryClient.refetchQueries({
          queryKey: queryKeys.upcomingEvents(param, false),
        });
      } else if (queryType === 'count') {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.eventCount(param),
        });
        
        return queryClient.refetchQueries({
          queryKey: queryKeys.eventCount(param),
        });
      } else if (queryType === 'nearby') {
        const [lat, lng] = param.split(',').map(Number);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.nearbyEvents(lat, lng, location?.distance || 10),
        });
        
        return queryClient.refetchQueries({
          queryKey: queryKeys.nearbyEvents(lat, lng, location?.distance || 10),
        });
      } else if (queryType === 'category') {
        await queryClient.invalidateQueries({
          queryKey: [...queryKeys.all, 'category', param],
        });
        
        return queryClient.refetchQueries({
          queryKey: [...queryKeys.all, 'category', param],
        });
      }
    });
    
    await Promise.all(warmingPromises);
    
    console.log(`✅ Cache warming invalidation completed for ${criticalQueries.size} critical queries`);
  },
};

/**
 * Strategy Registry
 */
export const invalidationStrategies = {
  targeted: targetedEventInvalidation,
  cascading: cascadingInvalidation,
  selective: selectiveInvalidation,
  smart: smartInvalidation,
  optimistic: optimisticInvalidation,
  tagBased: tagBasedInvalidation,
  dependencyBased: dependencyBasedInvalidation,
  smartPrefetching: smartPrefetchingInvalidation,
  cacheWarming: cacheWarmingInvalidation,
} as const;

/**
 * Execute Invalidation Strategy
 */
export const executeInvalidationStrategy = async (
  strategyName: keyof typeof invalidationStrategies,
  queryClient: QueryClient,
  context: CacheInvalidationContext
) => {
  const strategy = invalidationStrategies[strategyName];
  if (!strategy) {
    throw new Error(`Unknown invalidation strategy: ${strategyName}`);
  }
  
  console.log(`🔄 Executing invalidation strategy: ${strategy.name}`);
  const startTime = performance.now();
  
  try {
    await strategy.execute(queryClient, context);
    const duration = performance.now() - startTime;
    console.log(`✅ Invalidation strategy completed in ${duration.toFixed(2)}ms`);
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`❌ Invalidation strategy failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

/**
 * Automatic Strategy Selection
 */
export const selectOptimalStrategy = (
  context: CacheInvalidationContext,
  options: {
    preferPerformance?: boolean;
    preferAccuracy?: boolean;
    enablePrefetching?: boolean;
    enableCacheWarming?: boolean;
  } = {}
): keyof typeof invalidationStrategies => {
  const { eventType, participants, location, isPublic } = context;
  const { preferPerformance, preferAccuracy, enablePrefetching, enableCacheWarming } = options;
  
  // Use cache warming for critical operations when enabled
  if (enableCacheWarming && (eventType === 'create' || eventType === 'update')) {
    return 'cacheWarming';
  }
  
  // Use smart prefetching for user-facing operations when enabled
  if (enablePrefetching && (eventType === 'join' || eventType === 'leave')) {
    return 'smartPrefetching';
  }
  
  // Use dependency-based for complex relationships when accuracy is preferred
  if (preferAccuracy && participants && participants.length > 3) {
    return 'dependencyBased';
  }
  
  // Use tag-based for better organization when accuracy is preferred
  if (preferAccuracy && (isPublic || location)) {
    return 'tagBased';
  }
  
  // Use optimistic strategy for single-user operations when performance is preferred
  if (preferPerformance && (eventType === 'create' || eventType === 'update' || eventType === 'delete')) {
    return 'optimistic';
  }
  
  // Use cascading strategy for operations affecting many users
  if (participants && participants.length > 5) {
    return 'cascading';
  }
  
  // Use smart strategy for location-based operations
  if (location) {
    return 'smart';
  }
  
  // Use selective strategy for public events
  if (isPublic) {
    return 'selective';
  }
  
  // Default to targeted strategy
  return 'targeted';
};

/**
 * Advanced Cache Management Utilities
 */
export const cacheManagementUtils = {
  /**
   * Analyze cache state and recommend optimal strategy
   */
  analyzeCacheState: (queryClient: QueryClient, context: CacheInvalidationContext) => {
    const queries = queryClient.getQueryCache().getAll();
    const relatedQueries = queries.filter(query => {
      const queryKey = query.queryKey;
      return (
        (context.userId && queryKey.includes(context.userId)) ||
        (context.eventId && queryKey.includes(context.eventId)) ||
        (context.category && queryKey.includes(context.category))
      );
    });
    
    return {
      totalQueries: queries.length,
      relatedQueries: relatedQueries.length,
      staleQueries: relatedQueries.filter(q => q.isStale()).length,
      activeQueries: relatedQueries.filter(q => q.state.fetchStatus === 'fetching').length,
      recommendedStrategy: relatedQueries.length > 10 ? 'selective' : 'targeted',
    };
  },
  
  /**
   * Batch invalidation operations to reduce overhead
   */
  batchInvalidate: async (queryClient: QueryClient, operations: Array<{
    strategy: keyof typeof invalidationStrategies;
    context: CacheInvalidationContext;
  }>) => {
    const startTime = performance.now();
    
    // Group operations by strategy
    const groupedOperations = operations.reduce((acc, op) => {
      if (!acc[op.strategy]) {
        acc[op.strategy] = [];
      }
      acc[op.strategy].push(op.context);
      return acc;
    }, {} as Record<string, CacheInvalidationContext[]>);
    
    // Execute grouped operations
    const promises = Object.entries(groupedOperations).map(async ([strategyName, contexts]) => {
      for (const context of contexts) {
        await executeInvalidationStrategy(strategyName as keyof typeof invalidationStrategies, queryClient, context);
      }
    });
    
    await Promise.all(promises);
    
    const duration = performance.now() - startTime;
    console.log(`✅ Batch invalidation completed ${operations.length} operations in ${duration.toFixed(2)}ms`);
  },
  
  /**
   * Monitor cache performance and suggest optimizations
   */
  monitorCachePerformance: (queryClient: QueryClient) => {
    const queries = queryClient.getQueryCache().getAll();
    const mutations = queryClient.getMutationCache().getAll();
    
    const cacheStats = {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      activeQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      totalMutations: mutations.length,
      activeMutations: mutations.filter(m => m.state.status === 'pending').length,
      errorMutations: mutations.filter(m => m.state.status === 'error').length,
    };
    
    const recommendations = [];
    
    if (cacheStats.staleQueries > cacheStats.totalQueries * 0.3) {
      recommendations.push('Consider enabling cache warming for frequently accessed data');
    }
    
    if (cacheStats.activeQueries > 10) {
      recommendations.push('High number of active queries - consider request debouncing');
    }
    
    if (cacheStats.errorQueries > 5) {
      recommendations.push('High error rate - review error handling and retry strategies');
    }
    
    return { cacheStats, recommendations };
  },
};

/**
 * Development helpers
 */
if (__DEV__) {
  (global as any).__CACHE_INVALIDATION_STRATEGIES__ = {
    strategies: invalidationStrategies,
    execute: executeInvalidationStrategy,
    selectOptimal: selectOptimalStrategy,
    utils: cacheManagementUtils,
    
    // Test helpers
    testStrategy: async (strategyName: keyof typeof invalidationStrategies, context: CacheInvalidationContext) => {
      const mockQueryClient = {
        invalidateQueries: ({ queryKey }: { queryKey: any }) => {
          console.log('Mock invalidation:', queryKey);
          return Promise.resolve();
        },
        getQueryData: () => null,
        refetchQueries: ({ queryKey }: { queryKey: any }) => {
          console.log('Mock refetch:', queryKey);
          return Promise.resolve();
        },
        prefetchQuery: ({ queryKey }: { queryKey: any }) => {
          console.log('Mock prefetch:', queryKey);
          return Promise.resolve();
        },
        getQueryCache: () => ({
          getAll: () => [],
          subscribe: () => () => {},
        }),
        getMutationCache: () => ({
          getAll: () => [],
          subscribe: () => () => {},
        }),
      } as any;
      
      await executeInvalidationStrategy(strategyName, mockQueryClient, context);
    },
    
    // Performance testing
    benchmarkStrategies: async (context: CacheInvalidationContext) => {
      const results: Record<string, { duration: number; success: boolean; error?: string }> = {};
      
      for (const [name, strategy] of Object.entries(invalidationStrategies)) {
        const startTime = performance.now();
        try {
          await (global as any).__CACHE_INVALIDATION_STRATEGIES__.testStrategy(name, context);
          results[name] = {
            duration: performance.now() - startTime,
            success: true,
          };
        } catch (error) {
          results[name] = {
            duration: performance.now() - startTime,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
      
      console.table(results);
      return results;
    },
  };
}