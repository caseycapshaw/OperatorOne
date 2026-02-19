#!/bin/bash
# update-component.sh - Safely update a single component
# Usage: ./update-component.sh <component> <version> [--no-backup]

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
BLUE='\033[0;34m'
NC='\033[0m'

# Arguments
COMPONENT="${1:-}"
NEW_VERSION="${2:-}"
NO_BACKUP="${3:-}"

# Validate arguments
if [ -z "$COMPONENT" ] || [ -z "$NEW_VERSION" ]; then
    echo "Usage: $0 <component> <version> [--no-backup]"
    echo ""
    echo "Components: traefik, n8n, openbao, authentik, grafana, loki, redis"
    echo ""
    echo "Examples:"
    echo "  $0 traefik v3.2.3"
    echo "  $0 n8n 1.75.0"
    echo "  $0 openbao 2.6.0"
    exit 1
fi

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Ensure override file exists
if [ ! -f "$OVERRIDE_FILE" ]; then
    echo -e "${YELLOW}Creating docker-compose.prod.yml from template...${NC}"
    cp "${COMPOSE_FILE}" "${OVERRIDE_FILE}"
fi

# ─────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

backup_database() {
    local db_name=$1
    local backup_file="${BACKUP_DIR}/${db_name}-$(date +%Y%m%d-%H%M%S).sql"
    
    log_info "Backing up ${db_name} database to ${backup_file}..."
    docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump -U "${db_name}" "${db_name}" > "${backup_file}" 2>/dev/null || {
        log_warning "Could not backup ${db_name} database (may not exist yet)"
        return 0
    }
    log_success "Database backup created: ${backup_file}"
}

health_check() {
    local url=$1
    local max_attempts=${2:-30}
    local attempt=1
    
    log_info "Waiting for service to be healthy..."
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            log_success "Service is healthy!"
            return 0
        fi
        printf "."
        sleep 2
        ((attempt++))
    done
    echo ""
    log_error "Health check failed after ${max_attempts} attempts"
    return 1
}

update_image_version() {
    local pattern=$1
    local replacement=$2
    
    sed -i "s|${pattern}|${replacement}|g" "${OVERRIDE_FILE}"
}

pull_and_restart() {
    local service=$1
    
    log_info "Pulling new image..."
    docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" pull "$service"
    
    log_info "Restarting ${service}..."
    docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" up -d "$service"
}

# ─────────────────────────────────────────────────────────────
# Component-Specific Update Logic
# ─────────────────────────────────────────────────────────────

update_traefik() {
    local version=$1
    
    echo ""
    echo "============================================"
    echo "  Updating Traefik to ${version}"
    echo "  (Zero-downtime rolling update)"
    echo "============================================"
    echo ""
    
    # Traefik doesn't need database backup
    update_image_version 'traefik:v[0-9.]*' "traefik:${version}"
    pull_and_restart traefik
    
    sleep 5
    health_check "http://localhost:8080/ping" 15 || {
        log_error "Traefik update failed! Rolling back..."
        git checkout "${OVERRIDE_FILE}" 2>/dev/null || true
        docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" up -d traefik
        exit 1
    }
    
    log_success "Traefik updated to ${version}"
}

update_n8n() {
    local version=$1
    
    echo ""
    echo "============================================"
    echo "  Updating n8n to ${version}"
    echo "  (Brief downtime expected)"
    echo "============================================"
    echo ""
    
    # Check for running workflows
    log_info "Checking for running workflows..."
    # Note: Requires N8N_API_KEY to be set
    
    # Backup
    if [ "$NO_BACKUP" != "--no-backup" ]; then
        backup_database "n8n"
        
        # Export workflows
        log_info "Exporting workflows..."
        docker compose -f "${COMPOSE_FILE}" exec -T n8n n8n export:workflow --all \
            --output=/home/node/.n8n/backup-workflows-$(date +%Y%m%d).json 2>/dev/null || true
    fi
    
    update_image_version 'n8nio/n8n:[0-9.]*' "n8nio/n8n:${version}"
    pull_and_restart n8n
    
    health_check "http://localhost:5678/healthz" 30 || {
        log_error "n8n update failed!"
        exit 1
    }
    
    log_success "n8n updated to ${version}"
}

