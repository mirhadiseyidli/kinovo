import { useState, useCallback, useRef } from 'react';
import api from '@/utils/api';
import { NotificationData } from '@/types/allTypes';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

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

  // Keep track of current page to prevent duplicate requests
  const currentPageRef = useRef(0);
  const loadingRef = useRef(false);

  const fetchNotifications = useCallback(async (page: number = 1, reset: boolean = false) => {
    // Prevent duplicate requests
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setError(null);

      if (reset) {
        setLoading(true);
        setNotifications([]);
        currentPageRef.current = 0;
        setHasMoreData(true);
      } else if (page > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
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
      } else {
        // Append new notifications, avoiding duplicates
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n._id));
          const uniqueNewNotifications = newNotifications.filter((n: NotificationData) => !existingIds.has(n._id));
          return [...prev, ...uniqueNewNotifications];
        });
      }

      setPagination(paginationInfo);
      currentPageRef.current = page;
      setHasMoreData(page < paginationInfo.pages);

    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [initialLimit]);

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
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, is_seen: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await api.put('/api/notifications/mark-seen', {});

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_seen: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  return {
    notifications,
    loading,
    refreshing,
    loadingMore,
    pagination,
    hasMoreData,
    error,
    loadInitialNotifications,
    loadMoreNotifications,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
  };
}; 