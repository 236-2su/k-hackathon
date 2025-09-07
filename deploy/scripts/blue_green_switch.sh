#!/usr/bin/env bash
set -euo pipefail

# Colors and emojis for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script parameters
GIT_SHA=${1:-"latest"}
COMPOSE_FILE="deploy/docker-compose.prod.yml"
ACTIVE_FILE="~/deployment/active_color"
HEALTH_CHECK_URL="http://localhost:8080/actuator/health"
HEALTH_TIMEOUT=30
ROLLBACK_TIMEOUT=60

echo -e "${BLUE}🚀 Starting Blue/Green deployment for SHA: ${GIT_SHA}${NC}"

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  WARNING: $1${NC}"
}

# Function to check if container is running
check_container_running() {
    local container_name=$1
    if docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        return 0
    else
        return 1
    fi
}

# Function to perform health check
health_check() {
    local color=$1
    local container_name="hack-backend-${color}"
    
    log "🏥 Performing health check for ${color} environment..."
    
    for i in $(seq 1 $HEALTH_TIMEOUT); do
        if check_container_running "$container_name"; then
            # Try health check via container IP
            if docker exec "$container_name" curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
                log "✅ Health check passed for ${color} environment (attempt $i/$HEALTH_TIMEOUT)"
                return 0
            else
                if [ $i -eq $HEALTH_TIMEOUT ]; then
                    error "Health check failed for ${color} environment after $HEALTH_TIMEOUT attempts"
                    return 1
                fi
                echo -n "⏳ Health check attempt $i/$HEALTH_TIMEOUT for ${color}... "
                sleep 2
                echo "retrying"
            fi
        else
            error "Container ${container_name} is not running"
            return 1
        fi
    done
}

# Function to rollback deployment
rollback() {
    local failed_color=$1
    local stable_color=$2
    
    warning "🔄 Rolling back from ${failed_color} to ${stable_color}"
    
    # Stop the failed deployment
    docker compose -f "$COMPOSE_FILE" stop "backend_${failed_color}" || true
    
    # Ensure stable environment is running
    docker compose -f "$COMPOSE_FILE" up -d "backend_${stable_color}"
    
    # Wait for rollback to complete
    sleep 10
    
    # Restart nginx to ensure traffic goes to stable environment
    docker compose -f "$COMPOSE_FILE" restart nginx
    
    # Update active color file
    echo "$stable_color" > "$ACTIVE_FILE"
    
    error "Rollback completed. Active environment: ${stable_color}"
    exit 1
}

# Determine current and new colors
CURRENT_COLOR="blue"  # Default
NEW_COLOR="green"     # Default

if [ -f "$ACTIVE_FILE" ]; then
    CURRENT_COLOR=$(cat "$ACTIVE_FILE")
    if [ "$CURRENT_COLOR" = "blue" ]; then
        NEW_COLOR="green"
    else
        NEW_COLOR="blue"
    fi
else
    # First deployment - create the file
    echo "blue" > "$ACTIVE_FILE"
fi

log "Current active environment: ${CURRENT_COLOR}"
log "Deploying to: ${NEW_COLOR}"

# Pre-deployment checks
log "🔍 Pre-deployment checks..."

# Check if Docker Compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    error "Docker Compose file not found: $COMPOSE_FILE"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running or not accessible"
    exit 1
fi

# Set environment variable for docker-compose
export GIT_SHA

# Build and start new environment
log "🏗️  Building and starting ${NEW_COLOR} environment with SHA: ${GIT_SHA}"

# Stop any existing instance of the new color
docker compose -f "$COMPOSE_FILE" stop "backend_${NEW_COLOR}" || true

# Start new environment
if ! docker compose -f "$COMPOSE_FILE" up -d "backend_${NEW_COLOR}"; then
    error "Failed to start ${NEW_COLOR} environment"
    exit 1
fi

# Wait for container to be fully up
log "⏳ Waiting for ${NEW_COLOR} environment to initialize..."
sleep 15

# Perform health check on new environment
if ! health_check "$NEW_COLOR"; then
    error "Health check failed for ${NEW_COLOR} environment"
    rollback "$NEW_COLOR" "$CURRENT_COLOR"
fi

# Switch traffic to new environment
log "🔀 Switching traffic to ${NEW_COLOR} environment..."

# Update nginx configuration if needed (restart nginx)
if ! docker compose -f "$COMPOSE_FILE" restart nginx; then
    error "Failed to restart nginx"
    rollback "$NEW_COLOR" "$CURRENT_COLOR"
fi

# Final health check through nginx
log "🏥 Performing final health check through nginx..."
sleep 5

# Check if the application is accessible through nginx
for i in $(seq 1 10); do
    if curl -f -s "http://localhost/" > /dev/null 2>&1; then
        log "✅ Final health check passed (attempt $i/10)"
        break
    else
        if [ $i -eq 10 ]; then
            error "Final health check failed after 10 attempts"
            rollback "$NEW_COLOR" "$CURRENT_COLOR"
        fi
        sleep 3
    fi
done

# Stop old environment
log "🛑 Stopping ${CURRENT_COLOR} environment..."
docker compose -f "$COMPOSE_FILE" stop "backend_${CURRENT_COLOR}" || warning "Failed to stop ${CURRENT_COLOR} environment"

# Update active color
echo "$NEW_COLOR" > "$ACTIVE_FILE"

# Cleanup old images (keep last 3 versions)
log "🧹 Cleaning up old Docker images..."
docker images "hack-backend" --format "table {{.Tag}}\t{{.CreatedAt}}" | tail -n +2 | sort -k2 -r | tail -n +4 | awk '{print $1}' | xargs -r docker rmi "hack-backend:" || warning "Some old images could not be removed"

# Final success message
log "🎉 Blue/Green deployment completed successfully!"
log "Active environment: ${NEW_COLOR}"
log "SHA: ${GIT_SHA}"

# Display current status
echo ""
echo "📊 Current Status:"
echo "=================="
echo "Active Environment: $(cat "$ACTIVE_FILE")"
echo "Running Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep hack-

log "✅ Deployment completed in $(date)"
