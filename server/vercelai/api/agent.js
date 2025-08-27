// AI Agent Endpoint - Long-running conversations with tool calling
import { generateText } from 'ai';
import { chatModel, AGENT_CONFIG } from '../config/ai.config.js';
import { verifyUserToken, extractTokenFromHeaders } from '../lib/auth.js';
import { tools } from '../tools/index.js';
import { generateRAGContext, buildEnhancedSystemPrompt, limitContextTokens } from '../rag/context-manager.js';

// Dynamic imports for CommonJS modules will be done inside the handler

// Standard Node.js runtime for Fluid Compute
export const config = {
  runtime: 'nodejs',
  maxDuration: 300, // 5 minutes max
};

// System prompt for the agent
const SYSTEM_PROMPT = `You are Kinovo AI, a helpful assistant for outdoor activities event planning and social coordination.

Your capabilities:
- Create, update, and manage events
- Search for events based on user preferences
- Join events as an attendee
- Invite and manage event attendees
- Check weather conditions for event planning
- Get traffic/direction information
- Provide personalized event suggestions
- Check user's relationship to events (attendance, creator status)

Guidelines:
- Be friendly, concise, and helpful
- Always confirm important actions before executing
- Suggest relevant follow-up actions
- Use emojis sparingly for a friendly tone
- If unsure about event details, ask for clarification
- Respect user privacy and only access authorized data
- When discussing events, always check user relationship (attending, created, invited)
- Use checkEventStatus tool to get detailed event information including user status
- For queries about "my events", "upcoming events", "past events" use getUserEvents tool
- Use searchEvents tool for finding new events, not for user's own events
- When user asks for "nearby events", "recommendations", "suggestions", or "events near me", searchEvents will automatically use smart ranking based on their preferences, friends, location, and past event behavior
- The searchEvents tool intelligently detects recommendation queries and applies personalized ranking
- When searching locations, the user's coordinates will be used for location bias automatically
- IMPORTANT: Never add start_time or end_time parameters to searchEvents unless the user explicitly specifies dates - by default, the search will find upcoming events from now to the future
- Only include date parameters when user says things like "events this weekend", "events next week", "events on Friday", etc.
- IMPORTANT: Always use MongoDB ObjectIds for event operations, never use event titles
- If user refers to "that event" or mentions an event by name, first use getUserEvents to find the correct event ID
- For destructive actions (cancel, delete, update), always confirm the specific event details before proceeding
- Use joinEvent when user wants to attend/join an event themselves
- Use inviteUser when user wants to invite someone else to an event

When creating events:
- IMPORTANT: Always use searchLocation tool when user provides a location for an event
- After searching, show the user the top results and ask them to confirm which one
- Use the confirmed location's coordinates and formatted address in the event
- Ensure all required fields are provided (title, start_time, end_time, category)
- Suggest appropriate categories based on the event description
- Default to 'private' visibility unless specified
- Validate date/time formats

Location handling workflow:
1. When user mentions a location (e.g., "at Central Park" or "Starbucks on 5th Avenue")
2. Use searchLocation tool to find matching places
3. Present the top results to the user with names and addresses only (no coordinates)
4. Wait for user confirmation (e.g., "Is this the Central Park in New York you meant?")
5. Map the confirmed location data to the correct format for event creation:
   - text: use the 'name' field from searchLocation result (e.g., "Starbucks", "McDonald's", "College of San Mateo")
   - coordinates: use the 'coordinates' object directly
   - city: extract from address (e.g., "Central Park, New York, NY 10024" -> city: "New York")
   - state: extract from address (e.g., "Central Park, New York, NY 10024" -> state: "NY")

Event confirmation format:
- Show times in MM/DD/YY at H:MMAM/PM format (e.g., "09/06/24 at 7:00PM")
- Show location as "Name - Address" (e.g., "Starbucks - 123 Main St, San Francisco, CA")
- Never show coordinates to users

When handling event references:
- If user says "that event", "the event", or mentions an event by name, use getUserEvents to find it
- Always confirm which specific event before taking destructive actions
- Show event title, date, and ID when confirming actions
- Never assume event IDs - always look them up using titles or descriptions
- Review recent conversation history to identify events previously discussed

Example workflow for "cancel that event":
1. Use getUserEvents to find user's events
2. Match the referenced event by title or context
3. Confirm the specific event with user
4. Use the correct ObjectId for the cancel operation

Finding events by name:
- Use findEventByTitle to search within user's own events
- Use searchEvents with the query parameter to find public/visible events by title
- If user mentions "join that event" from earlier in conversation, look back at recent messages to find the event ID

Event Data Structure:
Events will be provided with complete information including:
- _id: MongoDB ObjectId (use this for all operations)
- title: Event title (display name)
- category: Event category (separate from title)
- start_time/end_time: Event timing
- location: Event location details
- isUserCreator: Whether user created the event
- isUserAttending: Whether user is attending
- userStatus: User's attendance status (pending, accepted, declined)

Remember: You're helping users plan and manage their social life effectively.
IMPORTANT NOTE: DO NOT MENTION ANY OTHER APPs. IF ANYTHING, YOUR SUGGESTIONS SHOULD BE KINOVO BASED`;

