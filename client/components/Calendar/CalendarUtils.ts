// CalendarUtils.ts
import {
  parseISO,
  isSameDay,
  isBefore,
  isAfter,
  startOfMonth,
  endOfMonth,
  getDay,
  eachDayOfInterval,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  startOfWeek,
  addDays
} from 'date-fns';
import { Event } from '@/types/allTypes';

// Cache for expensive calculations
const monthDaysCache = new Map<string, Date[]>();
const weekDatesCache = new Map<string, Date[]>();
const eventOccurrenceCache = new Map<string, boolean>();

// Clear cache when it gets too large to prevent memory leaks
const MAX_CACHE_SIZE = 25;

function clearCacheIfNeeded<K, V>(cache: Map<K, V>) {
  if (cache.size > MAX_CACHE_SIZE) {
    // Keep only the most recent entries
    const entries = Array.from(cache.entries());
    cache.clear();
    // Keep last 10 entries
    entries.slice(-10).forEach(([key, value]) => {
      cache.set(key, value);
    });
  }
}

// Memory management: Periodic cache cleanup
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60000; // 1 minute

function periodicCleanup() {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    // Aggressive cleanup if memory usage is high
    if (monthDaysCache.size > 15) monthDaysCache.clear();
    if (weekDatesCache.size > 15) weekDatesCache.clear();
    if (eventOccurrenceCache.size > 50) eventOccurrenceCache.clear();
    lastCleanup = now;
  }
}

export function doesEventOccurOnDay(date: Date, evt: Event): boolean {
  if (!evt.start_time) return false;

  // Periodic cleanup to prevent memory leaks
  periodicCleanup();

  // Create cache key for this specific date + event combination
  const cacheKey = `${date.toISOString().split('T')[0]}-${evt._id}-${evt.start_time}`;
  
  if (eventOccurrenceCache.has(cacheKey)) {
    return eventOccurrenceCache.get(cacheKey)!;
  }

  const start = typeof evt.start_time === 'string' ? parseISO(evt.start_time) : evt.start_time;
  const recurrence = evt.recurrence;

  // If no recurrence or not checked, just compare exact day
  if (!recurrence || !recurrence.checked) {
    const result = isSameDay(date, start);
    eventOccurrenceCache.set(cacheKey, result);
    clearCacheIfNeeded(eventOccurrenceCache);
    return result;
  }

  // Make sure we're not before the start time
  if (isBefore(date, start)) {
    eventOccurrenceCache.set(cacheKey, false);
    clearCacheIfNeeded(eventOccurrenceCache);
    return false;
  }

  // If there's an end_date for the recurrence, ensure we're not after it
  if (recurrence.end_date) {
    const end =
      typeof recurrence.end_date === 'string' ? parseISO(recurrence.end_date) : recurrence.end_date;
    if (isAfter(date, end)) {
      eventOccurrenceCache.set(cacheKey, false);
      clearCacheIfNeeded(eventOccurrenceCache);
      return false;
    }
  }

  // Handle different frequencies
  const freq = recurrence.frequency;
  let result = false;

  switch (freq) {
    case 'daily': {
      result = true;
      break;
    }
    case 'weekly': {
      const daysDiff = differenceInCalendarDays(date, start);
      result = daysDiff % 7 === 0;
      break;
    }
    case 'monthly': {
      if (date.getDate() !== start.getDate()) {
        result = false;
      } else {
        const monthsDiff = differenceInCalendarMonths(date, start);
        result = monthsDiff >= 0;
      }
      break;
    }
    case 'yearly': {
      if (date.getDate() === start.getDate() && date.getMonth() === start.getMonth()) {
        const yearsDiff = differenceInCalendarYears(date, start);
        result = yearsDiff >= 0;
      } else {
        result = false;
      }
      break;
    }
    default:
      result = false;
  }

  eventOccurrenceCache.set(cacheKey, result);
  clearCacheIfNeeded(eventOccurrenceCache);
  return result;
}

export function getMonthDays(year: number, month: number): Date[] {
  const cacheKey = `${year}-${month}`;
  
  // Periodic cleanup to prevent memory leaks
  periodicCleanup();
  
  if (monthDaysCache.has(cacheKey)) {
    return monthDaysCache.get(cacheKey)!;
  }

  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(monthStart);
  const daysArray = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startWeekday = getDay(monthStart);

  const previousMonthEnd = new Date(year, month, 0);
  const previousDays = [];
  for (let i = previousMonthEnd.getDate() - startWeekday + 1; i <= previousMonthEnd.getDate(); i++) {
    previousDays.push(new Date(year, month - 1, i));
  }

  const totalCells = 42;
  const nextDaysCount = totalCells - (previousDays.length + daysArray.length);
  const nextDays = [];
  for (let i = 1; i <= nextDaysCount; i++) {
    nextDays.push(new Date(year, month + 1, i));
  }

  const result = previousDays.concat(daysArray, nextDays);
  monthDaysCache.set(cacheKey, result);
  clearCacheIfNeeded(monthDaysCache);
  
  return result;
}

export const getWeekDates = (date: Date): Date[] => {
  const cacheKey = date.toISOString().split('T')[0];
  
  if (weekDatesCache.has(cacheKey)) {
    return weekDatesCache.get(cacheKey)!;
  }

  const start = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const result = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  
  weekDatesCache.set(cacheKey, result);
  clearCacheIfNeeded(weekDatesCache);
  
  return result;
};

// Export cache clearing function for memory management
export function clearDateCalculationCaches() {
  monthDaysCache.clear();
  weekDatesCache.clear();
  eventOccurrenceCache.clear();
}