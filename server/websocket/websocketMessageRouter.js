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
        registerFriendWatcher(userId, ws);
        break;

      case 'FriendsEventActivity':
        connectedUsers.set(userId, ws);
        sendFriendNewEventsChangeStream(userId, ws);
        break;

      case 'get_daily_insight':
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