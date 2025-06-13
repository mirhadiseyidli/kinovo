#!/bin/bash

# Create backup directory
mkdir -p ./server/websocket_backup

# Copy all WebSocket files to backup
cp -r ./server/websocket/* ./server/websocket_backup/

# Add a timestamp to the backup
echo "Backup created on $(date)" > ./server/websocket_backup/BACKUP_INFO.txt

echo "WebSocket files have been backed up to ./server/websocket_backup/"
echo "You can now safely remove the original WebSocket files if the Firebase implementation is working correctly."
echo "To remove the original files, run: rm -rf ./server/websocket" 