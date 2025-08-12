import { 
  parseISO, 
  isSameDay, 
  isBefore, 
  isAfter, 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears,
  startOfDay,
  endOfDay,
  format,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears
} from 'date-fns';
import { Event } from '@/types/allTypes';

export interface EventOccurrence {
  id: string; // unique identifier for this occurrence
  originalEventId: string; // reference to the master event
  date: Date; // the specific date of this occurrence
  event: Event; // the event data (may be modified for this occurrence)
  isModified: boolean; // whether this occurrence has been modified
  isCancelled: boolean; // whether this occurrence has been cancelled
}

export interface RecurringEventModification {
  originalEventId: string;
  occurrenceDate: Date;
  modifiedEvent: Partial<Event> & { cancelled?: boolean };
  modifyType: 'this_only' | 'all_future';
}

/**
 * Expands a recurring event into individual occurrences within a date range
 */
export function expandRecurringEvent(
  event: Event, 
  startDate: Date, 
  endDate: Date,
  modifications: RecurringEventModification[] = []
): EventOccurrence[] {
  if (!event.recurrence?.checked || !event.recurrence.frequency || !event.start_time) {
    // Non-recurring event
    if (!event.start_time) return [];
    
    const eventDate = typeof event.start_time === 'string' ? parseISO(event.start_time) : event.start_time;
    if (eventDate >= startDate && eventDate <= endDate) {
      return [{
        id: `${event._id}-${format(eventDate, 'yyyy-MM-dd')}`,
        originalEventId: event._id!,
        date: eventDate,
        event,
        isModified: false,
        isCancelled: false
      }];
    }
    return [];
  }

  const occurrences: EventOccurrence[] = [];
  const eventStartDate = typeof event.start_time === 'string' ? parseISO(event.start_time) : event.start_time;
  const recurrenceEndDate = event.recurrence.end_date 
    ? (typeof event.recurrence.end_date === 'string' ? parseISO(event.recurrence.end_date) : event.recurrence.end_date)
    : endDate;

  let currentDate = eventStartDate;
  const actualEndDate = recurrenceEndDate < endDate ? recurrenceEndDate : endDate;

  // Generate occurrences based on frequency
  while (currentDate <= actualEndDate) {
    if (currentDate >= startDate) {
      const occurrenceId = `${event._id}-${format(currentDate, 'yyyy-MM-dd')}`;
      
      // Check if this occurrence has been modified or cancelled
      const modification = modifications.find(mod => 
        mod.originalEventId === event._id && 
        isSameDay(mod.occurrenceDate, currentDate)
      );

      if (modification) {
        if (modification.modifiedEvent.cancelled) {
          // Skip cancelled occurrences
          currentDate = getNextOccurrenceDate(currentDate, event.recurrence.frequency);
          continue;
        }

        // Apply modifications to this occurrence
        const modifiedEvent = { ...event, ...modification.modifiedEvent };
        occurrences.push({
          id: occurrenceId,
          originalEventId: event._id!,
          date: currentDate,
          event: modifiedEvent,
          isModified: true,
          isCancelled: false
        });
      } else {
        // Regular occurrence
        occurrences.push({
          id: occurrenceId,
          originalEventId: event._id!,
          date: currentDate,
          event,
          isModified: false,
          isCancelled: false
        });
      }
    }

    currentDate = getNextOccurrenceDate(currentDate, event.recurrence.frequency);
  }

  return occurrences;
}

/**
 * Gets the next occurrence date based on frequency
 */
function getNextOccurrenceDate(currentDate: Date, frequency: string): Date {
  switch (frequency.toLowerCase()) {
    case 'daily':
      return addDays(currentDate, 1);
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'monthly':
      return addMonths(currentDate, 1);
    case 'yearly':
      return addYears(currentDate, 1);
    default:
      return addDays(currentDate, 1);
  }
}

/**
 * Groups event occurrences by date
 */
export function groupOccurrencesByDate(occurrences: EventOccurrence[]): Record<string, EventOccurrence[]> {
  return occurrences.reduce((acc, occurrence) => {
    const dateKey = format(occurrence.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(occurrence);
    return acc;
  }, {} as Record<string, EventOccurrence[]>);
}

/**
 * Filters occurrences for a specific date
 */
export function getOccurrencesForDate(occurrences: EventOccurrence[], date: Date): EventOccurrence[] {
  return occurrences.filter(occurrence => isSameDay(occurrence.date, date));
}

/**
 * Filters occurrences for a date range
 */
export function getOccurrencesForDateRange(
  occurrences: EventOccurrence[], 
  startDate: Date, 
  endDate: Date
): EventOccurrence[] {
  return occurrences.filter(occurrence => 
    occurrence.date >= startOfDay(startDate) && occurrence.date <= endOfDay(endDate)
  );
}

/**
 * Checks if an event occurs on a specific day (legacy compatibility)
 */
export function doesEventOccurOnDay(date: Date, event: Event): boolean {
  if (!event.start_time) return false;

  const eventDate = typeof event.start_time === 'string' ? parseISO(event.start_time) : event.start_time;
  
  if (!event.recurrence?.checked || !event.recurrence.frequency) {
    return isSameDay(date, eventDate);
  }

  // For recurring events, check if the date matches the recurrence pattern
  if (isBefore(date, eventDate)) return false;
  
  if (event.recurrence.end_date) {
    const endDate = typeof event.recurrence.end_date === 'string' 
      ? parseISO(event.recurrence.end_date) 
      : event.recurrence.end_date;
    if (isAfter(date, endDate)) return false;
  }

  switch (event.recurrence.frequency.toLowerCase()) {
    case 'daily':
      return true;
    case 'weekly':
      return differenceInWeeks(date, eventDate) >= 0 && 
             differenceInDays(date, eventDate) % 7 === 0;
    case 'monthly':
      return date.getDate() === eventDate.getDate() && 
             differenceInMonths(date, eventDate) >= 0;
    case 'yearly':
      return date.getDate() === eventDate.getDate() && 
             date.getMonth() === eventDate.getMonth() && 
             differenceInYears(date, eventDate) >= 0;
    default:
      return false;
  }
}

/**
 * Creates a modification record for a recurring event
 */
export function createEventModification(
  originalEventId: string,
  occurrenceDate: Date,
  modifiedEvent: Partial<Event>,
  modifyType: 'this_only' | 'all_future'
): RecurringEventModification {
  return {
    originalEventId,
    occurrenceDate,
    modifiedEvent,
    modifyType
  };
}

/**
 * Applies modifications to event occurrences
 */
export function applyModificationsToOccurrences(
  occurrences: EventOccurrence[],
  modifications: RecurringEventModification[]
): EventOccurrence[] {
  return occurrences.map(occurrence => {
    const modification = modifications.find(mod => 
      mod.originalEventId === occurrence.originalEventId &&
      isSameDay(mod.occurrenceDate, occurrence.date)
    );

    if (modification) {
      return {
        ...occurrence,
        event: { ...occurrence.event, ...modification.modifiedEvent },
        isModified: true
      };
    }

    return occurrence;
  });
} 