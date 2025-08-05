import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys.new';
import { eventApi } from '@/utils/queryFunctions.new';

export const useCalendarEventsQuery = (month: number, year: number) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: queryKeys.calendarEvents(userId || '', month, year),
    queryFn: () => eventApi.getCalendarEvents(userId || '', month, year),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000, // Keep calendar data longer
  });
};

export const useCalendarRangeQuery = (startDate: string, endDate: string) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: queryKeys.calendarRange(userId || '', startDate, endDate),
    queryFn: () => eventApi.getCalendarRange(userId || '', startDate, endDate),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};