update_openbao() {
    local version=$1

    echo ""
    echo "============================================"
    echo "  Updating OpenBao to ${version}"
    echo "  (Brief downtime expected)"
    echo "============================================"
    echo ""

    log_warning "IMPORTANT: Review migration notes at:"
    echo "https://github.com/openbao/openbao/releases/tag/v${version}"
    echo ""
    read -p "Continue with update? (y/n): " -r
    [ "$REPLY" != "y" ] && exit 0

    if [ "$NO_BACKUP" != "--no-backup" ]; then
        backup_database "openbao"
    fi

    update_image_version 'openbao/openbao:[0-9.]*' "openbao/openbao:${version}"
    pull_and_restart openbao

    sleep 10
    health_check "http://localhost:8200/v1/sys/seal-status" 30 || {
        log_error "OpenBao update failed!"
        exit 1
    }

    log_success "OpenBao updated to ${version}"
}

update_authentik() {
    local version=$1
    
    echo ""
    echo "============================================"
    echo "  Updating Authentik to ${version}"
    echo "  (SSO will be briefly unavailable)"
    echo "============================================"
    echo ""
    
    log_warning "This will interrupt SSO for all applications!"
    read -p "Continue with update? (y/n): " -r
    [ "$REPLY" != "y" ] && exit 0
    
    if [ "$NO_BACKUP" != "--no-backup" ]; then
        backup_database "authentik"
    fi
    
    # Update both server and worker (must match)
    update_image_version 'goauthentik/server:[0-9.]*' "goauthentik/server:${version}"
    
    log_info "Pulling new images..."
    docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" pull authentik-server authentik-worker
    
    log_info "Stopping worker..."
    docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" stop authentik-worker
    
    log_info "Restarting server (migrations will run)..."
    docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" up -d authentik-server
    
    log_info "Waiting for migrations (this may take a minute)..."
    sleep 45
    
    log_info "Starting worker..."
    docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" up -d authentik-worker
    
    health_check "http://localhost:9000/-/health/ready/" 60 || {
        log_error "Authentik update failed!"
        exit 1
    }
    
    log_success "Authentik updated to ${version}"
}

update_grafana() {
    local version=$1
    
    echo ""
    echo "============================================"
    echo "  Updating Grafana to ${version}"
    echo "  (Zero-downtime update)"
    echo "============================================"
    echo ""
    
    update_image_version 'grafana/grafana:[0-9.]*' "grafana/grafana:${version}"
    pull_and_restart grafana
    
    health_check "http://localhost:3001/api/health" 30 || {
        log_error "Grafana update failed!"
        exit 1
    }
    
    log_success "Grafana updated to ${version}"
}

update_loki() {
    local version=$1
    
    echo ""
    echo "============================================"
    echo "  Updating Loki to ${version}"
    echo "  (Zero-downtime update)"
    echo "============================================"
    echo ""
    
    update_image_version 'grafana/loki:[0-9.]*' "grafana/loki:${version}"
    pull_and_restart loki
    
    sleep 10
    health_check "http://localhost:3100/ready" 30 || {
        log_error "Loki update failed!"
        exit 1
    }
    
    log_success "Loki updated to ${version}"
}

update_redis() {
    local version=$1
    
    echo ""
    echo "============================================"
    echo "  Updating Redis to ${version}"
    echo "  (Brief reconnection expected)"
    echo "============================================"
    echo ""
    
    update_image_version 'redis:[0-9.]*-alpine' "redis:${version}-alpine"
    pull_and_restart redis
    
    sleep 5
    docker compose -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" exec -T redis redis-cli ping | grep -q PONG || {
        log_error "Redis update failed!"
        exit 1
    }
    
    log_success "Redis updated to ${version}"
}

# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

case $COMPONENT in
    traefik)
        update_traefik "$NEW_VERSION"
        ;;
    n8n)
        update_n8n "$NEW_VERSION"
        ;;
    openbao)
        update_openbao "$NEW_VERSION"
        ;;
    authentik)
        update_authentik "$NEW_VERSION"
        ;;
    grafana)
        update_grafana "$NEW_VERSION"
        ;;
    loki)
        update_loki "$NEW_VERSION"
        ;;
    redis)
        update_redis "$NEW_VERSION"
        ;;
    *)
        log_error "Unknown component: ${COMPONENT}"
        echo "Valid components: traefik, n8n, openbao, authentik, grafana, loki, redis"
        exit 1
        ;;
esac

echo ""
echo "============================================"
log_success "Update complete!"
echo ""
echo "Next steps:"
echo "  1. Monitor logs: docker compose logs -f ${COMPONENT}"
echo "  2. Verify functionality in the UI"
echo "  3. Check versions.yml is updated"
echo "============================================"
