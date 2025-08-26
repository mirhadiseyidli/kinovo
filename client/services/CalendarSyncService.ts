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
      location: this.buildLocationString(event.location),
      notes: this.buildEventNotes(event),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Handle all-day events
    if (this.isAllDayEvent(event)) {
      calendarEvent.allDay = true;
    }

    // Handle recurring events
    if (this.hasRecurrence(event)) {
      const recurrenceRule = this.buildRecurrenceRule(event);
      if (recurrenceRule) {
        calendarEvent.recurrenceRule = recurrenceRule;
      }
    }

    // Add URL if available
    if (event._id) {
      calendarEvent.url = `kinovo://event/${event._id}`;
    }

    return calendarEvent;
  }

  private buildEventNotes(event: Event): string {
    let notes = '';
    
    // Add description if available
    if (event.description && event.description.trim()) {
      notes += event.description.trim() + '\n\n';
    }
    
    // Event details section
    notes += '📅 EVENT DETAILS\n';
    notes += '───────────────\n';
    
    if (event.category) {
      notes += `📂 Category: ${event.category}\n`;
    }
    
    // Visibility info
    if (event.visibility) {
      const visibilityLabel = this.getVisibilityLabel(event.visibility);
      notes += `👁️ Visibility: ${visibilityLabel}\n`;
    }
    
    // Capacity info
    if (event.capacity) {
      notes += `👥 Capacity: ${event.capacity} attendees\n`;
    }
    
    // Attendee count
    if (event.attendees && event.attendees.length > 0) {
      const acceptedCount = event.attendees.filter(a => a.status === 'accepted').length;
      const totalCount = event.attendees.length;
      notes += `✅ RSVPs: ${acceptedCount} accepted, ${totalCount} total\n`;
    }
    
    // Creator info
    if (event.creator) {
      notes += `👤 Host: ${event.creator.full_name || event.creator.username || 'Unknown'}\n`;
    }
    
    // Recurrence info
    if (this.hasRecurrence(event)) {
      const recurrenceInfo = this.getRecurrenceDescription(event);
      if (recurrenceInfo) {
        notes += `🔄 Repeats: ${recurrenceInfo}\n`;
      }
    }
    
    // Location details
    if (event.location?.city && event.location?.state) {
      notes += `📍 Location: ${event.location.city}, ${event.location.state}\n`;
    }
    
    // Add separator
    notes += '\n───────────────\n';
    notes += `📱 Created with Kinovo\n`;
    notes += `🔗 Event ID: ${event._id}\n`;
    
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

  private buildRecurrenceRule(event: Event): Calendar.RecurrenceRule | undefined {
    // Only proceed if recurrence is actually enabled
    if (!event.recurrence?.checked || !event.recurrence.frequency || event.recurrence.frequency === 'none') {
      return undefined;
    }

    // Map frequency to proper Calendar enum values
    const frequencyMap: Record<string, any> = {
      'daily': Calendar.Frequency?.DAILY || 'daily',
      'weekly': Calendar.Frequency?.WEEKLY || 'weekly',
      'monthly': Calendar.Frequency?.MONTHLY || 'monthly',
      'yearly': Calendar.Frequency?.YEARLY || 'yearly',
    };
    
    const calendarFrequency = frequencyMap[event.recurrence.frequency];
    if (!calendarFrequency) {
      return undefined;
    }

    const rule: Calendar.RecurrenceRule = {
      frequency: calendarFrequency,
      endDate: event.recurrence.end_date as Date,
    };
    
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

  // Helper methods for enhanced event mapping
  private buildLocationString(location: Event['location']): string | undefined {
    if (!location) return undefined;
    
    let locationStr = '';
    
    if (location.text) {
      locationStr = location.text;
    }
    
    // Add city and state if available and different from text
    if (location.city && location.state) {
      const cityState = `${location.city}, ${location.state}`;
      if (!locationStr.includes(cityState)) {
        locationStr = locationStr ? `${locationStr}, ${cityState}` : cityState;
      }
    }
    
    return locationStr || undefined;
  }

  private getVisibilityLabel(visibility: string): string {
    const visibilityMap: Record<string, string> = {
      'public': 'Public',
      'private': 'Friends Only',
      'selected': 'Private (Invited Only)',
    };
    return visibilityMap[visibility] || visibility;
  }

  private hasRecurrence(event: Event): boolean {
    // Check if recurrence is enabled and has a valid frequency
    return !!(event.recurrence?.checked && 
              event.recurrence.frequency && 
              event.recurrence.frequency !== 'none');
  }

  private getRecurrenceDescription(event: Event): string | null {
    // Only proceed if recurrence is enabled
    if (!this.hasRecurrence(event)) {
      return null;
    }
    
    const frequency = event.recurrence!.frequency!;
    let description = frequency.charAt(0).toUpperCase() + frequency.slice(1);
    
    // Add interval info if available
    if (event.recurringPattern?.interval && event.recurringPattern.interval > 1) {
      const plurals: Record<string, string> = {
        'daily': 'days',
        'weekly': 'weeks', 
        'monthly': 'months',
        'yearly': 'years'
      };
      description = `Every ${event.recurringPattern.interval} ${plurals[frequency] || frequency}`;
    }
    
    // Add end date info
    if (event.recurrence && event.recurrence.end_date) {
      const endDateStr = new Date(event.recurrence.end_date).toLocaleDateString();
      description += ` until ${endDateStr}`;
    } else if (event.recurringPattern?.occurrences) {
      description += ` (${event.recurringPattern.occurrences} times)`;
    }
    
    return description;
  }
}

export default CalendarSyncService.getInstance();