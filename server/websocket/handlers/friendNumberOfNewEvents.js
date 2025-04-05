const mongoose = require('mongoose');
const WebSocket = require('ws');
const User = require('../../database/schemas/usersSchema');

const getUnseenFriendEvents = async (userId) => {
  const findViewHistory = await User.findById(userId).select('last_checked_events').lean();
  const userViewHistory = findViewHistory?.last_checked_events || [];

  const findFriendHistory = await User.findById(userId).select('friend_event_history').lean();
  const friendEventHistory = findFriendHistory?.friend_event_history || [];

  return friendEventHistory.filter(entry => {
    const viewedEntry = userViewHistory.find(
      view => String(view.friend) === String(entry.friend)
    );
    const viewedAt = viewedEntry?.viewed_at || new Date(0);
    return new Date(entry.added_at) > viewedAt;
  });
};

const sendFriendNewEventsChangeStream = (userId, ws) => {
  if (!mongoose.isValidObjectId(userId)) return;

  // send immediately once on connect
  (async () => {
    const unseenEvents = await getUnseenFriendEvents(userId);

    if (unseenEvents.length && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'newFriendEventsSummary',
        data: unseenEvents
      }));
    }
  })();

  const changeStream = User.watch(
    [
      {
        $match: {
          'documentKey._id': new mongoose.Types.ObjectId(`${userId}`),
          operationType: 'update',
        }
      }
    ]
  );

  changeStream.on('change', async (change) => {
    const unseenEvents = await getUnseenFriendEvents(userId);

    if (unseenEvents.length && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'newFriendEventsSummary',
        data: unseenEvents
      }));
    }
  });

  changeStream.once('error', (err) => {
    console.error('User change stream error:', err);
  });

  ws.on('close', () => {
    changeStream.close();
  });
};

module.exports = { sendFriendNewEventsChangeStream };