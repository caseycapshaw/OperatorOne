#!/bin/bash
# check-updates.sh - Check for available updates to all components
# Run weekly via cron: 0 9 * * 1 /opt/op1/scripts/check-updates.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
OVERRIDE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
VERSIONS_FILE="${PROJECT_DIR}/versions.yml"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track updates
updates_available=""
update_count=0

echo "============================================"
echo "  OperatorOne - Update Checker"
echo "  $(date)"
echo "============================================"
echo ""

# Function to get latest GitHub release
get_github_release() {
    local repo=$1
    curl -sf "https://api.github.com/repos/${repo}/releases/latest" 2>/dev/null \
        | grep -oP '"tag_name": "\K[^"]+' \
        || echo "unknown"
}

# Function to get current version from compose file
get_current_version() {
    local pattern=$1
    local file="${OVERRIDE_FILE}"
    
    # Fall back to main compose if override doesn't exist
    [ ! -f "$file" ] && file="${COMPOSE_FILE}"
    
    grep -oP "${pattern}" "$file" 2>/dev/null | head -1 || echo "unknown"
}

# Function to compare versions (returns 0 if update available)
version_gt() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | tail -1)" != "$2" ]
}

# Function to normalize version (remove 'v' prefix)
normalize_version() {
    echo "${1#v}"
}

echo "Checking components..."
echo ""

# ─────────────────────────────────────────────────────────────
# Traefik
# ─────────────────────────────────────────────────────────────
current_traefik=$(get_current_version 'traefik:v\K[0-9.]+')
latest_traefik=$(normalize_version "$(get_github_release 'traefik/traefik')")

printf "%-15s Current: %-12s Latest: %-12s " "Traefik" "$current_traefik" "$latest_traefik"
if [ "$current_traefik" != "$latest_traefik" ] && [ "$latest_traefik" != "unknown" ]; then
    echo -e "${YELLOW}UPDATE AVAILABLE${NC}"
    updates_available+="• Traefik: ${current_traefik} → ${latest_traefik}\n"
    ((update_count++))
else
    echo -e "${GREEN}Up to date${NC}"
fi

# ─────────────────────────────────────────────────────────────
# n8n
# ─────────────────────────────────────────────────────────────
current_n8n=$(get_current_version 'n8nio/n8n:\K[0-9.]+')
latest_n8n=$(normalize_version "$(get_github_release 'n8n-io/n8n')")

printf "%-15s Current: %-12s Latest: %-12s " "n8n" "$current_n8n" "$latest_n8n"
if [ "$current_n8n" != "$latest_n8n" ] && [ "$latest_n8n" != "unknown" ]; then
    echo -e "${YELLOW}UPDATE AVAILABLE${NC}"
    updates_available+="• n8n: ${current_n8n} → ${latest_n8n}\n"
    ((update_count++))
else
    echo -e "${GREEN}Up to date${NC}"
fi

# ─────────────────────────────────────────────────────────────
# OpenBao
# ─────────────────────────────────────────────────────────────
current_openbao=$(get_current_version 'openbao/openbao:\K[0-9.]+')
latest_openbao=$(normalize_version "$(get_github_release 'openbao/openbao')")

printf "%-15s Current: %-12s Latest: %-12s " "OpenBao" "$current_openbao" "$latest_openbao"
if [ "$current_openbao" != "$latest_openbao" ] && [ "$latest_openbao" != "unknown" ]; then
    echo -e "${YELLOW}UPDATE AVAILABLE${NC}"
    updates_available+="• OpenBao: ${current_openbao} → ${latest_openbao}\n"
    ((update_count++))
else
    echo -e "${GREEN}Up to date${NC}"
fi

# ─────────────────────────────────────────────────────────────
# Authentik
# ─────────────────────────────────────────────────────────────
current_authentik=$(get_current_version 'goauthentik/server:\K[0-9.]+')
latest_authentik=$(normalize_version "$(get_github_release 'goauthentik/authentik')")

printf "%-15s Current: %-12s Latest: %-12s " "Authentik" "$current_authentik" "$latest_authentik"
if [ "$current_authentik" != "$latest_authentik" ] && [ "$latest_authentik" != "unknown" ]; then
    echo -e "${YELLOW}UPDATE AVAILABLE${NC}"
    updates_available+="• Authentik: ${current_authentik} → ${latest_authentik}\n"
    ((update_count++))
else
    echo -e "${GREEN}Up to date${NC}"
