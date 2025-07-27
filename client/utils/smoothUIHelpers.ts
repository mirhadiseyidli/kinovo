import { Event } from '@/types/allTypes';

/**
 * Smooth UI Helpers for TanStack Query
 * 
 * This module provides utilities for creating smooth UI experiences with TanStack Query
 * using select, placeholderData, and keepPreviousData patterns.
 */

/**
 * Data transformation helpers for the select option
 * These prevent unnecessary re-renders by memoizing transformations
 */

// Transform events for display with computed properties
export const selectEventsWithDisplayData = (events: Event[] | undefined) => {
  if (!events) return [];
  
  return events.map(event => ({
    ...event,
    // Computed display properties
    displayDate: new Date(event.start_time || new Date()).toLocaleDateString(),
    displayTime: new Date(event.start_time || new Date()).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    duration: calculateEventDuration(event),
    isToday: isEventToday(event),
    isUpcoming: isEventUpcoming(event),
    attendeeCount: event.attendees?.length || 0,
    canEdit: event.creator?._id === event.creator?._id, // Would use current user ID
  }));
};

// Transform events for list display with minimal data
export const selectEventsForList = (events: Event[] | undefined) => {
  if (!events) return [];
  
  return events.map(event => ({
    _id: event._id,
    title: event.title,
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.location,
    category: event.category,
    isPublic: event.visibility === 'public',
    attendeeCount: event.attendees?.length || 0,
    displayDate: new Date(event.start_time || new Date()).toLocaleDateString(),
    displayTime: new Date(event.start_time || new Date()).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
  }));
};

// Transform events for calendar display
export const selectEventsForCalendar = (events: Event[] | undefined) => {
  if (!events) return [];
  
  return events.map(event => ({
    id: event._id,
    title: event.title,
    start: new Date(event.start_time || new Date()),
    end: new Date(event.end_time || new Date()),
    color: getCategoryColor(event.category || 'other'),
    allDay: isAllDayEvent(event),
    resource: {
      location: event.location,
      attendeeCount: event.attendees?.length || 0,
      isPublic: event.visibility === 'public',
    },
  }));
};

// Transform for search results with highlighting
export const selectEventsForSearch = (events: Event[] | undefined, searchTerm?: string) => {
  if (!events) return [];
  
  return events.map(event => ({
    ...event,
    highlightedTitle: highlightText(event.title, searchTerm),
    highlightedDescription: highlightText(event.description || '', searchTerm),
    relevanceScore: calculateRelevanceScore(event, searchTerm),
  })).sort((a, b) => b.relevanceScore - a.relevanceScore);
};

