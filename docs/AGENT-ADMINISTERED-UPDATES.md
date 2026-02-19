# Agent-Administered System Updates

## Overview

OperatorOne can be fully administered by an AI agent, including system updates. This creates a **self-maintaining system** where routine operations happen automatically while maintaining human oversight for high-risk changes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AGENT-ADMINISTERED UPDATE FLOW                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────┐     ┌──────────────┐     ┌─────────────┐                  │
│   │ AI Agent│────▶│ Admin MCP    │────▶│ Risk        │                  │
│   │ (Claude)│     │ Server       │     │ Assessment  │                  │
│   └─────────┘     └──────────────┘     └──────┬──────┘                  │
│                                               │                          │
│                         ┌─────────────────────┴─────────────────────┐   │
│                         ▼                                           ▼   │
│                   ┌───────────┐                             ┌───────────┐│
│                   │ LOW RISK  │                             │ MED/HIGH  ││
│                   │ Auto-apply│                             │ Request   ││
│                   │ & log     │                             │ Approval  ││
│                   └─────┬─────┘                             └─────┬─────┘│
│                         │                                         │      │
│                         ▼                                         ▼      │
│                   ┌───────────┐     ┌──────────┐          ┌───────────┐ │
│                   │ Execute   │     │  Human   │─────────▶│ Execute   │ │
│                   │ Update    │     │ Approves │          │ Update    │ │
│                   └───────────┘     └──────────┘          └───────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Components

### 1. Admin MCP Server

A custom MCP server that exposes system administration operations as tools:

| Tool | Description | Approval Required |
|------|-------------|-------------------|
| `check_updates` | List available updates for all components | No |
| `get_system_status` | Health check all services | No |
| `apply_update` | Apply an update to a component | Risk-dependent |
| `rollback_component` | Revert to previous version | Always |
| `list_backups` | Show available database backups | No |
| `get_update_history` | View update audit log | No |
| `schedule_maintenance` | Plan downtime window | Always |
| `check_approval_status` | Poll pending approval | No |

### 2. Risk Classification

Components are classified by risk level, which determines automation behavior:

```yaml
component_risk:
  # LOW RISK - Patch updates auto-applied
  traefik:
    level: low
    auto_update_patch: true
    requires_approval: false
    
  grafana:
    level: low
    auto_update_patch: true
    requires_approval: false
    
  loki:
    level: low
    auto_update_patch: true
    requires_approval: false

  promtail:
    level: low
    auto_update_patch: true
    requires_approval: false

  redis:
    level: low
    auto_update_patch: true
    requires_approval: false

  # MEDIUM RISK - Always requires approval
  n8n:
    level: medium
    auto_update_patch: false
    requires_approval: true
    reason: "Contains business workflows"
    
  # HIGH RISK - Requires approval + review
  openbao:
    level: high
    auto_update_patch: false
    requires_approval: true
    reason: "Manages all secrets"
    
  authentik:
    level: high
    auto_update_patch: false
    requires_approval: true
    reason: "SSO affects all services"
    
  # CRITICAL - Requires maintenance window
  postgres:
    level: critical
    auto_update_patch: false
    requires_approval: true
    requires_maintenance_window: true
    reason: "Database migration risk"
```

### 3. n8n Workflow Automation

The `system-update-manager` workflow handles:

1. **Weekly Update Checks** - Scheduled scan of all components
2. **Automatic Patch Updates** - Low-risk patches applied immediately
3. **Slack Approval Requests** - Interactive messages for human approval
4. **Approval Processing** - Executes updates when approved
5. **Audit Logging** - Records all update activity

### 4. Approval Flow

```
┌──────────────────┐
│ Agent detects    │
│ update available │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────┐
│ Is patch update  │────▶│ Auto-apply if   │
│ on low-risk?     │ Yes │ low-risk        │
└────────┬─────────┘     └─────────────────┘
         │ No
         ▼
┌──────────────────┐
│ Create approval  │
│ request          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Send Slack       │
│ notification     │
│ with buttons     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Human clicks     │
│ Approve/Deny     │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Approve│ │ Deny  │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Execute│ │ Log & │
│update │ │ notify│
└───────┘ └───────┘
```

---

## Configuration

### Enable Admin Module

**Local development** (containerized with dev overrides):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml \
               -f modules/console/docker-compose.yml -f modules/console/docker-compose.dev.yml \
               -f modules/admin/docker-compose.yml -f modules/admin/docker-compose.dev.yml \
               up -d
```

**Production deployment** (TLS, pinned versions):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
               -f modules/console/docker-compose.yml \
               -f modules/admin/docker-compose.yml \
               up -d
```

**Claude Code local MCP** (runs MCP server directly via stdio, no Docker):

The `.mcp.json` at the project root configures Claude Code to run the admin server locally:

