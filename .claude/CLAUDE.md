# OperatorOne — Agent Context

Comprehensive reference for continuing development on this project across sessions. Read this before doing any work.

---

## What This Is

A self-hosted, AI-agent-centric operations platform for small businesses. Everything runs in Docker Compose on a single server. An AI agent (Claude) orchestrates all backend systems through MCP tools. Clients interact through the Operator Console. The owner talks to the AI in natural language.

**Core idea:** One AI, all your systems. No tab-switching between five different SaaS tools.

---

## Architecture at a Glance

```
Internet → Traefik (ports 80/443)
              ├── auth.{DOMAIN}        → Authentik (SSO, identity)
              ├── automation.{DOMAIN}  → n8n (workflow automation) [SSO: forward auth]
              ├── monitor.{DOMAIN}     → Grafana (observability) [SSO: OAuth2]
              ├── console.{DOMAIN}      → Console (client dashboard) [SSO: OAuth2]
              ├── docs.{DOMAIN}        → Paperless-ngx (documents) [SSO: forward auth]
              ├── traefik.{DOMAIN}     → Traefik dashboard [SSO: forward auth]
              └── approvals.{DOMAIN}   → Admin approval API (Slack webhooks)

Internal (op1-backend network, not internet-exposed):
  OpenBao (8200) — secrets management (KV v2, service token auth)
  PostgreSQL (5432) — shared by: openbao, n8n, authentik, console, paperless, op1_audit
  Redis (6379) — shared by: authentik, paperless (key prefix isolation)
```

### Docker Networks

| Network | Type | Purpose |
|---------|------|---------|
| `op1-frontend` | bridge | Traefik ↔ services that need public routing |
| `op1-backend` | bridge, **internal** | Services ↔ PostgreSQL/Redis (no internet access) |

Every service that needs Traefik routing joins both networks. Database-only services join only `op1-backend`.

### Compose File Layering

```bash
# Dev (HTTP, no TLS, debug logging)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Dev with modules (standard dev stack)
docker compose -f docker-compose.yml -f docker-compose.dev.yml \
  -f modules/console/docker-compose.yml -f modules/console/docker-compose.dev.yml \
  -f modules/admin/docker-compose.yml -f modules/admin/docker-compose.dev.yml \
  -f modules/paperless/docker-compose.yml -f modules/paperless/docker-compose.dev.yml \
  up -d

# Prod (pinned versions, TLS, resource limits)
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  -f modules/console/docker-compose.yml \
  -f modules/admin/docker-compose.yml \
  -f modules/paperless/docker-compose.yml \
  up -d
```

---

## Services and Containers

| Service | Container Name | Image | Internal Port | Traefik Subdomain |
|---------|---------------|-------|---------------|-------------------|
| Traefik | op1-traefik | traefik:v3.6 | 80, 443 | traefik.{DOMAIN} |
| OpenBao | op1-openbao | openbao/openbao:2.5.0 | 8200 | — (internal only) |
| n8n | op1-n8n | n8nio/n8n:latest | 5678 | automation.{DOMAIN} |
| Authentik Server | op1-authentik-server | ghcr.io/goauthentik/server:2024.12 | 9000 | auth.{DOMAIN} |
| Authentik Worker | op1-authentik-worker | (same) | — | — |
| PostgreSQL | op1-postgres | postgres:16-alpine | 5432 | — |
| Redis | op1-redis | redis:7-alpine | 6379 | — |
| Loki | op1-loki | grafana/loki:3.0.0 | 3100 | — |
| Promtail | op1-promtail | grafana/promtail:3.0.0 | — | — |
| Grafana | op1-grafana | grafana/grafana:11.0.0 | 3000 | monitor.{DOMAIN} |
| Console | op1-console | (built from modules/console/app/) | 3000 | console.{DOMAIN} |
| Paperless-ngx | op1-paperless | ghcr.io/paperless-ngx/paperless-ngx:2.14 | 8000 | docs.{DOMAIN} |
| Admin MCP | admin-mcp-server | (built from mcp-servers/op1-admin/) | 3000 | — |
| Approval API | admin-approval-api | (built from modules/admin/approval-api/) | 3001 | approvals.{DOMAIN} |

---

