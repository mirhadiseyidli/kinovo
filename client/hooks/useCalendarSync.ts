import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import CalendarSyncService from '@/services/CalendarSyncService';
import { Event } from '@/types/allTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/utils/api';

interface SyncResult {
  success: boolean;
  calendarEventId?: string;
  error?: string;
}

export const useCalendarSync = () => {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  useEffect(() => {
    // Load sync preferences
    loadSyncPreferences();
  }, []);

  const loadSyncPreferences = async () => {
    try {
      const enabled = await AsyncStorage.getItem('calendarSyncEnabled');
      setSyncEnabled(enabled === 'true');
      
      if (enabled === 'true') {
        // Initialize service on load if enabled
        await CalendarSyncService.initialize();
      }
    } catch (error) {
      console.error('Failed to load sync preferences:', error);
    }
  };

  const enableSync = async (): Promise<boolean> => {
    try {
      // Check permissions first
      const hasPermission = await CalendarSyncService.checkPermissions();
      
      if (!hasPermission) {
        const granted = await CalendarSyncService.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Calendar Permission Required',
            'Please enable calendar access in settings to sync your events.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }

      // Initialize service
      const initialized = await CalendarSyncService.initialize();
      if (!initialized) {
        Alert.alert(
          'Calendar Setup Failed',
          'Unable to setup calendar sync. Please try again.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Save preference
      await AsyncStorage.setItem('calendarSyncEnabled', 'true');
      setSyncEnabled(true);
      return true;
    } catch (error) {
      console.error('Failed to enable sync:', error);
      return false;
    }
  };

  const disableSync = async () => {
    await AsyncStorage.setItem('calendarSyncEnabled', 'false');
    setSyncEnabled(false);
  };

  const syncEventToCalendar = useCallback(async (event: Event): Promise<SyncResult> => {
    if (!syncEnabled || !event.calendarSyncEnabled) {
      return { success: false, error: 'Sync not enabled' };
    }

    setSyncing(true);
    setLastSyncError(null);

    try {
      const result = await CalendarSyncService.syncEvent(event);
      
      if (result.success && result.calendarEventId) {
        // Update event with calendar ID in backend
        await api.put(`/api/manageevents/eventslist/update/${event._id}`, {
          iosCalendarEventId: result.calendarEventId,
          lastSyncedAt: new Date(),
        });
      }

      if (!result.success) {
        setLastSyncError(result.error || 'Sync failed');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastSyncError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setSyncing(false);
    }
  }, [syncEnabled]);

  const deleteEventFromCalendar = useCallback(async (event: Event): Promise<boolean> => {
    if (!syncEnabled || !event.iosCalendarEventId) {
      return true; // Not synced, so consider it success
    }

    setSyncing(true);
    setLastSyncError(null);

    try {
      const result = await CalendarSyncService.deleteEvent(event.iosCalendarEventId);
      
      if (!result.success) {
        setLastSyncError(result.error || 'Delete failed');
      }

      return result.success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastSyncError(errorMessage);
      return false;
    } finally {
      setSyncing(false);
    }
  }, [syncEnabled]);

  const syncMultipleEvents = useCallback(async (events: Event[]): Promise<void> => {
    if (!syncEnabled) return;

    setSyncing(true);
    setLastSyncError(null);

    let successCount = 0;
    let failCount = 0;

    for (const event of events) {
      if (event.calendarSyncEnabled) {
        const result = await syncEventToCalendar(event);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }

    setSyncing(false);

    if (failCount > 0) {
      Alert.alert(
        'Sync Complete',
        `Synced ${successCount} events. ${failCount} failed.`,
        [{ text: 'OK' }]
      );
    }
  }, [syncEnabled, syncEventToCalendar]);

  const syncAllExistingEvents = useCallback(async (): Promise<void> => {
    if (!syncEnabled) {
      Alert.alert('Calendar Sync Disabled', 'Please enable calendar sync first.');
      return;
    }

    try {
      setSyncing(true);
      setLastSyncError(null);

      // Fetch all user events that need syncing
      const response = await api.get('/api/manageevents/eventslist/get/my/upcoming/events');
      const allEvents = response.data.events || [];
      
      // Filter events that should be synced but aren't yet
      const eventsToSync = allEvents.filter((event: Event) => 
        event.calendarSyncEnabled && !event.iosCalendarEventId
      );

      if (eventsToSync.length === 0) {
        Alert.alert('All Synced', 'All your events are already synced to calendar.');
        setSyncing(false);
        return;
      }

      Alert.alert(
        'Sync Existing Events',
        `Found ${eventsToSync.length} events to sync. This may take a moment.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setSyncing(false) },
          { text: 'Sync All', onPress: () => performBulkSync(eventsToSync) }
        ]
      );

    } catch (error) {
      console.error('Failed to fetch events for bulk sync:', error);
      setLastSyncError('Failed to fetch events');
      Alert.alert('Error', 'Failed to fetch events for syncing.');
      setSyncing(false);
    }
  }, [syncEnabled]);

  const performBulkSync = useCallback(async (events: Event[]) => {
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const event of events) {
      try {
        const result = await syncEventToCalendar(event);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          if (result.error) {
            errors.push(`${event.title}: ${result.error}`);
          }
        }
      } catch (error) {
        failCount++;
        errors.push(`${event.title}: Sync failed`);
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setSyncing(false);

    // Show results
    if (successCount > 0 && failCount === 0) {
      Alert.alert(
        'Sync Complete',
        `Successfully synced ${successCount} events to calendar!`,
        [{ text: 'OK' }]
      );
    } else if (successCount > 0 && failCount > 0) {
      Alert.alert(
        'Sync Complete',
        `Synced ${successCount} events successfully. ${failCount} failed.\n\nErrors:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Sync Failed',
        `Failed to sync events.\n\nErrors:\n${errors.slice(0, 3).join('\n')}`,
        [{ text: 'OK' }]
      );
    }
  }, [syncEventToCalendar]);

  return {
    syncEnabled,
    enableSync,
    disableSync,
    syncing,
    lastSyncError,
    syncEventToCalendar,
    deleteEventFromCalendar,
    syncMultipleEvents,
    syncAllExistingEvents,
  };
};