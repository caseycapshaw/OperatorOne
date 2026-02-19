# Update Management Strategy

## Overview

This document covers how to safely update individual components of OperatorOne while minimizing downtime and risk.

## Update Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                     UPDATE PRINCIPLES                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Pin versions explicitly - no :latest in production           │
│ 2. Test updates in staging before production                    │
│ 3. One component at a time - never batch updates                │
│ 4. Always backup before updating                                │
│ 5. Have a rollback plan ready                                   │
│ 6. Monitor for 24 hours after updates                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Update Matrix

| Component | Update Frequency | Downtime Required | Risk Level | Auto-Update Safe |
|-----------|-----------------|-------------------|------------|------------------|
| **Traefik** | Monthly | No (rolling) | Low | Minor only |
| **OpenBao** | Monthly | Yes (~10s) | Medium | No |
| **n8n** | Bi-weekly | Yes (~60s) | Medium | No |
| **Authentik** | Monthly | Yes (~60s) | High | No |
| **PostgreSQL** | Quarterly | Yes (minutes) | High | No |
| **Redis** | Quarterly | No | Low | Yes |
| **Grafana** | Monthly | No | Low | Yes |
| **Loki** | Monthly | No | Low | Yes |

---

## Version Pinning Strategy

### Compose File Layering

The base `docker-compose.yml` uses `:latest` tags for some services (suitable for dev). Production deployments must use `docker-compose.prod.yml` which pins every image to a specific version.

**Current pinned versions** (in `docker-compose.prod.yml`):

```yaml
services:
  traefik:
    image: traefik:v3.6.1
  openbao:
    image: openbao/openbao:2.5.0
  n8n:
    image: n8nio/n8n:1.72.1
  authentik-server:
    image: ghcr.io/goauthentik/server:2024.12.1
  authentik-worker:
    image: ghcr.io/goauthentik/server:2024.12.1  # Must match server
  postgres:
    image: postgres:16.4-alpine
  redis:
    image: redis:7.4.1-alpine
  grafana:
    image: grafana/grafana:11.4.0
  loki:
    image: grafana/loki:3.3.2
  promtail:
    image: grafana/promtail:3.3.2
```

### Version Tracking

Running `scripts/check-updates.sh` generates a `versions.yml` file (gitignored) that records current versions, latest available versions, and changelog links for each component.

---

## Update Scripts

All update operations use scripts in the `scripts/` directory.

### Checking for Updates

```bash
./scripts/check-updates.sh
```

This script:
1. Reads current versions from `docker-compose.prod.yml` (falls back to `docker-compose.yml`)
2. Queries GitHub Releases API for latest version of each component
3. Prints a color-coded summary
4. Writes `versions.yml` with full version details
5. Sends Slack notification if `SLACK_WEBHOOK_URL` is set and updates are available

**Output example:**
```
============================================
  OperatorOne - Update Checker
============================================

Traefik         Current: 3.6.1       Latest: 3.6.2       UPDATE AVAILABLE
n8n             Current: 1.72.1      Latest: 1.75.0      UPDATE AVAILABLE
OpenBao         Current: 2.5.0       Latest: 2.5.0       Up to date
Authentik       Current: 2024.12.1   Latest: 2024.12.3   UPDATE AVAILABLE
Grafana         Current: 11.4.0      Latest: 11.4.0      Up to date
Loki            Current: 3.3.2       Latest: 3.3.2       Up to date

============================================
3 update(s) available

To update a component, run:
  ./scripts/update-component.sh <component> <version>
============================================
```

### Updating a Component

```bash
./scripts/update-component.sh <component> <version> [--no-backup]
```

**Supported components:** `traefik`, `n8n`, `openbao`, `authentik`, `grafana`, `loki`, `redis`

This script handles each component differently based on its risk profile:

| Component | Backup | Health Check | Confirmation Prompt | Notes |
|-----------|--------|-------------|-------------------|-------|
| `traefik` | No | `localhost:8080/ping` | No | Zero-downtime, auto-rollback on failure |
| `n8n` | DB + workflow export | `localhost:5678/healthz` | No | Brief downtime |
| `openbao` | DB | `localhost:8200/v1/sys/seal-status` | Yes (interactive) | Reviews migration notes |
| `authentik` | DB | `localhost:9000/-/health/ready/` | Yes (interactive) | Stops worker first, waits for migrations |
| `grafana` | No | `localhost:3001/api/health` | No | Zero-downtime |
| `loki` | No | `localhost:3100/ready` | No | Zero-downtime |
| `redis` | No | `redis-cli ping` | No | Brief reconnection |

