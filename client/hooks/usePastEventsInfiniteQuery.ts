import React, { useCallback } from 'react';
import { useInfiniteEventsQuery } from './useInfiniteEventsQuery';
import type { DateFilter } from '@/components/Home/EventFilters';

/**
 * Infinite query hook for past events with pagination and month/year filtering
 * 
 * This hook extends useInfiniteEventsQuery specifically for past events and includes:
 * - Pagination support with infinite scroll
 * - Month/year filtering that works with backend
 * - Backward compatibility with existing DateFilter interface
 * - Performance optimizations for large datasets
 */

export interface UsePastEventsInfiniteOptions {
  // Filtering options
  dateFilter?: DateFilter;
  
  // Pagination settings
  pageSize?: number;
  
  // React Query options
  enabled?: boolean;
  staleTime?: number;
  keepPreviousData?: boolean;
  
  // UI options
  enableSmooth?: boolean;
  
  // Callbacks
  onFinishRefresh?: () => void;
  contextRefreshing?: boolean;
}

/**
 * Convert DateFilter to year/month parameters for the backend
 */
const convertDateFilterToParams = (dateFilter?: DateFilter) => {
  if (!dateFilter || dateFilter.type === 'all' || !dateFilter.date) {
    return { year: undefined, month: undefined };
  }

  const filterDate = dateFilter.date;
  
  switch (dateFilter.type) {
    case 'year':
      return { 
        year: filterDate.getFullYear(), 
        month: undefined 
      };
    case 'month':
      return { 
        year: filterDate.getFullYear(), 
        month: filterDate.getMonth() // 0-11 format for backend
      };
    default:
      return { year: undefined, month: undefined };
  }
};

export const usePastEventsInfiniteQuery = (options: UsePastEventsInfiniteOptions = {}) => {
  const {
    dateFilter,
    pageSize = 5,
    enabled = true,
    enableSmooth = true,
    onFinishRefresh,
    contextRefreshing
  } = options;

  // Convert date filter to backend parameters
  const { year, month } = convertDateFilterToParams(dateFilter);

  // Use the base infinite events query
  const query = useInfiniteEventsQuery({
    eventType: 'past',
    year,
    month,
    pageSize,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    keepPreviousData: false, // Don't keep previous data
    enableSmooth
  });

  // Handle refresh callback
  const handleRefresh = useCallback(async () => {
    try {
      await query.refetch();
    } finally {
      if (onFinishRefresh) {
        onFinishRefresh();
      }
    }
  }, [query.refetch, onFinishRefresh]);

  // Trigger refresh when contextRefreshing changes
  React.useEffect(() => {
    if (contextRefreshing) {
      handleRefresh();
    }
  }, [contextRefreshing, handleRefresh]);

  return {
    // Data
    events: query.events,
    
    // Loading states
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefetching: query.isRefetching,
    
    // Error states
    isError: query.isError,
    error: query.error,
    
    // Pagination
    hasMore: query.hasMore,
    totalCount: query.totalCount,
    totalPages: query.totalPages,
    
    // Actions
    loadMore: query.loadMore,
    refetch: query.refetch,
    refresh: handleRefresh,
    
    // Query metadata
    dataUpdatedAt: query.dataUpdatedAt,
    
    // Legacy compatibility - return events in past_events format
    past_events: query.events,
    
    // Filter information for debugging
    activeFilters: { year, month, dateFilter },
  };
};

export default usePastEventsInfiniteQuery;