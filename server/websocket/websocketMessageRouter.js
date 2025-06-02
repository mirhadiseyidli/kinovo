// messageRouter.js
const { registerFriendWatcher } = require('./handlers/friendRequestsWebsocket');
const { sendFriendNewEventsChangeStream } = require('./handlers/friendNumberOfNewEvents');
const { handleAISummary } = require('./handlers/aiSummaryWebsocket');
const { registerNotificationsWatcher } = require('./handlers/notificationsWebsocket');
const { addConnectedUser } = require('./websocketUtils');

const handleMessage = async (message, ws, connectedUsers) => {
  try {
    const parsed = JSON.parse(message);
    const { type, userId } = parsed;

    switch (type) {
      case 'ManageFriends':
        addConnectedUser(userId, ws);
        registerFriendWatcher(userId, ws);
        break;

      case 'FriendsEventActivity':
        addConnectedUser(userId, ws);
        sendFriendNewEventsChangeStream(userId, ws);
        break;

      case 'NotificationsListener':
        addConnectedUser(userId, ws);
        // Register for friend request notifications
        registerFriendWatcher(userId, ws);
        // Register for general notifications (event creation, etc.)
        registerNotificationsWatcher(userId, ws);
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