```json
{
  "mcpServers": {
    "op1-admin": {
      "command": "node",
      "args": ["mcp-servers/op1-admin/src/index.js"],
      "env": {
        "PROJECT_DIR": "/path/to/operatorone"
      }
    }
  }
}
```

### Environment Variables

Add to `.env`:

```bash
# Required: shared token for console <-> admin MCP server HTTP API authentication
APPROVAL_API_TOKEN=<generate with: openssl rand -hex 32>

# Optional: Slack integration for human-in-the-loop approvals
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx
SLACK_SIGNING_SECRET=your-signing-secret
```

`APPROVAL_API_TOKEN` is **required** -- without it, the admin MCP server's HTTP endpoints return 503 and the console AI agent cannot check system status. The approval timeout is hardcoded to 1 hour in the MCP server (`mcp-servers/op1-admin/src/index.js`).

### Approval API

The approval flow uses two HTTP services working together:

1. **Admin MCP Server HTTP API** (port 3000, internal) -- An Express server running alongside the MCP stdio transport inside the admin-mcp-server container. Exposes `GET /health`, `GET /approvals/:id`, `POST /approvals/:id/approve`, and `POST /approvals/:id/deny` to manage the in-memory `pendingApprovals` Map.

2. **Approval API** (port 3001, public via Traefik) -- A lightweight Express service at `modules/admin/approval-api/server.js` that receives Slack interactive message webhooks. It verifies Slack request signatures (HMAC-SHA256 with replay protection), parses the button payload, forwards the decision to the admin MCP server's HTTP API, and updates the Slack message with the result.

```
Slack button click → Approval API (:3001) → Admin MCP Server HTTP API (:3000)
                     validates signature      updates pendingApprovals Map
                     parses payload           logs event
                     updates Slack message
```

When the AI agent next calls `check_approval_status`, it finds the approval status has been updated and proceeds accordingly (executing the update if approved, or reporting the denial).

### MCP Tool Permissions

The admin MCP server enforces permissions internally based on component risk levels (see Risk Classification below). Approval requirements are determined by the `COMPONENT_RISK` configuration in `mcp-servers/op1-admin/src/index.js`:

| Tool | Approval Required |
|------|-------------------|
| `check_updates` | No |
| `get_system_status` | No |
| `apply_update` | Risk-dependent (auto for low-risk patches, approval for others) |
| `rollback_component` | Always |
| `list_backups` | No |
| `get_update_history` | No |
| `schedule_maintenance` | Always |

---

## Agent Interaction Examples

### Example 1: Routine Update Check

**User:** "Check if any updates are available"

**Agent uses:** `check_updates` tool

**Response:**
```
I checked all components for updates. Here's the summary:

Updates Available:
• Traefik: 3.2.1 → 3.2.3 (patch, auto-eligible)
• n8n: 1.72.1 → 1.75.0 (minor, needs approval)
• Grafana: 11.4.0 → 11.4.2 (patch, auto-eligible)

The Traefik and Grafana patches are low-risk and can be auto-applied.
The n8n update requires your approval since it's a minor version bump.

Would you like me to:
1. Apply the safe patch updates automatically?
2. Request approval for the n8n update?
```

### Example 2: Apply Update with Approval

**User:** "Update n8n to the latest version"

**Agent uses:** `apply_update` tool

**Response:**
```
I've initiated the n8n update request. Since n8n contains your 
business workflows, this requires human approval.

A Slack notification has been sent to #op1-approvals with approve/deny buttons.

Approval ID: approval_1707234567_abc123
Expires: 1 hour from now

I'll notify you once the update is approved and completed. You can also
ask me to check the approval status at any time.
```

### Example 3: Emergency Rollback

**User:** "n8n is broken after the update, roll it back!"

**Agent uses:** `rollback_component` tool

**Response:**
```
I understand this is urgent. I've initiated an emergency rollback request
for n8n to version 1.72.1.

Since rollbacks can affect data, this requires human approval even in 
emergencies. A Slack notification has been sent to #op1-approvals marked 
as URGENT.

Available backups:
• n8n-20260206-100000.sql (2 hours ago)
• n8n-20260205-090000.sql (1 day ago)

Would you like to include a database restore in the rollback? If so,
which backup should I use?
```

### Example 4: Scheduled Maintenance

**User:** "Schedule the PostgreSQL upgrade for this Sunday at 2 AM"

**Agent uses:** `schedule_maintenance` tool

**Response:**
```
I've created a maintenance window request:

📅 Scheduled: Sunday, Feb 9, 2026 at 2:00 AM UTC
⏱️ Duration: 2 hours
🔧 Updates:
   • PostgreSQL: 16.4 → 17.0 (major upgrade)

This will send notifications to users 24 hours before and 1 hour before
the maintenance window. During the window:

1. Maintenance page will be enabled
2. Full database backup will be created
3. PostgreSQL will be upgraded
4. All services will be restarted
5. Health checks will verify everything works

An approval request has been sent. Once approved, the maintenance will
proceed automatically at the scheduled time.
```