// Group events by date for section list
export const selectEventsGroupedByDate = (events: Event[] | undefined) => {
  if (!events) return [];
  
  const grouped = events.reduce((acc, event) => {
    const dateKey = new Date(event.start_time || new Date()).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, Event[]>);
  
  return Object.entries(grouped)
    .map(([date, events]) => ({
      title: formatSectionDate(date),
      data: events.sort((a, b) => 
        new Date(a.start_time || new Date()).getTime() - new Date(b.start_time || new Date()).getTime()
      ),
    }))
    .sort((a, b) => new Date(a.title).getTime() - new Date(b.title).getTime());
};

/**
 * Placeholder data generators
 * These provide smooth loading states while maintaining layout
 */

// Generate placeholder events for skeleton loading
export const generatePlaceholderEvents = (count: number = 3): (Event & { isPlaceholder: boolean })[] => {
  return Array.from({ length: count }, (_, index) => ({
    _id: `placeholder-${index}`,
    title: `Loading event ${index + 1}...`,
    description: 'Loading description...',
    start_time: new Date(Date.now() + index * 24 * 60 * 60 * 1000),
    end_time: new Date(Date.now() + index * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    location: {
      text: `Loading location...`,
      city: null,
      state: null,
      coordinates: { lat: null, lng: null }
    },
    creator: {
      _id: 'placeholder-user',
      first_name: 'Loading',
      last_name: 'User',
      full_name: 'Loading User',
      username: 'loading_user',
      email: 'loading@example.com',
      email_verified: false,
      phone_number: {
        country_code: null,
        area_code: null,
        phone_num: null,
        full_num: null
      },
      profile_picture: '',
      created_at: new Date(),
      mutualFriendsCount: 0
    },
    attendees: [],
    visibility: 'public',
    category: 'other',
    status: 'active',
    event_picture: null,
    created_at: new Date(),
    updated_at: new Date(),
    participants: ['placeholder-user'],
    images: [],
    isPlaceholder: true, // Flag to identify placeholder data
  }));
};

// Generate placeholder data for different scenarios
export const createPlaceholderData = {
  // Upcoming events placeholder
  upcomingEvents: () => generatePlaceholderEvents(5),
  
  // Past events placeholder
  pastEvents: () => generatePlaceholderEvents(8),
  
  // Calendar events placeholder
  calendarEvents: () => generatePlaceholderEvents(10),
  
  // Search results placeholder
  searchResults: () => generatePlaceholderEvents(6),
  
  // Nearby events placeholder
  nearbyEvents: () => generatePlaceholderEvents(4),
  
  // Attention required events placeholder
  attentionRequired: () => generatePlaceholderEvents(3).map(event => ({
    ...event,
    userStatus: 'pending' as 'pending',
    title: 'Pending invitation...',
  })),
};

/**
 * Helper functions for data transformation
 */

const calculateEventDuration = (event: Event): string => {
  const start = new Date(event.start_time || new Date());
  const end = new Date(event.end_time || new Date());
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours === 0) {
    return `${diffMinutes}m`;
  } else if (diffMinutes === 0) {
    return `${diffHours}h`;
  } else {
    return `${diffHours}h ${diffMinutes}m`;
  }
};

const isEventToday = (event: Event): boolean => {
  const today = new Date();
  const eventDate = new Date(event.start_time || new Date());
  return eventDate.toDateString() === today.toDateString();
};

const isEventUpcoming = (event: Event): boolean => {
  return new Date(event.start_time || new Date()) > new Date();
};

const getCategoryColor = (category: string): string => {
  const colors = {
    work: '#3B82F6',
    personal: '#EF4444',
    social: '#10B981',
    fitness: '#F59E0B',
    education: '#8B5CF6',
    other: '#6B7280',
  };
  return colors[category as keyof typeof colors] || colors.other;
};

const isAllDayEvent = (event: Event): boolean => {
  const start = new Date(event.start_time || new Date());
  const end = new Date(event.end_time || new Date());
  
  // Check if start is midnight and end is midnight next day
  return start.getHours() === 0 && 
         start.getMinutes() === 0 && 
         end.getHours() === 0 && 
         end.getMinutes() === 0 &&
         (end.getTime() - start.getTime()) >= 24 * 60 * 60 * 1000;
};

const highlightText = (text: string, searchTerm?: string): string => {
  if (!searchTerm || !text) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

const calculateRelevanceScore = (event: Event, searchTerm?: string): number => {
  if (!searchTerm) return 0;
  
  const term = searchTerm.toLowerCase();
  let score = 0;
  
  // Title matches get highest score
  if (event.title.toLowerCase().includes(term)) {
    score += 10;
  }
  
  // Description matches get medium score
  if (event.description?.toLowerCase().includes(term)) {
    score += 5;
  }
  
  // Location matches get low score
  if (event.location?.text?.toLowerCase().includes(term)) {
    score += 2;
  }
  
  // Category matches get low score
  if (event.category?.toLowerCase().includes(term)) {
    score += 1;
  }
  
  return score;
};

const formatSectionDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  }
};

/**
 * Utility functions for keepPreviousData scenarios
 */

// Check if data should be kept during refetch
export const shouldKeepPreviousData = (
  currentData: any,
  isLoading: boolean,
  isFetching: boolean,
  error: any
): boolean => {
  // Keep previous data if we have it and are refetching
  return Boolean(currentData && !isLoading && isFetching && !error);
};

// Merge previous data with new data for smooth transitions
export const mergeWithPreviousData = <T>(
  previousData: T[] | undefined,
  newData: T[] | undefined,
  keyExtractor: (item: T) => string
): T[] => {
  if (!previousData) return newData || [];
  if (!newData) return previousData;
  
  
  // Merge previous and new data, preferring new data
  const mergedData = [...previousData];
  
  // Update existing items and add new ones
  newData.forEach(newItem => {
    const key = keyExtractor(newItem);
    const existingIndex = mergedData.findIndex(item => keyExtractor(item) === key);
    
    if (existingIndex >= 0) {
      mergedData[existingIndex] = newItem;
    } else {
      mergedData.push(newItem);
    }
  });
  
  return mergedData;
};

/**
 * Error state helpers
 */

// Generate error state data that maintains layout
export const createErrorStateData = (error: any, previousData?: any) => {
  return {
    hasError: true,
    error,
    data: previousData || [],
    errorMessage: getErrorMessage(error),
    canRetry: canRetryError(error),
  };
};

const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

const canRetryError = (error: any): boolean => {
  // Network errors and 5xx errors can be retried
  if (!error?.response) return true;
  
  const status = error.response.status;
  return status >= 500 || status === 408 || status === 429;
};