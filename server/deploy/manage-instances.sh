#!/bin/bash

# Configuration
CONTAINER_BASE="kinovo-server"
BASE_PORT=5002
MAX_INSTANCES=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to show usage
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  status              Show status of all instances"
    echo "  start <n>           Start instance n (or all if no n specified)"
    echo "  stop <n>            Stop instance n (or all if no n specified)"
    echo "  restart <n>         Restart instance n (or all if no n specified)"
    echo "  scale <count>       Scale to specified number of instances"
    echo "  logs <n>            Show logs for instance n (or all if no n specified)"
    echo "  health              Check health of all instances"
    echo "  reload-nginx        Reload nginx configuration"
    echo ""
    echo "Examples:"
    echo "  $0 status           # Show status of all instances"
    echo "  $0 start 2          # Start instance 2"
    echo "  $0 stop all         # Stop all instances"
    echo "  $0 scale 5          # Scale to 5 instances"
    echo "  $0 logs 3           # Show logs for instance 3"
}

# Function to get running instances
get_running_instances() {
    docker ps --format "table {{.Names}}" | grep "^${CONTAINER_BASE}-" | sed "s/${CONTAINER_BASE}-//" | sort -n
}

# Function to check instance status
check_status() {
    echo -e "${YELLOW}Checking instance status...${NC}"
    echo ""
    
    for i in $(seq 1 $MAX_INSTANCES); do
        CONTAINER_NAME="${CONTAINER_BASE}-${i}"
        if docker ps -q -f name="^${CONTAINER_NAME}$" > /dev/null 2>&1; then
            if [ "$(docker ps -q -f name=^${CONTAINER_NAME}$)" ]; then
                PORT=$((BASE_PORT + i - 1))
                # Get container stats
                STATS=$(docker stats --no-stream --format "CPU: {{.CPUPerc}} | MEM: {{.MemUsage}}" $CONTAINER_NAME 2>/dev/null)
                echo -e "${GREEN}✓ Instance $i${NC} - Port: $PORT - Status: Running - $STATS"
            fi
        fi
    done
    
    RUNNING_COUNT=$(get_running_instances | wc -l)
    echo ""
    echo -e "${BLUE}Total running instances: $RUNNING_COUNT${NC}"
}

# Function to start instance(s)
start_instances() {
    if [ "$1" == "all" ] || [ -z "$1" ]; then
        echo -e "${YELLOW}Starting all instances...${NC}"
        for i in $(seq 1 3); do  # Default to 3 instances
            start_single_instance $i
        done
    else
        start_single_instance $1
    fi
}

start_single_instance() {
    local INSTANCE_NUM=$1
    local PORT=$((BASE_PORT + INSTANCE_NUM - 1))
    local CONTAINER_NAME="${CONTAINER_BASE}-${INSTANCE_NUM}"
    
    # Check if already running
    if [ "$(docker ps -q -f name=^${CONTAINER_NAME}$)" ]; then
        echo -e "${YELLOW}Instance $INSTANCE_NUM is already running${NC}"
        return
    fi
    
    # Check if container exists but stopped
    if [ "$(docker ps -aq -f name=^${CONTAINER_NAME}$)" ]; then
        echo -e "${YELLOW}Starting existing instance $INSTANCE_NUM...${NC}"
        docker start $CONTAINER_NAME
    else
        echo -e "${YELLOW}Creating and starting instance $INSTANCE_NUM on port $PORT...${NC}"
        docker run -d \
            --name $CONTAINER_NAME \
            --restart unless-stopped \
            -p ${PORT}:5002 \
            --env-file .env \
            -e INSTANCE_ID="instance-${INSTANCE_NUM}" \
            kinovo-server
    fi
    
    sleep 2
    if [ "$(docker ps -q -f name=^${CONTAINER_NAME}$)" ]; then
        echo -e "${GREEN}✓ Instance $INSTANCE_NUM started successfully${NC}"
    else
        echo -e "${RED}✗ Failed to start instance $INSTANCE_NUM${NC}"
    fi
}

