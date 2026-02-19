import { NextResponse } from "next/server";
import { verifySetupAuth, verifyCsrfHeader } from "@/lib/setup-jwt";
import {
  isSetupComplete,
  markSetupComplete,
  getProviderCredentials,
  clearProviderCredentials,
  storeOrgIdentity,
} from "@/lib/setup";
import { updateEnvFile } from "@/lib/setup-env";
import { writeSecret, checkHealth } from "@/lib/openbao";

interface ApplyBody {
  orgName?: string;
  orgDomain?: string;
  operatorName?: string;
  operatorEmail?: string;
  aiProvider?: "anthropic" | "openrouter";
  anthropicApiKey?: string;
  openrouterApiKey?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  slackWebhookUrl?: string;
}

export async function POST(request: Request) {
  const complete = await isSetupComplete();
  if (complete) {
    return NextResponse.json(
      { error: "Setup already completed" },
      { status: 403 },
    );
  }

  // CSRF check
  if (!verifyCsrfHeader(request)) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 403 },
    );
  }

  const authorized = await verifySetupAuth(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read OAuth credentials from DB (stored by providers route)
  const creds = await getProviderCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Provider credentials not found. Run provider setup first." },
      { status: 400 },
    );
  }

  const body = (await request.json()) as ApplyBody;

  // Store org identity for application on first login
  if (body.orgName && body.orgDomain && body.operatorName && body.operatorEmail) {
    await storeOrgIdentity({
      orgName: body.orgName,
      orgDomain: body.orgDomain,
      operatorName: body.operatorName,
      operatorEmail: body.operatorEmail,
    });
  }

  try {
    // Build env updates from server-side credentials
    const envUpdates: Record<string, string> = {
      PORTAL_OAUTH_CLIENT_ID: creds.console.clientId,
      PORTAL_OAUTH_CLIENT_SECRET: creds.console.clientSecret,
      GRAFANA_OAUTH_CLIENT_ID: creds.grafana.clientId,
      GRAFANA_OAUTH_CLIENT_SECRET: creds.grafana.clientSecret,
    };

    // Determine domain for Grafana redirect URL
    const domain = process.env.DOMAIN || "localhost";
    const scheme = domain.includes("localhost") ? "http" : "https";
    envUpdates.GRAFANA_OAUTH_REDIRECT_URL =
      `${scheme}://monitor.${domain}/login/generic_oauth`;

    // AI provider selection
    if (body.aiProvider) {
      envUpdates.AI_PROVIDER = body.aiProvider;
    }

    // Optional services
    if (body.anthropicApiKey) {
      envUpdates.ANTHROPIC_API_KEY = body.anthropicApiKey;
    }
    if (body.openrouterApiKey) {
      envUpdates.OPENROUTER_API_KEY = body.openrouterApiKey;
    }
    if (body.smtpHost) envUpdates.SMTP_HOST = body.smtpHost;
    if (body.smtpPort) envUpdates.SMTP_PORT = body.smtpPort;
    if (body.smtpUser) envUpdates.SMTP_USER = body.smtpUser;
    if (body.smtpPass) envUpdates.SMTP_PASS = body.smtpPass;
    if (body.slackWebhookUrl) {
      envUpdates.SLACK_WEBHOOK_URL = body.slackWebhookUrl;
    }

    // 1. Write .env file
    await updateEnvFile(envUpdates);

    // 1b. Write API keys to OpenBao if available
    const openbaoAvailable = await checkHealth();
    if (openbaoAvailable) {
      if (body.anthropicApiKey) {
        await writeSecret("services/anthropic", { api_key: body.anthropicApiKey });
      }
      if (body.openrouterApiKey) {
        await writeSecret("services/openrouter", { api_key: body.openrouterApiKey });
      }
    }

    // 2. Clear credentials from DB (no longer needed)
    await clearProviderCredentials();

    // 3. Mark setup as complete
    await markSetupComplete("setup-wizard");

    // 4. Restart services via admin MCP
    const adminMcpUrl = process.env.ADMIN_MCP_URL;
    const adminMcpToken = process.env.ADMIN_MCP_TOKEN;
    let restartResult = { success: false, message: "Admin MCP not configured" };

    if (adminMcpUrl && adminMcpToken) {
      try {
        const res = await fetch(`${adminMcpUrl}/tools/restart-services`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminMcpToken}`,
          },
          body: JSON.stringify({ services: ["console", "grafana"] }),
        });
        const data = await res.json();
        restartResult = { success: res.ok, message: data.message || "Restart initiated" };
      } catch (error) {
        console.error("Service restart failed:", error);
        restartResult = {
          success: false,
          message: "Service restart request failed",
        };
      }
    }

    return NextResponse.json({
      success: true,
      envWritten: true,
      setupComplete: true,
      restart: restartResult,
    });
  } catch (error) {
    console.error("Apply configuration failed:", error);
    return NextResponse.json(
      { error: "Configuration apply failed" },
      { status: 500 },
    );
  }
}