## SSO Architecture

**Critical pattern:** In dev, server-to-server OIDC calls use `http://authentik-server:9000/...` (Docker service name). Browser redirects use `http://auth.localhost/...`. This split is required because `auth.localhost` resolves to 127.0.0.1 inside containers (which is the container itself, not Authentik).

| Service | Auth Method | Middleware | Notes |
|---------|------------|------------|-------|
| n8n | Forward auth | `authentik-auth@file` → `sso-web-chain@file` | Proxy provider in Authentik |
| Paperless-ngx | Forward auth | `sso-web-chain@file` | Proxy provider in Authentik (same pattern as n8n) |
| Traefik dashboard | Forward auth | `authentik-auth@file` | Proxy provider in Authentik |
| Grafana | OAuth2/OIDC | `web-chain@file` | OAuth2 provider with custom `groups` scope mapping |
| Console | OAuth2/OIDC | `web-chain@file` | OAuth2 provider, Auth.js handles sessions |
| OpenBao | Service token | — | Internal only (no Traefik route, no SSO needed) |

### Traefik Middleware Chains

Defined in `config/traefik/dynamic/middleware.yml`:

| Chain | Middlewares | Used By |
|-------|-----------|---------|
| `web-chain@file` | security-headers, compress | Console, Grafana |
| `sso-web-chain@file` | authentik-auth, security-headers, compress | n8n, Traefik dashboard |
| `ai-chain@file` | ai-ratelimit, security-headers, compress, request-limit | AI endpoints (future) |

---

## PostgreSQL Databases

Created by `scripts/init-multiple-dbs.sh` on first boot:

| Database | User | Used By |
|----------|------|---------|
| openbao | openbao | OpenBao secrets management |
| n8n | n8n | n8n workflow automation |
| authentik | authentik | Authentik identity provider |
| console | console | Console app (Drizzle ORM) |
| paperless | paperless | Paperless-ngx document management |
| op1_audit | postgres | AI interaction and MCP call logging |

The `op1_audit` database has two tables: `ai_interactions` and `mcp_tool_calls`, created by the init script. These are not yet populated by any service.

---

## Module Pattern

Modules live in `modules/<name>/` and extend the core stack:

```
modules/<name>/
├── docker-compose.yml      # Production service definition
├── docker-compose.dev.yml  # Dev overrides (HTTP, volume mounts, Docker-internal URLs)
└── <app-code>/             # Application source (if custom-built)
```

**Conventions:**
- Reference shared networks as `external: true`
- Use `op1-frontend` for Traefik-routed services, `op1-backend` for DB access
- Traefik labels go on the service definition (Docker provider)
- Dev overrides set `tls=false` and use `web` entrypoint instead of `websecure`
- Any service with TLS config in the base compose MUST have `tls=false` in dev override

### Existing Modules

**Admin** (`modules/admin/`):
- MCP server with 8 system administration tools
- HTTP GET endpoints (`/tools/system-status`, `/tools/check-updates`, `/tools/update-history`) for console AI agent
- System status reports all 13 containers (infrastructure + platform) via Docker API discovery
- Slack-based approval API for human-in-the-loop
- Mounts Docker socket for container management
- Tools wired into Claude Code via `.mcp.json` at project root
- Requires `APPROVAL_API_TOKEN` in `.env` for HTTP API authentication
- **Status: Running, integrated into standard dev stack**

**Paperless** (`modules/paperless/`):
- Paperless-ngx document management with OCR and full-text search
- Shares PostgreSQL (`paperless` database) and Redis (key prefix `paperless:`)
- SSO via Authentik forward auth (same pattern as n8n)
- Console AI agent accesses via REST API with token auth
- 15 AI tools in the Documents Operator sub-agent
- Console documents page reads from Paperless API
- **Status: Running, integrated into standard dev stack**

**Console** (`modules/console/`):
- Next.js 15 (App Router) client-facing dashboard
- **AI Operations Agent**: supervisor/sub-agent architecture with 54 role-gated tools
- Supervisor (Operator One) delegates to Console, Workflow, and System Admin operators
- DB-backed agent definitions, skills, and custom tools for per-org customization
- Auth.js v5 with Authentik OIDC provider
- Drizzle ORM with 16-table PostgreSQL schema
- Tron/cyberpunk UI theme (thegridcn-inspired, shadcn/ui base)
- Features: AI chat, service requests, projects/milestones, tickets, documents, activity log
- **Status: Running, SSO working, AI agent built (needs API key — see AI Provider section)**

