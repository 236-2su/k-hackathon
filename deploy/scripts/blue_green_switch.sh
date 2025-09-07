#!/usr/bin/env bash
set -euo pipefail

# Decide new color
ACTIVE_FILE="deploy/active_color"
NEW_COLOR="blue"
if [ -f "$ACTIVE_FILE" ]; then
  CUR=$(cat "$ACTIVE_FILE")
  if [ "$CUR" = "blue" ]; then NEW_COLOR="green"; fi
fi
echo "[switch] -> $NEW_COLOR"

# Start new color (build images if not present)
docker compose -f deploy/docker-compose.prod.yml up -d backend_${NEW_COLOR}

# Health check
for i in {1..30}; do
  if docker exec hack-backend-${NEW_COLOR} wget -qO- http://localhost:8080/actuator/health | grep -q UP; then
    echo "health ok"; break
  fi
  sleep 2
  if [ $i -eq 30 ]; then echo "health timeout"; exit 1; fi
done

# Bump nginx by sending a header-based route (simple approach: restart is enough)
docker compose -f deploy/docker-compose.prod.yml restart nginx

# Stop old color
if [ "$NEW_COLOR" = "blue" ]; then
  docker compose -f deploy/docker-compose.prod.yml stop backend_green || true
else
  docker compose -f deploy/docker-compose.prod.yml stop backend_blue || true
fi

echo "$NEW_COLOR" > "$ACTIVE_FILE"
echo "[switch] active=$NEW_COLOR"
