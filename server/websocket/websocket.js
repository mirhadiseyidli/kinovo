// websocketServer.js
const WebSocket = require('ws');
const { handleMessage } = require('./websocketMessageRouter');

const initWebSocket = () => {
  const wss = new WebSocket.Server({ port: 6000 });
  const connectedUsers = new Map();

  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (message) => {
      await handleMessage(message, ws, connectedUsers);
    });

    ws.on('close', () => {
      for (const [userId, socket] of connectedUsers.entries()) {
        if (socket === ws) connectedUsers.delete(userId);
      }
    });
  });
};

module.exports = { initWebSocket };

// const User = require('../database/schemas/usersSchema')
// const WebSocket = require('ws');
// const mongoose = require('mongoose');

// let wss;

// const initWebSocket = () => {
//   wss = new WebSocket.Server({ port: 6000 });
//   // Track connected users (userId => ws)
//   const connectedUsers = new Map();

//   // const { getAISummary } = require('../controllers/aiController');

//   // wss.on('connection', (ws) => {
//   //   console.log('Client connected');

//   //   ws.on('message', async (message) => {
//   //     try {
//   //       const { userId } = JSON.parse(message);
//   //       await getAISummary(userId, ws); // Stream assistant response
//   //     } catch (err) {
//   //       console.error('Invalid message or userId:', err.message);
//   //       ws.send('[ERROR]');
//   //     }
//   //   });

//   //   ws.on('close', () => {
//   //     console.log('Client disconnected');
//   //   });
//   // });

//   // When a client connects
//   wss.on('connection', (ws) => {
//     console.log('Client connected');
//     ws.on('message', (message) => {
//       const { type, userId } = JSON.parse(message);

//       if (type === 'register') {
//         connectedUsers.set(userId, ws);
//         console.log(`User ${userId} registered to socket.`);
//         if (mongoose.isValidObjectId(userId)) {
//           const userChangeStream = User.watch([
//             {
//               $match: {
//                 'documentKey._id': new mongoose.Types.ObjectId(`${userId}`),
//                 operationType: 'update'
//               }
//             }
//           ]);

//           userChangeStream.on('change', (change) => {
//             console.log('Actor', change.documentKey)
//             console.log('Actress', change.updateDescription.updatedFields)

//             if (
//               change.operationType === 'update' &&
//               change.updateDescription?.updatedFields &&
//               Array.isArray(change.updateDescription.updatedFields.friends)
//             ) {
//               const updatedUserId = change.documentKey._id.toString();
//               const newFriends = change.updateDescription.updatedFields.friends;
//               console.log('Actress', newFriends)

//               if (ws.readyState === WebSocket.OPEN) {
//                 ws.send(JSON.stringify({
//                   type: 'addedAsFriend',
//                   by: updatedUserId,
//                 }));
//               }
//             }
//           });

//           userChangeStream.once('error', (err) => {
//             console.error('User change stream error:', err);
//           }); 

//           ws.on('close', () => {
//             userChangeStream.close();
//             connectedUsers.delete(userId);
//           });
//         }
//       }
//     });

//     ws.on('close', () => {
//       for (const [userId, socket] of connectedUsers.entries()) {
//         if (socket === ws) connectedUsers.delete(userId);
//       }
//     });
//   });
// }

// module.exports = { initWebSocket };