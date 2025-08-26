// Tool schemas using Zod - matching Kinovo database schemas
import { z } from 'zod';

// Event creation schema - matches eventsSchema.js
export const createEventSchema = z.object({
  title: z.string().describe('The title of the event'),
  start_time: z.string().datetime({ offset: true }).describe('Start time in ISO format with timezone'),
  end_time: z.string().datetime({ offset: true }).describe('End time in ISO format with timezone'),
  location: z.object({
    text: z.string().optional().describe('Location name only (use name field from searchLocation result, e.g., "Starbucks", "McDonald\'s", "College of San Mateo")'),
    city: z.string().optional().describe('City name (extract from address like "New York" from "Central Park, New York, NY 10024")'),
    state: z.string().optional().describe('State code (extract from address like "NY" from "Central Park, New York, NY 10024")'),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional().describe('Coordinates object from searchLocation result'),
  }).optional().describe('Event location - map from searchLocation tool results'),
  visibility: z.enum(['public', 'private', 'selected']).default('private'),
  description: z.string().optional().nullable(),
  category: z.string().describe('Must be a valid active category. Available categories include: Alpine Ski, Backcountry Ski, Badminton, Boxing, Canoeing, Crossfit, E-Bike Ride, Golf, Hike, Kayaking, Kickboxing, Mountain Bike Ride, Pickleball, Pilates, Rock Climbing, Run, Soccer, Swim, Tennis, Walk, Weight Training, Yoga, and others. Use exact capitalization.'),
  capacity: z.number().optional().nullable(),
  recurrence: z.object({
    checked: z.boolean().default(false),
    frequency: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).optional().nullable(),
    end_date: z.string().datetime({ offset: true }).optional().nullable(),
  }).optional(),
});

// Event update schema
export const updateEventSchema = z.object({
  eventId: z.string().describe('The MongoDB ObjectId of the event to update'),
  patch: z.object({
    title: z.string().optional(),
    start_time: z.string().datetime({ offset: true }).optional(),
    end_time: z.string().datetime({ offset: true }).optional(),
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
  query: z.string().nullish().describe('Search query for title or description'),
  categories: z.array(z.string()).nullish().describe('Array of category names'),
  max: z.number().min(1).max(10).default(3).describe('Maximum number of results'),
  start_time: z.string().datetime({ offset: true }).nullish().describe('Events starting after this time'),
  end_time: z.string().datetime({ offset: true }).nullish().describe('Events ending before this time'),
  location: z.object({
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    radius: z.number().default(10).describe('Search radius in miles'),
  }).nullish(),
  visibility: z.array(z.enum(['public', 'private', 'selected'])).nullish(),
  status: z.array(z.enum(['upcoming', 'ongoing', 'completed', 'cancelled'])).nullish(),
});

// Weather schema using Apple WeatherKit format
export const weatherSchema = z.object({
  lat: z.number().describe('Latitude'),
  lng: z.number().describe('Longitude'), 
  date: z.string().datetime({ offset: true }).optional().describe('Date for weather forecast'),
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
  departure_time: z.string().optional().describe('Planned departure time in ISO format (optional, defaults to current time)'),
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
  occurrenceDate: z.string().datetime({ offset: true }).optional().describe('For recurring events, specific occurrence date'),
  modifyType: z.enum(['this_occurrence', 'all_occurrences']).optional().describe('For recurring events, whether to join this specific occurrence or all future occurrences'),
});

// Event data schema for AI responses - matches full Event type
export const eventDataSchema = z.object({
  _id: z.string().describe('Event ID'),
  title: z.string().describe('Event title'),
  start_time: z.string().describe('Event start time in ISO format'),
  end_time: z.string().optional().describe('Event end time in ISO format'),
  location: z.object({
    text: z.string().nullable().describe('Location name or address'),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    coordinates: z.object({ lat: z.number().nullable(), lng: z.number().nullable() }).optional(),
    mapSnapshotUrl: z.object({
      light: z.string().nullable(),
      dark: z.string().nullable(),
    }).nullable().optional(),
  }).optional().describe('Event location'),
  category: z.string().nullable().optional().describe('Event category'),
  description: z.string().nullable().optional().describe('Event description'),
  visibility: z.string().optional().describe('Event visibility'),
  creator: z.object({
    _id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    username: z.string().optional(),
    profile_picture: z.string().nullable().optional(),
  }).nullable().optional().describe('Event creator'),
  attendees: z.array(z.object({
    user: z.object({
      _id: z.string(),
      full_name: z.string().optional(),
      profile_picture: z.string().nullable().optional(),
    }).optional(),
    status: z.enum(['pending', 'maybe', 'accepted', 'rejected']).optional(),
  })).optional().describe('Event attendees'),
  created_at: z.string().optional().describe('Event creation date'),
  updated_at: z.string().optional().describe('Event update date'),
  status: z.string().optional().describe('Event status'),
  capacity: z.number().nullable().optional(),
  isRecurring: z.boolean().optional(),
  recurrence: z.object({
    checked: z.boolean(),
    frequency: z.string().nullable(),
    end_date: z.string().nullable(),
  }).optional(),
  // User relationship fields
  userStatus: z.enum(['pending', 'maybe', 'accepted', 'rejected']).nullable().optional(),
  isUserAttending: z.boolean().optional(),
  isUserInvited: z.boolean().optional(),
  isUserCreator: z.boolean().optional(),
  isFriendEvent: z.boolean().optional(),
}).describe('Event details');

// Weather data schema for AI responses
export const weatherDataSchema = z.object({
  temperature: z.number().describe('Temperature in Fahrenheit (rounded to whole number)'),
  condition: z.string().describe('Weather condition'),
  conditionCode: z.string().optional().describe('Weather condition code'),
  humidity: z.number().optional().describe('Humidity percentage'),
  windSpeed: z.number().optional().describe('Wind speed'),
  emoji: z.string().optional().describe('Weather emoji representation'),
  recommendation: z.string().optional().describe('Weather-based recommendation'),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional().describe('Weather location coordinates'),
}).describe('Weather information');

// Traffic data schema for AI responses
export const trafficDataSchema = z.object({
  duration: z.string().describe('Travel duration'),
  distance: z.string().describe('Travel distance'),
  traffic: z.string().optional().describe('Traffic conditions'),
  condition: z.string().optional().describe('Traffic condition description'),
  emoji: z.string().optional().describe('Traffic emoji representation'),
  recommendation: z.string().optional().describe('Traffic-based recommendation'),
  coordinates: z.object({
    from: z.object({
      lat: z.number(),
      lng: z.number(),
    }).describe('Origin coordinates'),
    to: z.object({
      lat: z.number(),
      lng: z.number(),
    }).describe('Destination coordinates'),
  }).optional().describe('Route coordinates'),
  mapSnapshotUrl: z.object({
    light: z.string(),
    dark: z.string(),
  }).nullable().optional().describe('Map snapshot URLs'),
  locationName: z.string().optional().describe('Destination location name'),
}).describe('Traffic and directions information');

// Agent response schema
export const agentResponseSchema = z.object({
  message: z.string().describe('The main response message to show to the user'),
  events: z.array(eventDataSchema).optional().describe('Event cards to display'),
  weather: weatherDataSchema.nullish().describe('Weather card to display'),
  traffic: trafficDataSchema.nullish().describe('Traffic card to display'),
  actionTaken: z.string().optional().describe('Description of any action performed'),
  followUpSuggestions: z.array(z.string()).optional().describe('Suggested follow-up actions'),
  conversationId: z.string().optional().describe('Conversation ID for this session'),
}).describe('Complete agent response with text and structured data');