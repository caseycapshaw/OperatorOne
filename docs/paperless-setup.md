# Paperless-ngx Setup Guide

Paperless-ngx provides document management with OCR, full-text search, and a REST API. It integrates into OperatorOne as a module, sharing PostgreSQL and Redis from the core stack.

---

## Prerequisites

- Core OperatorOne stack running (`docker compose up -d`)
- Authentik configured with at least one user

## 1. Create the Database

If your PostgreSQL instance was initialized **before** Paperless was added to `POSTGRES_MULTIPLE_DATABASES`, create the database manually:

```bash
docker exec -it op1-postgres psql -U postgres -c "
  CREATE USER paperless WITH PASSWORD '$(grep POSTGRES_PAPERLESS_PASSWORD .env | cut -d= -f2)';
  CREATE DATABASE paperless OWNER paperless;
"
```

For fresh deployments, the `init-multiple-dbs.sh` script handles this automatically.

## 2. Add Environment Variables

Add these to your `.env` file (or run `scripts/generate-secrets.sh` for a fresh deployment):

```bash
# PostgreSQL password for the paperless user
POSTGRES_PAPERLESS_PASSWORD=<generated>

# Django secret key
PAPERLESS_SECRET_KEY=<generated>

# Initial admin credentials (only used on first boot)
PAPERLESS_ADMIN_USER=admin
PAPERLESS_ADMIN_PASSWORD=<generated>

# API token — generated after first boot (see step 4)
PAPERLESS_API_TOKEN=

# Internal API URL (default works for Docker networking)
PAPERLESS_API_URL=http://op1-paperless:8000/api
```

## 3. Start the Module

```bash
# Dev
docker compose -f docker-compose.yml -f docker-compose.dev.yml \
  -f modules/console/docker-compose.yml -f modules/console/docker-compose.dev.yml \
  -f modules/admin/docker-compose.yml -f modules/admin/docker-compose.dev.yml \
  -f modules/paperless/docker-compose.yml -f modules/paperless/docker-compose.dev.yml \
  up -d

# Prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  -f modules/console/docker-compose.yml \
  -f modules/admin/docker-compose.yml \
  -f modules/paperless/docker-compose.yml \
  up -d
```

Verify the container is healthy:

```bash
docker ps --filter name=op1-paperless
```

## 4. Generate an API Token

1. Navigate to `docs.<domain>/admin/` (or `docs.localhost/admin/` in dev)
2. Log in with the admin credentials from step 2
3. Go to **Auth Tokens** and create a new token
4. Copy the token and add it to your `.env`:
   ```
   PAPERLESS_API_TOKEN=<your-token>
   ```
5. Restart the console container to pick up the new token:
   ```bash
   docker compose ... restart console
   ```

Alternatively, save the token via the Console admin UI:
- Navigate to **Dashboard > Admin > Integrations > Paperless-ngx**
- Paste the token and click "Save Key" (stores in OpenBao)

## 5. Configure SSO (Authentik Forward Auth)

Paperless uses the same forward auth pattern as n8n:

1. In Authentik admin (`auth.<domain>/`), create a **Proxy Provider**:
   - Name: `Paperless`
   - Authorization flow: default
   - External URL: `https://docs.<domain>` (or `http://docs.localhost` for dev)
   - Mode: Forward auth (single application)

2. Create an **Application**:
   - Name: `Paperless`
   - Slug: `paperless`
   - Provider: select the Paperless proxy provider

3. Add the application to your existing **Embedded Outpost**

No code changes needed — the `sso-web-chain@file` Traefik middleware handles authentication.

**Note:** Unlike other services, Paperless has SSO enabled in dev mode (`sso-web-chain@file` middleware). The Authentik embedded outpost must have `authentik_host` set to `http://auth.localhost` for browser redirects to work correctly.

## 6. Verify

- `docs.<domain>` (or `docs.localhost`) loads the Paperless UI
- Unauthenticated users are redirected to Authentik (prod only)
- Console sidebar "Documents" link opens Paperless in a new tab
- AI agent can search documents: "search my documents for invoice"

---

## Architecture

```
Traefik
  ├── docs.{DOMAIN} → Paperless-ngx (forward auth via Authentik)
  └── console.{DOMAIN} → Console (calls Paperless API internally)

Internal:
  Paperless → PostgreSQL (paperless DB) + Redis (paperless: prefix)
```

- **Image:** `ghcr.io/paperless-ngx/paperless-ngx:2.14`
- **Container:** `op1-paperless`
- **Port:** 8000 (internal)
- **Networks:** `op1-frontend` + `op1-backend`
- **Volumes:** `paperless-data`, `paperless-media`, `paperless-consume`

## AI Agent Tools

The Documents Operator sub-agent has 15 tools for managing Paperless:

| Tool | Role | Description |
|------|------|-------------|
| `search_paperless_documents` | viewer | Full-text search |
| `list_paperless_documents` | viewer | List with filters |
| `get_paperless_document` | viewer | Get document details |
| `upload_paperless_document` | member | Upload new document |
| `update_paperless_document` | member | Update metadata |
| `delete_paperless_document` | admin | Delete document |
| `list_paperless_tags` | viewer | List tags |
| `create_paperless_tag` | member | Create tag |
| `delete_paperless_tag` | admin | Delete tag |
| `list_paperless_correspondents` | viewer | List correspondents |
| `create_paperless_correspondent` | member | Create correspondent |
| `delete_paperless_correspondent` | admin | Delete correspondent |
| `list_paperless_document_types` | viewer | List document types |
| `create_paperless_document_type` | member | Create document type |
| `delete_paperless_document_type` | admin | Delete document type |

## Troubleshooting

**Paperless container won't start:**
- Check that the `paperless` database exists: `docker exec op1-postgres psql -U postgres -lqt | grep paperless`
- Verify `POSTGRES_PAPERLESS_PASSWORD` matches between `.env` and the database user

**Documents page shows "Paperless-ngx unavailable":**
- Confirm the container is healthy: `docker ps --filter name=op1-paperless`
- Check `PAPERLESS_API_URL` and `PAPERLESS_API_TOKEN` are set in the console container
- Verify network connectivity: `docker exec op1-console wget -qO- http://op1-paperless:8000/api/`

**SSO not working (prod):**
- Verify the Authentik application slug is `paperless`
- Check that the application is added to the embedded outpost
- Review Traefik logs: `docker logs op1-traefik --tail 50`
