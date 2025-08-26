// AI Insights Streaming Edge Function - Real-time insights generation
import { streamObject } from 'ai';
import { z } from 'zod';
import { chatModel, INSIGHT_CONFIG } from '../config/ai.config.js';
import { verifyUserToken } from '../lib/auth.js';
import { APIClient } from '../lib/api-client.js';

// Import the same schemas and context function from the regular insights handler
import { default as regularInsightsHandler } from './insights.js';

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
  duration: z.string().describe('Travel time using h and m format (e.g., "15m", "1h 30m", "2h")'),
  condition: z.string().describe('Traffic condition (e.g., "Light traffic", "Heavy traffic")'),
  emoji: z.string().describe('Traffic emoji (🟢, 🟡, 🔴)'),
  recommendation: z.string().describe('Brief traffic advice (e.g., "Good time to go!", "Leave 10 min early")'),
});

// Enhanced insight card schema for streaming
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

// Reuse the getUserContext function from the regular insights handler
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
    insightType = 'event';
    priorityEvent = urgentEvents[0];
  } else if (todaysEvents.length > 0) {
    insightType = 'social';
    priorityEvent = todaysEvents[0];
  } else {
    insightType = 'suggestion';
    priorityEvent = upcomingEvents[0] || null;
  }
  
  // Fetch weather and traffic data for urgent events
  if (insightType === 'event' && priorityEvent?.location?.coordinates) {
    const { lat, lng } = priorityEvent.location.coordinates;
    
    try {
      const eventTime = new Date(priorityEvent.start_time);
      const departureTimeUnix = Math.floor(eventTime.getTime() / 1000);
      
      let trafficPromise = null;
      if (userLat && userLng) {
        trafficPromise = client.request('GET', `/api/google/directions?origin=${userLat},${userLng}&destination=${lat},${lng}&departure_time=${departureTimeUnix}&mode=driving&traffic_model=best_guess`).catch((error) => {
          console.error('🚗 Traffic API error:', error.message);
          return null;
        });
      }
      
      const [weather, traffic] = await Promise.allSettled([
        client.request('GET', `/api/weather/get/location/weather?lat=${lat}&lon=${lng}&date=${priorityEvent.start_time}`).catch(() => null),
        trafficPromise,
      ]);
      
      weatherData = weather.status === 'fulfilled' && weather.value?.currentWeather ? {
        temperature: weather.value.currentWeather.temperature,
        conditionCode: weather.value.currentWeather.conditionCode,
        humidity: weather.value.currentWeather.humidity,
        windSpeed: weather.value.currentWeather.windSpeed
      } : null;
      
      trafficData = traffic.status === 'fulfilled' && traffic.value?.routes?.[0] ? {
        status: traffic.value.status,
        route: {
          duration: traffic.value.routes[0].legs?.[0]?.duration,
          duration_in_traffic: traffic.value.routes[0].legs?.[0]?.duration_in_traffic,
          distance: traffic.value.routes[0].legs?.[0]?.distance
        }
      } : null;
    } catch (error) {
      console.warn('Failed to fetch weather/traffic data for insights:', error);
    }
  }

  // Build RAG context for personalized recommendations
  let ragContext = null;
  try {
    const { buildRAGContext } = await import('../../services/vectorSearchService.js');
    const contextQuery = userProfile?.interests?.join(' ') || 'events activities';
    ragContext = await buildRAGContext(userId, contextQuery, {
      includeEvents: true,
      includeUsers: false,
      includeConversations: false,
      maxEvents: 3,
    });
  } catch (error) {
    console.error('Failed to build RAG context for insights:', error);
  }

  return {
    upcomingEvents: upcomingEvents || [],
    nextEvent: upcomingEvents[0] || null,
    eventCount: upcomingEvents.length || 0,
    userName: userProfile?.first_name || 'there',
    interests: userProfile?.interests || [],
    insightType,
    priorityEvent,
    priorityEventFull: priorityEvent,
    todaysEvents,
    urgentEvents,
    weatherData,
    trafficData,
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
    
    if (method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
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

    // Get user context
    const context = await getUserContext(token, user.userId, userLat, userLng);

    // Build enhanced prompt (same as regular insights)
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

    // Add case-specific context (same as regular insights)
    if (context.insightType === 'event' && context.priorityEvent) {
      const timeUntilEvent = new Date(context.priorityEvent.start_time).getTime() - now.getTime();
      const hoursUntilEvent = Math.round(timeUntilEvent / (1000 * 60 * 60 * 10)) / 100;
      
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
      prompt += `\n\nNext Upcoming Event:
- Title: ${context.priorityEvent.title}
- Date: ${new Date(context.priorityEvent.start_time).toLocaleDateString()}
- Time: ${new Date(context.priorityEvent.start_time).toLocaleTimeString()}
- Location: ${context.priorityEvent.location?.text || 'TBD'}
- Event ID: ${context.priorityEvent._id}`;
    }

    // Add weather and traffic data
    if (context.weatherData) {
      prompt += `\n\nWeather Data:
- Temperature: ${Math.round(context.weatherData.temperature) || 'N/A'}°C
- Condition: ${context.weatherData.conditionCode || 'N/A'}`;
    }

    if (context.trafficData?.route) {
      const route = context.trafficData.route;
      prompt += `\n\nTraffic Data:
- Duration: ${route.duration?.text || 'N/A'}
- Distance: ${route.distance?.text || 'N/A'}
- Traffic Duration: ${route.duration_in_traffic?.text || route.duration?.text || 'N/A'}`;
    }

    // Add RAG-based recommendations
    if (context.hasPersonalizedData && context.recommendedEvents.length > 0) {
      prompt += `\n\nPersonalized Recommendations (based on user history and preferences):`;
      context.recommendedEvents.forEach((event, index) => {
        prompt += `\n${index + 1}. "${event.title}" - ${event.category} (${event.location})`;
      });
    }

    prompt += `\n\nGenerate insight for type: ${context.insightType}

${context.insightType === 'event' ? 'EVENT TYPE - Include event card with weather/traffic data. Use gentle, helpful language.' : ''}
${context.insightType === 'social' ? 'SOCIAL TYPE - Focus on today\'s schedule with friendly, organized language.' : ''}
${context.insightType === 'suggestion' ? 'SUGGESTION TYPE - Encourage discovery with warm, inviting language.' : ''}

Language Guidelines:
- Use calm, helpful tone
- Be informative but not overwhelming
- Focus on being helpful rather than alarming

Requirements:
- title/subtitle: Keep concise (<50/80 chars)  
- priority: 1-10 (required)
- Weather: Convert °C to °F, use friendly condition names
- Traffic: Use duration_in_traffic for travel time`;

    // Use streamObject for real-time generation
    const result = await streamObject({
      model: chatModel,
      schema: insightCardSchema,
      prompt,
      temperature: INSIGHT_CONFIG.temperature,
      maxTokens: INSIGHT_CONFIG.maxTokens,
    });

    // Collect the complete insight first, then stream it manually
    let insight = {};
    const encoder = new TextEncoder();
    
    // First, collect the complete insight from the AI
    for await (const partialObject of result.partialObjectStream) {
      insight = { ...insight, ...partialObject };
    }

    // Add full event data for urgent events
    if (context.insightType === 'event' && context.priorityEventFull) {
      insight.fullEventData = context.priorityEventFull;
    }
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection event
          controller.enqueue(encoder.encode(`data: {"type": "connect", "content": ""}\n\n`));

          // Now manually stream the title character by character
          if (insight.title) {
            for (let i = 0; i < insight.title.length; i++) {
              const char = insight.title[i];
              controller.enqueue(encoder.encode(`data: {"type": "title", "content": "${char.replace(/"/g, '\\"')}"}\n\n`));
              await new Promise(resolve => setTimeout(resolve, 30)); // 30ms per character
            }
          }

          // Small pause between title and subtitle
          await new Promise(resolve => setTimeout(resolve, 200));

          // Stream the subtitle character by character
          if (insight.subtitle) {
            for (let i = 0; i < insight.subtitle.length; i++) {
              const char = insight.subtitle[i];
              controller.enqueue(encoder.encode(`data: {"type": "subtitle", "content": "${char.replace(/"/g, '\\"')}"}\n\n`));
              await new Promise(resolve => setTimeout(resolve, 25)); // 25ms per character
            }
          }

          // Send other data updates
          if (insight.event) {
            controller.enqueue(encoder.encode(`data: {"type": "event", "content": "", "data": ${JSON.stringify(insight.event)}}\n\n`));
          }

          if (insight.weather) {
            controller.enqueue(encoder.encode(`data: {"type": "weather", "content": "", "data": ${JSON.stringify(insight.weather)}}\n\n`));
          }

          if (insight.traffic) {
            controller.enqueue(encoder.encode(`data: {"type": "traffic", "content": "", "data": ${JSON.stringify(insight.traffic)}}\n\n`));
          }

          if (insight.cta) {
            controller.enqueue(encoder.encode(`data: {"type": "cta", "content": "", "data": ${JSON.stringify(insight.cta)}}\n\n`));
          }

          // Send final complete object
          controller.enqueue(encoder.encode(`data: {"type": "complete", "content": "", "data": ${JSON.stringify(insight)}}\n\n`));
          controller.close();

        } catch (error) {
          console.error('Streaming error:', error);
          // Send error and fallback
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
          controller.enqueue(encoder.encode(`data: {"type": "complete", "content": "", "data": ${JSON.stringify(fallbackInsight)}}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error) {
    console.error('Insights streaming error:', error);
    
    // Return a fallback stream
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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: {"type": "complete", "content": "", "data": ${JSON.stringify(fallbackInsight)}}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}