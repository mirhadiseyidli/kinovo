import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Event, ApiError } from '@/types/allTypes';
import api from '@/utils/api';

export const usePaginatedNearbyEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const fetchNearbyEvents = useCallback(async (
    lat: number | null, 
    lng: number | null, 
    distance: number = 50, 
    pageNum: number = 0, 
    isRefresh: boolean = false
  ) => {
    if (!lat || !lng) return [];

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    const isLoadingMore = pageNum > 0;
    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    setError(null);

    try {
      // First page loads 6 events, subsequent pages load 5
      const limit = pageNum === 0 ? 6 : 5;
      const skip = pageNum === 0 ? 0 : 6 + (pageNum - 1) * 5;
      
      const response = await api.get(
        `/api/manageevents/eventslist/get/nearby/events?lat=${lat}&lng=${lng}&distance=${distance}&limit=${limit}&skip=${skip}`,
        { signal: abortControllerRef.current.signal }
      );
      
      const fetchedEvents = response.data.events || [];
      
      if (mountedRef.current) {
        if (isRefresh || pageNum === 0) {
          setEvents(fetchedEvents);
          setPage(0);
        } else {
          setEvents(prev => [...prev, ...fetchedEvents]);
        }
        
        // Check if there are more events to load
        setHasMore(fetchedEvents.length === limit);
        setPage(pageNum);
        setIsFirstFetch(false);
      }
      
      return fetchedEvents;
    } catch (error) {
      const err = error as ApiError;
      
      // Don't show error for aborted requests
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return [];
      }
      
      console.error('Failed to fetch paginated nearby events:', err.message);
      if (mountedRef.current) {
        setError(err.message);
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  const loadMore = useCallback(async (lat: number | null, lng: number | null, distance: number = 50) => {
    if (!hasMore || loadingMore) return;
    
    const nextPage = page + 1;
    await fetchNearbyEvents(lat, lng, distance, nextPage, false);
  }, [fetchNearbyEvents, hasMore, loadingMore, page]);

  const refresh = useCallback(async (lat: number | null, lng: number | null, distance: number = 50) => {
    setPage(0);
    setHasMore(true);
    await fetchNearbyEvents(lat, lng, distance, 0, true);
  }, [fetchNearbyEvents]);

  const reset = useCallback(() => {
    setEvents([]);
    setLoading(false);
    setLoadingMore(false);
    setHasMore(true);
    setPage(0);
    setError(null);
    setIsFirstFetch(true);
  }, []);

  return {
    events,
    loading,
    loadingMore,
    hasMore,
    error,
    isFirstFetch,
    fetchNearbyEvents,
    loadMore,
    refresh,
    reset
  };
}; 