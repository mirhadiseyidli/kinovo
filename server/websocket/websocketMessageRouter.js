// messageRouter.js
const { registerFriendWatcher } = require('./handlers/friendRequestsWebsocket');
const { sendFriendNewEventsChangeStream } = require('./handlers/friendNumberOfNewEvents');
const { handleAISummary } = require('./handlers/aiSummaryWebsocket');

const handleMessage = async (message, ws, connectedUsers) => {
  try {
    const parsed = JSON.parse(message);
    const { type, userId } = parsed;

    switch (type) {
      case 'ManageFriends':
        connectedUsers.set(userId, ws);
        console.log(`User ${userId} registered to socket.`);
        registerFriendWatcher(userId, ws);
        break;

      case 'FriendsEventActivity':
        connectedUsers.set(userId, ws);
        console.log(`User ${userId} registered to socket.`);
        sendFriendNewEventsChangeStream(userId, ws);
        break;

      case 'ai-summary':
        await handleAISummary(userId, ws);
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
        ws.send('[UNKNOWN_TYPE]');
    }
  } catch (err) {
    console.error('Error handling message:', err.message);
    ws.send('[ERROR]');
  }
};

module.exports = { handleMessage };