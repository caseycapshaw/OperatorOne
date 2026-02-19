#!/bin/bash
# init-openbao.sh - First-time OpenBao bootstrap
# Run ONCE after first `docker compose up -d` to initialize the vault
#
# This script:
#   1. Initializes OpenBao with a single unseal key
#   2. Unseals the vault
#   3. Enables KV v2 secrets engine at secret/
#   4. Creates a console-admin policy
#   5. Creates a long-lived service token for Console
#   6. Prints values to add to .env

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

export BAO_ADDR="${BAO_ADDR:-http://localhost:8200}"

echo ""
echo "============================================"
echo "  OpenBao First-Time Initialization"
echo "============================================"
echo ""

# Check if OpenBao is running
if ! curl -sf "${BAO_ADDR}/v1/sys/health" > /dev/null 2>&1 && \
   ! curl -sf "${BAO_ADDR}/v1/sys/health" -o /dev/null -w "%{http_code}" 2>/dev/null | grep -q "50[0-9]"; then
    echo -e "${RED}[ERROR] OpenBao is not reachable at ${BAO_ADDR}${NC}"
    echo "Make sure the openbao container is running: docker compose ps openbao"
    exit 1
fi

# Check if already initialized
INIT_STATUS=$(curl -sf "${BAO_ADDR}/v1/sys/init" 2>/dev/null | grep -o '"initialized":[a-z]*' | cut -d: -f2)
if [ "$INIT_STATUS" = "true" ]; then
    echo -e "${YELLOW}[WARNING] OpenBao is already initialized.${NC}"
    echo "If you need to re-initialize, destroy the postgres openbao database and restart."
    exit 0
fi

echo -e "${BLUE}[INFO]${NC} Initializing OpenBao..."

# Initialize with 1 key share and 1 threshold (single-operator setup)
INIT_RESPONSE=$(curl -sf -X POST "${BAO_ADDR}/v1/sys/init" \
    -H "Content-Type: application/json" \
    -d '{"secret_shares": 1, "secret_threshold": 1}')

UNSEAL_KEY=$(echo "$INIT_RESPONSE" | grep -o '"keys":\["[^"]*"\]' | grep -o '"[^"]*"' | tail -1 | tr -d '"')
ROOT_TOKEN=$(echo "$INIT_RESPONSE" | grep -o '"root_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$UNSEAL_KEY" ] || [ -z "$ROOT_TOKEN" ]; then
    echo -e "${RED}[ERROR] Failed to initialize OpenBao${NC}"
    echo "Response: $INIT_RESPONSE"
    exit 1
fi

echo -e "${GREEN}[SUCCESS]${NC} OpenBao initialized"

# Unseal
echo -e "${BLUE}[INFO]${NC} Unsealing..."
curl -sf -X POST "${BAO_ADDR}/v1/sys/unseal" \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"${UNSEAL_KEY}\"}" > /dev/null

echo -e "${GREEN}[SUCCESS]${NC} OpenBao unsealed"

export BAO_TOKEN="$ROOT_TOKEN"

# Enable KV v2 secrets engine
echo -e "${BLUE}[INFO]${NC} Enabling KV v2 at secret/..."
curl -sf -X POST "${BAO_ADDR}/v1/sys/mounts/secret" \
    -H "X-Vault-Token: ${ROOT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"type": "kv", "options": {"version": "2"}}' > /dev/null

echo -e "${GREEN}[SUCCESS]${NC} KV v2 enabled at secret/"

# Create console-admin policy
echo -e "${BLUE}[INFO]${NC} Creating console-admin policy..."
POLICY='path "secret/data/*" { capabilities = ["create", "read", "update", "delete", "list"] }
path "secret/metadata/*" { capabilities = ["list", "read", "delete"] }
path "sys/health" { capabilities = ["read"] }'

curl -sf -X PUT "${BAO_ADDR}/v1/sys/policies/acl/console-admin" \
    -H "X-Vault-Token: ${ROOT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"policy\": $(echo "$POLICY" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}" > /dev/null

echo -e "${GREEN}[SUCCESS]${NC} Policy created"

# Create long-lived service token (1 year TTL, renewable)
echo -e "${BLUE}[INFO]${NC} Creating service token..."
TOKEN_RESPONSE=$(curl -sf -X POST "${BAO_ADDR}/v1/auth/token/create" \
    -H "X-Vault-Token: ${ROOT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"policies": ["console-admin"], "ttl": "8760h", "renewable": true, "display_name": "console-service"}')

SERVICE_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"client_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SERVICE_TOKEN" ]; then
    echo -e "${RED}[ERROR] Failed to create service token${NC}"
    exit 1
fi

echo -e "${GREEN}[SUCCESS]${NC} Service token created"

# Print results
echo ""
echo "============================================"
echo -e "${GREEN}  OpenBao Initialization Complete${NC}"
echo "============================================"
echo ""
echo -e "${YELLOW}Add these values to your .env file:${NC}"
echo ""
echo "OPENBAO_UNSEAL_KEY=${UNSEAL_KEY}"
echo "OPENBAO_ROOT_TOKEN=${ROOT_TOKEN}"
echo "OPENBAO_SERVICE_TOKEN=${SERVICE_TOKEN}"
echo ""
echo -e "${RED}IMPORTANT: Store the root token securely.${NC}"
echo "The root token is only needed for administrative operations."
echo "The service token is used by Console for day-to-day secrets access."
echo ""
echo "After adding to .env, restart OpenBao to enable auto-unseal:"
echo "  docker compose restart openbao"
echo ""