# Function to stop instance(s)
stop_instances() {
    if [ "$1" == "all" ] || [ -z "$1" ]; then
        echo -e "${YELLOW}Stopping all instances...${NC}"
        docker ps --format "{{.Names}}" | grep "^${CONTAINER_BASE}-" | while read container; do
            echo -e "${YELLOW}Stopping $container...${NC}"
            docker stop $container
        done
    else
        local CONTAINER_NAME="${CONTAINER_BASE}-$1"
        echo -e "${YELLOW}Stopping instance $1...${NC}"
        docker stop $CONTAINER_NAME
    fi
}

# Function to restart instance(s)
restart_instances() {
    if [ "$1" == "all" ] || [ -z "$1" ]; then
        stop_instances all
        sleep 2
        start_instances all
    else
        stop_instances $1
        sleep 1
        start_instances $1
    fi
}

# Function to scale instances
scale_instances() {
    local TARGET=$1
    
    if [ -z "$TARGET" ] || [ "$TARGET" -lt 1 ] || [ "$TARGET" -gt $MAX_INSTANCES ]; then
        echo -e "${RED}Please specify a valid number of instances (1-$MAX_INSTANCES)${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Scaling to $TARGET instances...${NC}"
    
    # Stop excess instances
    for i in $(seq $((TARGET + 1)) $MAX_INSTANCES); do
        CONTAINER_NAME="${CONTAINER_BASE}-${i}"
        if [ "$(docker ps -q -f name=^${CONTAINER_NAME}$)" ]; then
            echo -e "${YELLOW}Stopping instance $i...${NC}"
            docker stop $CONTAINER_NAME
            docker rm $CONTAINER_NAME
        fi
    done
    
    # Start required instances
    for i in $(seq 1 $TARGET); do
        start_single_instance $i
    done
    
    echo -e "${GREEN}Scaled to $TARGET instances${NC}"
    generate_nginx_upstream $TARGET
}

# Function to show logs
show_logs() {
    if [ "$1" == "all" ] || [ -z "$1" ]; then
        for i in $(get_running_instances); do
            CONTAINER_NAME="${CONTAINER_BASE}-${i}"
            echo -e "\n${GREEN}--- Instance $i logs ---${NC}"
            docker logs --tail 20 $CONTAINER_NAME
        done
    else
        CONTAINER_NAME="${CONTAINER_BASE}-$1"
        docker logs -f $CONTAINER_NAME
    fi
}

# Function to check health
check_health() {
    echo -e "${YELLOW}Running health checks...${NC}"
    echo ""
    
    for i in $(get_running_instances); do
        PORT=$((BASE_PORT + i - 1))
        
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/api/health | grep -q "200"; then
            RESPONSE=$(curl -s http://localhost:${PORT}/api/health)
            echo -e "${GREEN}✓ Instance $i (port $PORT): Healthy${NC}"
        else
            echo -e "${RED}✗ Instance $i (port $PORT): Unhealthy${NC}"
        fi
    done
}

# Function to generate nginx upstream configuration
generate_nginx_upstream() {
    local COUNT=${1:-$(get_running_instances | wc -l)}
    
    echo -e "\n${YELLOW}Nginx upstream configuration:${NC}"
    echo -e "${BLUE}upstream kinovo_backend {${NC}"
    echo -e "${BLUE}    least_conn;${NC}"
    
    for i in $(seq 1 $COUNT); do
        PORT=$((BASE_PORT + i - 1))
        echo -e "${BLUE}    server localhost:${PORT} weight=1 max_fails=3 fail_timeout=30s;${NC}"
    done
    
    echo -e "${BLUE}    keepalive 32;${NC}"
    echo -e "${BLUE}}${NC}"
}

# Function to reload nginx
reload_nginx() {
    echo -e "${YELLOW}Reloading nginx configuration...${NC}"
    
    # Test nginx config first
    if sudo nginx -t 2>/dev/null; then
        sudo nginx -s reload
        echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
    else
        echo -e "${RED}✗ Nginx configuration test failed${NC}"
        sudo nginx -t
        exit 1
    fi
}

# Main script logic
case "$1" in
    status)
        check_status
        ;;
    start)
        start_instances $2
        ;;
    stop)
        stop_instances $2
        ;;
    restart)
        restart_instances $2
        ;;
    scale)
        scale_instances $2
        ;;
    logs)
        show_logs $2
        ;;
    health)
        check_health
        ;;
    reload-nginx)
        reload_nginx
        ;;
    *)
        show_usage
        exit 1
        ;;
esac