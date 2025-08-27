// // AI Agent Streaming Endpoint - Real-time streaming with structured data
import { streamText, tool, Output, smoothStream } from 'ai';
import { z } from 'zod';
import { chatModel, AGENT_CONFIG } from '../config/ai.config.js';
import { verifyUserToken } from '../lib/auth.js';
import { tools as baseTools } from '../tools/index.js';
import { generateRAGContext, buildEnhancedSystemPrompt, limitContextTokens } from '../rag/context-manager.js';
import { 
  eventDataSchema, 
  weatherDataSchema, 
  trafficDataSchema, 
  agentResponseSchema 
} from '../tools/schemas.js';

// Schemas are now imported from ../tools/schemas.js

export const config = { runtime: 'edge' };

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
- When calling tools, omit optional parameters entirely if they're not needed - do not pass null values
- IMPORTANT: Always use MongoDB ObjectIds for event operations, never use event titles
- If user refers to "that event" or mentions an event by name, first use getUserEvents to find the correct event ID
- For destructive actions (cancel, delete, update), always confirm the specific event details before proceeding
- Use joinEvent when user wants to attend/join an event themselves
- Use inviteUser when user wants to invite someone else to an event
- Do not respond with anything that sounds like a guideline for you

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
3. Present the top results to the user with names and addresses
4. Wait for user confirmation (e.g., "Is this the Central Park in New York you meant?")
5. Use the confirmed location's details when creating the event

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

Response Format:
- Put the main text in 'message'
- Add event details in 'events' when applicable
- Add 'weather' and/or 'traffic' when relevant
- Add 'actionTaken' if any action was performed
- Add 'followUpSuggestions' for next steps
- IMPORTANT: Omit fields entirely when they don't have data - do not set them to null or empty strings

When using tools that return weather or traffic data:
- Provide a SIMPLE, conversational response in 'message' (e.g., "Here's the current weather and traffic")
- DO NOT include detailed weather/traffic data or ask unnecessary questions in the message text
- Put all detailed data in the structured 'weather' and 'traffic' objects

CRITICAL: Keep message text conversational and brief. Let the cards show the detailed data.

When presenting lists in 'message', use plain text bullets (- or •), one item per line, with a blank line before and after the list. Avoid markdown tables.

Remember: You're helping users plan and manage their social life effectively.
IMPORTANT NOTE: DO NOT MENTION ANY OTHER APPs. IF ANYTHING, YOUR SUGGESTIONS SHOULD BE KINOVO BASED
`;

export default async function handler(req) {
  try {
    // ── Auth ───────────────────────────────────────────────────────────────────
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await verifyUserToken(token);
    const userContext = { userId: user.userId, email: user.email };

    // ── Input ──────────────────────────────────────────────────────────────────
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error('❌ Failed to parse JSON body:', error);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, conversationId, timezone, userLocation } = body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userQuery = typeof messages[messages.length - 1]?.content === 'string'
      ? messages[messages.length - 1].content
      : '';

    // ── RAG prompt enrichment (safe fallback) ──────────────────────────────────
    let enhancedSystemPrompt = SYSTEM_PROMPT;
    try {
      const ragContext = await generateRAGContext(userContext.userId, userQuery, messages.slice(-10));
      const limited = limitContextTokens(ragContext, 2000);
      enhancedSystemPrompt = buildEnhancedSystemPrompt(SYSTEM_PROMPT, limited);
    } catch {
      // keep base prompt
    }

    const contextualSystemPrompt = `${enhancedSystemPrompt}

Current user: ${userContext.email} (ID: ${userContext.userId})
User timezone: ${timezone || 'UTC'}
Current time (user's timezone): ${
      timezone ? new Date().toLocaleString('en-US', { timeZone: timezone }) : new Date().toISOString()
    }
${userLocation ? `User location: ${userLocation.text || `${userLocation.city}, ${userLocation.state}`} (${userLocation.lat}, ${userLocation.lng})` : 'User location: Not available'}
Conversation ID: ${conversationId || 'N/A'}`;

    // ── Wrap tools with ai.tool(...) so the model can call them ────────────────
    const ctx = {
      headers: { authorization: `Bearer ${token}` },
      user: userContext,
      timezone: timezone || 'UTC',
      userLocation: userLocation || null,
      conversationId,
    };

    const wrappedTools = Object.fromEntries(
      Object.entries(baseTools).map(([name, t]) => [
        name,
        tool({
          description: t.description,
          parameters: t.parameters,                  // Zod schema
          async execute(params, { toolCallId, messages: llmMsgs, abortSignal }) {
            return t.execute(params, {
              ...ctx,
              toolCallId,
              llmMessages: llmMsgs,
              abortSignal,
            });
          },
        }),
      ])
    );

    // ── Stream text (token by token) + structured object + tool deltas ────────
    const result = streamText({
      model: chatModel,
      system: contextualSystemPrompt,
      schema: agentResponseSchema,
      messages, // expects [{role:'user'|'assistant'|'system'|'tool', content:...}, ...]
      tools: wrappedTools,
      toolChoice: 'auto',
      toolCallStreaming: true,                      // stream tool call args/results
      maxSteps: AGENT_CONFIG.maxSteps,
      temperature: AGENT_CONFIG.temperature,
      maxTokens: AGENT_CONFIG.maxTokens,
      // Ask the SDK to also parse a typed object while we stream text
      experimental_output: Output.object({ schema: agentResponseSchema }),
      abortSignal: req.signal,
      // Make token flow smooth & fast (word-chunked with minimal delays)
      experimental_transform: smoothStream({ delayInMs: 1000000000, chunking: 'word' }),
      onError(error) {
        console.error('stream error:', error);
      },
    });

    // IMPORTANT: return a DATA stream (not plain text) so your React hook
    // (e.g. useObject/useChat) can receive text-deltas + partial objects + tool events.
    return result.toTextStreamResponse({
      chunkSize: 16
    });
  } catch (error) {
    console.error('❌ Agent streaming error:', error);
    console.error('📍 Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: 'An error occurred processing your request',
        details: String(error?.message || error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}