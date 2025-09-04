#!/bin/bash

# Script to kill and restart the Kinovo admin dashboard container

CONTAINER_NAME="kinovo-admin"
IMAGE_NAME="kinovo-admin-dashboard"
PORT="3000"

echo "🔄 Restarting Kinovo Admin Dashboard Container..."
echo "=============================================="

# Stop and remove existing container
echo "📦 Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null
docker rm $CONTAINER_NAME 2>/dev/null

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please ensure .env file exists in the current directory."
    exit 1
fi

# Rebuild the image (optional - uncomment if you want to rebuild every time)
# echo "🔨 Rebuilding Docker image..."
# docker build -t $IMAGE_NAME .

# Start new container
echo "🚀 Starting new container..."
docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:$PORT \
    --env-file .env \
    --restart unless-stopped \
    $IMAGE_NAME

# Check if container started successfully
if [ $? -eq 0 ]; then
    echo "✅ Container started successfully!"
    echo "🌐 Dashboard available at: http://localhost:$PORT"
    echo "📊 Admin dashboard at: https://admin.kinovo.app (production)"
    
    # Show container status
    echo ""
    echo "📋 Container status:"
    docker ps | grep $CONTAINER_NAME
    
    # Show recent logs
    echo ""
    echo "📝 Recent logs:"
    docker logs --tail 10 $CONTAINER_NAME
else
    echo "❌ Failed to start container!"
    echo "📝 Check logs for details:"
    docker logs $CONTAINER_NAME
    exit 1
fi