/**
 * Approval API Service
 *
 * Receives Slack interactive message webhooks (button clicks),
 * validates signatures, and forwards approve/deny decisions
 * to the Admin MCP Server's HTTP API.
 */

import express from 'express';
import crypto from 'crypto';

const PORT = process.env.PORT || 3001;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://admin-mcp-server:3000';
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const APPROVAL_API_TOKEN = process.env.APPROVAL_API_TOKEN;

const app = express();

// ─────────────────────────────────────────────────────────────
// Middleware: Capture raw body for Slack signature verification
// Must run before any body parsers
// ─────────────────────────────────────────────────────────────

app.use('/approvals', (req, res, next) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
});

// Parse URL-encoded bodies (Slack sends payload as application/x-www-form-urlencoded)
app.use('/approvals', express.urlencoded({ extended: false }));

// ─────────────────────────────────────────────────────────────
// Slack Signature Verification
// ─────────────────────────────────────────────────────────────

function verifySlackSignature(req) {
  if (!SLACK_SIGNING_SECRET) {
    console.error('SLACK_SIGNING_SECRET not configured — rejecting request');
    return false;
  }

  const timestamp = req.headers['x-slack-request-timestamp'];
  const slackSignature = req.headers['x-slack-signature'];

  if (!timestamp || !slackSignature) {
    return false;
  }

  // Reject requests older than 5 minutes (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) {
    return false;
  }

  const sigBaseString = `v0:${timestamp}:${req.rawBody.toString()}`;
  const hmac = crypto.createHmac('sha256', SLACK_SIGNING_SECRET);
  hmac.update(sigBaseString);
  const computedSignature = `v0=${hmac.digest('hex')}`;

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(slackSignature)
    );
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// POST /approvals -- Slack interactive message webhook
// ─────────────────────────────────────────────────────────────

app.post('/approvals', async (req, res) => {
  // Verify Slack signature
  if (!verifySlackSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(req.body.payload);
  } catch {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // Extract action from interactive message
  const action = payload.actions?.[0];
  if (!action) {
    return res.status(400).json({ error: 'No action found' });
  }

  const actionId = action.action_id;
  let buttonValue;
  try {
    buttonValue = JSON.parse(action.value);
  } catch {
    return res.status(400).json({ error: 'Invalid action value' });
  }

  const { approvalId } = buttonValue;
  if (!approvalId) {
    return res.status(400).json({ error: 'Missing approvalId' });
  }

  const user = payload.user?.name || payload.user?.username || 'unknown';

  // Determine approve or deny
  let decision;
  if (actionId === 'approve_action') {
    decision = 'approve';
  } else if (actionId === 'deny_action') {
    decision = 'deny';
  } else {
    return res.status(400).json({ error: `Unknown action: ${actionId}` });
  }

  // Forward decision to admin MCP server
  let mcpResult;
  try {
    const mcpHeaders = { 'Content-Type': 'application/json' };
    if (APPROVAL_API_TOKEN) {
      mcpHeaders['Authorization'] = `Bearer ${APPROVAL_API_TOKEN}`;
    }
    const mcpResponse = await fetch(
      `${MCP_SERVER_URL}/approvals/${encodeURIComponent(approvalId)}/${decision}`,
      {
        method: 'POST',
        headers: mcpHeaders,
        body: JSON.stringify({ approvedBy: user }),
      }
    );
    mcpResult = await mcpResponse.json();

    if (!mcpResponse.ok) {
      throw new Error(mcpResult.error || `MCP server returned ${mcpResponse.status}`);
    }
  } catch (error) {
    console.error(`Failed to forward ${decision} to MCP server:`, error.message);

    // Update Slack message with error
    if (payload.response_url) {
      await updateSlackMessage(payload.response_url, {
        text: `Failed to process ${decision}: ${error.message}`,
        replace_original: true,
      });
    }

    return res.status(502).json({ error: `MCP server error: ${error.message}` });
  }

  // Update Slack message with result
  if (payload.response_url) {
    const emoji = decision === 'approve' ? '\u2705' : '\u274c';
    const verb = decision === 'approve' ? 'Approved' : 'Denied';
    const component = buttonValue.component || 'unknown';
    const version = buttonValue.version || '';

    await updateSlackMessage(payload.response_url, {
      replace_original: true,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *${verb}* by @${user}\n*${component}* update${version ? ` to ${version}` : ''}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Approval ID: \`${approvalId}\` | ${new Date().toISOString()}`,
            },
          ],
        },
      ],
    });
  }

  // Respond to Slack within 3 seconds
  res.status(200).json({ ok: true });
});

// ─────────────────────────────────────────────────────────────
// Helper: Update Slack message via response_url
// ─────────────────────────────────────────────────────────────

async function updateSlackMessage(responseUrl, body) {
  try {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Failed to update Slack message:', error.message);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /health -- Health check
// ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'approval-api',
  });
});

// ─────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Approval API listening on port ${PORT}`);
  if (!SLACK_SIGNING_SECRET) {
    console.error('WARNING: SLACK_SIGNING_SECRET not set — all Slack webhook requests will be rejected');
  }
  if (!APPROVAL_API_TOKEN) {
    console.error('WARNING: APPROVAL_API_TOKEN not set — outbound requests to MCP server will fail auth');
  }
});
