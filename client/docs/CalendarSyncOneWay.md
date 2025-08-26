# One-Directional Calendar Sync (Kinovo → iOS)

## Overview

This document provides a streamlined implementation guide for one-directional sync from Kinovo events to iOS Calendar. This approach eliminates complex conflict resolution and delivers immediate value with minimal complexity.

**Estimated Implementation Time: 2-3 days**  
**Difficulty: 2/10**

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Implementation Plan](#implementation-plan)
3. [Code Implementation](#code-implementation)
4. [User Interface](#user-interface)
5. [Testing](#testing)
6. [Deployment](#deployment)

---

## Architecture Overview

### Simple Data Flow

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Kinovo App    │────────►│  Sync Service   │────────►│  iOS Calendar   │
│                 │         │                 │         │                 │
│ • Create Event  │         │ • Map Fields    │         │ • Display Event │
│ • Update Event  │         │ • Handle Errors │         │ • iOS Reminders │
│ • Delete Event  │         │ • Track IDs     │         │ • System UI     │
└─────────────────┘         └─────────────────┘         └─────────────────┘

        User Action              Process                    Result
```

### Key Principles

✅ **Simple:** One-way data flow only  
✅ **Immediate:** Sync on user action  
✅ **Transparent:** Clear success/failure feedback  
✅ **Optional:** User can enable/disable per event  

---

## Implementation Plan

### Day 1: Core Sync Implementation (4-6 hours)

1. Schema updates
2. Basic sync service
3. Event mapper
4. Hook integration

### Day 2: Error Handling & Polish (4-6 hours)

1. Error recovery
2. Retry logic
3. User notifications
4. Settings integration

### Day 3: Testing & UI (4-6 hours)

1. Unit tests
2. Integration tests
3. UI components
4. Documentation

---

## Code Implementation

### Step 1: Schema Updates

#### 1.1 Update Event Type
```bash
# File: client/types/allTypes.ts
```

Add these minimal fields to the existing Event interface:

```typescript
export interface Event {
  // ... existing fields
  
  // iOS Calendar Sync Fields (minimal)
  iosCalendarEventId?: string | null;
  calendarSyncEnabled?: boolean;
  lastSyncedAt?: Date | null;
}
```

#### 1.2 Update User Preferences
```bash
# File: client/types/allTypes.ts
```

```typescript
export interface UserCalendarPreferences {
  calendarSyncEnabled: boolean;
  defaultCalendarId?: string | null;
  syncNewEventsByDefault: boolean;
}
```

### Step 2: Create Calendar Sync Service

#### 2.1 Base Service
```bash
# File: client/services/CalendarSyncService.ts
```

```typescript
import * as Calendar from 'expo-calendar';
import { Event } from '@/types/allTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

class CalendarSyncService {
  private static instance: CalendarSyncService;
  private defaultCalendarId: string | null = null;
  private isInitialized: boolean = false;

  static getInstance(): CalendarSyncService {
    if (!CalendarSyncService.instance) {
      CalendarSyncService.instance = new CalendarSyncService();
    }
    return CalendarSyncService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Check permissions
      const { status } = await Calendar.getCalendarPermissionsAsync();
      if (status !== 'granted') {
        return false;
      }

      // Get or create default calendar
      await this.setupDefaultCalendar();
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Calendar initialization failed:', error);
      return false;
    }
  }

  private async setupDefaultCalendar(): Promise<void> {
    // Check stored default calendar
    const storedCalendarId = await AsyncStorage.getItem('defaultCalendarId');
    
    if (storedCalendarId) {
      // Verify it still exists
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const exists = calendars.some(cal => cal.id === storedCalendarId);
      
      if (exists) {
        this.defaultCalendarId = storedCalendarId;
        return;
      }
    }

    // Find or create Kinovo calendar
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    let kinovoCalendar = calendars.find(cal => cal.title === 'Kinovo Events');

    if (!kinovoCalendar) {
      // Get default calendar source (iCloud preferred)
      const defaultSource = await this.getDefaultCalendarSource();
      
      if (defaultSource) {
        const calendarId = await Calendar.createCalendarAsync({
          title: 'Kinovo Events',
          color: '#4CAF50',
          entityType: Calendar.EntityTypes.EVENT,
          sourceId: defaultSource.id,
          source: defaultSource,
          name: 'Kinovo Events',
          ownerAccount: 'Kinovo',
          accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
        
        this.defaultCalendarId = calendarId;
        await AsyncStorage.setItem('defaultCalendarId', calendarId);
      }
    } else {
      this.defaultCalendarId = kinovoCalendar.id;
      await AsyncStorage.setItem('defaultCalendarId', kinovoCalendar.id);
    }
  }

  private async getDefaultCalendarSource() {
    const sources = await Calendar.getSourcesAsync();
    
    // Prefer iCloud
    const iCloudSource = sources.find(source => 
      source.type === Calendar.SourceType.CALDAV && 
      source.name === 'iCloud'
    );
    if (iCloudSource) return iCloudSource;

    // Fallback to local
    const localSource = sources.find(source => 
      source.type === Calendar.SourceType.LOCAL
    );
    return localSource || sources[0];
  }

  async syncEvent(event: Event): Promise<{ success: boolean; calendarEventId?: string; error?: string }> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, error: 'Calendar not initialized' };
      }
    }

    try {
      const calendarEvent = this.mapEventToCalendar(event);
      
      if (event.iosCalendarEventId) {
        // Update existing event
        await Calendar.updateEventAsync(event.iosCalendarEventId, calendarEvent);
        return { success: true, calendarEventId: event.iosCalendarEventId };
      } else {
        // Create new event
        const calendarEventId = await Calendar.createEventAsync(
          this.defaultCalendarId!,
          calendarEvent
        );
        return { success: true, calendarEventId };
      }
    } catch (error) {
      console.error('Event sync failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async deleteEvent(iosCalendarEventId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, error: 'Calendar not initialized' };
      }
    }

    try {
      await Calendar.deleteEventAsync(iosCalendarEventId);
      return { success: true };
    } catch (error) {
      console.error('Event deletion failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private mapEventToCalendar(event: Event): Partial<Calendar.Event> {
    const calendarEvent: Partial<Calendar.Event> = {
      title: event.title || 'Untitled Event',
      startDate: event.start_time ? new Date(event.start_time) : new Date(),
      endDate: event.end_time ? new Date(event.end_time) : new Date(),
      location: event.location?.text || undefined,
      notes: this.buildEventNotes(event),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Handle all-day events
    if (this.isAllDayEvent(event)) {
      calendarEvent.allDay = true;
    }

    // Handle recurring events
    if (event.isRecurring && event.recurringPattern) {
      calendarEvent.recurrenceRule = this.buildRecurrenceRule(event.recurringPattern);
    }

    return calendarEvent;
  }

  private buildEventNotes(event: Event): string {
    let notes = '';
    
    if (event.description) {
      notes += event.description + '\n\n';
    }
    
    notes += '───────────────\n';
    notes += `📱 Created with Kinovo\n`;
    notes += `🔗 Event ID: ${event._id}\n`;
    
    if (event.category) {
      notes += `📂 Category: ${event.category}\n`;
    }
    
    if (event.capacity) {
      notes += `👥 Capacity: ${event.capacity}\n`;
    }

    return notes;
  }

  private isAllDayEvent(event: Event): boolean {
    if (!event.start_time || !event.end_time) return false;
    
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    
    // Check if times are at midnight
    return start.getHours() === 0 && 
           start.getMinutes() === 0 && 
           end.getHours() === 23 && 
           end.getMinutes() === 59;
  }

  private buildRecurrenceRule(pattern: any): Calendar.RecurrenceRule {
    const rule: Calendar.RecurrenceRule = {
      frequency: Calendar.RecurrenceFrequency.WEEKLY, // Default
    };

    if (pattern.frequency) {
      const frequencyMap: Record<string, Calendar.RecurrenceFrequency> = {
        'daily': Calendar.RecurrenceFrequency.DAILY,
        'weekly': Calendar.RecurrenceFrequency.WEEKLY,
        'monthly': Calendar.RecurrenceFrequency.MONTHLY,
        'yearly': Calendar.RecurrenceFrequency.YEARLY,
      };
      
      rule.frequency = frequencyMap[pattern.frequency] || Calendar.RecurrenceFrequency.WEEKLY;
    }

    if (pattern.interval) {
      rule.interval = pattern.interval;
    }

    if (pattern.endDate) {
      rule.endDate = new Date(pattern.endDate);
    }

    if (pattern.occurrences) {
      rule.occurrence = pattern.occurrences;
    }

    return rule;
  }

  async checkPermissions(): Promise<boolean> {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  }

  async requestPermissions(): Promise<boolean> {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  }
}

export default CalendarSyncService.getInstance();
```

### Step 3: Create Sync Hook

#### 3.1 Main Hook
```bash
# File: client/hooks/useCalendarSync.ts
```

```typescript
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
        await api.patch(`/events/${event._id}`, {
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

  return {
    syncEnabled,
    enableSync,
    disableSync,
    syncing,
    lastSyncError,
    syncEventToCalendar,
    deleteEventFromCalendar,
    syncMultipleEvents,
  };
};
```

### Step 4: Integrate with Event Mutations

#### 4.1 Update Event Mutations
```bash
# File: client/hooks/useNewEventMutations.ts
```

Add calendar sync to existing mutations:

```typescript
import { useCalendarSync } from './useCalendarSync';

// Add to your existing useNewEventMutations hook
export const useNewEventMutations = () => {
  const { syncEventToCalendar, deleteEventFromCalendar } = useCalendarSync();
  const queryClient = useQueryClient();
  const { user } = useAuthSession();

  // CREATE EVENT
  const createEvent = useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      const response = await api.post('/events', eventData);
      return response.data;
    },
    onSuccess: async (data) => {
      // Existing cache update logic
      handleEventResponse(data, user?._id);
      
      // New: Sync to calendar
      if (data.event && data.event.calendarSyncEnabled) {
        await syncEventToCalendar(data.event);
      }
    },
  });

  // UPDATE EVENT
  const updateEvent = useMutation({
    mutationFn: async ({ eventId, updates }: UpdateEventData) => {
      const response = await api.patch(`/events/${eventId}`, updates);
      return response.data;
    },
    onSuccess: async (data) => {
      // Existing cache update logic
      handleEventResponse(data, user?._id);
      
      // New: Sync updates to calendar
      if (data.event && data.event.calendarSyncEnabled) {
        await syncEventToCalendar(data.event);
      }
    },
  });

  // DELETE EVENT
  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      // Get event data first to check if it's synced
      const event = await api.get(`/events/${eventId}`);
      const response = await api.delete(`/events/${eventId}`);
      
      return { ...response.data, originalEvent: event.data };
    },
    onSuccess: async (data) => {
      // Existing cache update logic
      removeEventFromCache(data.eventId);
      
      // New: Remove from calendar
      if (data.originalEvent && data.originalEvent.iosCalendarEventId) {
        await deleteEventFromCalendar(data.originalEvent);
      }
    },
  });

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    // ... other mutations
  };
};
```

### Step 5: User Interface Components

#### 5.1 Calendar Sync Toggle
```bash
# File: client/components/Calendar/CalendarSyncToggle.tsx
```

```typescript
import React from 'react';
import { View, Switch, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface CalendarSyncToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const CalendarSyncToggle: React.FC<CalendarSyncToggleProps> = ({
  value,
  onValueChange,
  showLabel = true,
  size = 'medium',
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
  const fontSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 8,
      padding: size === 'small' ? 4 : 8,
    }}>
      <Feather 
        name="calendar" 
        size={iconSize} 
        color={value ? themeColors.mountainGreen : themeColors.placeholderTextColor} 
      />
      
      {showLabel && (
        <ThemedText style={{ fontSize, flex: 1 }}>
          Sync to Calendar
        </ThemedText>
      )}
      
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ 
          false: themeColors.border, 
          true: themeColors.mountainGreen 
        }}
        thumbColor={themeColors.text}
      />
    </View>
  );
};
```

#### 5.2 Sync Status Indicator
```bash
# File: client/components/Calendar/SyncStatusIndicator.tsx
```

```typescript
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface SyncStatusIndicatorProps {
  syncing: boolean;
  synced: boolean;
  error?: string | null;
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  syncing,
  synced,
  error,
  compact = false,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  if (syncing) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <ActivityIndicator size="small" color={themeColors.mountainGreen} />
        {!compact && <ThemedText style={{ fontSize: 12 }}>Syncing...</ThemedText>}
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Feather name="alert-circle" size={16} color="#FF4444" />
        {!compact && (
          <ThemedText style={{ fontSize: 12, color: '#FF4444' }}>
            Sync failed
          </ThemedText>
        )}
      </View>
    );
  }

  if (synced) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Feather name="check-circle" size={16} color={themeColors.mountainGreen} />
        {!compact && (
          <ThemedText style={{ fontSize: 12, color: themeColors.mountainGreen }}>
            Synced
          </ThemedText>
        )}
      </View>
    );
  }

  return null;
};
```

#### 5.3 Create Event Integration
```bash
# File: client/app/(auth)/(createEvent)/EventAttendeesAndOptions.tsx
```

Add calendar sync toggle to create event flow:

```typescript
import { CalendarSyncToggle } from '@/components/Calendar/CalendarSyncToggle';
import { useCalendarSync } from '@/hooks/useCalendarSync';

