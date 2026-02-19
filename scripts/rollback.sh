#!/bin/bash
# rollback.sh - Rollback a component to a previous version
# Usage: ./rollback.sh <component> <previous_version> [--restore-db <backup_file>]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
OVERRIDE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
BACKUP_DIR="${PROJECT_DIR}/backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

COMPONENT="${1:-}"
PREVIOUS_VERSION="${2:-}"
RESTORE_DB_FLAG="${3:-}"
BACKUP_FILE="${4:-}"

if [ -z "$COMPONENT" ] || [ -z "$PREVIOUS_VERSION" ]; then
    echo "Usage: $0 <component> <previous_version> [--restore-db <backup_file>]"
    echo ""
    echo "Examples:"
    echo "  $0 n8n 1.72.1"
    echo "  $0 openbao 2.5.0 --restore-db backups/openbao-20260205.sql"
    echo ""
    echo "Available backups:"
    ls -la "${BACKUP_DIR}"/*.sql 2>/dev/null || echo "  No database backups found"
    exit 1
fi

echo ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}  ROLLBACK: ${COMPONENT} → ${PREVIOUS_VERSION}${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

# Confirm rollback
echo -e "${RED}WARNING: This will revert ${COMPONENT} to version ${PREVIOUS_VERSION}${NC}"
if [ "$RESTORE_DB_FLAG" == "--restore-db" ]; then
    echo -e "${RED}WARNING: Database will be restored from ${BACKUP_FILE}${NC}"
fi
echo ""
read -p "Are you sure you want to proceed? (yes/no): " -r
[ "$REPLY" != "yes" ] && { echo "Rollback cancelled."; exit 0; }

# Update version in compose file
echo "[INFO] Updating version in docker-compose.prod.yml..."

case $COMPONENT in
    traefik)
        sed -i "s|traefik:v[0-9.]*|traefik:${PREVIOUS_VERSION}|g" "${OVERRIDE_FILE}"
        ;;
    n8n)
        sed -i "s|n8nio/n8n:[0-9.]*|n8nio/n8n:${PREVIOUS_VERSION}|g" "${OVERRIDE_FILE}"
        ;;
    openbao)
        sed -i "s|openbao/openbao:[0-9.]*|openbao/openbao:${PREVIOUS_VERSION}|g" "${OVERRIDE_FILE}"
        ;;
    authentik)
        sed -i "s|goauthentik/server:[0-9.]*|goauthentik/server:${PREVIOUS_VERSION}|g" "${OVERRIDE_FILE}"
        ;;
    grafana)
        sed -i "s|grafana/grafana:[0-9.]*|grafana/grafana:${PREVIOUS_VERSION}|g" "${OVERRIDE_FILE}"
        ;;
    loki)
        sed -i "s|grafana/loki:[0-9.]*|grafana/loki:${PREVIOUS_VERSION}|g" "${OVERRIDE_FILE}"
        ;;
    redis)
        sed -i "s|redis:[0-9.]*-alpine|redis:${PREVIOUS_VERSION}-alpine|g" "${OVERRIDE_FILE}"
        ;;
    *)
        echo -e "${RED}[ERROR] Unknown component: ${COMPONENT}${NC}"
        exit 1
        ;;
esac

# Restore database if requested
if [ "$RESTORE_DB_FLAG" == "--restore-db" ] && [ -n "$BACKUP_FILE" ]; then
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}[ERROR] Backup file not found: ${BACKUP_FILE}${NC}"
        exit 1
    fi
    
    echo "[INFO] Stopping ${COMPONENT}..."
    docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" stop "$COMPONENT" 2>/dev/null || true
    
    # For authentik, also stop worker
    if [ "$COMPONENT" == "authentik" ]; then
        docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" stop authentik-worker 2>/dev/null || true
    fi
    
    echo "[INFO] Restoring database from ${BACKUP_FILE}..."
    
    # Determine database name
    DB_NAME="$COMPONENT"
    [ "$COMPONENT" == "authentik" ] && DB_NAME="authentik"
    
    # Drop and recreate database, then restore
    docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
    docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_NAME};" 2>/dev/null || true
    docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${DB_NAME}" -d "${DB_NAME}" < "${BACKUP_FILE}"
    
    echo -e "${GREEN}[SUCCESS] Database restored${NC}"
fi

# Pull and restart
echo "[INFO] Pulling image..."
docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" pull "$COMPONENT"

echo "[INFO] Restarting ${COMPONENT}..."
docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" up -d "$COMPONENT"

# For authentik, also restart worker
if [ "$COMPONENT" == "authentik" ]; then
    docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" up -d authentik-worker
fi

# Wait and verify
echo "[INFO] Waiting for service to start..."
sleep 15

echo "[INFO] Checking service status..."
docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" ps "$COMPONENT"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Rollback complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Please verify the service is working correctly:"
echo "  docker compose logs -f ${COMPONENT}"
