const mongoose = require('mongoose');
const WebSocket = require('ws');
const User = require('../../database/schemas/usersSchema');

const registerFriendWatcher = (userId, ws) => {
  if (!mongoose.isValidObjectId(userId)) return;

  const changeStream = User.watch(
    [
      {
        $match: {
          'documentKey._id': new mongoose.Types.ObjectId(`${userId}`),
          operationType: 'update',
        }
      }
    ],
    {
      fullDocument: 'updateLookup',
      fullDocumentBeforeChange: 'required',
    }
  );

  changeStream.on('change', (change) => {
    const oldFriends = change.fullDocumentBeforeChange?.friends || [];
    const newFriends = change.fullDocument?.friends || [];

    const added = newFriends.filter(
      id => !oldFriends.some(old => old.toString() === id.toString())
    );
    const removed = oldFriends.filter(
      id => !newFriends.some(cur => cur.toString() === id.toString())
    );

    if (added.length && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'friendAdded',
        addedBy: userId,
        addedFriendId: added[0].toString()
      }));
    }

    if (removed.length && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'friendRemoved',
        removedBy: userId,
        removedFriendId: removed[0].toString()
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

module.exports = { registerFriendWatcher };