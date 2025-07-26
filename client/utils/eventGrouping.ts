import { Event } from '@/types/allTypes';

export const THIS_MONTH = 'This Month';
export const LAST_MONTH = 'Last Month';

export interface GroupedEvents {
  [year: string]: {
    [month: string]: Event[];
  };
}

/**
 * Groups events by year and month for display in chronological order
 * 
 * @param events Array of events to group
 * @returns Grouped events object with year -> month -> events structure
 * 
 * Features:
 * - Sorts events from newest to oldest
 * - Uses "This Month" and "Last Month" labels for current/previous month
 * - Groups by actual month names for other months
 * - Handles edge cases like missing start_time
 */
export const groupEventsByYearAndMonth = (events: Event[]): GroupedEvents => {
  if (!events || events.length === 0) return {};

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const grouped: GroupedEvents = {};

  // Sort events from newest to oldest
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.start_time || 0);
    const dateB = new Date(b.start_time || 0);
    return dateB.getTime() - dateA.getTime();
  });

  sortedEvents.forEach(event => {
    if (!event.start_time) return;
    
    const eventDate = new Date(event.start_time);
    const eventYear = eventDate.getFullYear();
    const eventMonth = eventDate.getMonth();
    
    // Initialize year if not exists
    if (!grouped[eventYear]) {
      grouped[eventYear] = {};
    }

    // Determine month label
    let monthLabel: string;
    if (eventYear === currentYear && eventMonth === currentMonth) {
      monthLabel = THIS_MONTH;
    } else if (eventYear === currentYear && eventMonth === currentMonth - 1) {
      monthLabel = LAST_MONTH;
    } else {
      monthLabel = eventDate.toLocaleString('default', { month: 'long' });
    }

    // Initialize month if not exists
    if (!grouped[eventYear][monthLabel]) {
      grouped[eventYear][monthLabel] = [];
    }

    grouped[eventYear][monthLabel].push(event);
  });

  return grouped;
};

/**
 * Sorts month entries for display, prioritizing "This Month" and "Last Month"
 * 
 * @param monthEntries Array of [monthName, events] entries
 * @returns Sorted array with special months first
 */
export const sortMonthEntries = (monthEntries: [string, Event[]][]): [string, Event[]][] => {
  return monthEntries.sort(([monthA], [monthB]) => {
    if (monthA === THIS_MONTH) return -1;
    if (monthB === THIS_MONTH) return 1;
    if (monthA === LAST_MONTH) return -1;
    if (monthB === LAST_MONTH) return 1;
    return 0;
  });
};

/**
 * Sorts year entries for display (newest first)
 * 
 * @param yearEntries Array of [year, months] entries
 * @returns Sorted array with newest years first
 */
export const sortYearEntries = (yearEntries: [string, { [month: string]: Event[] }][]): [string, { [month: string]: Event[] }][] => {
  return yearEntries.sort(([yearA], [yearB]) => Number(yearB) - Number(yearA));
};