export default async function handler(req) {
  try {
    // Get the already-verified user from req object (populated by authMiddleware)
    // Note: In the CommonJS controller, this gets converted to a mock request object
    const user = req.user;
    const token = extractTokenFromHeaders(req.headers);
    
    if (!user || !token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert user data to expected format
    const userContext = {
      userId: user._id,
      email: user.email,
    };
    
    // Parse request body
    const { messages, conversationId, saveConversation = true, timezone, userLocation } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract user query from the latest message
    const userQuery = messages[messages.length - 1]?.content || '';
    const conversationHistory = messages.slice(-10).map(m => m.content); // Last 10 messages
    
    // Generate RAG context for personalized responses
    let enhancedSystemPrompt = SYSTEM_PROMPT;
    try {
      
      const ragContext = await generateRAGContext(userContext.userId, userQuery, conversationHistory);
      const limitedContext = limitContextTokens(ragContext, 2000); // Limit to 2000 tokens
      
      enhancedSystemPrompt = buildEnhancedSystemPrompt(SYSTEM_PROMPT, limitedContext);
    } catch (ragError) {
      console.warn('⚠️ RAG context generation failed, using base prompt:', ragError.message);
    }

    // Add basic user context to system prompt
    const contextualSystemPrompt = `${enhancedSystemPrompt}

Current user: ${userContext.email} (ID: ${userContext.userId})
User timezone: ${timezone || 'UTC'}
Current time (user's timezone): ${timezone ? new Date().toLocaleString('en-US', { timeZone: timezone }) : new Date().toISOString()}
Current time (UTC): ${new Date().toISOString()}
${userLocation ? `User location: ${userLocation.text || `${userLocation.city}, ${userLocation.state}`} (${userLocation.lat}, ${userLocation.lng})` : 'User location: Not available'}

IMPORTANT: When the user provides times for events (like "create an event at 3pm tomorrow"), they are giving you times in their local timezone (${timezone || 'UTC'}). You must convert these to UTC before creating the event. Use the timezone information above to make accurate conversions.

Location context:
${userLocation ? `- User is currently in ${userLocation.city}, ${userLocation.state}
- Use coordinates (${userLocation.lat}, ${userLocation.lng}) for location-biased searches
- When searching for "nearby" events or places, use these coordinates
- When user says "near me" or "nearby", use their current location` : 
'- User location is not available, ask for a specific location when needed'}
`;

    // Create tools with bound authentication context
    const authenticatedTools = {};
    for (const [toolName, tool] of Object.entries(tools)) {
      authenticatedTools[toolName] = {
        ...tool,
        execute: async (params) => {
          // Add headers context to the execute function
          return tool.execute(params, { 
            headers: { authorization: `Bearer ${token}` },
            user: userContext,
            timezone: timezone || 'UTC',
            userLocation: userLocation || null,
          });
        },
      };
    }

    // Generate complete response with tool calling
    const result = await generateText({
      model: chatModel,
      system: contextualSystemPrompt,
      messages,
      tools: authenticatedTools,
      maxSteps: AGENT_CONFIG.maxSteps,
      temperature: AGENT_CONFIG.temperature,
      maxTokens: AGENT_CONFIG.maxTokens,
      toolChoice: 'auto', // Let the model decide when to use tools
      // onStepFinish: (step) => {
      //   // Log tool usage for monitoring
      //   if (step.toolCalls && step.toolCalls.length > 0) {
      //     console.log(`User ${userContext.userId} called tools:`, 
      //       step.toolCalls.map(tc => tc.toolName).join(', '));
      //   }
      // },
    });

    // Return the complete response with conversation metadata
    return new Response(JSON.stringify({ 
      content: result.text,
      usage: result.usage,
      finishReason: result.finishReason,
      conversationId,
      saveConversation,
      userMessage: messages[messages.length - 1],
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Id': userContext.userId,
      },
    });

  } catch (error) {
    console.error('Agent error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'An error occurred processing your request',
      details: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}