import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys.new';

export const updateInfiniteQueryCache = (
  queryClient: QueryClient,
  eventType: string,
  newEvent: any,
  userId?: string
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId });
  
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    const newPages = oldData.pages.map((page: any, pageIndex: number) => {
      if (pageIndex === 0) {
        return {
          ...page,
          events: [newEvent, ...page.events],
          totalCount: page.totalCount + 1,
        };
      }
      return page;
    });
    
    return { ...oldData, pages: newPages };
  });
};

export const removeFromInfiniteQueryCache = (
  queryClient: QueryClient,
  eventType: string,
  eventId: string,
  userId?: string
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId });
  
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    const newPages = oldData.pages.map((page: any) => ({
      ...page,
      events: page.events.filter((event: any) => event._id !== eventId),
      totalCount: Math.max(0, page.totalCount - 1),
    }));
    
    return { ...oldData, pages: newPages };
  });
};

export const updateInfiniteQueryCacheItem = (
  queryClient: QueryClient,
  eventType: string,
  eventId: string,
  updatedEvent: any,
  userId?: string
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId });
  
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    const newPages = oldData.pages.map((page: any) => ({
      ...page,
      events: page.events.map((event: any) => 
        event._id === eventId ? { ...event, ...updatedEvent } : event
      ),
    }));
    
    return { ...oldData, pages: newPages };
  });
};