---

## Console Module Deep Dive

### Tech Stack
- Next.js 15 with App Router, Server Components, Server Actions
- Auth.js v5 (next-auth@5.0.0-beta.25)
- Drizzle ORM (0.38+) with postgres.js driver
- Tailwind CSS 4 with @theme directive
- shadcn/ui components (button, badge, input, textarea, label, separator, avatar)
- Custom thegridcn components (hud-frame, data-card, glow-container, status-bar, anomaly-banner)

### Key Files
- `modules/console/app/src/lib/auth.ts` — Auth.js config, Authentik provider, auto-provision clients
- `modules/console/app/src/lib/db.ts` — Drizzle client (postgres.js)
- `modules/console/app/src/lib/session.ts` — getCurrentClient(), getCurrentOrgId(), requireAuth()
- `modules/console/app/src/lib/queries.ts` — Server-side query functions (all org-scoped), includes getCurrentOrganization()
- `modules/console/app/src/lib/actions.ts` — Server actions (createRequest, createTicket, addRequestComment, addTicketComment, triggerTriage)
- `modules/console/app/src/db/schema.ts` — All table/enum definitions with type exports
- `modules/console/app/src/styles/globals.css` — Tron theme CSS variables, glow animations, grid background
- `modules/console/app/src/app/dashboard/` — All dashboard pages

### AI Provider Pattern

The AI system supports two backends, switchable via `AI_PROVIDER` env var:

| Provider | Env Var | Key Format | Key Secret Path |
|----------|---------|------------|-----------------|
| `anthropic` (default) | `ANTHROPIC_API_KEY` | `sk-ant-...` | `services/anthropic` |
| `openrouter` | `OPENROUTER_API_KEY` | `sk-or-...` | `services/openrouter` |

**How it works:**
- `provider.ts` exports a `ModelFactory` type: `(modelId: string) => LanguageModel`
- `getModelFactory()` reads `AI_PROVIDER`, resolves the API key (OpenBao-first, env-fallback), and returns the appropriate factory
- When OpenRouter is active, bare Claude model IDs (e.g. `claude-sonnet-4-5-20250929`) are auto-prefixed with `anthropic/` so existing agent definitions, `AI_MODEL`, and `modelOverride` all work unchanged
- All consumers (supervisor, agent-factory, agent-registry, triage, chat route) use `ModelFactory` — no Anthropic-specific types leak outside `provider.ts`
- Admin integrations page shows both provider cards with active indicator
- Setup wizard Step 4 has an Anthropic/OpenRouter toggle

### AI Agent Architecture (Supervisor/Delegation Pattern)

The AI system uses a **supervisor/sub-agent pattern** built on Vercel AI SDK's `ToolLoopAgent`:

```
User Message → Supervisor (Operator One)
                   │
                   ├── delegate_to_console-manager → Console Operator (16 tools)
                   ├── delegate_to_documents-manager → Documents Operator (15 tools)
                   ├── delegate_to_workflow-manager → Workflow Operator (37 tools, admin+)
                   ├── delegate_to_system-admin → System Admin Operator (3 tools, admin+)
                   └── delegate_to_<custom-slug> → Custom/Template Agents (configurable tools)
```

**How it works:**
1. `agent-registry.ts` loads system agents + DB-backed agents, filters by user role
2. `buildDelegationTools()` creates a `delegate_to_<slug>` tool for each available sub-agent
3. `supervisor.ts` creates the supervisor ToolLoopAgent with delegation tools only (no direct data tools)
4. When supervisor delegates, `agent-factory.ts` creates a sub-agent with resolved tools + loaded skills
5. Sub-agent executes, returns result to supervisor, which relays to user

