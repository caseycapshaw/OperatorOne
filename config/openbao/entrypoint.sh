#!/bin/sh
# OpenBao entrypoint: write unseal key to file, then start server
# The static unseal key allows auto-unseal on Docker restart

set -e

# Write unseal key from env var to file (if set)
if [ -n "$OPENBAO_UNSEAL_KEY" ]; then
  mkdir -p /openbao/secrets
  echo "$OPENBAO_UNSEAL_KEY" > /openbao/secrets/unseal.key
  chmod 600 /openbao/secrets/unseal.key
fi

# Substitute env vars in config
sed "s|{{BAO_PG_CONNECTION_URL}}|${BAO_PG_CONNECTION_URL}|g" \
  /openbao/config/openbao.hcl > /tmp/openbao.hcl

# Start OpenBao server in background
bao server -config=/tmp/openbao.hcl &
BAO_PID=$!

# Wait for server to be ready
export BAO_ADDR="http://127.0.0.1:8200"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if wget -q --spider http://127.0.0.1:8200/v1/sys/health?standbyok=true\&sealedcode=200\&uninitcode=200 2>/dev/null; then
    break
  fi
  sleep 1
done

# Auto-unseal if key file exists and server is sealed
if [ -f /openbao/secrets/unseal.key ]; then
  UNSEAL_KEY=$(cat /openbao/secrets/unseal.key)
  bao operator unseal "$UNSEAL_KEY" > /dev/null 2>&1 && echo "OpenBao auto-unsealed" || echo "OpenBao auto-unseal failed"
fi

# Wait for server process
wait $BAO_PID
