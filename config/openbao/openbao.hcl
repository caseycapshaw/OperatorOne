# OpenBao Server Configuration
# Storage: PostgreSQL (shared with other OP1 services)
# Unseal: Handled by entrypoint.sh using static unseal key

ui = false

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = true  # Internal network only — no Traefik exposure
}

storage "postgresql" {
  connection_url = "{{BAO_PG_CONNECTION_URL}}"
}

disable_mlock = true
