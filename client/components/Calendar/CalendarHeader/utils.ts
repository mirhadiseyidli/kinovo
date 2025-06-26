import { MonthItem } from '@/types/allTypes';
import { addDays, format, startOfMonth } from 'date-fns';

// Performance optimization: Cache expensive calculations
const monthGridCache = new Map<string, any[]>();
const buildWindowCache = new Map<number, MonthItem[]>();
const buildYearCache = new Map<number, MonthItem[]>();

// Clear cache when it gets too large to prevent memory leaks
const MAX_CACHE_SIZE = 30;

function clearCacheIfNeeded<K, V>(cache: Map<K, V>) {
  if (cache.size > MAX_CACHE_SIZE) {
    cache.clear();
  }
}

// Derive a fallback for selected display when key is missing
export const getSelectedItem = (
  data: MonthItem[],
  selectedKey: string,
  currentDate: Date
): MonthItem => {
  const found = data.find(item => item.key === selectedKey);
  if (found) return found;
  // fallback to currentDate
  return {
    key: `${currentDate.getFullYear()}-${currentDate.getMonth()}`,
    year: currentDate.getFullYear(),
    month: currentDate.getMonth(),
    title: format(currentDate, 'MMM'),
  };
};

// Type and builder for a 3‑year rolling window of months
export const buildWindow = (centerYear: number): MonthItem[] => {
  // Performance optimization: Check cache first
  if (buildWindowCache.has(centerYear)) {
    return buildWindowCache.get(centerYear)!;
  }

  const years = [centerYear - 1, centerYear, centerYear + 1];
  const result = years.flatMap(y =>
    Array.from({ length: 12 }, (_, i) => ({
      key: `${y}-${i}`,
      year: y,
      month: i,
      title: format(new Date(y, i), 'MMM'),
    }))
  );

  // Cache the result
  clearCacheIfNeeded(buildWindowCache);
  buildWindowCache.set(centerYear, result);
  
  return result;
};

// Build 12 months for a single year
export const buildYearMonths = (year: number): MonthItem[] => {
  // Performance optimization: Check cache first
  if (buildYearCache.has(year)) {
    return buildYearCache.get(year)!;
  }

  const result = Array.from({ length: 12 }, (_, i) => ({
    key: `${year}-${i}`,
    year,
    month: i,
    title: format(new Date(year, i), 'MMM'),
  }));

  // Cache the result
  clearCacheIfNeeded(buildYearCache);
  buildYearCache.set(year, result);
  
  return result;
};


export const generateMonthGrid = (date: Date) => {
  // Performance optimization: Create cache key based on year and month
  const cacheKey = `${date.getFullYear()}-${date.getMonth()}`;
  
  if (monthGridCache.has(cacheKey)) {
    return monthGridCache.get(cacheKey)!;
  }

  const start = startOfMonth(date);
  const startWeekday = start.getDay(); // 0 = Sunday, 6 = Saturday
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const days = [];

  // Pad with nulls for days before the first of the month
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }

  // Add actual days of the month
  for (let i = 0; i < daysInMonth; i++) {
    days.push(addDays(start, i));
  }

  // Pad with nulls for days after the last of the month to complete the grid
  const totalCells = days.length;
  const remainder = totalCells % 7;
  if (remainder !== 0) {
    const trailingNulls = 7 - remainder;
    for (let i = 0; i < trailingNulls; i++) {
      days.push(null);
    }
  }

  // Cache the result
  clearCacheIfNeeded(monthGridCache);
  monthGridCache.set(cacheKey, days);

  return days;
};

// Export cache clearing functions for memory management
export function clearCalendarHeaderCaches() {
  monthGridCache.clear();
  buildWindowCache.clear();
  buildYearCache.clear();
}