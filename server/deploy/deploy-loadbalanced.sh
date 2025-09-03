#!/bin/bash

# Number of backend instances
INSTANCES=3

# Base port
BASE_PORT=5002

# Container base name
CONTAINER_BASE="kinovo-server"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting load-balanced deployment with $INSTANCES instances...${NC}"

# Stop and remove ALL existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
for i in $(seq 1 $INSTANCES); do
    PORT=$((BASE_PORT + i - 1))
    CONTAINER_NAME="${CONTAINER_BASE}-${i}"
    
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
done

# Also stop single instance if exists (backwards compatibility)
docker stop kinovo-server 2>/dev/null || true
docker rm kinovo-server 2>/dev/null || true

# Build new image (same for all instances)
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t kinovo-server . || {
    echo -e "${RED}Docker build failed!${NC}"
    exit 1
}

# Fetch environment variables (uncomment if needed)
# ./fetch-env.sh

# Deploy multiple instances
echo -e "${YELLOW}Deploying $INSTANCES instances...${NC}"
for i in $(seq 1 $INSTANCES); do
    PORT=$((BASE_PORT + i - 1))
    CONTAINER_NAME="${CONTAINER_BASE}-${i}"
    
    echo -e "${GREEN}Starting instance $i on port $PORT...${NC}"
    
    docker run -d \
        --name $CONTAINER_NAME \
        --restart unless-stopped \
        -p ${PORT}:5002 \
        --env-file .env \
        -e INSTANCE_ID="instance-${i}" \
        -e INSTANCE_PORT=$PORT \
        --network host \
        kinovo-server
    
    # Check if container started successfully
    sleep 2
    if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        echo -e "${GREEN}✓ Instance $i started successfully on port $PORT${NC}"
    else
        echo -e "${RED}✗ Instance $i failed to start!${NC}"
        docker logs $CONTAINER_NAME
        exit 1
    fi
done

# Verify all instances are running
echo -e "\n${YELLOW}Verifying deployment...${NC}"
RUNNING_COUNT=0

for i in $(seq 1 $INSTANCES); do
    CONTAINER_NAME="${CONTAINER_BASE}-${i}"
    PORT=$((BASE_PORT + i - 1))
    
    if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        echo -e "${GREEN}✓ $CONTAINER_NAME is running on port $PORT${NC}"
        RUNNING_COUNT=$((RUNNING_COUNT + 1))
    else
        echo -e "${RED}✗ $CONTAINER_NAME is not running${NC}"
    fi
done

# Health check all instances
echo -e "\n${YELLOW}Running health checks...${NC}"
sleep 5

for i in $(seq 1 $INSTANCES); do
    PORT=$((BASE_PORT + i - 1))
    CONTAINER_NAME="${CONTAINER_BASE}-${i}"
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/api/health | grep -q "200"; then
        echo -e "${GREEN}✓ Health check passed for instance $i (port $PORT)${NC}"
    else
        echo -e "${RED}✗ Health check failed for instance $i (port $PORT)${NC}"
    fi
done

# Summary
echo -e "\n${YELLOW}=====================================${NC}"
if [ $RUNNING_COUNT -eq $INSTANCES ]; then
    echo -e "${GREEN}Deployment successful!${NC}"
    echo -e "${GREEN}$RUNNING_COUNT/$INSTANCES instances running${NC}"
    echo -e "\n${YELLOW}Instances running on ports:${NC}"
    for i in $(seq 1 $INSTANCES); do
        PORT=$((BASE_PORT + i - 1))
        echo -e "  - Instance $i: http://localhost:${PORT}"
    done
    echo -e "\n${YELLOW}Update nginx upstream servers to:${NC}"
    for i in $(seq 1 $INSTANCES); do
        PORT=$((BASE_PORT + i - 1))
        echo -e "  server localhost:${PORT};"
    done
else
    echo -e "${RED}Deployment incomplete!${NC}"
    echo -e "${RED}Only $RUNNING_COUNT/$INSTANCES instances running${NC}"
    exit 1
fi

echo -e "${YELLOW}=====================================${NC}"

# Show recent logs from all instances
echo -e "\n${YELLOW}Recent logs from all instances:${NC}"
for i in $(seq 1 $INSTANCES); do
    CONTAINER_NAME="${CONTAINER_BASE}-${i}"
    echo -e "\n${GREEN}--- $CONTAINER_NAME ---${NC}"
    docker logs --tail 10 $CONTAINER_NAME 2>&1
done