fi

# ─────────────────────────────────────────────────────────────
# Grafana
# ─────────────────────────────────────────────────────────────
current_grafana=$(get_current_version 'grafana/grafana:\K[0-9.]+')
latest_grafana=$(normalize_version "$(get_github_release 'grafana/grafana')")

printf "%-15s Current: %-12s Latest: %-12s " "Grafana" "$current_grafana" "$latest_grafana"
if [ "$current_grafana" != "$latest_grafana" ] && [ "$latest_grafana" != "unknown" ]; then
    echo -e "${YELLOW}UPDATE AVAILABLE${NC}"
    updates_available+="• Grafana: ${current_grafana} → ${latest_grafana}\n"
    ((update_count++))
else
    echo -e "${GREEN}Up to date${NC}"
fi

# ─────────────────────────────────────────────────────────────
# Loki
# ─────────────────────────────────────────────────────────────
current_loki=$(get_current_version 'grafana/loki:\K[0-9.]+')
latest_loki=$(normalize_version "$(get_github_release 'grafana/loki')")

printf "%-15s Current: %-12s Latest: %-12s " "Loki" "$current_loki" "$latest_loki"
if [ "$current_loki" != "$latest_loki" ] && [ "$latest_loki" != "unknown" ]; then
    echo -e "${YELLOW}UPDATE AVAILABLE${NC}"
    updates_available+="• Loki: ${current_loki} → ${latest_loki}\n"
    ((update_count++))
else
    echo -e "${GREEN}Up to date${NC}"
fi

# ─────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────
echo ""
echo "============================================"
if [ $update_count -gt 0 ]; then
    echo -e "${YELLOW}${update_count} update(s) available${NC}"
    echo ""
    echo "To update a component, run:"
    echo "  ./scripts/update-component.sh <component> <version>"
    echo ""
    echo "Example:"
    echo "  ./scripts/update-component.sh traefik ${latest_traefik}"
else
    echo -e "${GREEN}All components are up to date${NC}"
fi
echo "============================================"

# ─────────────────────────────────────────────────────────────
# Generate versions.yml
# ─────────────────────────────────────────────────────────────
cat > "${VERSIONS_FILE}" << EOF
# Auto-generated by check-updates.sh
# Last checked: $(date -Iseconds)

components:
  traefik:
    current: "${current_traefik}"
    latest: "${latest_traefik}"
    changelog: "https://github.com/traefik/traefik/releases"
    update_available: $([ "$current_traefik" != "$latest_traefik" ] && echo "true" || echo "false")

  n8n:
    current: "${current_n8n}"
    latest: "${latest_n8n}"
    changelog: "https://github.com/n8n-io/n8n/releases"
    update_available: $([ "$current_n8n" != "$latest_n8n" ] && echo "true" || echo "false")

  openbao:
    current: "${current_openbao}"
    latest: "${latest_openbao}"
    changelog: "https://github.com/openbao/openbao/releases"
    update_available: $([ "$current_openbao" != "$latest_openbao" ] && echo "true" || echo "false")

  authentik:
    current: "${current_authentik}"
    latest: "${latest_authentik}"
    changelog: "https://github.com/goauthentik/authentik/releases"
    update_available: $([ "$current_authentik" != "$latest_authentik" ] && echo "true" || echo "false")

  grafana:
    current: "${current_grafana}"
    latest: "${latest_grafana}"
    changelog: "https://github.com/grafana/grafana/releases"
    update_available: $([ "$current_grafana" != "$latest_grafana" ] && echo "true" || echo "false")

  loki:
    current: "${current_loki}"
    latest: "${latest_loki}"
    changelog: "https://github.com/grafana/loki/releases"
    update_available: $([ "$current_loki" != "$latest_loki" ] && echo "true" || echo "false")

last_checked: "$(date -Iseconds)"
EOF

echo ""
echo "Version info saved to: ${VERSIONS_FILE}"

# ─────────────────────────────────────────────────────────────
# Slack notification (if configured)
# ─────────────────────────────────────────────────────────────
if [ -n "$updates_available" ] && [ -n "$SLACK_WEBHOOK" ]; then
    curl -sf -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🔄 *OperatorOne Updates Available*\n\n${updates_available}\nRun \`check-updates.sh\` for details.\"}" \
        "$SLACK_WEBHOOK" > /dev/null
    echo "Slack notification sent."
fi

exit 0
