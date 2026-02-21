# OperatorOne Architecture
## AI-Agent-Centric, Modular, Self-Hosted Platform

**Version:** 1.1
**Date:** February 2026
**Status:** Architecture Specification

---

## Executive Summary

This document specifies a modular, AI-agent-centric operations backend designed for small to mid-sized businesses (SMBs). The platform serves as a deployable template that can be customized per-business while maintaining a consistent, secure foundation.

**Core Philosophy:** Users interact with a single AI hub that orchestrates all backend systems, eliminating the need to navigate between multiple tools and interfaces.

### Key Design Principles

1. **Use existing systems before building new ones** -- leverage proven open-source solutions
2. **Optimize for simplicity and cost-effectiveness** -- avoid overengineering
3. **Design for semi-technical/non-technical users** -- minimize operational complexity
4. **Create minimal interaction surfaces** -- AI as the single pane of glass

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION LAYER                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     AI CONVERSATION INTERFACE                            ││
│  │              (Claude / OpenAI API / Self-hosted LLM)                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI GATEWAY LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Traefik    │  │   Security   │  │  Rate Limit  │  │   Audit Log      │ │
│  │  AI Gateway  │  │  Guardrails  │  │   & Cache    │  │   & Telemetry    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MCP SERVER LAYER                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │   Files    │ │  Database  │ │   Email    │ │  Calendar  │ │   CRM      │ │
│  │   MCP      │ │    MCP     │ │    MCP     │ │    MCP     │ │   MCP      │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATION LAYER                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        n8n Workflow Engine                              │ │
│  │           (Visual automation, integrations, scheduled tasks)           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SECURITY LAYER                                      │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────────────┐  │
│  │     OpenBao       │  │    Authentik      │  │      PostgreSQL         │  │
│  │  (Secrets Mgmt)   │  │  (Identity/SSO)   │  │    (Audit + Data)       │  │
│  └───────────────────┘  └───────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Selection Rationale

### Why These Tools?

| Component | Selected Tool | Alternatives Considered | Rationale |
|-----------|--------------|------------------------|-----------|
| **Secrets Management** | OpenBao | HashiCorp Vault, Infisical, Doppler | Linux Foundation fork of Vault (MPL 2.0), no enterprise paywalls, PostgreSQL storage, static auto-unseal, API-driven (no UI needed — managed via Console) |
| **Workflow Orchestration** | n8n | Windmill, Temporal | Best balance of visual UI for non-technical users + code flexibility, 500+ integrations |
| **AI Gateway** | Traefik | Kong, custom | AI guardrails middleware, open-source core, single binary, Docker-native |
| **Identity/SSO** | Authentik | Keycloak, Auth0 | Modern UI, easy setup, good Docker support, open-source |
| **Database** | PostgreSQL | MySQL, SQLite | Industry standard, excellent tooling, required by OpenBao/n8n/Authentik |
| **Reverse Proxy** | Traefik | Nginx, Caddy | Auto SSL, Docker-native service discovery, doubles as AI gateway |
| **Log Aggregation** | Loki + Promtail | ELK stack, Datadog | Lightweight, designed for Docker/container logs, pairs with Grafana |

---

## Core Components Deep Dive

### 1. Secrets Management: OpenBao

**Purpose:** Centralized, secure storage for all API keys, database credentials, and sensitive configuration.

