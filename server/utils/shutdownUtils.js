/**
 * Utilities for gracefully shutting down services during migration
 */

/**
 * Attempts to gracefully shut down the WebSocket server
 * Called during migration from WebSockets to Firebase Realtime Database
 */
const shutdownWebSockets = () => {
  try {
    // Try to import the WebSocket server
    let websocketModule;
    try {
      // Try the active path first
      websocketModule = require('../websocket/websocket');
    } catch (err) {
      // If not found, try the backup path
      try {
        websocketModule = require('../websocket_backup/websocket');
      } catch (backupErr) {
        console.log('WebSocket module not found, already migrated or not initialized');
        return;
      }
    }

    // Access the WebSocket server instance
    if (websocketModule && websocketModule.wss) {
      console.log('Shutting down WebSocket server...');
      websocketModule.wss.close();
      console.log('WebSocket server shut down successfully');
    } else {
      console.log('WebSocket server not initialized or already shut down');
    }
  } catch (error) {
    console.error('Error shutting down WebSocket server:', error);
  }
};

module.exports = {
  shutdownWebSockets
}; 