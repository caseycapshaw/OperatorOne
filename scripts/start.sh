#!/bin/bash
# OperatorOne — Unified Startup Script
# Usage: ./scripts/start.sh                      # Dev (localhost, HTTP)
#        ./scripts/start.sh --domain example.com  # Prod (TLS, real domain)
#
# This script:
#   1. Generates .env if missing (all secrets auto-generated)
#   2. Generates a one-time setup code (stored in .env as SETUP_CODE)
#   3. Starts docker compose (dev or prod based on domain)
#   4. Waits for critical services to become healthy
#   5. Displays setup URL + setup code

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Parse arguments
DOMAIN=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --domain=*)
      DOMAIN="${1#*=}"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--domain example.com]"
      echo ""
      echo "  --domain    Set the deployment domain (default: localhost)"
      echo "              localhost → dev mode (HTTP, no TLS)"
      echo "              anything else → prod mode (TLS, Let's Encrypt)"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

cd "$PROJECT_DIR"

echo ""
echo -e "${CYAN}${BOLD}  OperatorOne${NC}"
echo -e "${DIM}  ─────────────────────────────${NC}"
echo ""

# ─── Step 1: Generate .env if missing ─────────────────────────────────
if [ ! -f .env ]; then
  echo -e "${BLUE}[1/4]${NC} Generating .env with random secrets..."
  bash "$SCRIPT_DIR/generate-secrets.sh" > .env 2>/dev/null
  echo -e "  ${GREEN}✓${NC} .env created"
else
  echo -e "${BLUE}[1/4]${NC} .env exists — keeping current secrets"
fi

# ─── Step 2: Ensure SETUP_CODE exists ─────────────────────────────────
SETUP_CODE=$(grep -E '^SETUP_CODE=' .env 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
if [ -z "$SETUP_CODE" ]; then
  SETUP_CODE="op1-$(openssl rand -hex 3)"
  echo "" >> .env
  echo "# One-time setup code for the web wizard" >> .env
  echo "SETUP_CODE=${SETUP_CODE}" >> .env
  echo -e "  ${GREEN}✓${NC} Setup code generated"
fi

# ─── Step 3: Apply --domain if provided ───────────────────────────────
if [ -n "$DOMAIN" ]; then
  # Update DOMAIN in .env
  if grep -q '^DOMAIN=' .env; then
    sed -i.bak "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|" .env && rm -f .env.bak
  else
    echo "DOMAIN=${DOMAIN}" >> .env
  fi
  # Update ACME_EMAIL if it's still the placeholder
  CURRENT_EMAIL=$(grep -E '^ACME_EMAIL=' .env | cut -d= -f2)
  if [ "$CURRENT_EMAIL" = "admin@example.com" ] || [ "$CURRENT_EMAIL" = "admin@example.com  # CHANGE THIS" ]; then
    sed -i.bak "s|^ACME_EMAIL=.*|ACME_EMAIL=admin@${DOMAIN}|" .env && rm -f .env.bak
  fi
  echo -e "  ${GREEN}✓${NC} Domain set to ${BOLD}${DOMAIN}${NC}"
fi

# Resolve final domain from .env
RESOLVED_DOMAIN=$(grep -E '^DOMAIN=' .env | head -1 | cut -d= -f2 | sed 's/#.*//' | xargs)
RESOLVED_DOMAIN="${RESOLVED_DOMAIN:-localhost}"

# ─── Step 4: Start Docker Compose ─────────────────────────────────────
echo ""
if [[ "$RESOLVED_DOMAIN" == "localhost" || "$RESOLVED_DOMAIN" == *".localhost"* ]]; then
  MODE="dev"
  SCHEME="http"
  COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.dev.yml \
    -f modules/console/docker-compose.yml -f modules/console/docker-compose.dev.yml \
    -f modules/admin/docker-compose.yml -f modules/admin/docker-compose.dev.yml \
    -f modules/paperless/docker-compose.yml -f modules/paperless/docker-compose.dev.yml"
else
  MODE="prod"
  SCHEME="https"
  COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    -f modules/console/docker-compose.yml \
    -f modules/admin/docker-compose.yml \
    -f modules/paperless/docker-compose.yml"
fi

echo -e "${BLUE}[2/4]${NC} Starting services (${BOLD}${MODE}${NC} mode)..."
eval "$COMPOSE_CMD up -d" 2>&1 | while read -r line; do
  echo -e "  ${DIM}${line}${NC}"
done
echo -e "  ${GREEN}✓${NC} Compose started"

# ─── Step 5: Wait for health checks ───────────────────────────────────
echo ""
echo -e "${BLUE}[3/4]${NC} Waiting for services to become healthy..."

wait_for_service() {
  local name=$1
  local url=$2
  local max_attempts=${3:-60}
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo -e "  ${GREEN}✓${NC} ${name}"
      return 0
    fi
    # Also accept 5xx (Authentik returns 500 during startup but is "up")
    local status
    status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [[ "$status" =~ ^[2345] ]]; then
      echo -e "  ${GREEN}✓${NC} ${name}"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done

  echo -e "  ${YELLOW}⏳${NC} ${name} (not ready after ${max_attempts} attempts — may still be starting)"
  return 1
}

# PostgreSQL doesn't have an HTTP endpoint — check via docker exec
PG_READY=false
for attempt in $(seq 1 30); do
  if docker exec op1-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL"
    PG_READY=true
    break
  fi
  sleep 2
done
if [ "$PG_READY" = false ]; then
  echo -e "  ${YELLOW}⏳${NC} PostgreSQL (still starting)"
fi

wait_for_service "Authentik" "http://localhost:9000/-/health/ready/" 90
wait_for_service "Console" "http://console.${RESOLVED_DOMAIN}" 60

echo ""
echo -e "${BLUE}[4/4]${NC} ${GREEN}Ready!${NC}"

# ─── Display setup info ───────────────────────────────────────────────
CONSOLE_URL="${SCHEME}://console.${RESOLVED_DOMAIN}/setup"

echo ""
echo -e "${CYAN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "    ${BOLD}OperatorOne is ready!${NC}"
echo ""
echo -e "    Setup wizard:  ${BOLD}${CONSOLE_URL}${NC}"
echo -e "    Setup code:    ${BOLD}${SETUP_CODE}${NC}"
echo ""
echo -e "    ${DIM}Enter the code in the wizard to begin.${NC}"
echo ""
echo -e "${CYAN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