---

## Conversation Patterns for Self-Administration

The AI agent can be instructed with a system prompt to proactively manage updates:

```markdown
## System Administration Instructions

You have access to the admin MCP server for managing system updates.

### Weekly Routine
Every Monday at 9 AM, automatically:
1. Run `check_updates` to scan for available updates
2. Apply any low-risk patch updates automatically
3. Summarize pending updates that need approval in #op1-updates channel

### When Users Report Issues
If a user reports a service is broken after an update:
1. Immediately check `get_system_status` for the affected component
2. Use `list_backups` to identify available restore points
3. Initiate `rollback_component` with appropriate backup
4. Mark the rollback as URGENT in the approval request

### Update Decision Framework
- Patch updates on low-risk components: Auto-apply
- Minor updates: Request approval, explain what's new
- Major updates: Request approval, recommend maintenance window
- Security patches: Flag as high priority in approval request

### Never Do
- Never auto-apply updates to n8n, OpenBao, or Authentik
- Never skip the approval process for rollbacks
- Never update PostgreSQL without a scheduled maintenance window
```

---

## Audit Trail

All operations are logged to `${PROJECT_DIR}/logs/updates.jsonl` (defaults to `/opt/op1/logs/updates.jsonl` in Docker, or the project directory when running locally):

```json
{"timestamp":"2026-02-06T10:00:00Z","action":"check_updates","components":["traefik","n8n","openbao"]}
{"timestamp":"2026-02-06T10:00:05Z","action":"update","component":"traefik","fromVersion":"3.2.1","toVersion":"3.2.3","autoApproved":true}
{"timestamp":"2026-02-06T10:00:15Z","action":"update_complete","component":"traefik","version":"3.2.3","success":true}
{"timestamp":"2026-02-06T10:01:00Z","action":"approval_requested","component":"n8n","fromVersion":"1.72.1","toVersion":"1.75.0","approvalId":"approval_xxx"}
{"timestamp":"2026-02-06T10:15:00Z","action":"approval_granted","approvalId":"approval_xxx","approvedBy":"@admin"}
{"timestamp":"2026-02-06T10:15:05Z","action":"update","component":"n8n","fromVersion":"1.72.1","toVersion":"1.75.0","approvalId":"approval_xxx"}
{"timestamp":"2026-02-06T10:16:00Z","action":"update_complete","component":"n8n","version":"1.75.0","success":true}
```

---

## Security Considerations

### Docker Socket Access

The admin MCP server requires Docker socket access. Mitigations:

1. **Read-mostly operations** - Most tools only read container state
2. **No direct exec** - Updates go through scripts, not container exec
3. **Audit logging** - All operations are logged
4. **Approval gates** - High-risk operations require human approval

### Approval Bypass Prevention

- Approval IDs are cryptographically random
- Approvals expire after 1 hour
- All approval grants are logged with user identity
- Slack signing secret validates webhook authenticity

### Rollback Protection

- Rollbacks always require approval (no auto-rollback)
- Database backups created before every update
- Version history maintained for audit

---

## Extending the System

### Add Custom Approval Channels

Modify `modules/admin/docker-compose.yml` to add:
- Email notifications
- Microsoft Teams integration
- PagerDuty for critical updates

### Add Custom Risk Rules

Edit the `COMPONENT_RISK` object in `op1-admin/src/index.js`:

```javascript
const COMPONENT_RISK = {
  // Add your custom component
  'custom-service': {
    level: 'medium',
    autoUpdatePatch: false,
    requiresApproval: true,
    requiresMaintenanceWindow: false,
  },
};
```

### Add Pre/Post Update Hooks

The update scripts support hooks:

```bash
# scripts/hooks/pre-update-n8n.sh
#!/bin/bash
# Pause running workflows before n8n update
curl -X POST http://localhost:5678/api/v1/workflows/pause-all

# scripts/hooks/post-update-n8n.sh
#!/bin/bash
# Resume workflows after successful update
curl -X POST http://localhost:5678/api/v1/workflows/resume-all
```

---

## Summary

The agent-administered update system provides:

1. **Autonomous routine maintenance** - Patch updates applied automatically
2. **Human oversight for risk** - Medium/high risk changes require approval
3. **Complete audit trail** - Every action logged with timestamps
4. **Easy rollback** - One-command revert with database restore
5. **Flexible scheduling** - Maintenance windows for major updates
6. **Slack-native workflow** - Approve updates without leaving chat

This creates a system that is largely self-maintaining while ensuring humans remain in control of significant changes.
