#!/bin/bash

# Container configuration
CONTAINER_NAME="kinovo-admin"
IMAGE_NAME="kinovo-admin-dashboard"
PORT=3000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Restarting Kinovo Admin Dashboard...${NC}"

# Check if we're in the dashboard directory
if [ ! -f "package.json" ] || [ ! -f "Dockerfile" ]; then
    echo -e "${RED}Error: package.json or Dockerfile not found. Please run this script from the dashboard directory.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Running from dashboard directory${NC}"

# Stop and remove existing container
echo -e "${YELLOW}Stopping existing container...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Remove existing image (force rebuild)
echo -e "${YELLOW}Removing existing image...${NC}"
docker rmi $IMAGE_NAME 2>/dev/null || true

# Build new image
echo -e "${YELLOW}Building new Docker image...${NC}"
docker build -t $IMAGE_NAME . || {
    echo -e "${RED}Docker build failed!${NC}"
    exit 1
}

# Run new container
echo -e "${YELLOW}Starting new container...${NC}"
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p ${PORT}:3000 \
    $IMAGE_NAME

# Check if container started successfully
sleep 3
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
else
    echo -e "${RED}✗ Container failed to start!${NC}"
    echo -e "${RED}Container logs:${NC}"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Health check
echo -e "${YELLOW}Running health check...${NC}"
sleep 5

if curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT} | grep -qE "200|301|302"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo -e "${YELLOW}Attempting to check container status...${NC}"
    docker logs --tail 20 $CONTAINER_NAME
fi

# Summary
echo -e "\n${YELLOW}=====================================${NC}"
echo -e "${GREEN}Dashboard restart completed!${NC}"
echo -e "${GREEN}Container: $CONTAINER_NAME${NC}"
echo -e "${GREEN}Available at: http://localhost:${PORT}${NC}"
echo -e "${YELLOW}=====================================${NC}"

# Show recent logs
echo -e "\n${YELLOW}Recent logs:${NC}"
docker logs --tail 15 $CONTAINER_NAME

# Show container status
echo -e "\n${YELLOW}Container status:${NC}"
docker ps | grep $CONTAINER_NAME