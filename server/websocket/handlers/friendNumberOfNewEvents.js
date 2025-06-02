const mongoose = require('mongoose');
const WebSocket = require('ws');
const User = require('../../database/schemas/usersSchema');

// const getUnseenFriendEvents = async (userId) => {
//   const findViewHistory = await User.findById(userId).select('last_checked_events').lean();
//   const userViewHistory = findViewHistory?.last_checked_events || [];

//   const findFriendHistory = await User.findById(userId).select('friend_event_history').lean();
//   const friendEventHistory = findFriendHistory?.friend_event_history || [];

//   return friendEventHistory.filter(entry => {
//     const viewedEntry = userViewHistory.find(
//       view => String(view.friend) === String(entry.friend)
//     );
//     const viewedAt = viewedEntry?.viewed_at || new Date(0);
//     return new Date(entry.added_at) > viewedAt;
//   });
// };

// const clearAllEventStoryData = async () => {
//   try {
//     const result = await User.updateMany(
//       {},
//       {
//         $set: {
//           last_checked_events: [],
//           friend_event_history: [],
//         },
//       }
//     );
//     console.log(`Cleared event story data for ${result.modifiedCount} users.`);
//   } catch (error) {
//     console.error('Error clearing event story data:', error);
//   }
// };

const getUnseenFriendEvents = async (userId) => {
  const findUser = await User.findById(userId)
    .select('last_checked_events friend_event_history')
    .populate('friend_event_history.friend', '-password')
    .populate({
      path: 'friend_event_history.events.event',
      select: '-password',
      populate: {
        path: 'creator',
        select: '-password'
      }
    })
    .populate('last_checked_events.friend', '-password')
    .populate('last_checked_events.viewed_events.event', '-password')
    .lean();

  const userViewHistory = findUser?.last_checked_events || [];
  const friendEventHistory = findUser?.friend_event_history || [];

  const unseenEntries = [];
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  for (const friendEntry of friendEventHistory) {
    const viewedFriendEntry = userViewHistory.find(
      (v) => String(v.friend?._id || v.friend) === String(friendEntry.friend?._id || friendEntry.friend)
    );

    const viewedEventsMap = new Map(
      (viewedFriendEntry?.viewed_events || []).map(v => [String(v.event?._id || v.event), new Date(v.viewed_at)])
    );

    const unseenEvents = friendEntry.events.filter(e => {
      const eventId = String(e.event?._id || e.event);
      const viewedAt = viewedEventsMap.get(eventId);
      const addedAt = new Date(e.added_at);
      
      // Auto-expire events older than 24 hours
      const isExpired = addedAt < twentyFourHoursAgo;
      if (isExpired) {
        return false; // Don't include in unseen
      }
      
      const isUnseen = !viewedAt || addedAt > viewedAt;
      return isUnseen;
    });

    if (unseenEvents.length) {
      unseenEntries.push({
        friend: friendEntry.friend,
        unseen_events: unseenEvents
      });
    }
  }

  return unseenEntries;
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

    if (ws.readyState === WebSocket.OPEN) {
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