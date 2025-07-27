
/**
 * Stable Query Key Utilities
 * 
 * This module provides utilities for creating stable query keys that prevent
 * unnecessary re-renders due to object parameter recreation. It leverages
 * TanStack Query v5's built-in hashQueryKey functionality.
 */

/**
 * Simple hash function for query keys
 * Since hashQueryKey is no longer available in React Query v5
 */
const simpleHash = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

/**
 * Creates a stable query key using simple JSON serialization and hashing
 * This prevents unnecessary re-renders when object parameters are recreated
 * but have the same values.
 * 
 * @param queryKey - The query key to hash
 * @returns A stable hash that can be used for query deduplication
 */
export const createStableQueryKey = <T extends readonly unknown[] = readonly unknown[]>(
  queryKey: T
): string => {
  try {
    const serialized = JSON.stringify(queryKey, (_key, value) => {
      // Handle special cases for consistent serialization
      if (typeof value === 'function') {
        return value.toString();
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
    return simpleHash(serialized);
  } catch (error) {
    console.warn('Failed to hash query key, falling back to string representation:', error);
    return simpleHash(String(queryKey));
  }
};

/**
 * Creates a stable query key for object parameters
 * This is particularly useful when passing objects as query parameters
 * that might be recreated on every render.
 * 
 * @param baseKey - The base query key
 * @param params - Object parameters to include in the key
 * @returns A stable query key with hashed parameters
 */
export const createStableQueryKeyWithParams = <T extends Record<string, unknown>>(
  baseKey: readonly string[],
  params: T
): readonly unknown[] => {
  // Sort object keys to ensure consistent hashing
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, unknown>);

  return [...baseKey, sortedParams] as const;
};

/**
 * Creates a stable query key for location-based queries
 * This handles floating point precision issues in coordinates
 * 
 * @param baseKey - The base query key
 * @param lat - Latitude
 * @param lng - Longitude
 * @param additionalParams - Additional parameters
 * @returns A stable query key with normalized coordinates
 */
export const createStableLocationQueryKey = (
  baseKey: readonly string[],
  lat: number,
  lng: number,
  additionalParams?: Record<string, unknown>
): readonly unknown[] => {
  // Normalize coordinates to prevent floating point precision issues
  const normalizedLat = Math.round(lat * 1000000) / 1000000; // 6 decimal places
  const normalizedLng = Math.round(lng * 1000000) / 1000000; // 6 decimal places
  
  const params = {
    lat: normalizedLat,
    lng: normalizedLng,
    ...additionalParams
  };

  return createStableQueryKeyWithParams(baseKey, params);
};

/**
 * Creates a stable query key for time-based queries
 * This handles Date objects and timestamps consistently
 * 
 * @param baseKey - The base query key
 * @param date - Date object or timestamp
 * @param additionalParams - Additional parameters
 * @returns A stable query key with normalized date
 */
export const createStableTimeQueryKey = (
  baseKey: readonly string[],
  date: Date | number,
  additionalParams?: Record<string, unknown>
): readonly unknown[] => {
  // Normalize date to timestamp for consistent hashing
  const timestamp = date instanceof Date ? date.getTime() : date;
  
  const params = {
    timestamp,
    ...additionalParams
  };

  return createStableQueryKeyWithParams(baseKey, params);
};

/**
 * Utility to compare query keys for equality
 * This is useful for debugging and testing
 * 
 * @param keyA - First query key
 * @param keyB - Second query key
 * @returns True if keys are equivalent
 */
export const queryKeysEqual = (
  keyA: readonly unknown[],
  keyB: readonly unknown[]
): boolean => {
  try {
    return createStableQueryKey(keyA) === createStableQueryKey(keyB);
  } catch (error) {
    console.warn('Failed to compare query keys, falling back to JSON comparison:', error);
    return JSON.stringify(keyA) === JSON.stringify(keyB);
  }
};

/**
 * Utility to check if a query key is stable
 * This helps identify potential performance issues
 * 
 * @param queryKey - The query key to check
 * @returns True if the key appears to be stable
 */
export const isStableQueryKey = (queryKey: readonly unknown[]): boolean => {
  // Check for common unstable patterns
  for (const part of queryKey) {
    // Check for plain objects (potential instability)
    if (typeof part === 'object' && part !== null && !Array.isArray(part)) {
      // Check if object has methods (likely unstable)
      if (Object.getOwnPropertyNames(part).some(prop => 
        typeof (part as any)[prop] === 'function'
      )) {
        return false;
      }
    }
    
    // Check for functions (definitely unstable)
    if (typeof part === 'function') {
      return false;
    }
  }
  
  return true;
};

/**
 * Development helper to log query key stability warnings
 * Only runs in development mode
 * 
 * @param queryKey - The query key to check
 * @param context - Context for the warning (e.g., hook name)
 */
export const warnIfUnstableQueryKey = (
  queryKey: readonly unknown[],
  context: string
): void => {
  if (__DEV__ && !isStableQueryKey(queryKey)) {
    console.warn(
      `Potentially unstable query key detected in ${context}:`,
      queryKey,
      'Consider using stable query key helpers to prevent unnecessary re-renders.'
    );
  }
};