**69 total tools** across 5 categories:
- Console Read (9): list/get requests, projects, tickets, documents, dashboard stats, activity search
- Console Write (5): create request/ticket, update status, add comment
- Paperless (15): documents (search/list/get/upload/update/delete), tags (list/create/delete), correspondents (list/create/delete), document types (list/create/delete)
- n8n (37): full REST API coverage — workflows, executions, credentials, tags, variables, users, projects, source control, audit
- System Admin (3): system status, check updates, update history

**5 system agents** (always present, defined in `predefined.ts`):
- Operator One (supervisor) — routes requests, no direct tools
- Console Operator — 16 console tools (incl. Paperless search/list), all roles
- Documents Operator — 15 Paperless tools, all roles
- Workflow Operator — 37 n8n tools, admin+
- System Admin Operator — 3 admin tools, admin+

**4 template agents** (installable per-org, defined in `predefined.ts`):
- Marketing Operator, Customer Success Operator, Accounting Operator, Website Operator

**DB-backed extensions:**
- `agents` table: per-org custom agents with configurable tools, model override, skills
- `agentSkills` table: knowledge blocks injected into agent instructions at runtime
- `customTools` table: user-defined HTTP tools (planned, schema exists)
- `tool-registry.ts`: centralized catalog mapping tool names → implementations with role enforcement

### AI Agent Files
- `modules/console/app/src/lib/ai/provider.ts` — Provider-agnostic ModelFactory, getModelFactory(), getActiveProvider()
- `modules/console/app/src/lib/ai/agents/supervisor.ts` — Creates supervisor ToolLoopAgent with delegation tools
- `modules/console/app/src/lib/ai/agents/agent-registry.ts` — Loads agents, builds delegation tools, handles DB overrides
- `modules/console/app/src/lib/ai/agents/agent-factory.ts` — Creates sub-agent ToolLoopAgent with resolved tools + skills
- `modules/console/app/src/lib/ai/agents/predefined.ts` — System + template agent definitions
- `modules/console/app/src/lib/ai/agents/tool-registry.ts` — Centralized tool catalog (54 entries) with role filtering
- `modules/console/app/src/lib/ai/agents/types.ts` — AgentDefinition, AgentContext, SkillDefinition types
- `modules/console/app/src/lib/ai/system-prompt.ts` — Role-aware system prompt builder
- `modules/console/app/src/lib/ai/session-context.ts` — Gets authenticated user's orgId, clientId, role
- `modules/console/app/src/lib/ai/paperless-client.ts` — Paperless-ngx REST API client
- `modules/console/app/src/lib/ai/tools/index.ts` — `buildToolSet(role, orgId, clientId)` flat tool assembly (legacy path)
- `modules/console/app/src/lib/ai/tools/console-read-tools.ts` — 9 read tools (all roles)
- `modules/console/app/src/lib/ai/tools/console-write-tools.ts` — 5 write tools (member+)
- `modules/console/app/src/lib/ai/tools/n8n-tools.ts` — 37 n8n tools (admin+)
- `modules/console/app/src/lib/ai/tools/admin-tools.ts` — 3 system admin tools (admin+)
- `modules/console/app/src/lib/ai/tools/paperless-tools.ts` — 15 Paperless-ngx tools (viewer/member/admin)
- `modules/console/app/src/lib/ai/n8n-client.ts` — n8n REST API client
- `modules/console/app/src/lib/ai/admin-client.ts` — Admin MCP HTTP API client
- `modules/console/app/src/lib/ai/triage.ts` — Proactive triage logic (generateText, non-streaming)
- `modules/console/app/src/app/api/chat/route.ts` — Streaming chat (streamText + toUIMessageStreamResponse)
- `modules/console/app/src/app/api/chat/conversations/route.ts` — List/create conversations
- `modules/console/app/src/app/api/chat/conversations/[id]/route.ts` — Get/delete conversation
- `modules/console/app/src/app/api/agent/triage/route.ts` — Proactive triage endpoint (POST)
- `modules/console/app/src/components/chat/chat-panel.tsx` — Main chat container (useChat hook)
- `modules/console/app/src/components/chat/chat-messages.tsx` — Message list with auto-scroll
- `modules/console/app/src/components/chat/chat-message.tsx` — Single message with markdown rendering
- `modules/console/app/src/components/chat/chat-input.tsx` — Input bar (Enter to send, Shift+Enter newline)
- `modules/console/app/src/components/chat/chat-tool-result.tsx` — Inline tool status display
- `modules/console/app/src/components/chat/conversation-list.tsx` — Conversation history sidebar
- `modules/console/app/src/components/chat/dashboard-sidebar.tsx` — Condensed stats panel

