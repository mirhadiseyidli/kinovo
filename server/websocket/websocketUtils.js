const WebSocket = require('ws');

// Global map to store connected users
const connectedUsers = new Map();

const addConnectedUser = (userId, ws) => {
  connectedUsers.set(userId, ws);
};

const removeConnectedUser = (userId) => {
  connectedUsers.delete(userId);
};

const getConnectedUser = (userId) => {
  return connectedUsers.get(userId);
};

const sendNotificationToUser = (userId, notification) => {
  console.log(`Attempting to send notification to user ${userId}:`, notification);
  const ws = connectedUsers.get(userId);
  
  if (!ws) {
    console.log(`No WebSocket connection found for user ${userId}`);
    return false;
  }
  
  if (ws.readyState !== WebSocket.OPEN) {
    console.log(`WebSocket connection for user ${userId} is not open (state: ${ws.readyState})`);
    return false;
  }
  
  try {
    ws.send(JSON.stringify(notification));
    console.log(`Successfully sent notification to user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    return false;
  }
};

const cleanupClosedConnections = () => {
  for (const [userId, ws] of connectedUsers.entries()) {
    if (ws.readyState === WebSocket.CLOSED) {
      connectedUsers.delete(userId);
    }
  }
};

module.exports = {
  connectedUsers,
  addConnectedUser,
  removeConnectedUser,
  getConnectedUser,
  sendNotificationToUser,
  cleanupClosedConnections
}; 