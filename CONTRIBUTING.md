# Contributing to OperatorOne

Thanks for your interest in contributing. This document covers the basics.

## Getting Started

1. Fork the repo and clone your fork
2. Copy `.env.example` to `.env` and run `./scripts/generate-secrets.sh`
3. Start the dev stack:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml \
     -f modules/console/docker-compose.yml -f modules/console/docker-compose.dev.yml \
     -f modules/admin/docker-compose.yml -f modules/admin/docker-compose.dev.yml \
     up -d
   ```
4. Access services at `*.localhost` (see README for URLs)

## Development Workflow

- Create a feature branch from `main`
- Keep commits focused and descriptive
- Test your changes locally with the full dev stack before submitting a PR

## Project Structure

- **Core stack**: `docker-compose.yml` + environment-specific overrides
- **Modules**: `modules/<name>/` with their own compose files layered via `-f`
- **Console app**: `modules/console/app/` (Next.js 15, App Router)
- **MCP servers**: `mcp-servers/` (Node.js)
- **Scripts**: `scripts/` (bash utilities for ops tasks)

## Conventions

- **Server Components** for data fetching, **Server Actions** for mutations
- All database queries are org-scoped (multi-tenant)
- Traefik routing via Docker labels, not config files
- Dev overrides always set `tls=false` and use the `web` entrypoint
- Secrets never committed to git

## Submitting Changes

1. Open a pull request against `main`
2. Describe what changed and why
3. Include steps to test if the change affects runtime behavior

## Reporting Issues

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Relevant logs (redact any secrets)
