// Not being used yet, but will as soon as everything else is ready
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 6000 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log('Received:', message);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

module.exports = wss;