**Example:**
```bash
# Update Traefik (zero-downtime)
./scripts/update-component.sh traefik v3.6.2

# Update n8n (brief downtime, backs up DB first)
./scripts/update-component.sh n8n 1.75.0

# Update n8n without backup (for dev)
./scripts/update-component.sh n8n 1.75.0 --no-backup

# Update OpenBao (interactive confirmation required)
./scripts/update-component.sh openbao 2.6.0
```

### Rolling Back a Component

```bash
./scripts/rollback.sh <component> <previous_version> [--restore-db <backup_file>]
```

Rollbacks always require interactive confirmation (`yes`). For Authentik, the script also stops and restarts the worker.

**Example:**
```bash
# Rollback n8n to previous version
./scripts/rollback.sh n8n 1.72.1

# Rollback OpenBao with database restore
./scripts/rollback.sh openbao 2.5.0 --restore-db backups/openbao-20260205-100000.sql
```

The script lists available backup files if no arguments are provided.

---

## Pre-Update Checklist (All Components)

```bash
# 1. Check current state
docker compose ps
docker compose logs --tail=50

# 2. Run the update checker to see what's available
./scripts/check-updates.sh

# 3. Check disk space
df -h

# 4. Review changelog for the target version
# (URLs printed by check-updates.sh and saved in versions.yml)

# 5. Notify users of maintenance window (if downtime required)
```

---

## PostgreSQL Major Version Upgrades

PostgreSQL major version upgrades (e.g., 16 -> 17) are not handled by `update-component.sh` because they require a dump/restore cycle. This is a manual procedure:

```bash
BACKUP_DIR="backups/postgres-upgrade-$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

# 1. Full backup of all databases
docker compose exec -T postgres pg_dumpall -U postgres > "${BACKUP_DIR}/all-databases.sql"

# 2. Stop all dependent services
docker compose stop n8n openbao authentik-server authentik-worker

# 3. Stop PostgreSQL
docker compose stop postgres

# 4. Backup data volume
docker volume create postgres-data-backup
docker run --rm -v postgres-data:/source -v postgres-data-backup:/backup alpine \
    sh -c "cp -a /source/. /backup/"

# 5. Remove old container and volume
docker compose rm -f postgres
docker volume rm postgres-data

# 6. Update version in docker-compose.prod.yml and start new PostgreSQL
# (Edit the file manually to change postgres:16.4-alpine -> postgres:17.x-alpine)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres
sleep 20

# 7. Restore databases
docker compose exec -T postgres psql -U postgres < "${BACKUP_DIR}/all-databases.sql"

# 8. Restart dependent services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 9. Verify
docker compose ps
```

**Important:** Schedule a maintenance window for PostgreSQL major upgrades. Expect 15-30 minutes of downtime depending on data size.

---

## Automated Update Checking (Cron)

Add to crontab on the host:

```bash
# Check for updates every Monday at 9 AM
0 9 * * 1 /opt/op1/scripts/check-updates.sh >> /opt/op1/logs/update-checks.log 2>&1
```

If `SLACK_WEBHOOK_URL` is set in the environment, the script will send notifications when updates are available.

---

## Agent-Administered Updates

For fully automated update management via AI agent, see [Agent-Administered Updates](AGENT-ADMINISTERED-UPDATES.md). The admin module provides MCP tools that allow an AI agent to:
- Check for updates (`check_updates`)
- Auto-apply low-risk patches
- Request human approval for medium/high-risk updates via Slack
- Execute rollbacks with approval gates

---

## Maintenance Windows

### Recommended Schedule

| Task | Frequency | Window | Duration |
|------|-----------|--------|----------|
| Security patches | As released | Immediate | 5-10 min |
| Minor updates | Bi-weekly | Sunday 2-4 AM | 30 min |
| Major updates | Quarterly | Scheduled maintenance | 2-4 hours |
| PostgreSQL upgrades | Yearly | Major maintenance | 4-8 hours |

---

## Summary

1. **Pin all versions explicitly** -- never use `:latest` in production (use `docker-compose.prod.yml`)
2. **One component at a time** -- never batch updates
3. **Always backup first** -- `update-component.sh` handles this automatically (skip with `--no-backup`)
4. **Test in staging** -- before any production update
5. **Monitor after updates** -- watch logs for 24 hours
6. **Keep rollback ready** -- use `rollback.sh` with optional database restore
7. **Document everything** -- `check-updates.sh` generates `versions.yml` automatically
