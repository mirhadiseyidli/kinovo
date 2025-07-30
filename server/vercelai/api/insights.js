// AI Insights Edge Function - Fast insights for app launch
import { generateObject } from 'ai';
import { z } from 'zod';
import { chatModel, INSIGHT_CONFIG } from '../config/ai.config.js';
import { verifyUserToken } from '../lib/auth.js';
import { APIClient } from '../lib/api-client.js';
// Import vector search service for RAG-based personalization
// Note: This needs to be imported dynamically due to CommonJS/ES module differences
// Simple in-memory cache for insights (replace with Redis in production)
const insightCache = new Map();

// Cleanup expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of insightCache.entries()) {
    if (value.expires < now) {
      insightCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

// Cache invalidation function
export function invalidateUserInsights(userId) {
  const cacheKey = `insight_${userId}`;
  const deleted = insightCache.delete(cacheKey);
  console.log(`🗑️ Cache invalidation for user ${userId}: ${deleted ? 'SUCCESS' : 'NOT_FOUND'}`);
  return deleted;
}

// Event card schema for upcoming events
const eventCardSchema = z.object({
  eventId: z.string().describe('MongoDB ObjectId of the event'),
  title: z.string().describe('Event title'),
  date: z.string().describe('Event date in readable format (e.g., "Today", "Tomorrow", "Dec 25")'),
  time: z.string().describe('Event time in readable format (e.g., "2:00 PM", "10:30 AM")'),
  location: z.string().describe('Event location name or address'),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional().describe('Event coordinates for weather/traffic'),
  category: z.string().describe('Event category/type'),
});

// Weather sub-card schema
const weatherCardSchema = z.object({
  temperature: z.string().describe('Temperature with unit (e.g., "72°F", "22°C")'),
  condition: z.string().describe('Weather condition (e.g., "Sunny", "Cloudy", "Rain")'),
  emoji: z.string().describe('Weather emoji (☀️, ⛅, 🌧️, etc.)'),
  recommendation: z.string().describe('Brief weather advice (e.g., "Perfect weather!", "Bring an umbrella")'),
});

// Traffic sub-card schema  
const trafficCardSchema = z.object({
  duration: z.string().describe('Travel time (e.g., "15 min", "30 min")'),
  condition: z.string().describe('Traffic condition (e.g., "Light traffic", "Heavy traffic")'),
  emoji: z.string().describe('Traffic emoji (🟢, 🟡, 🔴)'),
  recommendation: z.string().describe('Brief traffic advice (e.g., "Good time to go!", "Leave 10 min early")'),
});

// Enhanced insight card schema
const insightCardSchema = z.object({
  title: z.string().describe('Short, engaging title (max 50 chars)'),
  subtitle: z.string().describe('Supporting detail or context (max 80 chars)'),
  emoji: z.string().describe('Single emoji that represents the insight'),
  type: z.enum(['event', 'social', 'suggestion', 'achievement']).describe('Type of insight'),
  
  // Event-specific data
  event: eventCardSchema.optional().describe('Event details if type is "event"'),
  weather: weatherCardSchema.optional().describe('Weather info for upcoming events'),
  traffic: trafficCardSchema.optional().describe('Traffic info for upcoming events'),
  
  // Full event data (not processed by AI, added by backend)
  fullEventData: z.any().optional().describe('Complete event object with attendees from backend'),
  
  cta: z.object({
    text: z.string().describe('Call to action text (e.g., "View Event", "Add Friends")'),
    action: z.enum(['navigate', 'create', 'explore']).describe('Type of action'),
    target: z.string().optional().describe('Navigation target (e.g., eventId, screen name)'),
  }).optional(),
  priority: z.number().min(1).max(10).default(6).describe('Priority score for sorting multiple insights (1-10, defaults to 6)'),
});

// Edge runtime configuration
export const config = {
  runtime: 'edge',
};

async function getUserContext(token, userId, userLat = null, userLng = null) {
  const client = new APIClient(token);
  
  // Fetch minimal data for quick insights
  const [upcomingEventsResponse, userProfile] = await Promise.all([
    client.request('GET', '/api/manageevents/eventslist/get/my/upcoming/events').catch(() => ({ events: [] })),
    client.request('GET', '/api/users/me').catch(() => null),
  ]);
  
  // Handle different possible response structures
  let upcomingEvents = [];
  if (Array.isArray(upcomingEventsResponse)) {
    upcomingEvents = upcomingEventsResponse;
  } else if (upcomingEventsResponse && Array.isArray(upcomingEventsResponse.events)) {
    upcomingEvents = upcomingEventsResponse.events;
  } else if (upcomingEventsResponse && Array.isArray(upcomingEventsResponse.data)) {
    upcomingEvents = upcomingEventsResponse.data;
  }
  
  console.log(`📊 Found ${upcomingEvents.length} upcoming events for insights`);
  if (upcomingEvents.length > 0) {
    console.log(`📅 Next event: "${upcomingEvents[0]?.title}" at ${upcomingEvents[0]?.start_time}`);
  }

  let weatherData = null;
  let trafficData = null;
  let insightType = 'suggestion'; // Default type
  let priorityEvent = null;
  
  // Determine insight type and priority event based on timing
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  
  // Find events happening today
  const todaysEvents = upcomingEvents.filter(event => {
    if (!event?.start_time) return false;
    const eventDate = new Date(event.start_time);
    return eventDate >= today && eventDate < todayEnd;
  });
  
  // Find events happening in next 3 hours
  const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const urgentEvents = todaysEvents.filter(event => {
    if (!event?.start_time) return false;
    const eventDate = new Date(event.start_time);
    return eventDate <= threeHoursFromNow;
  });
  
  // Determine insight type and priority event
  if (urgentEvents.length > 0) {
    // Case 1: Event within 3 hours - show detailed event info with weather/traffic
    insightType = 'event';
    priorityEvent = urgentEvents[0]; // Closest event
  } else if (todaysEvents.length > 0) {
    // Case 2: Events today but not urgent - show today's plans
    insightType = 'social';
    priorityEvent = todaysEvents[0]; // Next event today
  } else {
    // Case 3: No events today - show suggestions
    insightType = 'suggestion';
    priorityEvent = upcomingEvents[0] || null; // Next upcoming event if any
  }
  
  console.log(`🎯 Insight type: ${insightType}, Priority event: ${priorityEvent?.title || 'none'}`);
  console.log(`📊 Today's events: ${todaysEvents.length}, Urgent events: ${urgentEvents.length}`);
  
  // Fetch weather and traffic data for urgent events (Case 1)
  if (insightType === 'event' && priorityEvent?.location?.coordinates) {
    const { lat, lng } = priorityEvent.location.coordinates;
    
    try {
      // For traffic, we need user's current location. Using event location as both origin and destination for now
      // In production, origin should be user's current location
      const eventTime = new Date(priorityEvent.start_time);
      const departureTimeUnix = Math.floor(eventTime.getTime() / 1000); // Convert to Unix timestamp
      
      // Prepare traffic request - use user's location as origin if available
      let trafficPromise = null;
      if (userLat && userLng) {
        console.log(`🚗 Fetching traffic from user location (${userLat}, ${userLng}) to event (${lat}, ${lng})`);
        // Use user's current location as origin, event location as destination
        trafficPromise = client.request('GET', `/api/google/directions?origin=${userLat},${userLng}&destination=${lat},${lng}&departure_time=${departureTimeUnix}&mode=driving&traffic_model=best_guess`).catch((error) => {
          console.error('🚗 Traffic API error:', error.message);
          return null;
        });
      } else {
        console.log(`📍 User location not available - skipping traffic data (userLat: ${userLat}, userLng: ${userLng})`);
      }
      
      // Fetch weather and traffic in parallel
      const [weather, traffic] = await Promise.allSettled([
        client.request('GET', `/api/weather/get/location/weather?lat=${lat}&lon=${lng}&date=${priorityEvent.start_time}`).catch(() => null),
        trafficPromise,
      ]);
      
      // Extract only essential weather data
      weatherData = weather.status === 'fulfilled' && weather.value?.currentWeather ? {
        temperature: weather.value.currentWeather.temperature,
        conditionCode: weather.value.currentWeather.conditionCode,
        humidity: weather.value.currentWeather.humidity,
        windSpeed: weather.value.currentWeather.windSpeed
      } : null;
      
      // Extract only essential traffic data
      trafficData = traffic.status === 'fulfilled' && traffic.value?.routes?.[0] ? {
        status: traffic.value.status,
        route: {
          duration: traffic.value.routes[0].legs?.[0]?.duration,
          duration_in_traffic: traffic.value.routes[0].legs?.[0]?.duration_in_traffic,
          distance: traffic.value.routes[0].legs?.[0]?.distance
        }
      } : null;
      
      console.log(`🌤️ Weather data (trimmed):`, weatherData);
      console.log(`🚗 Traffic data (trimmed):`, trafficData);
      console.log(`📍 User location: ${userLat && userLng ? `${userLat}, ${userLng}` : 'Not provided'}`);
      console.log(`🎯 Event location: ${lat}, ${lng}`);
    } catch (error) {
      console.warn('Failed to fetch weather/traffic data for insights:', error);
    }
  }

  // Build RAG context for personalized recommendations
  let ragContext = null;
  try {
    // Dynamic import for vector search service
    const { buildRAGContext } = await import('../../services/vectorSearchService.js');
    
    // Get personalized context based on user's interests and event history
    const contextQuery = userProfile?.interests?.join(' ') || 'events activities';
    ragContext = await buildRAGContext(userId, contextQuery, {
      includeEvents: true,
      includeUsers: false, // Skip for insights to keep it fast
      includeConversations: false, // Skip for insights
      maxEvents: 3, // Limit for performance
    });
  } catch (error) {
    console.error('Failed to build RAG context for insights:', error);
    // Continue without RAG data - graceful degradation
  }

  return {
    upcomingEvents: upcomingEvents || [],
    nextEvent: upcomingEvents[0] || null, // For backward compatibility
    eventCount: upcomingEvents.length || 0,
    userName: userProfile?.first_name || 'there',
    interests: userProfile?.interests || [],
    // Timing-based insight logic
    insightType,
    priorityEvent,
    priorityEventFull: priorityEvent, // Full event object with attendees for frontend
    todaysEvents,
    urgentEvents,
    // Weather and traffic data for urgent events
    weatherData,
    trafficData,
    // RAG-enhanced data
    recommendedEvents: ragContext?.sources?.find(s => s.type === 'events')?.data || [],
    hasPersonalizedData: !!ragContext && ragContext.sources.length > 0,
  };
}

export default async function handler(req) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await verifyUserToken(token);
    const method = req.method;
    
    // Extract user location from query parameters
    let userLat = null;
    let userLng = null;
    
    try {
      const url = new URL(req.url);
      userLat = url.searchParams.get('userLat');
      userLng = url.searchParams.get('userLng');
    } catch (error) {
      console.warn('Failed to parse URL for location parameters:', error);
    }

    // Handle cache invalidation (POST request)
    if (method === 'POST') {
      const deleted = invalidateUserInsights(user.userId);
      return new Response(JSON.stringify({ 
        success: true, 
        invalidated: deleted,
        message: deleted ? 'Cache cleared successfully' : 'No cache to clear'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle insights generation (GET request)
    if (method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cacheKey = `insight_${user.userId}`;

    // Check cache first
    const cached = insightCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }

    // Get user context with RAG-enhanced recommendations
    const context = await getUserContext(token, user.userId, userLat, userLng);

    // Build enhanced prompt based on timing logic
    const now = new Date();
    const currentTime = now.toLocaleTimeString();
    const currentDate = now.toLocaleDateString();
    
    let prompt = `Generate a personalized insight card for ${context.userName}'s app launch.

Current Time: ${currentDate} at ${currentTime}

Context:
- Total upcoming events: ${context.eventCount}
- Today's events: ${context.todaysEvents.length || 0}
- Urgent events (next 3 hours): ${context.urgentEvents.length || 0}
- User interests: ${context.interests?.join(', ') || 'Not specified'}
- Insight type to generate: ${context.insightType}`;

    // Add case-specific context
    if (context.insightType === 'event' && context.priorityEvent) {
      // Case 1: Urgent event within 3 hours
      const timeUntilEvent = new Date(context.priorityEvent.start_time).getTime() - now.getTime();
      const hoursUntilEvent = Math.round(timeUntilEvent / (1000 * 60 * 60 * 10)) / 100; // Round to 2 decimals
      
      prompt += `\n\nURGENT EVENT (within 3 hours):
- Title: ${context.priorityEvent.title}
- Starts in: ${hoursUntilEvent} hours
- Date: ${new Date(context.priorityEvent.start_time).toLocaleDateString()}
- Time: ${new Date(context.priorityEvent.start_time).toLocaleTimeString()}
- Location: ${context.priorityEvent.location?.text || 'TBD'}
- Category: ${context.priorityEvent.category || 'General'}
- Event ID: ${context.priorityEvent._id}`;

      if (context.priorityEvent.location?.coordinates) {
        prompt += `\n- Coordinates: ${context.priorityEvent.location.coordinates.lat}, ${context.priorityEvent.location.coordinates.lng}`;
      }
    } else if (context.insightType === 'social' && context.todaysEvents.length > 0) {
      // Case 2: Events today but not urgent
      prompt += `\n\nTODAY'S EVENTS:`;
      context.todaysEvents.forEach((event, index) => {
        prompt += `\n${index + 1}. "${event.title}" at ${new Date(event.start_time).toLocaleTimeString()} - ${event.location?.text || 'TBD'}`;
      });
      
      if (context.priorityEvent) {
        prompt += `\n\nNext Event Today:
- Title: ${context.priorityEvent.title}
- Time: ${new Date(context.priorityEvent.start_time).toLocaleTimeString()}
- Location: ${context.priorityEvent.location?.text || 'TBD'}
- Event ID: ${context.priorityEvent._id}`;
      }
    } else if (context.priorityEvent) {
      // Case 3: Future events but none today
      prompt += `\n\nNext Upcoming Event:
- Title: ${context.priorityEvent.title}
- Date: ${new Date(context.priorityEvent.start_time).toLocaleDateString()}
- Time: ${new Date(context.priorityEvent.start_time).toLocaleTimeString()}
- Location: ${context.priorityEvent.location?.text || 'TBD'}
- Event ID: ${context.priorityEvent._id}`;
    }

    // Add weather data if available
    if (context.weatherData) {
      prompt += `\n\nWeather Data:
- Temperature: ${Math.round(context.weatherData.temperature) || 'N/A'}°C
- Condition: ${context.weatherData.conditionCode || 'N/A'}`;
    }

    // Add traffic data if available
    if (context.trafficData?.route) {
      const route = context.trafficData.route;
      prompt += `\n\nTraffic Data:
- Duration: ${route.duration?.text || 'N/A'}
- Distance: ${route.distance?.text || 'N/A'}
- Traffic Duration: ${route.duration_in_traffic?.text || route.duration?.text || 'N/A'}`;
    }

    // Add RAG-based recommendations if available
    if (context.hasPersonalizedData && context.recommendedEvents.length > 0) {
      prompt += `\n\nPersonalized Recommendations (based on user history and preferences):`;
      context.recommendedEvents.forEach((event, index) => {
        prompt += `\n${index + 1}. "${event.title}" - ${event.category} (${event.location})`;
      });
      prompt += `\n\nThese recommendations are based on the user's event history and preferences. Use this to create more targeted suggestions.`;
    }

    prompt += `\n\nGenerate insight for type: ${context.insightType}

${context.insightType === 'event' ? 'EVENT TYPE - Include event card with weather/traffic data. Use gentle, helpful language like "Your event starts in 1 hour" or "Time to head out soon".' : ''}
${context.insightType === 'social' ? 'SOCIAL TYPE - Focus on today\'s schedule with friendly, organized language.' : ''}
${context.insightType === 'suggestion' ? 'SUGGESTION TYPE - Encourage discovery with warm, inviting language.' : ''}

Language Guidelines:
- Use calm, helpful tone (avoid "urgent", "emergency", "alert")
- Be informative but not overwhelming
- Examples: "Your event starts soon", "Time to get ready", "Perfect timing"
- Focus on being helpful rather than alarming

Requirements:
- title/subtitle: Keep concise (<50/80 chars)  
- priority: 1-10 (required)
- Weather: Convert °C to °F, use friendly condition names
- Traffic: Use duration_in_traffic for travel time`;

    const result = await generateObject({
      model: chatModel,
      schema: insightCardSchema,
      prompt,
      temperature: INSIGHT_CONFIG.temperature,
      maxTokens: INSIGHT_CONFIG.maxTokens,
    });

    const insight = result.object;

    // Add full event data for urgent events (for attendee information)
    if (context.insightType === 'event' && context.priorityEventFull) {
      insight.fullEventData = context.priorityEventFull;
      console.log(`📋 Added full event data with ${context.priorityEventFull.attendees?.length || 0} attendees`);
    }

    // Cache the result
    insightCache.set(cacheKey, {
      data: insight,
      expires: Date.now() + INSIGHT_CONFIG.cacheTime,
    });

    return new Response(JSON.stringify(insight), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    console.error('Insights error:', error);
    
    // Return a fallback insight on error
    const fallbackInsight = {
      title: "Welcome back!",
      subtitle: "Check out what's happening around you",
      emoji: "👋",
      type: "suggestion",
      cta: {
        text: "Explore Events",
        action: "explore",
      },
      priority: 5,
    };

    return new Response(JSON.stringify(fallbackInsight), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}