// In your component
const EventAttendeesAndOptions = () => {
  const { syncEnabled } = useCalendarSync();
  const [enableCalendarSync, setEnableCalendarSync] = useState(syncEnabled);

  // Add to your form data
  const handleCreateEvent = async () => {
    const eventData = {
      // ... existing event data
      calendarSyncEnabled: enableCalendarSync,
    };
    
    await createEvent.mutateAsync(eventData);
  };

  return (
    <ScrollView>
      {/* ... existing UI ... */}
      
      {/* Add calendar sync option */}
      {syncEnabled && (
        <ThemedView style={{ marginVertical: 16 }}>
          <CalendarSyncToggle
            value={enableCalendarSync}
            onValueChange={setEnableCalendarSync}
          />
          <ThemedText style={{ 
            fontSize: 12, 
            color: themeColors.placeholderTextColor,
            marginTop: 4,
            marginLeft: 28 
          }}>
            Add this event to your iOS Calendar
          </ThemedText>
        </ThemedView>
      )}
      
      {/* ... rest of UI ... */}
    </ScrollView>
  );
};
```

#### 5.4 Settings Page Update
```bash
# File: client/app/(auth)/(profileSections)/calendarPermissions.tsx
```

Update existing calendar permissions page:

```typescript
import React, { useState, useEffect } from 'react';
import { ScrollView, Switch, View, Alert, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { SyncStatusIndicator } from '@/components/Calendar/SyncStatusIndicator';
import * as Linking from 'expo-linking';

const CalendarPermissions = () => {
  const {
    syncEnabled,
    enableSync,
    disableSync,
    syncing,
    lastSyncError,
    syncMultipleEvents,
  } = useCalendarSync();

  const [loading, setLoading] = useState(false);

  const handleToggleSync = async (value: boolean) => {
    setLoading(true);
    
    if (value) {
      const success = await enableSync();
      if (!success) {
        // Permission denied or setup failed
        Alert.alert(
          'Setup Failed',
          'Unable to enable calendar sync. Please check your permissions.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } else {
      await disableSync();
    }
    
    setLoading(false);
  };

  const handleSyncAllEvents = async () => {
    Alert.alert(
      'Sync All Events',
      'This will sync all your events to iOS Calendar. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync All',
          onPress: async () => {
            // Fetch user's events and sync them
            const events = await fetchUserEvents();
            await syncMultipleEvents(events);
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          title: 'Calendar Sync',
          headerRight: () => (
            <SyncStatusIndicator
              syncing={syncing}
              synced={syncEnabled && !lastSyncError}
              error={lastSyncError}
              compact
            />
          )
        }} 
      />
      
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Main Toggle */}
        <View style={{ 
          backgroundColor: themeColors.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20 
        }}>
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: '600' }}>
                iOS Calendar Sync
              </ThemedText>
              <ThemedText style={{ 
                fontSize: 14, 
                color: themeColors.placeholderTextColor,
                marginTop: 4 
              }}>
                Automatically add events to your calendar
              </ThemedText>
            </View>
            
            <Switch
              value={syncEnabled}
              onValueChange={handleToggleSync}
              disabled={loading}
              trackColor={{ 
                false: themeColors.border, 
                true: themeColors.mountainGreen 
              }}
              thumbColor={themeColors.text}
            />
          </View>
        </View>

        {syncEnabled && (
          <>
            {/* Sync Status */}
            <View style={{ 
              backgroundColor: themeColors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20 
            }}>
              <ThemedText style={{ fontSize: 16, fontWeight: '500', marginBottom: 12 }}>
                Sync Status
              </ThemedText>
              
              {lastSyncError ? (
                <View style={{ 
                  backgroundColor: '#FF44441A',
                  borderRadius: 8,
                  padding: 12 
                }}>
                  <ThemedText style={{ color: '#FF4444', fontSize: 14 }}>
                    {lastSyncError}
                  </ThemedText>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="check-circle" size={20} color={themeColors.mountainGreen} />
                  <ThemedText>Calendar sync is active</ThemedText>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={{ 
              backgroundColor: themeColors.card,
              borderRadius: 12,
              padding: 16 
            }}>
              <ThemedText style={{ fontSize: 16, fontWeight: '500', marginBottom: 12 }}>
                Actions
              </ThemedText>
              
              <TouchableOpacity
                onPress={handleSyncAllEvents}
                disabled={syncing}
                style={{
                  backgroundColor: themeColors.mountainGreen,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                  opacity: syncing ? 0.5 : 1,
                }}
              >
                <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  {syncing ? 'Syncing...' : 'Sync All Events'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={{ 
              backgroundColor: '#4CAF501A',
              borderRadius: 12,
              padding: 16,
              marginTop: 20 
            }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Feather name="info" size={16} color={themeColors.mountainGreen} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
                    How it works
                  </ThemedText>
                  <ThemedText style={{ fontSize: 13, color: themeColors.placeholderTextColor }}>
                    • Events are automatically synced when created or updated
                  </ThemedText>
                  <ThemedText style={{ fontSize: 13, color: themeColors.placeholderTextColor }}>
                    • You can toggle sync per event when creating
                  </ThemedText>
                  <ThemedText style={{ fontSize: 13, color: themeColors.placeholderTextColor }}>
                    • Deleted events are removed from your calendar
                  </ThemedText>
                  <ThemedText style={{ fontSize: 13, color: themeColors.placeholderTextColor }}>
                    • Changes made in iOS Calendar won't affect Kinovo events
                  </ThemedText>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
};

export default CalendarPermissions;
```

---

## Testing

### Unit Tests

```bash
# File: client/__tests__/services/CalendarSyncService.test.ts
```

```typescript
import CalendarSyncService from '@/services/CalendarSyncService';
import * as Calendar from 'expo-calendar';

jest.mock('expo-calendar');
jest.mock('@react-native-async-storage/async-storage');

describe('CalendarSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully with permissions', async () => {
      (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted'
      });
      
      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([
        { id: '1', title: 'Kinovo Events' }
      ]);

      const result = await CalendarSyncService.initialize();
      expect(result).toBe(true);
    });

    it('should fail without permissions', async () => {
      (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied'
      });

      const result = await CalendarSyncService.initialize();
      expect(result).toBe(false);
    });
  });

  describe('syncEvent', () => {
    it('should create new calendar event', async () => {
      const mockEvent = {
        _id: '123',
        title: 'Test Event',
        start_time: new Date('2024-01-01T10:00:00'),
        end_time: new Date('2024-01-01T11:00:00'),
        calendarSyncEnabled: true,
      };

      (Calendar.createEventAsync as jest.Mock).mockResolvedValue('cal-123');

      const result = await CalendarSyncService.syncEvent(mockEvent);
      
      expect(result.success).toBe(true);
      expect(result.calendarEventId).toBe('cal-123');
      expect(Calendar.createEventAsync).toHaveBeenCalled();
    });

    it('should update existing calendar event', async () => {
      const mockEvent = {
        _id: '123',
        title: 'Updated Event',
        start_time: new Date('2024-01-01T10:00:00'),
        end_time: new Date('2024-01-01T11:00:00'),
        iosCalendarEventId: 'cal-123',
        calendarSyncEnabled: true,
      };

      (Calendar.updateEventAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await CalendarSyncService.syncEvent(mockEvent);
      
      expect(result.success).toBe(true);
      expect(result.calendarEventId).toBe('cal-123');
      expect(Calendar.updateEventAsync).toHaveBeenCalledWith('cal-123', expect.any(Object));
    });
  });

  describe('deleteEvent', () => {
    it('should delete calendar event', async () => {
      (Calendar.deleteEventAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await CalendarSyncService.deleteEvent('cal-123');
      
      expect(result.success).toBe(true);
      expect(Calendar.deleteEventAsync).toHaveBeenCalledWith('cal-123');
    });

    it('should handle deletion errors gracefully', async () => {
      (Calendar.deleteEventAsync as jest.Mock).mockRejectedValue(new Error('Not found'));

      const result = await CalendarSyncService.deleteEvent('cal-999');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });
});
```

### Integration Tests

```bash
# File: client/__tests__/hooks/useCalendarSync.test.ts
```

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import CalendarSyncService from '@/services/CalendarSyncService';

jest.mock('@/services/CalendarSyncService');

describe('useCalendarSync', () => {
  it('should sync event to calendar when enabled', async () => {
    const { result } = renderHook(() => useCalendarSync());
    
    // Enable sync
    await act(async () => {
      await result.current.enableSync();
    });

    const mockEvent = {
      _id: '123',
      title: 'Test Event',
      calendarSyncEnabled: true,
      // ... other fields
    };

    // Sync event
    await act(async () => {
      const syncResult = await result.current.syncEventToCalendar(mockEvent);
      expect(syncResult.success).toBe(true);
    });

    expect(CalendarSyncService.syncEvent).toHaveBeenCalledWith(mockEvent);
  });

  it('should not sync when disabled', async () => {
    const { result } = renderHook(() => useCalendarSync());
    
    const mockEvent = {
      _id: '123',
      title: 'Test Event',
      calendarSyncEnabled: true,
    };

    const syncResult = await result.current.syncEventToCalendar(mockEvent);
    
    expect(syncResult.success).toBe(false);
    expect(syncResult.error).toBe('Sync not enabled');
  });
});
```

---

## Deployment

### Phase 1: Testing (Day 1)
- Internal testing with team
- Verify basic sync functionality
- Test error scenarios

### Phase 2: Beta Release (Day 2)
- Deploy to 10% of users
- Monitor for errors
- Gather feedback

### Phase 3: Full Release (Day 3)
- Roll out to all users
- Monitor performance
- Support documentation

### Feature Flags

```typescript
// Enable gradual rollout
const CALENDAR_SYNC_FEATURE = {
  enabled: true, // Can be toggled remotely
  betaUsers: ['user1', 'user2'], // Beta test group
  percentage: 100, // Percentage rollout
};

export const isCalendarSyncEnabled = (userId: string): boolean => {
  if (!CALENDAR_SYNC_FEATURE.enabled) return false;
  
  if (CALENDAR_SYNC_FEATURE.betaUsers.includes(userId)) return true;
  
  // Simple percentage rollout
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 100) < CALENDAR_SYNC_FEATURE.percentage;
};
```

### Monitoring

```typescript
// Track sync metrics
export const trackCalendarSync = (event: string, properties?: any) => {
  analytics.track(`calendar_sync_${event}`, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
};

// Usage
trackCalendarSync('enabled');
trackCalendarSync('event_synced', { eventId, success: true });
trackCalendarSync('sync_failed', { eventId, error: errorMessage });
```

---

## Troubleshooting Guide

### Common Issues

1. **"Calendar not found"**
   - Solution: Reinitialize calendar service
   - Clear AsyncStorage calendar ID

2. **"Permission denied"**
   - Solution: Direct user to Settings app
   - Show clear permission explanation

3. **"Sync failed"**
   - Check event date validity
   - Verify calendar still exists
   - Retry with exponential backoff

### Debug Mode

```typescript
// Enable debug logging
const DEBUG_CALENDAR_SYNC = __DEV__;

export const debugLog = (message: string, data?: any) => {
  if (DEBUG_CALENDAR_SYNC) {
    console.log(`[CalendarSync] ${message}`, data);
  }
};
```

---

## Summary

This one-directional sync implementation provides:

✅ **Simple architecture** - No conflict resolution needed  
✅ **Fast implementation** - 2-3 days total  
✅ **Clear UX** - Users understand exactly what happens  
✅ **Low maintenance** - Minimal ongoing support  
✅ **Future-proof** - Easy to upgrade to bidirectional later  

The implementation focuses on delivering immediate value with minimal complexity, perfect for validating the feature with users before investing in more complex bidirectional sync.