import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '@/utils/api';

interface NotificationPreferences {
  friend_request_accepted: boolean;
  event_reminder: boolean;
  event_updated: boolean;
  new_event_nearby: boolean;
  event_attendance_confirmed: boolean;
  new_event_from_friend: boolean;
  event_invitation: boolean;
  someone_from_contacts_joined: boolean;
}

interface AllNotificationPreferences {
  inApp: NotificationPreferences;
  email: NotificationPreferences;
  push: NotificationPreferences;
}

type NotificationChannel = 'inApp' | 'email' | 'push';

const defaultPreferences: AllNotificationPreferences = {
  inApp: {
    friend_request_accepted: true,
    event_reminder: true,
    event_updated: true,
    new_event_nearby: true,
    event_attendance_confirmed: true,
    new_event_from_friend: true,
    event_invitation: true,
    someone_from_contacts_joined: true,
  },
  email: {
    friend_request_accepted: false,
    event_reminder: true,
    event_updated: false,
    new_event_nearby: false,
    event_attendance_confirmed: false,
    new_event_from_friend: false,
    event_invitation: false,
    someone_from_contacts_joined: false,
  },

  push: {
    friend_request_accepted: true,
    event_reminder: true,
    event_updated: true,
    new_event_nearby: true,
    event_attendance_confirmed: true,
    new_event_from_friend: true,
    event_invitation: true,
    someone_from_contacts_joined: true,
  },
};

// Global cache for preferences to avoid re-fetching
let cachedPreferences: AllNotificationPreferences | null = null;
let isInitialLoad = true;

export const useNotificationPreferences = (channel?: NotificationChannel) => {
  const [loading, setLoading] = useState(isInitialLoad);
  const [refreshing, setRefreshing] = useState(false);
  const [allPreferences, setAllPreferences] = useState<AllNotificationPreferences>(
    cachedPreferences || defaultPreferences
  );
  const hasLoadedRef = useRef(!isInitialLoad);

  // Get preferences for specific channel or all preferences
  const preferences = channel ? allPreferences[channel] : allPreferences;

  const loadPreferences = useCallback(async () => {
    try {
      const response = await api.get('/api/notifications/preferences');
      if (response.data.success && response.data.preferences) {
        const newPreferences = {
          ...defaultPreferences,
          ...response.data.preferences
        };
        setAllPreferences(newPreferences);
        cachedPreferences = newPreferences;
        hasLoadedRef.current = true;
        isInitialLoad = false;
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      // Keep default preferences if loading fails
    } finally {
      setLoading(false);
    }
  }, []);

  const saveChannelPreferences = useCallback(async (
    targetChannel: NotificationChannel,
    newChannelPreferences: NotificationPreferences
  ) => {
    try {
      // Update local state immediately for responsiveness
      const updatedPreferences = {
        ...allPreferences,
        [targetChannel]: newChannelPreferences
      };
      setAllPreferences(updatedPreferences);
      cachedPreferences = updatedPreferences;

      // Save to backend
      await api.put('/api/notifications/preferences', {
        preferences: updatedPreferences
      });
    } catch (error) {
      console.error(`Error saving ${targetChannel} notification preferences:`, error);
      // Revert local state on error
      setAllPreferences(allPreferences);
      cachedPreferences = allPreferences;
    }
  }, [allPreferences]);

  const saveAllPreferences = useCallback(async (newPreferences: AllNotificationPreferences) => {
    try {
      setAllPreferences(newPreferences);
      cachedPreferences = newPreferences;
      await api.put('/api/notifications/preferences', {
        preferences: newPreferences
      });
    } catch (error) {
      console.error('Error saving all notification preferences:', error);
      // Revert local state on error
      setAllPreferences(allPreferences);
      cachedPreferences = allPreferences;
    }
  }, [allPreferences]);

  const togglePreference = useCallback(async (
    notificationType: keyof NotificationPreferences,
    targetChannel?: NotificationChannel
  ) => {
    const channelToUpdate = targetChannel || channel;
    if (!channelToUpdate) {
      console.error('No channel specified for toggle preference');
      return;
    }

    const currentChannelPrefs = allPreferences[channelToUpdate];
    const newChannelPrefs = {
      ...currentChannelPrefs,
      [notificationType]: !currentChannelPrefs[notificationType]
    };

    await saveChannelPreferences(channelToUpdate, newChannelPrefs);
  }, [channel, allPreferences, saveChannelPreferences]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPreferences();
    } finally {
      setRefreshing(false);
    }
  }, [loadPreferences]);

  // Auto-load preferences only on first use
  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current) {
        loadPreferences();
      }
    }, [loadPreferences])
  );

  return {
    preferences,
    allPreferences,
    loading,
    refreshing,
    loadPreferences,
    saveChannelPreferences,
    saveAllPreferences,
    togglePreference,
    onRefresh,
  };
}; 