### Database Schema (16 tables)
- `organizations` — multi-tenant root entity (with `domain` field)
- `clients` — user records (auto-provisioned from Authentik `sub` claim)
- `organization_members` — client↔org relationship with role (owner/admin/member/viewer)
- `requests` + `request_comments` — service request workflow
- `projects` + `milestones` — project tracking
- `tickets` — support tickets
- `documents` — file library
- `activity_log` — audit trail (includes `ai_chat_action` type)
- `conversations` — AI chat conversation metadata
- `messages` — AI chat message content with role and tool invocations
- `setup_config` — first-boot wizard state and org identity storage
- `agents` — AI operator definitions (system, template, custom) with per-org overrides
- `agent_skills` — knowledge/instruction blocks attached to agents (loaded at runtime)
- `custom_tools` — user-defined HTTP tools stored in DB, executed dynamically

### Auth Flow
1. User visits `console.{DOMAIN}` → redirected to `/login`
2. Login page triggers Auth.js `signIn("authentik")` server action
3. Browser redirects to Authentik authorize URL → user authenticates
4. Callback returns to `/api/auth/callback/authentik`
5. Auth.js `signIn` callback auto-provisions/updates `clients` table row (first user also gets a default org + admin membership)
6. JWT callback stores `authentikUid` (Authentik `sub` claim) in token
7. Session callback exposes `authentikUid` on `session.user`
8. All queries use `getCurrentOrgId()` which traces: session → clients → organization_members → organizationId

---

## Admin MCP Module Deep Dive

### Tools (8 total)
| Tool | Description | Approval |
|------|-------------|----------|
| check_updates | Query GitHub releases for all components | No |
| get_system_status | Docker health checks on all services | No |
| apply_update | Update a component version | Risk-dependent |
| rollback_component | Revert to previous version | Always |
| check_approval_status | Poll pending approval by ID | No |
| list_backups | List backup files in backups/ directory | No |
| get_update_history | Read updates.jsonl audit log | No |
| schedule_maintenance | Create maintenance window | Always |

### Risk Classification
- **Low** (auto-apply patches): traefik, grafana, loki, redis
- **Medium** (approval required): n8n
- **High** (approval required): openbao, authentik
- **Critical** (maintenance window): postgres

### Local Dev Usage
`.mcp.json` at project root wires tools into Claude Code:
```json
{
  "mcpServers": {
    "op1-admin": {
      "command": "node",
      "args": ["mcp-servers/op1-admin/src/index.js"],
      "env": { "PROJECT_DIR": "/path/to/operatorone" }
    }
  }
}
```

---

## Development Gotchas

### Traefik
- Empty `services: {}` or `routers:` with only comments in dynamic YAML causes the **entire file provider to fail** silently. Only visible in DEBUG logs. Fix: remove unused top-level keys.
- Routers with `tls.certresolver` in base compose won't match HTTP entrypoints in dev. Dev override MUST set `tls=false`.

### Authentik (2024.12)
- Bootstrap token for dev: `dev-bootstrap-token` (set in docker-compose.dev.yml)
- API base: `http://auth.localhost/api/v3/`
- Scope mappings: `/api/v3/propertymappings/provider/scope/` (NOT `/propertymappings/scope/`)
- When creating OAuth2 providers via API:
  - `invalidation_flow` is **required** (fetch from `/api/v3/flows/instances/?designation=invalidation`)
  - `redirect_uris` must be `[{"matching_mode": "strict", "url": "..."}]` (not a string)
  - `signing_key` must be set for RS256 (Auth.js expects RS256; Authentik defaults to HS256 without it)
  - Find RSA keys: `/api/v3/crypto/certificatekeypairs/?has_key=true`
- `AUTHENTIK_BOOTSTRAP_PASSWORD` must be set before first boot or Authentik must be restarted
- `docker compose restart` does NOT re-read `.env` — use `up -d` to recreate containers

