/**
 * OperatorOne Admin MCP Server
 *
 * Exposes system administration operations as MCP tools for AI agents.
 * Implements tiered permissions with human-in-the-loop for risky operations.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import Docker from 'dockerode';
import { readFile, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import YAML from 'yaml';
import semver from 'semver';
import express from 'express';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Configuration
const CONFIG = {
  projectDir: process.env.PROJECT_DIR || '/opt/op1',
  composeFile: 'docker-compose.yml',
  prodOverride: 'docker-compose.prod.yml',
  versionsFile: 'versions.yml',
  backupDir: 'backups',
  approvalTimeout: 3600000, // 1 hour
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  approvalCallbackUrl: process.env.APPROVAL_CALLBACK_URL,
  // Shared secret for authenticating approval API requests.
  // Both the admin-mcp-server and approval-api must have the same value.
  approvalToken: process.env.APPROVAL_API_TOKEN,
};

// Pending approvals store (in production, use Redis)
const pendingApprovals = new Map();

// Component risk levels determine approval requirements
const COMPONENT_RISK = {
  traefik: { level: 'low', autoUpdatePatch: true, requiresApproval: false },
  grafana: { level: 'low', autoUpdatePatch: true, requiresApproval: false },
  loki: { level: 'low', autoUpdatePatch: true, requiresApproval: false },
  promtail: { level: 'low', autoUpdatePatch: true, requiresApproval: false },
  redis: { level: 'low', autoUpdatePatch: true, requiresApproval: false },
  n8n: { level: 'medium', autoUpdatePatch: false, requiresApproval: true },
  openbao: { level: 'high', autoUpdatePatch: false, requiresApproval: true },
  authentik: { level: 'high', autoUpdatePatch: false, requiresApproval: true },
  postgres: { level: 'critical', autoUpdatePatch: false, requiresApproval: true, requiresMaintenanceWindow: true },
};

// GitHub repos for version checking
const GITHUB_REPOS = {
  traefik: 'traefik/traefik',
  n8n: 'n8n-io/n8n',
  openbao: 'openbao/openbao',
  authentik: 'goauthentik/authentik',
  grafana: 'grafana/grafana',
  loki: 'grafana/loki',
  promtail: 'grafana/loki', // promtail versions track loki releases
};

// ─────────────────────────────────────────────────────────────
// Input Validation
// ─────────────────────────────────────────────────────────────

const VERSION_REGEX = /^v?\d+\.\d+\.\d+(-[\w.]+)?$/;

function validateVersion(version) {
  if (!version || typeof version !== 'string') return false;
  return VERSION_REGEX.test(version);
}

function validateComponent(component) {
  return typeof component === 'string' && component in COMPONENT_RISK;
}

function validateBackupPath(filename) {
  if (!filename || typeof filename !== 'string') return false;
  // Must be a simple filename (no path separators, no shell metacharacters)
  if (/[\/\\;|&$`'"<>(){}!\n\r]/.test(filename)) return false;
  // Must match expected backup filename pattern
  if (!/^\w+-\d{8}-?\d{0,6}\.sql$/.test(filename)) return false;
  // Verify file actually exists in the backup directory
  const fullPath = path.join(CONFIG.projectDir, CONFIG.backupDir, filename);
  return existsSync(fullPath);
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

async function getLatestGitHubRelease(repo) {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.tag_name?.replace(/^v/, '');
  } catch {
    return null;
  }
}

async function getCurrentVersions() {
  const overridePath = path.join(CONFIG.projectDir, CONFIG.prodOverride);
  const mainPath = path.join(CONFIG.projectDir, CONFIG.composeFile);
  
  const content = existsSync(overridePath) 
    ? await readFile(overridePath, 'utf-8')
    : await readFile(mainPath, 'utf-8');
  
  const versions = {};
  
  // Parse versions from image tags
  const patterns = {
    traefik: /traefik:v?([\d.]+)/,
    n8n: /n8nio\/n8n:([\d.]+)/,
    openbao: /openbao\/openbao:([\d.]+)/,
    authentik: /goauthentik\/server:([\d.]+)/,
    grafana: /grafana\/grafana:([\d.]+)/,
    loki: /grafana\/loki:([\d.]+)/,
    promtail: /grafana\/promtail:([\d.]+)/,
    redis: /redis:([\d.]+)/,
    postgres: /postgres:([\d.]+)/,
  };
  
  for (const [component, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    versions[component] = match ? match[1] : 'unknown';
  }
  
  return versions;
}

async function getContainerHealth(serviceName) {
  try {
    const containers = await docker.listContainers({
      filters: { name: [`op1-${serviceName}`] }
    });
    
    if (containers.length === 0) {
      return { status: 'not_running', healthy: false };
    }
    
    const container = containers[0];
    return {
      status: container.State,
      healthy: container.Status?.includes('healthy') || container.State === 'running',
      uptime: container.Status,
    };
  } catch (error) {
    return { status: 'error', healthy: false, error: error.message };
  }
}

// Get full system status including all op1-* containers
async function getFullSystemStatus() {
  const currentVersions = await getCurrentVersions();
  const components = [];

  // First, add all known versioned components
  for (const [component, version] of Object.entries(currentVersions)) {
    const health = await getContainerHealth(component);
    components.push({
      component,
      version,
      ...health,
      riskLevel: COMPONENT_RISK[component]?.level || 'unknown',
      type: 'infrastructure',
    });
  }

  // Then discover any additional op1-* containers not already included
  try {
    const allContainers = await docker.listContainers({
      all: true,
      filters: { name: ['op1-'] }
    });

    const knownNames = new Set(components.map(c => `op1-${c.component}`));
    // Also match authentik-server/worker to the 'authentik' component
    knownNames.add('op1-authentik-server');
    knownNames.add('op1-authentik-worker');

    for (const container of allContainers) {
      const name = container.Names[0]?.replace(/^\//, '') || '';
      if (knownNames.has(name)) continue;

      // Extract a readable component name from container name
      const componentName = name.replace(/^op1-/, '');
      const image = container.Image || '';
      // Try to extract version from image tag
      const versionMatch = image.match(/:v?([\d.]+[\d.a-z-]*)/);
      const version = versionMatch ? versionMatch[1] : 'local';

      components.push({
        component: componentName,
        version,
        status: container.State,
        healthy: container.Status?.includes('healthy') || container.State === 'running',
        uptime: container.Status,
        riskLevel: 'internal',
        type: 'platform',
      });
    }
  } catch (error) {
    // If Docker discovery fails, return what we have from versioned components
  }

  // Add authentik-worker explicitly (same image as server, separate container)
  const workerHealth = await getContainerHealth('authentik-worker');
  if (workerHealth.status !== 'not_running') {
    const serverEntry = components.find(c => c.component === 'authentik');
    components.push({
      component: 'authentik-worker',
      version: serverEntry?.version || 'unknown',
      ...workerHealth,
      riskLevel: 'high',
      type: 'infrastructure',
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    components,
    overall: {
      total: components.length,
      healthy: components.every(c => c.healthy),
      healthyCount: components.filter(c => c.healthy).length,
      unhealthyCount: components.filter(c => !c.healthy).length,
    },
  };
}

async function executeUpdate(component, version) {
  // Validate inputs before execution
  if (!validateComponent(component)) {
    return { success: false, error: `Invalid component: ${component}` };
  }
  if (!validateVersion(version)) {
    return { success: false, error: `Invalid version format: ${version}` };
  }

  const { execFileSync } = await import('child_process');
  const scriptPath = path.join(CONFIG.projectDir, 'scripts', 'update-component.sh');

  try {
    const output = execFileSync(scriptPath, [component, version], {
      cwd: CONFIG.projectDir,
      encoding: 'utf-8',
      timeout: 300000, // 5 minute timeout
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

async function executeRollback(component, version, restoreDb = null) {
  // Validate inputs before execution
  if (!validateComponent(component)) {
    return { success: false, error: `Invalid component: ${component}` };
  }
  if (!validateVersion(version)) {
    return { success: false, error: `Invalid version format: ${version}` };
  }
  if (restoreDb && !validateBackupPath(restoreDb)) {
    return { success: false, error: `Invalid or nonexistent backup file: ${restoreDb}` };
  }

  const { execFileSync } = await import('child_process');
  const scriptPath = path.join(CONFIG.projectDir, 'scripts', 'rollback.sh');

  const args = [component, version];
  if (restoreDb) {
    // restoreDb is validated above — pass only the filename, resolve full path
    const fullBackupPath = path.join(CONFIG.projectDir, CONFIG.backupDir, restoreDb);
    args.push('--restore-db', fullBackupPath);
  }

  try {
    const output = execFileSync(scriptPath, args, {
      cwd: CONFIG.projectDir,
      encoding: 'utf-8',
      timeout: 300000,
      input: 'yes\n', // Auto-confirm
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function requestHumanApproval(action, details) {
  const approvalId = `approval_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

  const approval = {
    id: approvalId,
    action,
    details,
    requestedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CONFIG.approvalTimeout).toISOString(),
    status: 'pending',
  };

  pendingApprovals.set(approvalId, approval);

  // Send Slack notification with Block Kit interactive message
  if (CONFIG.slackWebhook) {
    const riskEmoji = {
      low: '\u2139\ufe0f',
      medium: '\u26a0\ufe0f',
      high: '\ud83d\udea8',
      critical: '\ud83d\udd34',
    };
    const emoji = riskEmoji[details.riskLevel] || '\ud83d\udd14';
    const component = details.component || 'unknown';
    const version = details.toVersion || '';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Approval Required: ${action} ${component}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Component:*\n${component}` },
          { type: 'mrkdwn', text: `*Risk Level:*\n${(details.riskLevel || 'unknown').toUpperCase()}` },
          ...(details.fromVersion ? [{ type: 'mrkdwn', text: `*Current Version:*\n${details.fromVersion}` }] : []),
          ...(version ? [{ type: 'mrkdwn', text: `*Target Version:*\n${version}` }] : []),
        ],
      },
      ...(details.reason ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `*Reason:*\n${details.reason}` },
      }] : []),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Approval ID: \`${approvalId}\` | Expires: ${approval.expiresAt}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Approve', emoji: true },
            style: 'primary',
            action_id: 'approve_action',
            value: JSON.stringify({ approvalId, action, component, version }),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Deny', emoji: true },
            style: 'danger',
            action_id: 'deny_action',
            value: JSON.stringify({ approvalId, action, component, version }),
          },
        ],
      },
    ];

    await fetch(CONFIG.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Approval Required: ${action} ${component}`,
        blocks,
      }),
    });
  }

  return approval;
}

async function logUpdateEvent(event) {
  const logPath = path.join(CONFIG.projectDir, 'logs', 'updates.jsonl');
  const entry = JSON.stringify({ ...event, timestamp: new Date().toISOString() }) + '\n';
  await writeFile(logPath, entry, { flag: 'a' });
}

// ─────────────────────────────────────────────────────────────
// MCP Server Definition
// ─────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'op1-admin', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Tool: Check for available updates
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'check_updates',
      description: 'Check all components for available updates. Returns current versions, latest available versions, and whether updates are recommended.',
      inputSchema: {
        type: 'object',
        properties: {
          component: {
            type: 'string',
            description: 'Optional: Check a specific component only',
            enum: Object.keys(COMPONENT_RISK),
          },
        },
      },
    },
    {
      name: 'get_system_status',
      description: 'Get health and status of all system components including container state, resource usage, and any alerts.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'apply_update',
      description: 'Apply an update to a component. Low-risk patch updates may be auto-approved. Medium/high risk updates require human approval.',
      inputSchema: {
        type: 'object',
        properties: {
          component: {
            type: 'string',
            description: 'Component to update',
            enum: Object.keys(COMPONENT_RISK),
          },
          version: {
            type: 'string',
            description: 'Target version (e.g., "1.75.0" or "v3.2.3")',
          },
          reason: {
            type: 'string',
            description: 'Reason for the update (for audit log)',
          },
        },
        required: ['component', 'version', 'reason'],
      },
    },
    {
      name: 'rollback_component',
      description: 'Rollback a component to a previous version. Always requires human approval.',
      inputSchema: {
        type: 'object',
        properties: {
          component: {
            type: 'string',
            description: 'Component to rollback',
            enum: Object.keys(COMPONENT_RISK),
          },
          version: {
            type: 'string',
            description: 'Version to rollback to',
          },
          restore_database: {
            type: 'string',
            description: 'Optional: Path to database backup to restore',
          },
          reason: {
            type: 'string',
            description: 'Reason for rollback (for audit log)',
          },
        },
        required: ['component', 'version', 'reason'],
      },
    },
    {
      name: 'check_approval_status',
      description: 'Check the status of a pending approval request.',
      inputSchema: {
        type: 'object',
        properties: {
          approval_id: {
            type: 'string',
            description: 'The approval ID to check',
          },
        },
        required: ['approval_id'],
      },
    },
    {
      name: 'list_backups',
      description: 'List available database backups for a component.',
      inputSchema: {
        type: 'object',
        properties: {
          component: {
            type: 'string',
            description: 'Component to list backups for',
          },
        },
      },
    },
    {
      name: 'get_update_history',
      description: 'Get the history of updates and rollbacks performed on the system.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of recent entries to return (default: 20)',
          },
        },
      },
    },
    {
      name: 'schedule_maintenance',
      description: 'Schedule a maintenance window for updates that require downtime.',
      inputSchema: {
        type: 'object',
        properties: {
          start_time: {
            type: 'string',
            description: 'ISO 8601 datetime for maintenance start',
          },
          duration_minutes: {
            type: 'number',
            description: 'Expected duration in minutes',
          },
          updates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                component: { type: 'string' },
                version: { type: 'string' },
              },
            },
            description: 'List of updates to perform during maintenance',
          },
          notify_users: {
            type: 'boolean',
            description: 'Whether to send user notifications',
          },
        },
        required: ['start_time', 'duration_minutes', 'updates'],
      },
    },
  ],
}));

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // ─────────────────────────────────────────────────────────
    case 'check_updates': {
      const currentVersions = await getCurrentVersions();
      const updates = [];
      
      const componentsToCheck = args.component 
        ? [args.component] 
        : Object.keys(GITHUB_REPOS);
      
      for (const component of componentsToCheck) {
        const repo = GITHUB_REPOS[component];
        if (!repo) continue;
        
        const current = currentVersions[component];
        const latest = await getLatestGitHubRelease(repo);
        const risk = COMPONENT_RISK[component];
        
        if (!latest || !current || current === 'unknown') continue;
        
        const currentClean = current.replace(/^v/, '');
        const latestClean = latest.replace(/^v/, '');
        
        const updateAvailable = semver.valid(currentClean) && semver.valid(latestClean)
          ? semver.lt(currentClean, latestClean)
          : currentClean !== latestClean;
        
        const isPatch = semver.valid(currentClean) && semver.valid(latestClean)
          ? semver.diff(currentClean, latestClean) === 'patch'
          : false;
        
        updates.push({
          component,
          current: currentClean,
          latest: latestClean,
          updateAvailable,
          isPatch,
          riskLevel: risk.level,
          autoUpdateEligible: risk.autoUpdatePatch && isPatch,
          requiresApproval: risk.requiresApproval || !isPatch,
          changelog: `https://github.com/${repo}/releases`,
        });
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            checkedAt: new Date().toISOString(),
            updates,
            summary: {
              total: updates.length,
              updatesAvailable: updates.filter(u => u.updateAvailable).length,
              autoUpdateEligible: updates.filter(u => u.autoUpdateEligible && u.updateAvailable).length,
            },
          }, null, 2),
        }],
      };
    }

    // ─────────────────────────────────────────────────────────
    case 'get_system_status': {
      const status = await getFullSystemStatus();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(status, null, 2),
        }],
      };
    }

    // ─────────────────────────────────────────────────────────
    case 'apply_update': {
      const { component, version, reason } = args;
      const risk = COMPONENT_RISK[component];

      if (!risk) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Unknown component: ${component}` }) }],
        };
      }

      if (!validateVersion(version)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Invalid version format: ${version}. Expected semver like "1.2.3" or "v1.2.3".` }) }],
        };
      }

      const currentVersions = await getCurrentVersions();
      const current = currentVersions[component];
      const versionClean = version.replace(/^v/, '');
      
      // Determine if this can be auto-approved
      const isPatch = semver.valid(current) && semver.valid(versionClean)
        ? semver.diff(current, versionClean) === 'patch'
        : false;
      
      const canAutoApprove = risk.autoUpdatePatch && isPatch && risk.level === 'low';
      
      if (canAutoApprove) {
        // Execute immediately for low-risk patch updates
        await logUpdateEvent({
          action: 'update',
          component,
          fromVersion: current,
          toVersion: versionClean,
          reason,
          autoApproved: true,
        });
        
        const result = await executeUpdate(component, version);
        
        await logUpdateEvent({
          action: 'update_complete',
          component,
          version: versionClean,
          success: result.success,
        });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: result.success ? 'completed' : 'failed',
              autoApproved: true,
              component,
              fromVersion: current,
              toVersion: versionClean,
              ...result,
            }, null, 2),
          }],
        };
      } else {
        // Request human approval
        const approval = await requestHumanApproval('update', {
          component,
          fromVersion: current,
          toVersion: versionClean,
          reason,
          riskLevel: risk.level,
        });
        
        await logUpdateEvent({
          action: 'approval_requested',
          component,
          fromVersion: current,
          toVersion: versionClean,
          approvalId: approval.id,
        });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'pending_approval',
              approvalId: approval.id,
              expiresAt: approval.expiresAt,
              reason: `${risk.level} risk update requires human approval`,
              component,
              fromVersion: current,
              toVersion: versionClean,
            }, null, 2),
          }],
        };
      }
    }

    // ─────────────────────────────────────────────────────────
    case 'rollback_component': {
      const { component, version, restore_database, reason } = args;

      if (!validateComponent(component)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Unknown component: ${component}` }) }],
        };
      }

      if (!validateVersion(version)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Invalid version format: ${version}. Expected semver like "1.2.3" or "v1.2.3".` }) }],
        };
      }

      if (restore_database && !validateBackupPath(restore_database)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Invalid or nonexistent backup file: ${restore_database}. Use list_backups to see available files.` }) }],
        };
      }

      // Rollbacks always require approval
      const approval = await requestHumanApproval('rollback', {
        component,
        toVersion: version,
        restoreDatabase: restore_database || false,
        reason,
      });
      
      await logUpdateEvent({
        action: 'rollback_approval_requested',
        component,
        toVersion: version,
        approvalId: approval.id,
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'pending_approval',
            approvalId: approval.id,
            expiresAt: approval.expiresAt,
            reason: 'Rollbacks always require human approval',
            component,
            toVersion: version,
          }, null, 2),
        }],
      };
    }

    // ─────────────────────────────────────────────────────────
    case 'check_approval_status': {
      const { approval_id } = args;
      const approval = pendingApprovals.get(approval_id);
      
      if (!approval) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: 'Approval not found or expired' }),
          }],
        };
      }
      
      // Check if expired
      if (new Date(approval.expiresAt) < new Date()) {
        approval.status = 'expired';
        pendingApprovals.delete(approval_id);
      }
      
      // If approved, execute the action
      if (approval.status === 'approved') {
        let result;
        
        if (approval.action === 'update') {
          result = await executeUpdate(
            approval.details.component,
            approval.details.toVersion
          );
        } else if (approval.action === 'rollback') {
          result = await executeRollback(
            approval.details.component,
            approval.details.toVersion,
            approval.details.restoreDatabase
          );
        }
        
        await logUpdateEvent({
          action: `${approval.action}_complete`,
          component: approval.details.component,
          version: approval.details.toVersion,
          success: result?.success,
          approvalId: approval_id,
        });
        
        pendingApprovals.delete(approval_id);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'executed',
              approval,
              result,
            }, null, 2),
          }],
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(approval, null, 2),
        }],
      };
    }

    // ─────────────────────────────────────────────────────────
    case 'list_backups': {
      const backupDir = path.join(CONFIG.projectDir, CONFIG.backupDir);
      
      try {
        const files = await readdir(backupDir);
        const backups = files
          .filter(f => f.endsWith('.sql'))
          .filter(f => !args.component || f.startsWith(args.component))
          .map(f => {
            const match = f.match(/^(\w+)-(\d{8})-?(\d{6})?\.sql$/);
            return {
              filename: f,
              component: match?.[1] || 'unknown',
              date: match?.[2] || 'unknown',
              path: path.join(backupDir, f),
            };
          })
          .sort((a, b) => b.date.localeCompare(a.date));
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ backups }, null, 2),
          }],
        };
      } catch {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ backups: [], error: 'Backup directory not found' }),
          }],
        };
      }
    }

    // ─────────────────────────────────────────────────────────
    case 'get_update_history': {
      const logPath = path.join(CONFIG.projectDir, 'logs', 'updates.jsonl');
      
      try {
        const content = await readFile(logPath, 'utf-8');
        const entries = content
          .trim()
          .split('\n')
          .filter(Boolean)
          .map(line => JSON.parse(line))
          .slice(-(args.limit || 20));
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ history: entries.reverse() }, null, 2),
          }],
        };
      } catch {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ history: [], note: 'No update history found' }),
          }],
        };
      }
    }

    // ─────────────────────────────────────────────────────────
    case 'schedule_maintenance': {
      const { start_time, duration_minutes, updates, notify_users } = args;
      
      // In production, this would integrate with a scheduler
      const maintenance = {
        id: `maint_${Date.now()}`,
        scheduledStart: start_time,
        durationMinutes: duration_minutes,
        updates,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      };
      
      // Request approval for scheduled maintenance
      const approval = await requestHumanApproval('maintenance_window', maintenance);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'pending_approval',
            maintenanceId: maintenance.id,
            approvalId: approval.id,
            ...maintenance,
          }, null, 2),
        }],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      };
  }
});

// ─────────────────────────────────────────────────────────────
// HTTP API (runs alongside MCP stdio for approval callbacks)
// ─────────────────────────────────────────────────────────────

const HTTP_PORT = process.env.HTTP_PORT || 3000;
const httpApp = express();
httpApp.use(express.json());

// Bearer token authentication for approval endpoints
function requireApprovalAuth(req, res, next) {
  if (!CONFIG.approvalToken) {
    return res.status(503).json({ error: 'APPROVAL_API_TOKEN not configured. Approval endpoints are disabled.' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.slice(7);
  // Timing-safe comparison to prevent timing attacks
  try {
    const expected = Buffer.from(CONFIG.approvalToken);
    const provided = Buffer.from(token);
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return res.status(403).json({ error: 'Invalid token' });
    }
  } catch {
    return res.status(403).json({ error: 'Invalid token' });
  }
  next();
}

// GET /health
httpApp.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'admin-mcp-server',
  });
});

// ─── Tool HTTP Endpoints (for console AI agent) ──────────
// These mirror the MCP tools but as simple GET endpoints

httpApp.get('/tools/system-status', requireApprovalAuth, async (req, res) => {
  try {
    const status = await getFullSystemStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

httpApp.get('/tools/check-updates', requireApprovalAuth, async (req, res) => {
  try {
    const currentVersions = await getCurrentVersions();
    const updates = [];

    const componentsToCheck = req.query.component
      ? [req.query.component]
      : Object.keys(GITHUB_REPOS);

    for (const component of componentsToCheck) {
      const repo = GITHUB_REPOS[component];
      if (!repo) continue;

      const current = currentVersions[component];
      const latest = await getLatestGitHubRelease(repo);

      if (!latest || !current || current === 'unknown') continue;

      const currentClean = current.replace(/^v/, '');
      const latestClean = latest.replace(/^v/, '');
      const risk = COMPONENT_RISK[component];

      const updateAvailable = semver.valid(currentClean) && semver.valid(latestClean)
        ? semver.lt(currentClean, latestClean)
        : currentClean !== latestClean;

      const isPatch = semver.valid(currentClean) && semver.valid(latestClean)
        ? semver.diff(currentClean, latestClean) === 'patch'
        : false;

      updates.push({
        component,
        current: currentClean,
        latest: latestClean,
        updateAvailable,
        isPatch,
        riskLevel: risk?.level,
        changelog: `https://github.com/${repo}/releases`,
      });
    }

    res.json({
      checkedAt: new Date().toISOString(),
      updates,
      summary: {
        total: updates.length,
        updatesAvailable: updates.filter(u => u.updateAvailable).length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

httpApp.get('/tools/update-history', requireApprovalAuth, async (req, res) => {
  const logPath = path.join(CONFIG.projectDir, 'logs', 'updates.jsonl');

  try {
    const content = await readFile(logPath, 'utf-8');
    const entries = content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
      .slice(-(parseInt(req.query.limit) || 20));

    res.json({ history: entries.reverse() });
  } catch {
    res.json({ history: [], note: 'No update history found' });
  }
});

// POST /tools/restart-services -- Restart specified services by container name
const RESTARTABLE_SERVICES = ['console', 'grafana', 'n8n', 'traefik'];

httpApp.post('/tools/restart-services', requireApprovalAuth, async (req, res) => {
  const { services } = req.body;

  if (!Array.isArray(services) || services.length === 0) {
    return res.status(400).json({ error: 'services must be a non-empty array' });
  }

  const invalid = services.filter(s => !RESTARTABLE_SERVICES.includes(s));
  if (invalid.length > 0) {
    return res.status(400).json({
      error: `Invalid services: ${invalid.join(', ')}. Allowed: ${RESTARTABLE_SERVICES.join(', ')}`,
    });
  }

  const results = [];
  for (const service of services) {
    const containerName = `op1-${service}`;
    try {
      const containers = await docker.listContainers({
        all: true,
        filters: { name: [containerName] },
      });

      if (containers.length === 0) {
        results.push({ service, status: 'not_found', error: `Container ${containerName} not found` });
        continue;
      }

      const container = docker.getContainer(containers[0].Id);
      await container.restart({ t: 10 });
      results.push({ service, status: 'restarted' });
    } catch (error) {
      results.push({ service, status: 'error', error: error.message });
    }
  }

  const allOk = results.every(r => r.status === 'restarted');
  res.status(allOk ? 200 : 207).json({
    message: allOk ? 'All services restarted' : 'Some services failed to restart',
    results,
  });
});

// GET /approvals/:id -- Get approval status (authenticated)
httpApp.get('/approvals/:id', requireApprovalAuth, (req, res) => {
  const approval = pendingApprovals.get(req.params.id);

  if (!approval) {
    return res.status(404).json({ error: 'Approval not found or expired' });
  }

  // Check expiry
  if (new Date(approval.expiresAt) < new Date()) {
    approval.status = 'expired';
    pendingApprovals.delete(req.params.id);
    return res.json({ ...approval, status: 'expired' });
  }

  res.json(approval);
});

// POST /approvals/:id/approve (authenticated)
httpApp.post('/approvals/:id/approve', requireApprovalAuth, async (req, res) => {
  const approval = pendingApprovals.get(req.params.id);

  if (!approval) {
    return res.status(404).json({ error: 'Approval not found or expired' });
  }

  if (new Date(approval.expiresAt) < new Date()) {
    approval.status = 'expired';
    pendingApprovals.delete(req.params.id);
    return res.status(410).json({ error: 'Approval has expired' });
  }

  if (approval.status !== 'pending') {
    return res.status(409).json({ error: `Approval already ${approval.status}` });
  }

  approval.status = 'approved';
  approval.approvedBy = req.body.approvedBy || 'unknown';
  approval.approvedAt = new Date().toISOString();

  await logUpdateEvent({
    action: 'approval_granted',
    approvalId: req.params.id,
    approvedBy: approval.approvedBy,
    component: approval.details?.component,
  });

  console.error(`Approval ${req.params.id} approved by ${approval.approvedBy}`);
  res.json(approval);
});

// POST /approvals/:id/deny (authenticated)
httpApp.post('/approvals/:id/deny', requireApprovalAuth, async (req, res) => {
  const approval = pendingApprovals.get(req.params.id);

  if (!approval) {
    return res.status(404).json({ error: 'Approval not found or expired' });
  }

  if (approval.status !== 'pending') {
    return res.status(409).json({ error: `Approval already ${approval.status}` });
  }

  approval.status = 'denied';
  approval.deniedBy = req.body.approvedBy || 'unknown';
  approval.deniedAt = new Date().toISOString();

  await logUpdateEvent({
    action: 'approval_denied',
    approvalId: req.params.id,
    deniedBy: approval.deniedBy,
    component: approval.details?.component,
  });

  pendingApprovals.delete(req.params.id);

  console.error(`Approval ${req.params.id} denied by ${approval.deniedBy}`);
  res.json(approval);
});

// Start HTTP server
httpApp.listen(HTTP_PORT, () => {
  console.error(`Admin HTTP API listening on port ${HTTP_PORT}`);
});

// Start MCP server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('OperatorOne Admin MCP Server running');
