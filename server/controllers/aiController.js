const { OpenAI } = require("openai");
const User = require('../database/schemas/usersSchema');
require('dotenv').config();

const getUserEvents = async (userId) => {
  try {
    
    const user = await User.findOne({ user_id: userId }).select('-password_hash').populate('events');

    if (!user || !user.events || user.events.length === 0) {
      console.log('No events found for user');
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysEvents = user.events.filter((event) => {
      const eventDate = new Date(event.start_time);
      return eventDate >= today && eventDate < tomorrow;
    });

    return todaysEvents;
  } catch (error) {
    console.error('Error fetching user events:', error);
    return [];
  }
};

// Modified getAISummary for WebSocket use
const getAISummary = async (userId, ws) => {
  console.log(userId);
  // const events = await getUserEvents(userId);

  const openai = new OpenAI({ apiKey: 'REDACTED_OPENAI_KEY' });
  const assistantId = 'asst_MPDd9p8PwFeiV3kbehPvCS2P';

  try {
    // const questions = `
    //   Summarize my day based on my events. Today's events: ${events.length > 0 ? JSON.stringify(events) : 'No events today'}.
    // `;
    const questions = `
      Summarize my day based on my events. Today's events: 'No events today'}.
    `;

    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: questions,
    });

    let text = '';

    console.log('asking');
    await new Promise((resolve, reject) => {
      openai.beta.threads.runs.stream(thread.id, {
        assistant_id: assistantId,
      })
        .on('textDelta', (textDelta) => {
          text += textDelta.value;
          process.stdout.write(textDelta.value);
          ws.send(textDelta.value); 
        })
        .on('end', () => {
          console.log(text);
          ws.send('[DONE]');
          resolve();
        })
        .on('error', (error) => {
          console.error("Error during response stream:", error.message);
          ws.send('[ERROR]');
          reject(error);
        });
    });
  } catch (error) {
    console.error("Error interacting with assistant:", error.message);
    ws.send('[ERROR]');
  }
};

module.exports = { getAISummary };