### PostgreSQL
- `init-multiple-dbs.sh` only runs on **first boot** (when data volume is empty). To add a database to an existing instance, create it manually via `docker exec`.
- Console database was manually created after initial stack setup.

### Console Auth (Docker networking)
- OIDC issuer URL must use `http://authentik-server:9000/application/o/console/` (Docker-internal) for server-to-server OIDC discovery
- Authorization URL must use `http://auth.localhost/application/o/authorize/` (browser-facing)
- Token and userinfo URLs also use `authentik-server:9000` (server-to-server)
- This split is set in `modules/console/docker-compose.dev.yml` via separate env vars
- The Authentik application slug must be `console` (matching the issuer URL path)

### Console Fresh Deployment
- DB schema auto-applied on startup via `entrypoint.sh` (`drizzle-kit push`)
- First user login auto-creates the organization (using identity from setup wizard if available, otherwise defaults) and assigns the user as admin
- Setup wizard is 5 steps: authenticate, org identity, SSO providers, external services, apply
- Setup wizard creates OAuth2 providers idempotently (safe to retry after page refresh)
- Setup wizard stores credentials in `setup_config` table before writing to `.env`
- Organization identity (name, domain, operator) is stored in `setup_config.org_identity` and applied on first login

### OpenBao (Dev vs Prod)
- OpenBao runs on `op1-backend` network only — no Traefik route, no browser access
- Console reads secrets via `lib/openbao.ts` (HTTP client for KV v2 API), falls back to `process.env`
- `lib/secrets.ts` caches OpenBao health for 60 seconds — if OpenBao is unreachable, falls back to env vars silently
- **Dev setup:** `OPENBAO_ADDR` and `OPENBAO_SERVICE_TOKEN` are set in the base `modules/console/docker-compose.yml` and inherited by dev via Docker Compose merge. If `OPENBAO_SERVICE_TOKEN` is empty in `.env` (before running `init-openbao.sh`), OpenBao reads will fail silently and all secrets fall back to env vars.
- **Prod setup:** Run `scripts/init-openbao.sh` first to initialize vault, enable KV v2, create policy, and generate a service token. Add `OPENBAO_SERVICE_TOKEN` to `.env`, then restart console.
- **Key files:** `modules/console/app/src/lib/openbao.ts` (HTTP client), `modules/console/app/src/lib/secrets.ts` (OpenBao-first, env-fallback reader)
- Secrets stored at paths like `services/anthropic`, `services/openrouter`, `services/n8n` in OpenBao KV v2
- Admin page at `/dashboard/admin` can write secrets to OpenBao via the console UI

### Paperless-ngx
- Shares Redis with Authentik but uses `PAPERLESS_REDIS_PREFIX=paperless:` for key isolation
- For existing deployments, the `paperless` database must be created manually since `init-multiple-dbs.sh` only runs on first boot
- `PAPERLESS_ENABLE_HTTP_REMOTE_USER=true` trusts `X-authentik-username` header — safe because Traefik strips client-supplied headers; only Authentik outpost sets it
- API token must be generated manually in Paperless admin UI after first boot (`/admin/` → Auth Tokens)
- Console reads the token via `getPaperlessApiToken()` (OpenBao `services/paperless` field `api_token`, env fallback `PAPERLESS_API_TOKEN`)
- In dev, the `sso-web-chain` middleware is cleared (same as other services), so Paperless is accessible without Authentik
- The old `documents` table in the console DB is deprecated — the `list_documents` tool now proxies through Paperless API

### Tailwind CSS 4
- Uses `@theme` directive in globals.css instead of tailwind.config.ts for custom tokens
- PostCSS config uses `@tailwindcss/postcss` plugin (not the old `tailwindcss` plugin)

---

## File Map (Quick Reference)

