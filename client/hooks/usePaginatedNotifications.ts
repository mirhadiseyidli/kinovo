import { useState, useCallback, useRef, useEffect } from 'react';
import api from '@/utils/api';
import { NotificationData } from '@/types/allTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const CACHED_NOTIFICATIONS_KEY = 'cached_notifications';
const CACHE_SIZE = 10; // Cache top 10 notifications

export const usePaginatedNotifications = (initialLimit: number = 5) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 0,
    limit: initialLimit,
    total: 0,
    pages: 0
  });
  const [hasMoreData, setHasMoreData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCachedData, setHasCachedData] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Keep track of current page to prevent duplicate requests
  const currentPageRef = useRef(0);
  const loadingRef = useRef(false);

  // Load cached notifications on hook initialization
  useEffect(() => {
    loadCachedNotifications();
  }, []);

  const loadCachedNotifications = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHED_NOTIFICATIONS_KEY);
      if (cachedData) {
        const cached = JSON.parse(cachedData);
        if (Array.isArray(cached) && cached.length > 0) {
          setNotifications(cached);
          setHasCachedData(true);
          setIsFirstLoad(false);
        }
      }
    } catch (error) {
      console.warn('Error loading cached notifications:', error);
    }
  }, []);

  const saveCachedNotifications = useCallback(async (notificationsToCache: NotificationData[]) => {
    try {
      // Only cache the top CACHE_SIZE notifications
      const topNotifications = notificationsToCache.slice(0, CACHE_SIZE);
      await AsyncStorage.setItem(CACHED_NOTIFICATIONS_KEY, JSON.stringify(topNotifications));
    } catch (error) {
      console.warn('Error saving cached notifications:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async (page: number = 1, reset: boolean = false) => {
    // Prevent duplicate requests
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setError(null);

      if (reset) {
        // Only show loading spinner if it's the very first load (no cached data)
        if (isFirstLoad && !hasCachedData) {
          setLoading(true);
        }
        currentPageRef.current = 0;
        setHasMoreData(true);
      } else if (page > 1) {
        setLoadingMore(true);
      } else {
        // Only show loading spinner if it's the very first load (no cached data)
        if (isFirstLoad && !hasCachedData) {
          setLoading(true);
        }
      }

      const response = await api.get('/api/notifications', {
        params: {
          page,
          limit: initialLimit
        }
      });

      const newNotifications = response.data.notifications || [];
      const paginationInfo = response.data.pagination;

      if (reset || page === 1) {
        setNotifications(newNotifications);
        // Cache the fresh data
        saveCachedNotifications(newNotifications);
      } else {
        // Append new notifications, avoiding duplicates
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n._id));
          const uniqueNewNotifications = newNotifications.filter((n: NotificationData) => !existingIds.has(n._id));
          const updatedNotifications = [...prev, ...uniqueNewNotifications];
          // Update cache with the latest data (only first page for cache)
          if (currentPageRef.current === 0) {
            saveCachedNotifications(updatedNotifications);
          }
          return updatedNotifications;
        });
      }

      setPagination(paginationInfo);
      currentPageRef.current = page;
      setHasMoreData(page < paginationInfo.pages);
      setIsFirstLoad(false);

    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [initialLimit, isFirstLoad, hasCachedData, saveCachedNotifications]);

  const loadInitialNotifications = useCallback(() => {
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  const loadMoreNotifications = useCallback(() => {
    if (!hasMoreData || loadingRef.current || loadingMore) return;
    
    const nextPage = currentPageRef.current + 1;
    fetchNotifications(nextPage, false);
  }, [hasMoreData, loadingMore, fetchNotifications]);

  const refreshNotifications = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(1, true);
  }, [fetchNotifications]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.put('/api/notifications/mark-seen', {
        notificationIds: [notificationId]
      });

      // Update local state
      setNotifications(prev => {
        const updated = prev.map(n => n._id === notificationId ? { ...n, is_seen: true } : n);
        // Update cache if this affects cached notifications
        if (updated.length <= CACHE_SIZE) {
          saveCachedNotifications(updated);
        }
        return updated;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [saveCachedNotifications]);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await api.put('/api/notifications/mark-seen', {});

      // Update local state
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, is_seen: true }));
        // Update cache
        saveCachedNotifications(updated);
        return updated;
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [saveCachedNotifications]);

  return {
    notifications,
    loading: loading && isFirstLoad && !hasCachedData, // Only show loading on first load without cached data
    refreshing,
    loadingMore,
    pagination,
    hasMoreData,
    error,
    hasCachedData,
    isFirstLoad,
    loadInitialNotifications,
    loadMoreNotifications,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
  };
}; 