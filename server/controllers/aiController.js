const { OpenAI } = require("openai");
const User = require('../database/schemas/usersSchema');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// const assistant_id = process.env.OPENAI_ASSISTANT_ID;

const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "get_daily_insight",
      description: "Returns a short message about what events the user has today.",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string", description: "The ID of the user." }
        },
        required: ["userId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "validate_event_intent",
      description: "Checks if a message is about outdoor events like hikes or yoga.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "User's input query." }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Creates a new event with provided data.",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string", description: "The ID of the event creator." },
          eventData: {
            type: "object",
            description: "The event object",
            properties: {
              title: { type: "string" },
              start_time: { type: "string", format: "date-time" },
              end_time: { type: "string", format: "date-time" },
              location: { type: "object" },
              description: { type: "string" },
              category: { type: "string" },
              capacity: { type: "number" }
            },
            required: ["title", "start_time", "end_time", "location"]
          }
        },
        required: ["userId", "eventData"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit_event",
      description: "Edits an event by ID. Supplies updated fields.",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "The ID of the event to update." },
          updates: {
            type: "object",
            description: "Updated event fields",
            additionalProperties: true
          }
        },
        required: ["eventId", "updates"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_event",
      description: "Deletes an event created by the user.",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string", description: "The user who owns the event." },
          eventId: { type: "string", description: "The ID of the event to delete." }
        },
        required: ["userId", "eventId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_friends_events",
      description: "Finds a friend's events by name. If multiple matches, returns list of names.",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string", description: "The ID of the requesting user." },
          friendName: { type: "string", description: "Partial or full name of the friend." }
        },
        required: ["userId", "friendName"]
      }
    }
  }
];

const getFormattedDailyInsight = async (userId) => {
  const events = await getUserEvents(userId);
  console.log(events)
  const formattedEvents = events.map(event => ({
    title: event.title,
    start_time: event.start_time,
    location: event.location || '',
  }));
  const message = events.length > 0
    ? `Here are today's events: ${JSON.stringify(formattedEvents)}.`
    : "The user has no events today.";
  return message;
};

const handleToolCall = async (name, args) => {
  switch (name) {
    case 'get_daily_insight':
      return await getFormattedDailyInsight(args.userId);
    case 'validate_event_intent':
      // Simple check for event intent
      return args.query.toLowerCase().includes("hike") || args.query.toLowerCase().includes("yoga");
    case 'create_event':
      // Simulate event creation
      return { success: true, message: `Event "${args.eventData.title}" created.` };
    case 'edit_event':
      // Simulate event editing
      return { success: true, message: `Event ${args.eventId} updated with ${JSON.stringify(args.updates)}` };
    case 'delete_event':
      // Simulate event deletion
      return { success: true, message: `Event ${args.eventId} deleted.` };
    case 'find_friends_events':
      // Simulate finding friend's events
      return [`Example event for friend ${args.friendName}`];
    default:
      throw new Error(`Unhandled tool call: ${name}`);
  }
};

const getUserEvents = async (userId) => {
  try {
    
    const user = await User.findOne({ _id: userId })
      .select('-password')
      .populate({
        path: 'events',
        populate: {
          path: 'event', // this is the inner ObjectId that needs to be populated
          model: 'Events', // adjust this if your model name is different
        },
      });

    if (!user || !user.events || user.events.length === 0) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysEvents = user.events
      .filter((e) => {
        const eventDate = new Date(e.event.start_time);
        return eventDate >= today && eventDate < tomorrow;
      })
      .map((e) => {
        const { title, start_time, location } = e.event;
        console.log(location?.text)

        return {
          title,
          time: new Date(start_time).toLocaleString(), // you can format this as needed
          location: location?.text || 'No location specified',
          status: e.status,
        };
      });

    console.log(todaysEvents)

    return todaysEvents;
  } catch (error) {
    console.error('Error fetching user events:', error);
    return [];
  }
};

const getOrCreateUserAssistant = async (userId) => {
  const user = await User.findById(userId);

  if (user.ai_assistant_id) {
    return user.ai_assistant_id;
  }

  const assistant = await openai.beta.assistants.create({
    name: `Assistant for ${user.full_name || user.username}`,
    instructions: "You help users manage outdoor events like hikes, yoga, and group activities. Only answer event-related questions. Address them as you, not user",
    model: "gpt-4-1106-preview",
    tools: toolDefinitions
  });

  user.ai_assistant_id = assistant.id;
  await user.save();

  return assistant.id;
};

const assistantRun = async (toolName, args, ws) => {
  try {
    const userId = args.userId || args.user_id;
    const dynamicAssistantId = await getOrCreateUserAssistant(userId);

    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Run function ${toolName} with this input: ${JSON.stringify(args)}`
    });

    // Create the run
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: dynamicAssistantId,
    });

    let runStatus;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log(runStatus.status, runStatus.id)
      if (runStatus.status === 'completed') break;

      if (runStatus.status === 'requires_action') {
        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;

        const tool_outputs = [];
        for (const call of toolCalls) {
          const result = await handleToolCall(call.function.name, JSON.parse(call.function.arguments));
          tool_outputs.push({
            tool_call_id: call.id,
            output: JSON.stringify(result)
          });
        }

        await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
          tool_outputs
        });
      }

      await new Promise(res => setTimeout(res, 1000));
      attempts++;
    }

    if (attempts === maxAttempts) {
      throw new Error("Run polling timed out");
    }

    // Stream the message content after completion
    const messages = await openai.beta.threads.messages.list(thread.id);
    for (const msg of messages.data.reverse()) {
      if (msg.role === 'assistant') {
        for (const part of msg.content) {
          if (part.type === 'text') {
            ws.send(JSON.stringify({
              type: toolName,
              content: part.text.value
            }));
          }
        }
      }
    }
    ws.send('[DONE]');
  } catch (err) {
    console.error("Assistant run error:", err);
    ws.send('[ERROR]');
  }
};

const getAISummary = async (userId, ws) => {
  const userMessage = await getFormattedDailyInsight(userId) + " Please summarize the user's day.";
  return await assistantRun("get_daily_insight", { userId, userMessage }, ws);
};

const isValidEventQuery = async (query, ws) => {
  return await assistantRun("validate_event_intent", { query }, ws);
};

const createEvent = async (userId, eventData, ws) => {
  return await assistantRun("create_event", { userId, eventData }, ws);
};

const editEvent = async (eventId, updates, ws) => {
  return await assistantRun("edit_event", { eventId, updates }, ws);
};

const deleteEvent = async (userId, eventId, ws) => {
  return await assistantRun("delete_event", { userId, eventId }, ws);
};

const findFriendsEventsByName = async (userId, friendName, ws) => {
  return await assistantRun("find_friends_events", { userId, friendName }, ws);
};

module.exports = {
  getAISummary,
  isValidEventQuery,
  createEvent,
  editEvent,
  deleteEvent,
  findFriendsEventsByName,
};