**Why OpenBao:**
- Linux Foundation fork of HashiCorp Vault (MPL 2.0 — no enterprise paywalls)
- OIDC/SAML support included (unlike Infisical's Enterprise-only SSO)
- Static auto-unseal on Docker restart (no manual intervention)
- PostgreSQL storage backend (shared with other OP1 services, no extra dependency)
- KV v2 secrets engine with versioning
- No web UI needed — managed via Console admin page

**Key Features:**
- **KV v2 API:** Versioned secrets at `/v1/secret/data/<path>`
- **Service token auth:** Long-lived scoped token for Console access
- **Static seal:** Auto-unseal on restart using key file written by entrypoint
- **OpenBao-first, env-fallback:** Console reads from OpenBao, falls back to `process.env`

**Deployment:** OpenBao runs on the `op1-backend` network only (no Traefik exposure — internal service). It uses PostgreSQL for storage and auto-unseals via an entrypoint script that writes the unseal key from an env var to a file.

**Security Pattern:**
```
┌─────────────────────────────────────────────────────────────┐
│                    SECRET FLOW                               │
│                                                              │
│  Console Request → OpenBao KV v2 API → Encrypted Storage    │
│                          │                                   │
│                          ▼                                   │
│              Runtime Secret Resolution                       │
│              (OpenBao-first, env-fallback)                   │
│                          │                                   │
│                          ▼                                   │
│              Service uses secret (no secrets in image)       │
└─────────────────────────────────────────────────────────────┘
```

### 2. Workflow Orchestration: n8n

**Purpose:** Visual automation platform that connects all business systems and enables AI-triggered workflows.

**Why n8n for SMBs:**
- Visual workflow builder (non-technical users can understand flows)
- 500+ pre-built integrations (Gmail, Slack, QuickBooks, etc.)
- Self-hostable with Docker
- Fair-code license (free for most SMB use cases)
- AI Agent nodes for Claude/OpenAI integration
- Webhook triggers for real-time automation

**Key Integration Patterns:**

```
AI Request → n8n Webhook → Business Logic → External Service
                │
                ├── CRM Update (Salesforce, HubSpot)
                ├── Invoice Generation (QuickBooks)
                ├── Email Automation (Gmail, Outlook)
                ├── Document Processing (Google Drive)
                └── Notification Dispatch (Slack, Teams)
```

**Pre-built Workflow:** The project includes `config/n8n/workflows/system-update-manager.json`, which manages automated update checking and approval processing for the admin module.

**Recommended Workflows to Build:**
1. **Invoice Processing:** AI extracts data → n8n validates → QuickBooks entry
2. **Customer Inquiry Routing:** Email → AI classification → appropriate team
3. **Report Generation:** Scheduled data pull → AI summarization → Email delivery
4. **Onboarding Automation:** New employee → account creation → notifications

### 3. AI Gateway: Traefik

**Purpose:** Single entry point for all traffic with security, observability, and governance.

**Why a Dedicated AI Gateway:**
- **Prompt injection defense:** Filter malicious inputs before LLM
- **PII protection:** Detect/redact sensitive data in prompts/responses
- **Cost control:** Rate limiting, caching, token budgets
- **Audit trail:** Log all AI interactions for compliance
- **Model abstraction:** Switch between Claude/OpenAI/local models without app changes

**Traefik Configuration (actual):** Dynamic configuration lives in `config/traefik/dynamic/middleware.yml` and defines:
- `ai-ratelimit` -- 100 req/min with burst of 50
- `security-headers` -- HSTS, XSS filter, content-type nosniff, frame options
- `request-limit` -- 1MB max request body to prevent prompt abuse
- `ai-chain` -- Composable middleware chain for AI endpoints
- TLS options enforcing TLS 1.2+ with strong cipher suites

### 4. MCP Server Layer

**Purpose:** Standardized interface for AI to access business tools and data.

**MCP Architecture:**
```
Claude/LLM ←→ MCP Client ←→ MCP Servers ←→ Business Systems
                              │
                              ├── filesystem-mcp (documents)
                              ├── postgres-mcp (database)
                              ├── slack-mcp (communications)
                              ├── google-drive-mcp (files)
                              └── admin-mcp (system ops)
```

**Implemented MCP Servers:**

| MCP Server | Location | Status | Purpose |
|------------|----------|--------|---------|
| Admin Server | `mcp-servers/op1-admin/` | Implemented | System administration, updates, rollbacks, health checks |

The admin MCP server is fully operational with 8 tools (check_updates, get_system_status, apply_update, rollback_component, check_approval_status, list_backups, get_update_history, schedule_maintenance). It also exposes HTTP endpoints used by the console: GET endpoints (`/tools/system-status`, `/tools/check-updates`, `/tools/update-history`) for AI agent system queries, and `POST /tools/restart-services` for the setup wizard to restart containers after configuration changes. The `get_system_status` tool reports all `op1-*` containers (13 total) by combining version-tracked infrastructure components with Docker API discovery of platform containers (console, admin-mcp, approval-api). HTTP endpoints require bearer token authentication (`APPROVAL_API_TOKEN`). It runs via Claude Code locally (`.mcp.json`) or containerized (`modules/admin/docker-compose.yml` with `modules/admin/docker-compose.dev.yml` for dev overrides). See [Agent-Administered Updates](AGENT-ADMINISTERED-UPDATES.md).

**Planned MCP Servers** (architecture spec in `config/mcp/mcp-config.json`):

The MCP config file defines the **target architecture** for additional MCP servers. These are not yet deployed -- they serve as a blueprint for future expansion:

| MCP Server | Purpose | Security Model |
|------------|---------|----------------|
| `filesystem` | Document access | Read-only, restricted paths, blocks credentials |
| `postgres` | Database queries | SELECT only, blocked sensitive tables, approval for writes |
| `slack` | Team communication | Scoped to specific channels |
| `google-drive` | File access | Read-only |
| `email` | Email operations | Read/draft only, send requires approval |

**MCP Security Model (from `config/mcp/mcp-config.json`):**
```json
{
  "permissionTiers": {
    "tier1_readonly": "Read-only access to documents and data",
    "tier2_write_safe": "Safe write operations (calendar, drafts)",
    "tier3_write_risky": "Operations requiring approval (DB writes, sending email)",
    "tier4_admin": "Administrative operations (deletes, permission changes)"
  },
  "defaultTier": "tier1_readonly"
}
```

### 5. Operator Console Module + AI Operations Agent

**Purpose:** Client-facing operations dashboard with an AI-powered chat interface as the primary UX. Supports service requests, project tracking, ticket management, document access, and AI-driven operations.

**Tech Stack:**
- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **AI:** Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`, `@openrouter/ai-sdk-provider`, `@ai-sdk/react`) with Claude via Anthropic or OpenRouter
- **Auth:** Auth.js v5 with Authentik OIDC provider
- **ORM:** Drizzle (type-safe, no binary engine, Docker-friendly)
- **UI:** Tron/cyberpunk aesthetic (thegridcn-inspired) built on shadcn/ui + Tailwind CSS 4
- **Docker:** Multi-stage standalone build (deps → build → runner)

**Architecture:**
```
Browser → Traefik (console.${DOMAIN}) → Next.js App
                                          │
                                          ├── Auth.js → Authentik OIDC (OAuth2)
                                          ├── Server Components → PostgreSQL (via Drizzle)
                                          ├── Server Actions → PostgreSQL (mutations)
                                          └── AI Chat API (POST /api/chat)
                                                │
                                                ├── streamText → Claude API (streaming)
                                                ├── Console Tools → PostgreSQL (Drizzle)
                                                ├── Paperless Tools → Paperless-ngx REST API
                                                ├── n8n Tools → n8n REST API
                                                └── Admin Tools → Admin MCP HTTP API
```

**AI Operations Agent (Supervisor/Sub-Agent Architecture):**

The AI system uses a **supervisor/delegation pattern** built on Vercel AI SDK's `ToolLoopAgent`:

```
User Message → Supervisor (Operator One)
                   │
                   ├── delegate_to_console-manager → Console Operator (16 tools)
                   ├── delegate_to_documents-manager → Documents Operator (15 tools)
                   ├── delegate_to_workflow-manager → Workflow Operator (37 tools, admin+)
                   ├── delegate_to_system-admin → System Admin Operator (3 tools, admin+)
                   └── delegate_to_<custom-slug> → Custom/Template Agents
```

- **69 role-gated tools**: 9 console read (all roles), 5 console write (member+), 15 Paperless (viewer/member/admin), 37 n8n (admin+), 3 system admin (admin+)
- **5 system agents** (always present): Operator One (supervisor), Console Operator, Documents Operator, Workflow Operator, System Admin Operator
- **4 template agents** (installable per-org): Marketing, Customer Success, Accounting, Website Operator
- **DB-backed extensions**: custom agents (`agents` table), agent skills (`agent_skills` table), custom HTTP tools (`custom_tools` table)
- **Tool registry**: centralized catalog (`tool-registry.ts`) mapping 69 tool names → implementations with role enforcement
- **Streaming chat** with conversation persistence (PostgreSQL-backed)
- **Proactive triage**: fire-and-forget `generateText` call when requests/tickets are created, auto-adds AI comment
- **Role hierarchy**: viewer → member → admin → owner, each level unlocks more tools
- Configurable model via `AI_MODEL` env var (default: `claude-sonnet-4-5-20250929`)
- **Switchable AI provider** via `AI_PROVIDER` env var (`anthropic` or `openrouter`)

**Key Design Decisions:**
- Uses `web-chain@file` middleware (NOT `authentik-auth@file`). The console handles its own auth via OAuth2; forward auth would double-authenticate.
- Auto-provisions a `clients` record on first login via the Auth.js `signIn` callback.
- In dev, OIDC discovery URLs use `authentik-server:9000` (Docker-internal) while the authorization redirect uses `auth.localhost` (browser-facing). Same pattern as Grafana OAuth.
- AI tools are plain async functions inside the API route (not MCP clients) for simplicity.
- Dangerous operations (apply_update, rollback) are NOT exposed through chat — they keep their Slack approval flow.
- Provider-agnostic `ModelFactory` pattern (`provider.ts`) decouples all agent code from any specific AI SDK provider. Consumers call `getModelFactory()` which returns a `(modelId: string) => LanguageModel` function. When OpenRouter is active, bare Claude model IDs are auto-prefixed with `anthropic/` so existing agent definitions, `AI_MODEL`, and `modelOverride` work unchanged.

**Setup Wizard:**
The console includes a first-boot setup wizard that detects missing OAuth configuration (`CONSOLE_OAUTH_CLIENT_ID` empty) and redirects to `/setup`. The 5-step wizard authenticates via bootstrap password, captures organization identity (name, domain, operator name/email), auto-creates OAuth2 providers in Authentik using its REST API, collects optional service credentials (Anthropic, SMTP, Slack), writes everything to `.env`, and restarts affected containers via the admin MCP server's `POST /tools/restart-services` endpoint. Organization identity is stored in `setup_config.org_identity` and applied on the first user login (used to create the org record with proper name/slug/domain instead of defaults). After completion, the `setup_config` table is marked complete and the wizard returns 403 on all subsequent requests.

Security hardening: The auth endpoint uses timing-safe comparison and rate limiting (5 attempts per 15-minute window). OAuth client secrets are stored server-side in the `setup_config.provider_credentials` column and cleared after `.env` is written — the browser only sees masked values. All POST routes require a CSRF header (`X-Setup-Request: 1`), `.env` values are sanitized against injection, and error messages are generic (full details logged server-side only). The wizard requires `AUTH_SECRET`, `AUTHENTIK_BOOTSTRAP_TOKEN`, and `DOMAIN` to be set before first boot.

**Database Schema (16 tables):**
- `organizations` (with `domain` field), `clients`, `organization_members` — multi-tenant identity
- `requests`, `request_comments` — service request workflow
- `projects`, `milestones` — project tracking with progress
- `tickets` — support ticket management
- `documents` — file library
- `activity_log` — audit trail for all console actions (includes `ai_chat_action` type)
- `conversations` — AI chat conversation metadata (org-scoped, client-scoped)
- `messages` — AI chat message content with role and optional tool invocations
- `setup_config` — first-boot wizard state (pending/in_progress/completed), stores org identity during setup
- `agents` — AI operator definitions (system, template, custom) with per-org overrides
- `agent_skills` — knowledge/instruction blocks attached to agents (loaded at runtime)
- `custom_tools` — user-defined HTTP tools stored in DB, executed dynamically

**Location:** `modules/console/` (compose overlay) + `modules/console/app/` (Next.js application)

### 6. Identity & Access: Authentik

**Purpose:** Single sign-on, user management, and access control.

**Key Features:**
- OIDC/OAuth2 provider for all services
- LDAP integration for existing directories
- MFA enforcement
- Application access policies
- Audit logging
- Forward auth middleware for Traefik (configured for n8n and Paperless-ngx)

**Integration Points:**
```
User → Authentik (SSO) → JWT Token → n8n (forward auth)
                                   → Paperless-ngx (forward auth)
                                   → Grafana (OAuth)
                                   → Console (OAuth)
                                   → Custom Apps
```

### 7. Observability: Loki + Promtail + Grafana

**Purpose:** Centralized logging, monitoring, and dashboarding.

These services are behind the `observability` Docker Compose profile and are optional but recommended.

**Log Collection Flow:**
```
Docker containers → Promtail (Docker SD) → Loki → Grafana
Traefik access logs → Promtail (file) → Loki → Grafana
```

**Pre-built Grafana Dashboards (in `config/grafana/dashboards/`):**
- `container-logs.json` -- Filter and search logs by service, level
- `traefik-access.json` -- HTTP request metrics, status codes, latency by router
- `system-overview.json` -- Overall system health

**Retention:** Loki is configured to retain 30 days of logs (`config/loki/loki-config.yml`).

### 8. Audit Database

The PostgreSQL init script (`scripts/init-multiple-dbs.sh`) creates a dedicated `op1_audit` database with:
- `ai_interactions` -- Logs all AI requests with user, session, tool, tokens, response time
- `mcp_tool_calls` -- Logs MCP tool invocations with parameters, approval status, execution time

Both tables are indexed by timestamp, user, and tool for efficient querying.

---

## Modular Deployment Strategy

### Compose File Layering

The project uses Docker Compose file merging for environment-specific configuration:

```bash
# Local development (HTTP, no TLS, all modules)
docker compose -f docker-compose.yml -f docker-compose.dev.yml \
               -f modules/console/docker-compose.yml -f modules/console/docker-compose.dev.yml \
               -f modules/admin/docker-compose.yml -f modules/admin/docker-compose.dev.yml \
               -f modules/paperless/docker-compose.yml -f modules/paperless/docker-compose.dev.yml \
               up -d

# Production (pinned versions, TLS, all modules)
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
               -f modules/console/docker-compose.yml \
               -f modules/admin/docker-compose.yml \
               -f modules/paperless/docker-compose.yml \
               up -d

# With observability
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile observability up -d
```

### Implemented Modules

| Module | Location | Purpose |
|--------|----------|---------|
| `admin` | `modules/admin/` | AI-administered system updates via MCP server + HTTP API + Slack approval API |
| `console` | `modules/console/` | Client-facing operations hub with AI chat agent (Next.js 15, Vercel AI SDK v6, Auth.js, Drizzle ORM) |
| `paperless` | `modules/paperless/` | Document management with OCR and full-text search (Paperless-ngx). 15 AI tools via Documents Operator sub-agent |

### Adding New Modules

1. Create a directory under `modules/<name>/`
2. Add a `docker-compose.yml` defining new services
3. Reference the shared networks (`op1-frontend`, `op1-backend`) as `external: true`
4. Include the module compose file with `-f` when deploying

### Per-Client Customization Points

| Customization | Location | Method |
|--------------|----------|--------|
| Domain | `.env` | Set `DOMAIN` variable |
| Enabled modules | Compose `-f` flags | Include/exclude module files |
| MCP permissions | `config/mcp/mcp-config.json` | AI data access rules per tier |
| Workflows | `config/n8n/workflows/` | Pre-built automation JSON |
| Access policies | Authentik UI | Who can access which services |
| Traefik middleware | `config/traefik/dynamic/` | Rate limits, security headers |
| Observability | `--profile observability` | Enable/disable monitoring stack |

---

## Security Architecture

### Defense in Depth

```
┌────────────────────────────────────────────────────────────────────┐
│ LAYER 1: Network Security                                          │
│ - TLS termination at Traefik (TLS 1.2+, strong ciphers)           │
│ - Internal network isolation (op1-backend is Docker-internal)      │
│ - No direct database exposure                                      │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ LAYER 2: Authentication & Authorization                            │
│ - Authentik SSO for all human access                               │
│ - Forward auth middleware for Traefik routes                       │
│ - Service accounts with scoped permissions                         │
│ - MFA enforcement for administrative access                        │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ LAYER 3: Secrets Management                                        │
│ - OpenBao for all credentials                                      │
│ - No secrets in environment files or images                        │
│ - Automatic rotation for database credentials                      │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ LAYER 4: AI-Specific Security                                      │
│ - PII detection and redaction (mcp-config.json)                    │
│ - Tool permission scoping (4-tier model)                           │
│ - Human-in-the-loop for sensitive operations                       │
│ - Rate limiting (Traefik middleware)                                │
│ - Request size limits (1MB)                                        │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ LAYER 5: Audit & Monitoring                                        │
│ - All AI interactions logged (op1_audit.ai_interactions)           │
│ - MCP tool calls audited (op1_audit.mcp_tool_calls)               │
│ - Traefik access logs → Loki → Grafana                            │
│ - Container logs collected by Promtail                             │
└────────────────────────────────────────────────────────────────────┘
```

### AI Permission Model

Defined in `config/mcp/mcp-config.json`:

```yaml
permissions:
  tier1_read_only:
    - "View documents"
    - "Read database (SELECT only)"
    - "List calendar events"
    - "Search emails"

  tier2_write_safe:
    - "Create calendar events"
    - "Draft emails (not send)"
    - "Create documents"
    - "Add notes to CRM"

  tier3_write_risky:
    - "Send emails"
    - "Update database records"
    - "Modify CRM contacts"
    - "Create invoices"
    requires: "human_approval"

  tier4_admin:
    - "Delete records"
    - "Modify permissions"
    - "Access financial data"
    requires: "admin_approval"
```

Default tier is `tier1_readonly`.

---

## AI Hub Design

### Conversation Flow

```
User Message
     │
     ▼
┌─────────────────────────────────────────┐
│          AI GATEWAY (Traefik)            │
│  - Rate limiting                         │
│  - PII detection/redaction               │
│  - Request size limit                    │
│  - Request logging                       │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│     LLM (Anthropic or OpenRouter)        │
│  + System Prompt (business context)      │
│  + MCP Tool Definitions                  │
│  + Conversation History                  │
└─────────────────────────────────────────┘
     │
     ├── Direct Response (no tool needed)
     │
     └── Tool Call Required
              │
              ▼
         ┌─────────────────────────────────────────┐
         │           MCP SERVER LAYER               │
         │  - Permission check (tier-based)         │
         │  - Audit logging                         │
         │  - Execute operation                     │
         │  - Return structured result              │
         └─────────────────────────────────────────┘
              │
              ▼
         ┌─────────────────────────────────────────┐
         │       APPROVAL GATEWAY (if needed)       │
         │  - Human-in-the-loop for risky ops      │
         │  - Notification to approvers            │
         │  - Timeout handling                      │
         └─────────────────────────────────────────┘
              │
              ▼
         Final Response to User
```

### System Prompt Template

```markdown
# Business Operations Assistant

You are the AI operations assistant for {{COMPANY_NAME}}. You help employees
with day-to-day business operations by accessing company systems through
integrated tools.

## Your Capabilities
- Access and search company documents
- Query business databases (read-only unless approved)
- Manage calendar events
- Draft and send communications
- Generate reports from business data
- Automate repetitive tasks

## Security Rules
1. Never expose raw database credentials or API keys
2. Always confirm before sending external communications
3. Financial operations require human approval
4. Personal employee data is restricted
5. Log all data access for audit

## Available Tools
{{MCP_TOOL_LIST}}

## Business Context
{{CUSTOM_BUSINESS_CONTEXT}}

## Communication Style
- Professional but approachable
- Confirm understanding before taking actions
- Explain what you're doing in plain language
- Proactively suggest helpful follow-up actions
```

---

## Deployment Checklist

### Initial Setup

```bash
# 1. Clone template
git clone https://github.com/caseycapshaw/OperatorOne.git
cd OperatorOne

# 2. Generate secrets
./scripts/generate-secrets.sh > .env

# 3. Configure domain
# Edit .env and set DOMAIN=client-domain.com, ACME_EMAIL=admin@client-domain.com

# 4. Start core services (production)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 5. Wait for initialization (PostgreSQL creates databases on first start via init-multiple-dbs.sh)
docker compose logs -f postgres

# 6. Run the Setup Wizard
open https://console.client-domain.com
# - Wizard auto-launches on first boot (detects missing OAuth config)
# - Enter bootstrap password from .env
# - Set organization name, domain, and operator details
# - Wizard auto-creates OAuth2 providers in Authentik
# - Choose AI provider (Anthropic direct or OpenRouter) and enter API key
# - Wizard writes credentials to .env and restarts services

# 7. Initialize OpenBao (first-time only)
./scripts/init-openbao.sh
# - Initializes vault, enables KV v2 at secret/
# - Creates console-admin policy and service token
# - Add printed tokens to .env, then restart OpenBao

# 8. Configure Authentik users & groups
open https://auth.client-domain.com
# - Create user accounts, assign to groups
# - Forward auth for n8n/Traefik is still manual (see docs/sso-setup.md)

# 9. Configure n8n
open https://automation.client-domain.com
# - Import pre-built workflows from config/n8n/workflows/
# - Configure credentials (stored in OpenBao or .env)
```

### Per-Client Customization

1. **Domain:** Set `DOMAIN` in `.env`
2. **Modules:** Add required module compose files
3. **Workflows:** Import client-specific n8n workflows
4. **AI Prompt:** Customize system prompt with business context
5. **Permissions:** Configure MCP permission tiers in `config/mcp/mcp-config.json`

---

## Cost Estimate (Monthly)

### Infrastructure (Self-Hosted VPS)

| Component | Specification | Estimated Cost |
|-----------|--------------|----------------|
| VPS (Hetzner/DigitalOcean) | 4 vCPU, 8GB RAM, 160GB SSD | $30-50 |
| Backup Storage | 100GB object storage | $5-10 |
| Domain | Annual, amortized | $2 |
| **Infrastructure Total** | | **~$40-65/month** |

### AI API Costs

Two provider options — pricing is similar since OpenRouter passes through Anthropic rates plus a small margin:

| Usage Level | Anthropic Direct | OpenRouter | Notes |
|-------------|-----------------|------------|-------|
| Light (100 queries/day) | $50-100 | $50-110 | Claude Sonnet |
| Medium (500 queries/day) | $200-400 | $210-420 | Claude Sonnet |
| Heavy (2000 queries/day) | $500-1000 | $525-1050 | Consider caching |

OpenRouter adds ~5% margin but simplifies billing (single account for 300+ models). Set `AI_PROVIDER=openrouter` in `.env` to switch.

### Total Cost Range

- **Small Business:** $90-165/month
- **Medium Business:** $240-465/month
- **Larger SMB:** $540-1065/month

---

## Next Steps

### Phase 1: Core Platform (Weeks 1-2)
- [ ] Deploy base stack
- [ ] Configure secrets management
- [ ] Set up SSO
- [ ] Test basic AI interactions

### Phase 2: Integration (Weeks 3-4)
- [ ] Deploy relevant MCP servers
- [ ] Build core automation workflows
- [ ] Configure AI permissions
- [ ] User acceptance testing

### Phase 3: Customization (Weeks 5-6)
- [ ] Client-specific workflows
- [ ] Custom MCP servers if needed
- [ ] Training and documentation
- [ ] Handoff to operations

---

## Appendix A: Alternative Approaches Considered

### Claude.ai Connectors (Rejected)

**Limitations:**
- No self-hosting option
- Limited control over data flow
- No custom security policies
- Per-seat pricing doesn't scale for SMBs
- No workflow automation integration

### Full Kubernetes (Rejected for SMB)

**Reasons:**
- Operational complexity too high for SMB
- Requires dedicated DevOps expertise
- Overkill for typical SMB scale
- Docker Compose sufficient for 90% of cases

**When to upgrade to K8s:**
- Multi-region deployment needed
- High availability requirements
- >50 concurrent users
- Complex scaling requirements

---

## Appendix B: Security Hardening Checklist

- [ ] All traffic over HTTPS (TLS 1.2+)
- [ ] No default passwords
- [ ] Database not exposed to internet
- [ ] MFA enabled for admin accounts
- [ ] Audit logging enabled for all services
- [ ] Automated backups configured
- [ ] Secrets rotation schedule set
- [ ] Network policies restricting container communication
- [ ] Regular security updates automated
- [ ] Incident response plan documented
