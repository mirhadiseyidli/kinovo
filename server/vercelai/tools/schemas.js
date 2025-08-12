// Tool schemas using Zod - matching Kinovo database schemas
import { z } from 'zod';

// Event creation schema - matches eventsSchema.js
export const createEventSchema = z.object({
  title: z.string().describe('The title of the event'),
  start_time: z.string().datetime().describe('Start time in ISO format'),
  end_time: z.string().datetime().describe('End time in ISO format'),
  location: z.object({
    text: z.string().optional().describe('Full address text'),
    city: z.string().optional(),
    state: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }).optional().describe('Event location'),
  visibility: z.enum(['public', 'private', 'selected']).default('private'),
  description: z.string().optional().nullable(),
  category: z.string().describe('Must be a valid active category'),
  capacity: z.number().optional().nullable(),
  recurrence: z.object({
    checked: z.boolean().default(false),
    frequency: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).optional().nullable(),
    end_date: z.string().datetime().optional().nullable(),
  }).optional(),
});

// Event update schema
export const updateEventSchema = z.object({
  eventId: z.string().describe('The MongoDB ObjectId of the event to update'),
  patch: z.object({
    title: z.string().optional(),
    start_time: z.string().datetime().optional(),
    end_time: z.string().datetime().optional(),
    location: z.object({
      text: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }).optional(),
    }).optional(),
    visibility: z.enum(['public', 'private', 'selected']).optional(),
    description: z.string().optional().nullable(),
    category: z.string().optional(),
    capacity: z.number().optional().nullable(),
    status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
  }).describe('Fields to update'),
});

// Cancel event schema
export const cancelEventSchema = z.object({
  eventId: z.string().describe('The MongoDB ObjectId of the event to cancel'),
  reason: z.string().optional().describe('Reason for cancellation'),
  notifyAttendees: z.boolean().default(true),
});

// Invite user schema
export const inviteUserSchema = z.object({
  eventId: z.string().describe('The MongoDB ObjectId of the event'),
  userId: z.string().describe('The MongoDB ObjectId of the user to invite'),
  message: z.string().optional().describe('Optional invitation message'),
});

// Remove user schema  
export const removeUserSchema = z.object({
  eventId: z.string().describe('The MongoDB ObjectId of the event'),
  userId: z.string().describe('The MongoDB ObjectId of the user to remove'),
});

// Search events schema
export const searchEventsSchema = z.object({
  query: z.string().optional().describe('Search query for title or description'),
  categories: z.array(z.string()).optional().describe('Array of category names'),
  max: z.number().min(1).max(50).default(10).describe('Maximum number of results'),
  start_time: z.string().datetime().optional().describe('Events starting after this time'),
  end_time: z.string().datetime().optional().describe('Events ending before this time'),
  location: z.object({
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    radius: z.number().default(10).describe('Search radius in kilometers'),
  }).optional(),
  visibility: z.array(z.enum(['public', 'private', 'selected'])).optional(),
  status: z.array(z.enum(['upcoming', 'ongoing', 'completed', 'cancelled'])).optional(),
});

// Weather schema using Apple WeatherKit format
export const weatherSchema = z.object({
  lat: z.number().describe('Latitude'),
  lng: z.number().describe('Longitude'), 
  date: z.string().datetime().optional().describe('Date for weather forecast'),
});

// Traffic schema
export const trafficSchema = z.object({
  from: z.object({
    lat: z.number(),
    lng: z.number(),
  }).describe('Starting location'),
  to: z.object({
    lat: z.number(),
    lng: z.number(),
  }).describe('Destination location'),
  departure_time: z.string().datetime().optional().describe('Planned departure time'),
});

// Check event status schema
export const checkEventStatusSchema = z.object({
  eventId: z.string().describe('The MongoDB ObjectId of the event to check status for'),
});

// Get user's own events schema
export const getUserEventsSchema = z.object({
  type: z.enum(['upcoming', 'past', 'all']).default('upcoming').describe('Type of events to retrieve'),
  limit: z.number().min(1).max(50).default(10).describe('Maximum number of events to return'),
});

// Find event by title schema
export const findEventByTitleSchema = z.object({
  title: z.string().describe('The title or partial title of the event to find'),
  type: z.enum(['upcoming', 'past', 'all']).default('all').describe('Type of events to search in'),
});

// Location search schema
export const searchLocationSchema = z.object({
  query: z.string().describe('The location query (e.g., "Central Park", "123 Main St, New York", "Starbucks near Times Square")'),
  userLat: z.number().optional().describe('User\'s current latitude for location bias'),
  userLng: z.number().optional().describe('User\'s current longitude for location bias'),
});

// Join event schema
export const joinEventSchema = z.object({
  eventId: z.string().describe('The MongoDB ObjectId of the event to join'),
  status: z.enum(['accepted', 'maybe']).default('accepted').describe('Attendance status - accepted means definitely attending, maybe means might attend'),
  occurrenceDate: z.string().datetime().optional().describe('For recurring events, specific occurrence date'),
  modifyType: z.enum(['this_occurrence', 'all_occurrences']).optional().describe('For recurring events, whether to join this specific occurrence or all future occurrences'),
});