#!/bin/bash

# Stop and remove existing container if it exists
docker stop kinovo-server || true
docker rm kinovo-server || true

# Build new image
docker build -t kinovo-server .

# Fetch environment variables
#./fetch-env.sh

# Run new container
docker run -d \
  --name kinovo-server \
  --restart unless-stopped \
  -p 5002:5002 \
  --env-file .env \
  kinovo-server

# Check if container is running
if [ "$(docker ps -q -f name=kinovo-server)" ]; then
    echo "Deployment successful!"
    docker logs kinovo-server
else
    echo "Deployment failed!"
    exit 1
fi 