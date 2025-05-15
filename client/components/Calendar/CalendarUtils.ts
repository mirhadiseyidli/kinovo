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

export function doesEventOccurOnDay(date: Date, evt: Event): boolean {
  if (!evt.start_time) return false;

  const start = typeof evt.start_time === 'string' ? parseISO(evt.start_time) : evt.start_time;
  const recurrence = evt.recurrence;

  // If no recurrence or not checked, just compare exact day
  if (!recurrence || !recurrence.checked) {
    return isSameDay(date, start);
  }

  // Make sure we're not before the start time
  if (isBefore(date, start)) {
    return false;
  }

  // If there's an end_date for the recurrence, ensure we're not after it
  if (recurrence.end_date) {
    const end =
      typeof recurrence.end_date === 'string' ? parseISO(recurrence.end_date) : recurrence.end_date;
    if (isAfter(date, end)) {
      return false;
    }
  }

  // Handle different frequencies
  const freq = recurrence.frequency;

  switch (freq) {
    case 'daily': {
      return true;
    }
    case 'weekly': {
      const daysDiff = differenceInCalendarDays(date, start);
      return daysDiff % 7 === 0;
    }
    case 'monthly': {
      if (date.getDate() !== start.getDate()) {
        return false;
      }
      const monthsDiff = differenceInCalendarMonths(date, start);
      return monthsDiff >= 0;
    }
    case 'yearly': {
      if (date.getDate() === start.getDate() && date.getMonth() === start.getMonth()) {
        const yearsDiff = differenceInCalendarYears(date, start);
        return yearsDiff >= 0;
      }
      return false;
    }
    default:
      return false;
  }
}

export function getMonthDays(year: number, month: number): Date[] {
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

  return previousDays.concat(daysArray, nextDays);
}

export const getWeekDates = (date: Date): Date[] => {
  const start = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};