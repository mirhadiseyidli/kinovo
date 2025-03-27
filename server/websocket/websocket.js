// websocket.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 6000 });

const { getAISummary } = require('../controllers/aiController');

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const { userId } = JSON.parse(message);
      await getAISummary(userId, ws); // Stream assistant response
    } catch (err) {
      console.error('Invalid message or userId:', err.message);
      ws.send('[ERROR]');
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

module.exports = wss;