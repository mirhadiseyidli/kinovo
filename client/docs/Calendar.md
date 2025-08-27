# iOS Calendar Sync Implementation Guide

## Overview

This document provides a comprehensive, step-by-step guide for implementing production-ready bidirectional sync between Kinovo events and iOS Calendar, including conflict resolution strategies.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Technical Architecture](#technical-architecture)
3. [Database Schema Changes](#database-schema-changes)
4. [Implementation Plan](#implementation-plan)
5. [Conflict Resolution](#conflict-resolution)
6. [Testing Strategy](#testing-strategy)
7. [Performance Considerations](#performance-considerations)
8. [Security & Privacy](#security--privacy)
9. [Deployment Plan](#deployment-plan)
10. [Maintenance & Monitoring](#maintenance--monitoring)

---

## Current State Analysis

### ✅ Already Implemented
- **expo-calendar** package installed (v14.1.4)
- Calendar permissions system in `app/(auth)/(profileSections)/calendarPermissions.tsx`
- Event mutation system in `hooks/useNewEventMutations.ts`
- Event cache management system
- Event CRUD operations with proper state management

### 🔍 Current Event Schema
```typescript
interface Event {
  _id: string;
  creator: User;
  title: string;
  category: string | null;
  description?: string | null;
  location: {
    text: string | null;
    city: string | null;
    state: string | null;
    coordinates: { lat: number | null; lng: number | null };
  };
  start_time: Date | null;
  end_time: Date | null;
  capacity?: number | null;
  isRecurring?: boolean;
  recurringPattern?: any;
  // Missing: iOS calendar integration fields
}
```

### 📍 Key Files for Integration
- `client/types/allTypes.ts` - Event interface definition
- `client/hooks/useNewEventMutations.ts` - Event CRUD operations
- `client/utils/eventCache.ts` - Event cache management
- `client/app/(auth)/(profileSections)/calendarPermissions.tsx` - Permissions

---

## Technical Architecture

### Sync Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Kinovo App    │◄──►│  Sync Service   │◄──►│  iOS Calendar   │
│                 │    │                 │    │                 │
│ - Event CRUD    │    │ - Conflict Res  │    │ - Native Events │
│ - Cache Mgmt    │    │ - Mapping       │    │ - System Sync   │
│ - User Actions  │    │ - Error Handling│    │ - Notifications │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components

1. **CalendarSyncService** - Main sync orchestrator
2. **CalendarEventMapper** - Maps between Kinovo events and iOS calendar events
3. **ConflictResolver** - Handles sync conflicts
4. **SyncStateManager** - Tracks sync status and metadata
5. **CalendarSyncProvider** - React context for sync state

---

## Database Schema Changes

### 1. Event Schema Extensions

Add to existing Event interface:

```typescript
interface Event {
  // ... existing fields
  
  // iOS Calendar Sync Fields
  iosCalendarEventId?: string | null;
  calendarSyncEnabled?: boolean;
  lastSyncedAt?: Date | null;
  syncVersion?: number;
  conflictResolution?: {
    strategy: 'app_wins' | 'calendar_wins' | 'manual' | 'merge';
    resolvedAt?: Date;
    resolvedBy?: 'user' | 'auto';
  };
  externalModifications?: {
    detectedAt: Date;
    source: 'ios_calendar' | 'app';
    changes: string[];
  }[];
}
```

### 2. User Preferences Schema

Add calendar sync preferences:

```typescript
interface UserCalendarPreferences {
  syncEnabled: boolean;
  defaultCalendarId?: string;
  conflictResolution: 'ask' | 'app_wins' | 'calendar_wins';
  syncCategories: string[]; // Which event categories to sync
  autoSyncRecurring: boolean;
  notifyOnConflicts: boolean;
}
```

### 3. Sync Metadata Schema

```typescript
interface SyncMetadata {
  userId: string;
  lastFullSync: Date;
  lastIncrementalSync: Date;
  pendingConflicts: string[]; // Event IDs with unresolved conflicts
  syncErrors: {
    eventId: string;
    error: string;
    timestamp: Date;
    retryCount: number;
  }[];
}
```

---

## Implementation Plan

### Phase 1: Foundation (Days 1-3)

#### 1.1 Schema Updates
```bash
# File: client/types/allTypes.ts
```

**Step 1.1.1:** Extend Event interface
```typescript
// Add calendar sync fields to Event interface
interface Event {
  // ... existing fields
  iosCalendarEventId?: string | null;
  calendarSyncEnabled?: boolean;
  lastSyncedAt?: Date | null;
  syncVersion?: number;
  conflictResolution?: ConflictResolution;
  externalModifications?: ExternalModification[];
}

interface ConflictResolution {
  strategy: 'app_wins' | 'calendar_wins' | 'manual' | 'merge';
  resolvedAt?: Date;
  resolvedBy?: 'user' | 'auto';
}

interface ExternalModification {
  detectedAt: Date;
  source: 'ios_calendar' | 'app';
  changes: string[];
}
```

#### 1.2 Calendar Sync Service Foundation
```bash
# File: client/services/CalendarSyncService.ts
```

**Step 1.2.1:** Create base sync service
```typescript
import * as Calendar from 'expo-calendar';
import { Event } from '@/types/allTypes';

export class CalendarSyncService {
  private static instance: CalendarSyncService;
  private defaultCalendarId: string | null = null;
  
  static getInstance(): CalendarSyncService {
    if (!CalendarSyncService.instance) {
      CalendarSyncService.instance = new CalendarSyncService();
    }
    return CalendarSyncService.instance;
  }

  async initialize(): Promise<boolean> {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    if (status !== 'granted') return false;
    
    await this.setupDefaultCalendar();
    return true;
  }

  private async setupDefaultCalendar(): Promise<void> {
    // Implementation for calendar setup
  }

  async syncEventToCalendar(event: Event): Promise<string | null> {
    // Implementation for single event sync
  }

  async syncEventFromCalendar(calendarEventId: string): Promise<Event | null> {
    // Implementation for reverse sync
  }

  async detectConflicts(event: Event): Promise<ConflictInfo[]> {
    // Implementation for conflict detection
  }
}
```

#### 1.3 Event Mapper
```bash
# File: client/services/CalendarEventMapper.ts
```

**Step 1.3.1:** Create event mapping logic
```typescript
import * as Calendar from 'expo-calendar';
import { Event } from '@/types/allTypes';

export class CalendarEventMapper {
  static kinovoToCalendar(event: Event): Calendar.Event {
    return {
      title: event.title,
      startDate: event.start_time!,
      endDate: event.end_time!,
      location: event.location.text || undefined,
      notes: this.buildEventNotes(event),
      allDay: this.isAllDayEvent(event),
      // Add other mappings
    };
  }

  static calendarToKinovo(calendarEvent: Calendar.Event): Partial<Event> {
    return {
      title: calendarEvent.title,
      start_time: calendarEvent.startDate,
      end_time: calendarEvent.endDate,
      location: {
        text: calendarEvent.location || null,
        city: null,
        state: null,
        coordinates: { lat: null, lng: null }
      },
      description: this.parseEventNotes(calendarEvent.notes),
      // Add other mappings
    };
  }

  private static buildEventNotes(event: Event): string {
    // Build notes with metadata for reverse mapping
  }

  private static parseEventNotes(notes?: string): string | null {
    // Parse notes to extract description
  }

  private static isAllDayEvent(event: Event): boolean {
    // Logic to determine if event is all-day
  }
}
```

### Phase 2: Core Sync Implementation (Days 4-7)

#### 2.1 Hook Integration
```bash
# File: client/hooks/useCalendarSync.ts
```

**Step 2.1.1:** Create calendar sync hook
```typescript
import { useState, useEffect } from 'react';
import { CalendarSyncService } from '@/services/CalendarSyncService';
import { Event } from '@/types/allTypes';

export const useCalendarSync = () => {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

  const syncService = CalendarSyncService.getInstance();

  const syncEventToCalendar = async (event: Event): Promise<boolean> => {
    if (!syncEnabled) return false;
    
    setSyncing(true);
    try {
      const calendarEventId = await syncService.syncEventToCalendar(event);
      if (calendarEventId) {
        // Update event with calendar ID
        await updateEventCalendarId(event._id, calendarEventId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const detectAndResolveConflicts = async (): Promise<void> => {
    // Implementation for conflict detection and resolution
  };

  return {
    syncEnabled,
    setSyncEnabled,
    syncing,
    conflicts,
    syncEventToCalendar,
    detectAndResolveConflicts,
  };
};
```

#### 2.2 Modify Event Mutations
```bash
# File: client/hooks/useNewEventMutations.ts
```

**Step 2.2.1:** Integrate sync into existing mutations
```typescript
// Add to existing useNewEventMutations hook

import { useCalendarSync } from './useCalendarSync';

export const useNewEventMutations = () => {
  const { syncEventToCalendar } = useCalendarSync();
  
  // Modify existing createEvent mutation
  const createEvent = useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      // Existing creation logic
      const response = await api.post('/events', eventData);
      
      // New: Auto-sync to calendar if enabled
      if (response.data.event) {
        await syncEventToCalendar(response.data.event);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      // Existing success logic
      handleEventResponse(data, user?._id);
    },
  });

  // Similar modifications for updateEvent and deleteEvent
  
  return {
    createEvent,
    updateEvent,
    deleteEvent,
    // ... other mutations
  };
};
```

#### 2.3 Background Sync Implementation
```bash
# File: client/services/BackgroundSyncService.ts
```

**Step 2.3.1:** Create background sync service
```typescript
import { AppState } from 'react-native';
import { CalendarSyncService } from './CalendarSyncService';

export class BackgroundSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncCheck: Date = new Date();

  startBackgroundSync(): void {
    // Sync when app becomes active
    AppState.addEventListener('change', this.handleAppStateChange);
    
    // Periodic sync check (every 5 minutes when app is active)
    this.syncInterval = setInterval(this.performIncrementalSync, 5 * 60 * 1000);
  }

  stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: string): void => {
    if (nextAppState === 'active') {
      this.performIncrementalSync();
    }
  };

  private performIncrementalSync = async (): Promise<void> => {
    const syncService = CalendarSyncService.getInstance();
    
    try {
      // Check for external calendar changes
      await syncService.syncFromCalendar(this.lastSyncCheck);
      this.lastSyncCheck = new Date();
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  };
}
```

### Phase 3: Conflict Resolution (Days 8-10)

#### 3.1 Conflict Detection
```bash
# File: client/services/ConflictDetector.ts
```

**Step 3.1.1:** Implement conflict detection logic
```typescript
import * as Calendar from 'expo-calendar';
import { Event } from '@/types/allTypes';

export interface ConflictInfo {
  eventId: string;
  type: 'modified' | 'deleted' | 'created';
  appVersion: Event;
  calendarVersion: Calendar.Event | null;
  conflictFields: string[];
  detectedAt: Date;
}

export class ConflictDetector {
  static async detectConflicts(event: Event): Promise<ConflictInfo[]> {
    if (!event.iosCalendarEventId || !event.lastSyncedAt) {
      return [];
    }

    try {
      const calendarEvent = await Calendar.getEventAsync(event.iosCalendarEventId);
      
      if (!calendarEvent) {
        return [{
          eventId: event._id,
          type: 'deleted',
          appVersion: event,
          calendarVersion: null,
          conflictFields: ['existence'],
          detectedAt: new Date(),
        }];
      }

      const conflicts = this.compareEvents(event, calendarEvent);
      
      if (conflicts.length > 0) {
        return [{
          eventId: event._id,
          type: 'modified',
          appVersion: event,
          calendarVersion: calendarEvent,
          conflictFields: conflicts,
          detectedAt: new Date(),
        }];
      }

      return [];
    } catch (error) {
      console.error('Conflict detection failed:', error);
      return [];
    }
  }

  private static compareEvents(appEvent: Event, calendarEvent: Calendar.Event): string[] {
    const conflicts: string[] = [];

    // Compare title
    if (appEvent.title !== calendarEvent.title) {
      conflicts.push('title');
    }

    // Compare dates
    if (appEvent.start_time?.getTime() !== calendarEvent.startDate?.getTime()) {
      conflicts.push('start_time');
    }

    if (appEvent.end_time?.getTime() !== calendarEvent.endDate?.getTime()) {
      conflicts.push('end_time');
    }

    // Compare location
    if (appEvent.location.text !== calendarEvent.location) {
      conflicts.push('location');
    }

    // Add more field comparisons as needed

    return conflicts;
  }
}
```

#### 3.2 Conflict Resolution UI
```bash
# File: client/components/Calendar/ConflictResolutionModal.tsx
```

**Step 3.2.1:** Create conflict resolution interface
```typescript
import React, { useState } from 'react';
import { Modal, View, ScrollView, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ConflictInfo } from '@/services/ConflictDetector';

interface ConflictResolutionModalProps {
  visible: boolean;
  conflicts: ConflictInfo[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  visible,
  conflicts,
  onResolve,
  onCancel,
}) => {
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  const handleResolveConflict = (eventId: string, strategy: string) => {
    setResolutions(prev => ({ ...prev, [eventId]: strategy }));
  };

  const submitResolutions = () => {
    const resolvedConflicts = conflicts.map(conflict => ({
      eventId: conflict.eventId,
      strategy: resolutions[conflict.eventId] || 'app_wins',
      resolvedAt: new Date(),
      resolvedBy: 'user' as const,
    }));
    
    onResolve(resolvedConflicts);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={{ flex: 1, padding: 16 }}>
        <ThemedText style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
          Resolve Calendar Conflicts
        </ThemedText>
        
        <ScrollView>
          {conflicts.map((conflict, index) => (
            <ConflictItem
              key={conflict.eventId}
              conflict={conflict}
              onResolve={(strategy) => handleResolveConflict(conflict.eventId, strategy)}
            />
          ))}
        </ScrollView>
        
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <TouchableOpacity onPress={onCancel} style={{ flex: 1 }}>
            <ThemedText>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={submitResolutions} style={{ flex: 1 }}>
            <ThemedText>Resolve All</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
};
```

#### 3.3 Automatic Conflict Resolution
```bash
# File: client/services/ConflictResolver.ts
```

**Step 3.3.1:** Implement automatic resolution strategies
```typescript
import { Event } from '@/types/allTypes';
import { ConflictInfo } from './ConflictDetector';
import { CalendarEventMapper } from './CalendarEventMapper';

export class ConflictResolver {
  static async resolveConflict(
    conflict: ConflictInfo,
    strategy: 'app_wins' | 'calendar_wins' | 'merge'
  ): Promise<Event> {
    switch (strategy) {
      case 'app_wins':
        return await this.resolveAppWins(conflict);
      
      case 'calendar_wins':
        return await this.resolveCalendarWins(conflict);
      
      case 'merge':
        return await this.resolveMerge(conflict);
      
      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }
  }

  private static async resolveAppWins(conflict: ConflictInfo): Promise<Event> {
    // Keep app version, update calendar
    const calendarEvent = CalendarEventMapper.kinovoToCalendar(conflict.appVersion);
    await Calendar.updateEventAsync(conflict.appVersion.iosCalendarEventId!, calendarEvent);
    
    return {
      ...conflict.appVersion,
      lastSyncedAt: new Date(),
      syncVersion: (conflict.appVersion.syncVersion || 0) + 1,
    };
  }

  private static async resolveCalendarWins(conflict: ConflictInfo): Promise<Event> {
    // Keep calendar version, update app
    if (!conflict.calendarVersion) {
      throw new Error('Calendar version missing for calendar_wins resolution');
    }

    const appUpdates = CalendarEventMapper.calendarToKinovo(conflict.calendarVersion);
    
    return {
      ...conflict.appVersion,
      ...appUpdates,
      lastSyncedAt: new Date(),
      syncVersion: (conflict.appVersion.syncVersion || 0) + 1,
    };
  }

  private static async resolveMerge(conflict: ConflictInfo): Promise<Event> {
    // Intelligent merge based on field precedence
    const merged = { ...conflict.appVersion };
    
    if (conflict.calendarVersion) {
      // Merge strategy: Calendar wins for time/location, App wins for description/category
      if (conflict.conflictFields.includes('start_time')) {
        merged.start_time = conflict.calendarVersion.startDate;
      }
      
      if (conflict.conflictFields.includes('end_time')) {
        merged.end_time = conflict.calendarVersion.endDate;
      }
      
      if (conflict.conflictFields.includes('location')) {
        merged.location.text = conflict.calendarVersion.location || merged.location.text;
      }
      
      // Keep app version for title, description, category
    }

    return {
      ...merged,
      lastSyncedAt: new Date(),
      syncVersion: (conflict.appVersion.syncVersion || 0) + 1,
    };
  }
}
```

### Phase 4: Advanced Features & Polish (Days 11-14)

#### 4.1 Recurring Events Support
```bash
# File: client/services/RecurringEventSync.ts
```

**Step 4.1.1:** Handle recurring event complexities
```typescript
import * as Calendar from 'expo-calendar';
import { Event } from '@/types/allTypes';

export class RecurringEventSync {
  static async syncRecurringEvent(event: Event): Promise<string[]> {
    if (!event.isRecurring || !event.recurringPattern) {
      throw new Error('Event is not recurring');
    }

    const recurrenceRule = this.buildRecurrenceRule(event.recurringPattern);
    const calendarEvent = {
      ...CalendarEventMapper.kinovoToCalendar(event),
      recurrenceRule,
    };

    const calendarEventId = await Calendar.createEventAsync(
      this.getDefaultCalendarId(),
      calendarEvent
    );

    // Handle recurring event instances
    return [calendarEventId];
  }

  static buildRecurrenceRule(pattern: any): Calendar.RecurrenceRule {
    // Convert Kinovo recurring pattern to iOS recurrence rule
    return {
      frequency: this.mapFrequency(pattern.frequency),
      interval: pattern.interval || 1,
      endDate: pattern.endDate,
      // Add other recurrence rule properties
    };
  }

  private static mapFrequency(frequency: string): Calendar.RecurrenceRule['frequency'] {
    const mapping: Record<string, Calendar.RecurrenceRule['frequency']> = {
      'daily': 'daily',
      'weekly': 'weekly',
      'monthly': 'monthly',
      'yearly': 'yearly',
    };
    
    return mapping[frequency] || 'weekly';
  }
}
```

#### 4.2 Sync Status & Error Handling
```bash
# File: client/components/Calendar/SyncStatusIndicator.tsx
```

**Step 4.2.1:** Create sync status UI component
```typescript
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { useCalendarSync } from '@/hooks/useCalendarSync';

export const SyncStatusIndicator: React.FC = () => {
  const { syncEnabled, syncing, conflicts, lastSyncError } = useCalendarSync();

  const getSyncStatusIcon = () => {
    if (syncing) return 'refresh-cw';
    if (conflicts.length > 0) return 'alert-triangle';
    if (lastSyncError) return 'x-circle';
    if (syncEnabled) return 'check-circle';
    return 'circle';
  };

  const getSyncStatusColor = () => {
    if (syncing) return '#FFA500';
    if (conflicts.length > 0) return '#FF6B6B';
    if (lastSyncError) return '#FF4444';
    if (syncEnabled) return '#4CAF50';
    return '#999999';
  };

  const getSyncStatusText = () => {
    if (syncing) return 'Syncing...';
    if (conflicts.length > 0) return `${conflicts.length} conflicts`;
    if (lastSyncError) return 'Sync failed';
    if (syncEnabled) return 'Synced';
    return 'Sync disabled';
  };

  return (
    <TouchableOpacity 
      style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
      onPress={() => {/* Handle tap - show sync details */}}
    >
      <Feather 
        name={getSyncStatusIcon()} 
        size={16} 
        color={getSyncStatusColor()} 
      />
      <ThemedText style={{ marginLeft: 4, fontSize: 12, color: getSyncStatusColor() }}>
        {getSyncStatusText()}
      </ThemedText>
    </TouchableOpacity>
  );
};
```

#### 4.3 Sync Settings UI
```bash
# File: client/components/Calendar/CalendarSyncSettings.tsx
```

**Step 4.3.1:** Create comprehensive sync settings
```typescript
import React, { useState } from 'react';
import { ScrollView, Switch, View, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useCalendarSync } from '@/hooks/useCalendarSync';

export const CalendarSyncSettings: React.FC = () => {
  const { 
    syncEnabled, 
    setSyncEnabled, 
    syncPreferences, 
    updateSyncPreferences 
  } = useCalendarSync();

  const [preferences, setPreferences] = useState(syncPreferences);

  const handleToggleSync = async (enabled: boolean) => {
    if (enabled) {
      const permission = await requestCalendarPermission();
      if (!permission) return;
    }
    
    setSyncEnabled(enabled);
  };

  const handleUpdatePreferences = (key: string, value: any) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    updateSyncPreferences(updated);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView style={{ padding: 16 }}>
        {/* Main Sync Toggle */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
          <ThemedText style={{ fontSize: 18, fontWeight: '600' }}>
            Calendar Sync
          </ThemedText>
          <Switch
            value={syncEnabled}
            onValueChange={handleToggleSync}
          />
        </View>

        {syncEnabled && (
          <>
            {/* Sync Categories */}
            <View style={{ marginBottom: 24 }}>
              <ThemedText style={{ fontSize: 16, fontWeight: '500', marginBottom: 12 }}>
                Sync Categories
              </ThemedText>
              {CATEGORIES.map(category => (
                <View key={category} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <ThemedText>{category}</ThemedText>
                  <Switch
                    value={preferences.syncCategories.includes(category)}
                    onValueChange={(enabled) => {
                      const updated = enabled
                        ? [...preferences.syncCategories, category]
                        : preferences.syncCategories.filter(c => c !== category);
                      handleUpdatePreferences('syncCategories', updated);
                    }}
                  />
                </View>
              ))}
            </View>

            {/* Conflict Resolution */}
            <View style={{ marginBottom: 24 }}>
              <ThemedText style={{ fontSize: 16, fontWeight: '500', marginBottom: 12 }}>
                Conflict Resolution
              </ThemedText>
              <ConflictResolutionPicker
                value={preferences.conflictResolution}
                onValueChange={(value) => handleUpdatePreferences('conflictResolution', value)}
              />
            </View>

            {/* Auto-sync Recurring */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <ThemedText>Auto-sync Recurring Events</ThemedText>
              <Switch
                value={preferences.autoSyncRecurring}
                onValueChange={(value) => handleUpdatePreferences('autoSyncRecurring', value)}
              />
            </View>

            {/* Notifications */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <ThemedText>Notify on Conflicts</ThemedText>
              <Switch
                value={preferences.notifyOnConflicts}
                onValueChange={(value) => handleUpdatePreferences('notifyOnConflicts', value)}
              />
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
};
```

---

## Conflict Resolution

### Conflict Types

1. **Modification Conflicts**
   - Event details changed in both app and calendar
   - Strategy: Field-level precedence or user choice

2. **Deletion Conflicts**
   - Event deleted in one system but modified in another
   - Strategy: Restore or confirm deletion

3. **Creation Conflicts**
   - Similar events created in both systems
   - Strategy: Merge or keep separate

4. **Timing Conflicts**
   - Scheduling conflicts due to external changes
   - Strategy: Notify user and suggest alternatives

### Resolution Strategies

1. **App Wins** - Kinovo app data takes precedence
2. **Calendar Wins** - iOS Calendar data takes precedence
3. **Manual Resolution** - User chooses field by field
4. **Intelligent Merge** - Automatic merge based on rules

### User Experience

```typescript
// Example conflict resolution flow
const resolveConflicts = async (conflicts: ConflictInfo[]) => {
  for (const conflict of conflicts) {
    const userPreference = await getUserConflictPreference();
    
    if (userPreference === 'ask') {
      // Show conflict resolution modal
      const resolution = await showConflictModal(conflict);
      await applyResolution(conflict, resolution);
    } else {
      // Auto-resolve based on preference
      await applyResolution(conflict, userPreference);
    }
  }
};
```

---

## Testing Strategy

### Unit Tests

```bash
# File: client/__tests__/services/CalendarSyncService.test.ts
```

```typescript
import { CalendarSyncService } from '@/services/CalendarSyncService';
import { mockEvent, mockCalendarEvent } from '@/test-utils/mocks';

describe('CalendarSyncService', () => {
  let syncService: CalendarSyncService;

  beforeEach(() => {
    syncService = CalendarSyncService.getInstance();
  });

  describe('syncEventToCalendar', () => {
    it('should create calendar event successfully', async () => {
      const event = mockEvent();
      const calendarEventId = await syncService.syncEventToCalendar(event);
      
      expect(calendarEventId).toBeTruthy();
      expect(typeof calendarEventId).toBe('string');
    });

    it('should handle sync failures gracefully', async () => {
      const invalidEvent = { ...mockEvent(), start_time: null };
      
      await expect(syncService.syncEventToCalendar(invalidEvent))
        .rejects.toThrow('Invalid event data');
    });
  });

  describe('conflict detection', () => {
    it('should detect title conflicts', async () => {
      const appEvent = mockEvent({ title: 'App Title' });
      const calendarEvent = mockCalendarEvent({ title: 'Calendar Title' });
      
      const conflicts = await syncService.detectConflicts(appEvent, calendarEvent);
      
      expect(conflicts).toContain('title');
    });
  });
});
```

### Integration Tests

```typescript
// Test full sync workflow
describe('Full Sync Integration', () => {
  it('should sync event creation end-to-end', async () => {
    // Create event in app
    const event = await createTestEvent();
    
    // Verify calendar sync
    const calendarEvents = await Calendar.getEventsAsync(
      [testCalendarId],
      event.start_time!,
      event.end_time!
    );
    
    expect(calendarEvents).toHaveLength(1);
    expect(calendarEvents[0].title).toBe(event.title);
  });

  it('should handle conflict resolution correctly', async () => {
    // Setup conflict scenario
    const event = await createTestEvent();
    await modifyCalendarEventExternally(event.iosCalendarEventId!);
    
    // Trigger sync
    await syncService.performFullSync();
    
    // Verify resolution
    const resolvedEvent = await getEventById(event._id);
    expect(resolvedEvent.conflictResolution).toBeDefined();
  });
});
```

### E2E Tests

```typescript
// Test user workflows
describe('Calendar Sync E2E', () => {
  it('should enable sync and sync existing events', async () => {
    // Navigate to sync settings
    await navigateToCalendarSettings();
    
    // Enable sync
    await toggleSyncSwitch(true);
    
    // Verify permission request
    await handlePermissionModal('allow');
    
    // Verify sync status
    await waitForSyncCompletion();
    
    // Check calendar app for synced events
    await verifyEventsInCalendar();
  });
});
```

---

## Performance Considerations

### Optimization Strategies

1. **Batch Operations**
   ```typescript
   // Batch sync multiple events
   const batchSyncEvents = async (events: Event[]) => {
     const promises = events.map(event => syncEventToCalendar(event));
     return await Promise.allSettled(promises);
   };
   ```

2. **Incremental Sync**
   ```typescript
   // Only sync changes since last sync
   const incrementalSync = async (lastSyncDate: Date) => {
     const modifiedEvents = await getEventsModifiedSince(lastSyncDate);
     return await batchSyncEvents(modifiedEvents);
   };
   ```

3. **Background Processing**
   ```typescript
   // Queue sync operations for background processing
   const queueSyncOperation = (operation: SyncOperation) => {
     SyncQueue.add(operation, { 
       delay: 1000,
       attempts: 3,
       backoff: 'exponential' 
     });
   };
   ```

4. **Caching Strategy**
   ```typescript
   // Cache calendar data to reduce API calls
   const cachedCalendarData = new Map<string, CachedCalendarEvent>();
   
   const getCachedCalendarEvent = async (eventId: string) => {
     if (cachedCalendarData.has(eventId)) {
       const cached = cachedCalendarData.get(eventId)!;
       if (Date.now() - cached.timestamp < CACHE_TTL) {
         return cached.data;
       }
     }
     
     const fresh = await Calendar.getEventAsync(eventId);
     cachedCalendarData.set(eventId, {
       data: fresh,
       timestamp: Date.now()
     });
     
     return fresh;
   };
   ```

### Memory Management

- Implement proper cleanup for event listeners
- Use WeakMap for temporary sync state
- Limit concurrent sync operations
- Clear expired cache entries regularly

---

## Security & Privacy

### Data Protection

1. **Sensitive Data Handling**
   - Never store calendar credentials
   - Encrypt sync metadata
   - Respect user privacy settings

2. **Permission Management**
   ```typescript
   const validateCalendarPermissions = async (): Promise<boolean> => {
     const { status } = await Calendar.getCalendarPermissionsAsync();
     
     if (status !== 'granted') {
       // Request permission with clear explanation
       const { status: newStatus } = await Calendar.requestCalendarPermissionsAsync();
       return newStatus === 'granted';
     }
     
     return true;
   };
   ```

3. **User Consent**
   - Clear disclosure of sync behavior
   - Granular sync controls
   - Easy opt-out mechanism

### Security Measures

- Validate all calendar data before processing
- Sanitize user input before sync
- Implement rate limiting for sync operations
- Log security-relevant events

---

## Deployment Plan

### Phase 1: Beta Release (Week 1)
- Core sync functionality
- Basic conflict resolution
- Limited user group testing

### Phase 2: Limited Release (Week 2)
- Advanced conflict resolution
- Performance optimizations
- Expanded user group

### Phase 3: Full Release (Week 3)
- All features complete
- Comprehensive testing
- Full user base rollout

### Rollback Strategy

```typescript
// Feature flag for easy rollback
const CALENDAR_SYNC_ENABLED = true; // Can be toggled remotely

const useCalendarSyncWithFeatureFlag = () => {
  const baseHook = useCalendarSync();
  
  if (!CALENDAR_SYNC_ENABLED) {
    return {
      ...baseHook,
      syncEnabled: false,
      syncEventToCalendar: async () => false,
    };
  }
  
  return baseHook;
};
```

### Monitoring

1. **Sync Success Rate**
   - Track successful vs failed sync operations
   - Monitor by event type and user cohort

2. **Performance Metrics**
   - Sync operation latency
   - Memory usage during sync
   - Battery impact

3. **User Adoption**
   - Sync enablement rate
   - Feature usage patterns
   - User feedback and support tickets

4. **Error Tracking**
   ```typescript
   const trackSyncError = (error: Error, context: SyncContext) => {
     analytics.track('sync_error', {
       error_type: error.name,
       error_message: error.message,
       sync_operation: context.operation,
       user_id: context.userId,
       timestamp: new Date().toISOString(),
     });
   };
   ```

---

## Maintenance & Monitoring

### Health Checks

```typescript
// Regular sync health validation
const performSyncHealthCheck = async (): Promise<HealthCheckResult> => {
  const checks = [
    checkCalendarPermissions(),
    checkSyncServiceStatus(),
    checkPendingConflicts(),
    checkSyncErrors(),
  ];
  
  const results = await Promise.allSettled(checks);
  
  return {
    overall: results.every(r => r.status === 'fulfilled'),
    details: results,
    timestamp: new Date(),
  };
};
```

### Maintenance Tasks

1. **Daily**
   - Clean up resolved conflicts
   - Process failed sync retries
   - Update sync statistics

2. **Weekly**
   - Full sync health audit
   - Performance optimization review
   - User feedback analysis

3. **Monthly**
   - Sync pattern analysis
   - Feature usage review
   - Capacity planning

### Support & Troubleshooting

```typescript
// Diagnostic tools for support
const generateSyncDiagnostics = async (userId: string) => {
  return {
    user: userId,
    syncEnabled: await getSyncStatus(userId),
    lastSync: await getLastSyncTime(userId),
    pendingConflicts: await getPendingConflicts(userId),
    recentErrors: await getRecentSyncErrors(userId),
    permissions: await getCalendarPermissions(),
    settings: await getSyncSettings(userId),
  };
};
```

---

## Conclusion

This implementation plan provides a comprehensive roadmap for production-ready iOS Calendar sync with the following key benefits:

✅ **Bidirectional sync** with conflict resolution  
✅ **Scalable architecture** with proper separation of concerns  
✅ **Robust error handling** and user experience  
✅ **Performance optimizations** for large event datasets  
✅ **Security and privacy** compliance  
✅ **Comprehensive testing** strategy  
✅ **Monitoring and maintenance** framework  

**Estimated Timeline:** 14 days for full production implementation  
**Risk Level:** Medium (well-established technologies, clear requirements)  
**Maintenance Overhead:** Low (mostly automated with good monitoring)

The modular architecture ensures that features can be implemented incrementally and issues can be addressed without affecting the entire sync system.