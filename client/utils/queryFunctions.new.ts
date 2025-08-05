// New simplified API functions based on new_tanstack.md
import api from '@/utils/api';
import { Event } from '@/types/allTypes';

// Simple API functions - let TanStack Query handle error management
export const eventApi = {
  // Get individual event
  getEventById: async (eventId: string): Promise<Event> => {
    const response = await api.get(`/api/manageevents/eventslist/event/get/event/by/id?_id=${eventId}`);
    console.log('------', response.data.event)
    return response.data.event;
  },
  
  // User events
  getUpcomingEvents: async (userId: string, fromHomeScreen?: boolean): Promise<Event[]> => {
    const params = fromHomeScreen ? '?from_home_screen=true' : '';
    const response = await api.get(`/api/manageevents/eventslist/get/my/upcoming/events${params}`);
    return response.data.events || [];
  },
  
  getPastEvents: async (userId: string, page = 1, limit = 5, year?: number, month?: number): Promise<{ events: Event[]; hasMore: boolean; totalCount: number; currentPage: number; totalPages: number }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (year !== undefined) params.append('year', year.toString());
    if (month !== undefined) params.append('month', month.toString());
    
    const response = await api.get(`/api/manageevents/eventslist/get/my/past/events?${params}`);
    return {
      events: response.data.events || [],
      hasMore: response.data.hasMore || false,
      totalCount: response.data.totalCount || 0,
      currentPage: response.data.currentPage || page,
      totalPages: response.data.totalPages || 0,
    };
  },
  
  getAttentionRequired: async (userId: string, fromHomeScreen?: boolean): Promise<Event[]> => {
    const params = fromHomeScreen ? '?from_home_screen=true' : '';
    const response = await api.get(`/api/manageevents/eventslist/get/attention/required${params}`);
    return response.data.events || [];
  },
  
  // Discovery
  getNearbyEvents: async (lat: number, lng: number, distance: number): Promise<Event[]> => {
    const response = await api.get('/api/manageevents/eventslist/get/nearby/events', {
      params: { lat, lng, distance }
    });
    return response.data.events || [];
  },
  
  getRecommendedEvents: async (userId: string, page = 1, limit = 5): Promise<{ events: Event[]; hasMore: boolean; totalCount: number }> => {
    const response = await api.get('/api/manageevents/eventslist/get/recommended', {
      params: { page, limit }
    });
    return {
      events: response.data.events || [],
      hasMore: response.data.hasMore || false,
      totalCount: response.data.totalCount || 0
    };
  },
  
  getFriendsEvents: async (userId: string): Promise<Event[]> => {
    const response = await api.get('/api/manageevents/eventslist/friends');
    return response.data.events || [];
  },
  
  // Calendar
  getCalendarEvents: async (userId: string, month: number, year: number): Promise<Event[]> => {
    const response = await api.get('/api/manageevents/eventslist/get/my/events/month/view', {
      params: { month, year }
    });
    return response.data.events || [];
  },
  
  getCalendarRange: async (userId: string, startDate: string, endDate: string): Promise<Event[]> => {
    const response = await api.get('/api/manageevents/eventslist/get/my/events/range', {
      params: { start: startDate, end: endDate }
    });
    return response.data.events || [];
  },
  
  // Profile
  getUserEvents: async (viewerId: string, profileUserId: string): Promise<Event[]> => {
    const response = await api.get('/api/manageevents/eventslist/get/user/events', {
      params: { _id: profileUserId }
    });
    return response.data.events || [];
  },
  
  getUserEventCount: async (viewerId: string, profileUserId: string): Promise<number> => {
    const response = await api.get('/api/manageevents/eventslist/get/user/events/count', {
      params: { _id: profileUserId }
    });
    return response.data.count || 0;
  },

  // Mutations
  createEvent: async (eventData: Partial<Event>) => {
    const response = await api.post('/api/manageevents/eventslist/create/new/event', eventData);
    return response.data;
  },

  updateEvent: async (eventId: string, updates: Partial<Event>, options?: { occurrenceDate?: Date; modifyType?: 'this_only' | 'all_instances' }) => {
    const response = await api.put(`/api/manageevents/eventslist/update/${eventId}`, {
      ...updates,
      occurrence_date: options?.occurrenceDate,
      modify_type: options?.modifyType
    });
    return response.data;
  },

  deleteEvent: async (eventId: string) => {
    const response = await api.delete(`/api/manageevents/eventslist/delete/${eventId}`);
    return response.data;
  },
};