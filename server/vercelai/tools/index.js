// AI Tools Implementation
import { tool } from 'ai';
import { APIClient } from '../lib/api-client.js';
import { verifyUserToken } from '../lib/auth.js';
import {
  createEventSchema,
  updateEventSchema,
  cancelEventSchema,
  inviteUserSchema,
  removeUserSchema,
  searchEventsSchema,
  weatherSchema,
  trafficSchema,
  checkEventStatusSchema,
  getUserEventsSchema,
  findEventByTitleSchema,
  searchLocationSchema,
  joinEventSchema,
} from './schemas.js';
import { knowledgeBase } from './knowledge-base.js';
import mapKitService from '../../services/appleMapKitService.js';
import { calculateSmartEventRanking, isRecommendationQuery } from '../../utils/smartEventRanking.js';

// Create event tool
export const createEvent = tool({
  description: 'Create a new event with specified details. When using location data from searchLocation results, map the data correctly: text=name (location name only), coordinates=coordinates, parse city and state from address',
  parameters: createEventSchema,
  execute: async ({ title, start_time, end_time, location, visibility, description, category, capacity, recurrence }, { headers }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      const user = await verifyUserToken(token);
      const client = new APIClient(token);
      
      const eventData = {
        title,
        start_time,
        end_time,
        location,
        visibility,
        description,
        category,
        capacity,
        recurrence,
      };
      
      const result = await client.createEvent(eventData);
      
      // Invalidate insights cache after successful creation
      try {
        const { invalidateUserInsights } = await import('../api/insights.js');
        const userFromToken = await verifyUserToken(token);
        invalidateUserInsights(userFromToken.userId);
      } catch (error) {
        console.warn('Failed to invalidate insights cache:', error.message);
      }
      
      return {
        success: true,
        eventId: result.events[0]._id,
        message: `Event "${title}" created successfully`,
        event: JSON.parse(JSON.stringify(result.events[0])), // Ensure serializable
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// Update event tool
export const updateEvent = tool({
  description: 'Update an existing event',
  parameters: updateEventSchema,
  execute: async ({ eventId, patch }, { headers }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      await verifyUserToken(token);
      const client = new APIClient(token);
      
      // Handle recurring event compound IDs (format: eventId-YYYY-MM-DD)
      let processedEventId = eventId;
      const compoundIdMatch = eventId.match(/^([0-9a-fA-F]{24})-(\d{4}-\d{2}-\d{2})$/);
      if (compoundIdMatch) {
        processedEventId = compoundIdMatch[1]; // Extract base event ID
      }
      
      const result = await client.updateEvent(processedEventId, patch);
      return {
        success: true,
        message: 'Event updated successfully',
        eventId: processedEventId,
        originalEventId: eventId,
        event: JSON.parse(JSON.stringify(result.event)), // Ensure serializable
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// Cancel event tool
export const cancelEvent = tool({
  description: 'Cancel an event and optionally notify attendees',
  parameters: cancelEventSchema,
  execute: async ({ eventId, reason, notifyAttendees }, { headers }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      await verifyUserToken(token);
      const client = new APIClient(token);
      
      // Handle recurring event compound IDs (format: eventId-YYYY-MM-DD)
      let processedEventId = eventId;
      const compoundIdMatch = eventId.match(/^([0-9a-fA-F]{24})-(\d{4}-\d{2}-\d{2})$/);
      if (compoundIdMatch) {
        processedEventId = compoundIdMatch[1]; // Extract base event ID
      }
      
      // First update event status to cancelled
      await client.updateEvent(processedEventId, { status: 'cancelled' });
      
      // Then delete the event (which handles notifications)
      const result = await client.cancelEvent(processedEventId);
      
      // Invalidate insights cache after successful cancellation
      try {
        const { invalidateUserInsights } = await import('../api/insights.js');
        const userFromToken = await verifyUserToken(token);
        invalidateUserInsights(userFromToken.userId);
      } catch (error) {
        console.warn('Failed to invalidate insights cache:', error.message);
      }
      
      return {
        success: true,
        message: 'Event cancelled successfully',
        eventId: processedEventId,
        originalEventId: eventId,
        notifiedAttendees: notifyAttendees,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// Invite user tool
export const inviteUser = tool({
  description: 'Invite a user to an event',
  parameters: inviteUserSchema,
  execute: async ({ eventId, userId, message }, { headers }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      await verifyUserToken(token);
      const client = new APIClient(token);
      
      const result = await client.inviteUserToEvent(eventId, userId);
      return {
        success: true,
        message: 'User invited successfully',
        invitation: JSON.parse(JSON.stringify(result)), // Ensure serializable
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// Remove user tool
export const removeUser = tool({
  description: 'Remove a user from an event',
  parameters: removeUserSchema,
  execute: async ({ eventId, userId }, { headers }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      await verifyUserToken(token);
      const client = new APIClient(token);
      
      const result = await client.removeUserFromEvent(eventId, userId);
      return {
        success: true,
        message: 'User removed from event successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// Search events tool
export const searchEvents = tool({
  description: 'Search for events by title, description, location, or other criteria. Use this to find both public events and events you may want to join. When users ask for nearby events, recommendations, or suggestions without specific categories, this will intelligently rank events based on their preferences, friends, location, and past behavior.',
  parameters: searchEventsSchema,
  execute: async ({ query, categories, max, start_time, end_time, location, visibility, status }, { headers, userLocation, user }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      const userFromToken = await verifyUserToken(token);
      const client = new APIClient(token);
      
      // Use provided location or fall back to user's current location for nearby searches
      const searchLocation = location || (userLocation && !query ? {
        coordinates: { lat: userLocation.lat, lng: userLocation.lng },
        radius: 50 // Default 50 mile radius for "nearby" searches
      } : null);
      
      // Determine if this is a recommendation-type query
      const isRecommendation = isRecommendationQuery(query, { categories, location: searchLocation });
      
      const params = {
        ...(query && { query }),
        ...(categories && { categories: categories.join(',') }),
        ...(max && { limit: isRecommendation ? Math.max(max || 10, 20) : max }), // Get more results for smart ranking
        ...(start_time && { start_time }),
        ...(end_time && { end_time }),
        ...(searchLocation && {
          lat: searchLocation.coordinates.lat,
          lng: searchLocation.coordinates.lng,
          radius: searchLocation.radius,
        }),
        ...(visibility && { visibility: visibility.join(',') }),
        ...(status && { status: status.join(',') }),
      };
      
      const result = await client.searchEvents(params);
      let events = result.events || result;
      
      // Filter out invalid events with missing required fields
      events = events.filter(event => 
        event && 
        event._id && 
        event.title && 
        event.start_time && 
        event.location &&
        event.category
      );
      
      // Apply smart ranking for recommendation queries
      if (isRecommendation && events.length > 0) {
        try {
          const userId = userFromToken.userId || user?.userId;
          const userLoc = searchLocation?.coordinates || userLocation;
          
          // Apply smart ranking
          const rankedEvents = await calculateSmartEventRanking(
            events, 
            userId, 
            userLoc, 
            { 
              isRecommendationQuery: true,
              originalQuery: query,
              searchType: 'recommendation'
            }
          );
          
          // Limit to requested number after ranking
          events = rankedEvents.slice(0, max || 10);
          
          return {
            success: true,
            events: JSON.parse(JSON.stringify(events)), // Ensure serializable
            count: events.length,
            totalFound: rankedEvents.length,
            isSmartRanked: true,
            searchType: 'recommendation',
            message: `Found ${events.length} events ranked by your preferences, friends, and location`
          };
        } catch (rankingError) {
          console.warn('Smart ranking failed, falling back to basic results:', rankingError.message);
          // Fall back to original results if ranking fails
        }
      }
      
      return {
        success: true,
        events: JSON.parse(JSON.stringify(events)), // Ensure serializable
        count: events?.length || 0,
        isSmartRanked: false,
        searchType: isRecommendation ? 'recommendation_fallback' : 'search'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// Weather tool
export const weather = tool({
  description: 'Get weather information for a specific location and date',
  parameters: weatherSchema,
  execute: async ({ lat, lng, date }, { headers }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      await verifyUserToken(token);
      const client = new APIClient(token);
      
      const result = await client.getWeather(lat, lng, date);
      
      // Round temperature values to whole numbers
      if (result && result.currentWeather && result.currentWeather.temperature !== undefined) {
        result.currentWeather.temperature = Math.round(result.currentWeather.temperature);
      }
      
      return {
        success: true,
        weather: JSON.parse(JSON.stringify(result)), // Ensure serializable
        coordinates: { lat, lng }, // Include coordinates for iOS Weather app
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// Traffic tool
export const traffic = tool({
  description: 'Get traffic and direction information between two locations',
  parameters: trafficSchema,
  execute: async ({ from, to, departure_time }, { headers, user }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      await verifyUserToken(token);
      const client = new APIClient(token);
      
      // Get directions
      const result = await client.getDirections(from, to, departure_time);
      
      // Log the complete Google Maps API response to see what emoji/icon data is available
      console.log('🗺️ Google Maps API Response:', JSON.stringify(result, null, 2));
      
      // Generate map snapshot for destination only (matching event schema)
      let mapSnapshotUrl = null;
      if (to?.lat && to?.lng) {
        try {
          // Use the imported mapKitService directly
          const mapSnapshotResult = await mapKitService.getSnapshotAndUploadToS3({
            lat: to.lat,
            lon: to.lng,  // Note: using 'lon' not 'lng' as per the service API
            eventId: `traffic-${Date.now()}`,
            userId: user?.userId || 'ai-agent',
            width: 640,
            height: 265,
            zoom: 15,
            scale: 2
          });
          
          // Update with both light and dark map snapshot URLs
          mapSnapshotUrl = {
            light: mapSnapshotResult.light.cdnUrl,  // Using cdnUrl not url
            dark: mapSnapshotResult.dark.cdnUrl    // Using cdnUrl not url
          };
          console.log("SDKJHFKJSDHKJGHHJ", mapSnapshotUrl)
        } catch (snapshotError) {
          console.error('Error generating map snapshot for traffic:', snapshotError);
          // Don't fail traffic response if snapshot generation fails
        }
      }
      
      // Determine traffic emoji based on traffic conditions
      const normalDuration = result.routes?.[0]?.legs?.[0]?.duration?.value || 0;
      const trafficDuration = result.routes?.[0]?.legs?.[0]?.duration_in_traffic?.value || normalDuration;
      
      let trafficEmoji = '🟢'; // Default: light traffic
      let trafficCondition = 'Light traffic';
      
      if (trafficDuration > normalDuration) {
        const trafficRatio = trafficDuration / normalDuration;
        if (trafficRatio > 1.5) {
          trafficEmoji = '🔴'; // Heavy traffic (50%+ longer)
          trafficCondition = 'Heavy traffic';
        } else if (trafficRatio > 1.2) {
          trafficEmoji = '🟡'; // Moderate traffic (20%+ longer)
          trafficCondition = 'Moderate traffic';
        }
      }

      return {
        success: true,
        directions: JSON.parse(JSON.stringify(result)), // Ensure serializable
        duration: result.routes?.[0]?.legs?.[0]?.duration?.text,
        distance: result.routes?.[0]?.legs?.[0]?.distance?.text,
        traffic: result.routes?.[0]?.legs?.[0]?.duration_in_traffic?.text,
        emoji: trafficEmoji,
        condition: trafficCondition,
        // Include the complete result so we can see what emoji/icon data Google provides
        rawResult: result,
        coordinates: {
          from: { lat: from.lat, lng: from.lng }, // Origin coordinates for iOS Maps
          to: { lat: to.lat, lng: to.lng }, // Destination coordinates for iOS Maps
        },
        mapSnapshotUrl // Map snapshot for destination (matches event schema format)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// Check event status tool
export const checkEventStatus = tool({
  description: 'Check the user\'s relationship to an event (attendance status, creator status, invitation status)',
  parameters: checkEventStatusSchema,
  execute: async ({ eventId }, { headers }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      await verifyUserToken(token);
      const client = new APIClient(token);
      
      // Handle recurring event compound IDs (format: eventId-YYYY-MM-DD)
      let processedEventId = eventId;
      const compoundIdMatch = eventId.match(/^([0-9a-fA-F]{24})-(\d{4}-\d{2}-\d{2})$/);
      if (compoundIdMatch) {
        processedEventId = compoundIdMatch[1]; // Extract base event ID
      }
      
      const result = await client.getEvent(processedEventId);
      const event = result.found_event || result;
      
      return {
        success: true,
        event: JSON.parse(JSON.stringify(event)), // Ensure serializable
        originalEventId: eventId,
        processedEventId,
        message: `Event status checked for: ${event.title}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// Get user's own events tool
export const getUserEvents = tool({
  description: 'Get the user\'s own events (created or attending) - past, upcoming, or all events',
  parameters: getUserEventsSchema,
  execute: async ({ type, limit }, { headers }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      await verifyUserToken(token);
      const client = new APIClient(token);
      
      const result = await client.getUserEvents(type, limit);
      const events = result.events || result;
      
      return {
        success: true,
        events: JSON.parse(JSON.stringify(events)), // Ensure serializable
        count: events?.length || 0,
        type,
        message: `Found ${events?.length || 0} ${type} events`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        type,
        count: 0,
      };
    }
  },
});

// Find event by title tool
export const findEventByTitle = tool({
  description: 'Find a specific event by title or partial title from user\'s events',
  parameters: findEventByTitleSchema,
  execute: async ({ title, type }, { headers }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      await verifyUserToken(token);
      const client = new APIClient(token);
      
      const result = await client.getUserEvents(type, 50); // Get more events to search through
      const events = result.events || result;
      
      // Find events that match the title (case-insensitive partial match)
      const matchingEvents = events.filter(event => 
        event.title?.toLowerCase().includes(title.toLowerCase())
      );
      
      return {
        success: true,
        events: JSON.parse(JSON.stringify(matchingEvents)), // Ensure serializable
        count: matchingEvents?.length || 0,
        searchTitle: title,
        message: `Found ${matchingEvents?.length || 0} events matching "${title}"`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        searchTitle: title,
        count: 0,
      };
    }
  },
});

// Search location tool
export const searchLocation = tool({
  description: 'Search for a location using Google Places API. Use this to validate and get complete location details before creating events.',
  parameters: searchLocationSchema,
  execute: async ({ query, userLat, userLng }, { headers, userLocation }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      await verifyUserToken(token);
      const client = new APIClient(token);
      
      // Use provided coordinates or fall back to user's current location
      const lat = userLat || userLocation?.lat;
      const lng = userLng || userLocation?.lng;
      
      // Call the Google Places search endpoint
      const result = await client.searchLocation(query, lat, lng);
      
      // Format the results for easy confirmation
      const formattedResults = result.places?.slice(0, 3).map(place => ({
        name: place.displayName?.text || place.formattedAddress,
        address: place.formattedAddress,
        coordinates: {
          lat: place.location?.latitude,
          lng: place.location?.longitude
        },
        placeId: place.id,
        types: place.types
      })) || [];
      
      return {
        success: true,
        query,
        results: formattedResults,
        count: formattedResults.length,
        message: formattedResults.length > 0 
          ? `Found ${formattedResults.length} location${formattedResults.length > 1 ? 's' : ''} matching "${query}". Please confirm which one to use.`
          : `No locations found matching "${query}". Please try a different search.`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        query
      };
    }
  },
});

// Join event tool
export const joinEvent = tool({
  description: 'Join an event as the authenticated user. Use this when user wants to attend/join an event.',
  parameters: joinEventSchema,
  execute: async ({ eventId, status, occurrenceDate, modifyType }, { headers }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      await verifyUserToken(token);
      const client = new APIClient(token);
      
      // Handle recurring event compound IDs (format: eventId-YYYY-MM-DD)
      let processedEventId = eventId;
      let extractedOccurrenceDate = occurrenceDate;
      
      // Check if eventId contains a date suffix (for recurring events)
      const compoundIdMatch = eventId.match(/^([0-9a-fA-F]{24})-(\d{4}-\d{2}-\d{2})$/);
      if (compoundIdMatch) {
        processedEventId = compoundIdMatch[1]; // Extract base event ID
        if (!extractedOccurrenceDate) {
          extractedOccurrenceDate = compoundIdMatch[2] + 'T00:00:00.000Z'; // Convert to ISO format
        }
      }
      
      const result = await client.joinEvent(processedEventId, status, extractedOccurrenceDate, modifyType);
      
      // Invalidate insights cache after successful join
      try {
        const { invalidateUserInsights } = await import('../api/insights.js');
        const userFromToken = await verifyUserToken(token);
        invalidateUserInsights(userFromToken.userId);
      } catch (error) {
        console.warn('Failed to invalidate insights cache:', error.message);
      }
      
      return {
        success: true,
        message: `Successfully joined the event with status: ${status}`,
        eventId: processedEventId,
        originalEventId: eventId,
        status,
        occurrenceDate: extractedOccurrenceDate,
        result: JSON.parse(JSON.stringify(result)), // Ensure serializable
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        eventId,
      };
    }
  },
});

// Export all tools
export const tools = {
  createEvent,
  updateEvent,
  cancelEvent,
  inviteUser,
  removeUser,
  searchEvents,
  searchLocation,
  weather,
  traffic,
  checkEventStatus,
  getUserEvents,
  findEventByTitle,
  joinEvent,
  knowledgeBase
};