| What | Where |
|------|-------|
| Core compose | `docker-compose.yml` |
| Dev overrides | `docker-compose.dev.yml` |
| Prod overrides | `docker-compose.prod.yml` |
| Environment template | `.env.example` |
| Secret generator | `scripts/generate-secrets.sh` |
| DB init script | `scripts/init-multiple-dbs.sh` |
| Update scripts | `scripts/check-updates.sh`, `scripts/update-component.sh`, `scripts/rollback.sh` |
| Traefik middleware | `config/traefik/dynamic/middleware.yml` |
| MCP architecture spec | `config/mcp/mcp-config.json` |
| MCP tool code | `mcp-servers/op1-admin/src/index.js` |
| Claude Code MCP config | `.mcp.json` |
| Admin module compose | `modules/admin/docker-compose.yml` |
| Admin module dev override | `modules/admin/docker-compose.dev.yml` |
| Approval API | `modules/admin/approval-api/server.js` |
| Console compose (prod) | `modules/console/docker-compose.yml` |
| Console compose (dev) | `modules/console/docker-compose.dev.yml` |
| Console app root | `modules/console/app/` |
| Console auth config | `modules/console/app/src/lib/auth.ts` |
| Console DB schema | `modules/console/app/src/db/schema.ts` |
| Console queries | `modules/console/app/src/lib/queries.ts` |
| Console server actions | `modules/console/app/src/lib/actions.ts` |
| Console theme CSS | `modules/console/app/src/styles/globals.css` |
| AI provider factory | `modules/console/app/src/lib/ai/provider.ts` |
| AI agent tools | `modules/console/app/src/lib/ai/tools/` |
| AI agent definitions | `modules/console/app/src/lib/ai/agents/` |
| AI supervisor | `modules/console/app/src/lib/ai/agents/supervisor.ts` |
| AI agent registry | `modules/console/app/src/lib/ai/agents/agent-registry.ts` |
| AI predefined agents | `modules/console/app/src/lib/ai/agents/predefined.ts` |
| AI tool registry | `modules/console/app/src/lib/ai/agents/tool-registry.ts` |
| AI system prompt | `modules/console/app/src/lib/ai/system-prompt.ts` |
| OpenBao client | `modules/console/app/src/lib/openbao.ts` |
| Secret reader | `modules/console/app/src/lib/secrets.ts` |
| Paperless API client | `modules/console/app/src/lib/ai/paperless-client.ts` |
| Paperless AI tools | `modules/console/app/src/lib/ai/tools/paperless-tools.ts` |
| AI triage logic | `modules/console/app/src/lib/ai/triage.ts` |
| Chat API route | `modules/console/app/src/app/api/chat/route.ts` |
| Chat UI components | `modules/console/app/src/components/chat/` |
| Setup wizard | `modules/console/app/src/components/setup/SetupWizard.tsx` |
| Setup utilities | `modules/console/app/src/lib/setup.ts` |
| Setup apply API | `modules/console/app/src/app/api/setup/apply/route.ts` |
| Admin page | `modules/console/app/src/app/dashboard/admin/page.tsx` |
| Admin integrations component | `modules/console/app/src/components/console/admin-integrations.tsx` |
| Admin form component | `modules/console/app/src/components/console/admin-form.tsx` |
| Admin secrets API | `modules/console/app/src/app/api/admin/secrets/route.ts` |
| Admin API route | `modules/console/app/src/app/api/admin/organization/route.ts` |
| Paperless compose (prod) | `modules/paperless/docker-compose.yml` |
| Paperless compose (dev) | `modules/paperless/docker-compose.dev.yml` |
| SSO setup guide | `docs/sso-setup.md` |
| Architecture doc | `docs/ARCHITECTURE.md` |
| Update management doc | `docs/UPDATES.md` |
| Agent updates doc | `docs/AGENT-ADMINISTERED-UPDATES.md` |
| Paperless setup guide | `docs/paperless-setup.md` |
| Next steps | `NEXT_STEPS.md` |

---

## Git & Gitignore

**Gitignored sensitive files:** `.env`, `.mcp.json`, `NEXT_STEPS.md`, `backups/`, `logs/`

---

## Conventions

- **Module compose files** layer onto the base with `-f` flags
- **Traefik routing** is configured via Docker labels on services, not in config files
- **Dev overrides** always: set `tls=false`, use `web` entrypoint, override auth URLs to Docker-internal
- **Secrets** never committed to git — generated by `scripts/generate-secrets.sh`, stored in `.env`
- **Database per service** — each service gets its own PostgreSQL database and user
- **Server Components** preferred for data fetching in the console; Server Actions for mutations
- **All console queries are org-scoped** — never expose data across organizations
