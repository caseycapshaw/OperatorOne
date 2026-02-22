import { verifySetupAuth, verifyCsrfHeader } from "@/lib/setup-jwt";
import {
  isSetupComplete,
  markSetupComplete,
  storeProviderCredentials,
  clearProviderCredentials,
  storeOrgIdentity,
} from "@/lib/setup";
import { updateEnvFile } from "@/lib/setup-env";
import { writeSecret, checkHealth } from "@/lib/openbao";
import {
  authenticateWithBootstrap,
  setAdminPassword,
  createAllProviders,
} from "@/lib/authentik-client";
import {
  isOpenBaoInitialized,
  initializeOpenBao,
  writeSecretWithToken,
} from "@/lib/openbao-init";
import { generatePaperlessApiToken } from "@/lib/paperless-token";

interface ApplyBody {
  adminPassword: string;
  orgName: string;
  orgDomain: string;
  operatorName: string;
  operatorEmail: string;
  aiProvider?: "anthropic" | "openrouter";
  anthropicApiKey?: string;
  openrouterApiKey?: string;
}

type StepName =
  | "authentikPassword"
  | "openbaoInit"
  | "ssoProviders"
  | "paperlessToken"
  | "secretsStored"
  | "envUpdated"
  | "setupComplete"
  | "servicesRestarted";

interface StepResult {
  step: StepName;
  success: boolean;
  message: string;
}

export async function POST(request: Request) {
  const complete = await isSetupComplete();
  if (complete) {
    return new Response(
      JSON.stringify({ error: "Setup already completed" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!verifyCsrfHeader(request)) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const authorized = await verifySetupAuth(request);
  if (!authorized) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = (await request.json()) as ApplyBody;

  // Validate required fields
  if (!body.adminPassword || body.adminPassword.length < 12) {
    return new Response(
      JSON.stringify({ error: "Admin password must be at least 12 characters" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!body.orgName || !body.orgDomain || !body.operatorName || !body.operatorEmail) {
    return new Response(
      JSON.stringify({ error: "Organization identity fields are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Stream progress back to the client via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendStep(result: StepResult) {
        const data = JSON.stringify(result);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      function sendDone(success: boolean) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, success })}\n\n`),
        );
        controller.close();
      }

      const envUpdates: Record<string, string> = {};
      let openbaoServiceToken: string | null = null;

      // ── Step 1: Set Authentik admin password ──────────────────────
      try {
        const authentikToken = await authenticateWithBootstrap();
        await setAdminPassword(authentikToken, body.adminPassword);
        sendStep({
          step: "authentikPassword",
          success: true,
          message: "Authentik admin password set",
        });
      } catch (err) {
        console.error("Failed to set Authentik admin password:", err);
        sendStep({
          step: "authentikPassword",
          success: false,
          message: `Failed to set admin password: ${err instanceof Error ? err.message : "unknown error"}`,
        });
        sendDone(false);
        return;
      }

      // ── Step 2: Initialize OpenBao ────────────────────────────────
      try {
        const initialized = await isOpenBaoInitialized();
        if (!initialized) {
          const result = await initializeOpenBao();
          openbaoServiceToken = result.serviceToken;
          envUpdates.OPENBAO_UNSEAL_KEY = result.unsealKey;
          envUpdates.OPENBAO_ROOT_TOKEN = result.rootToken;
          envUpdates.OPENBAO_SERVICE_TOKEN = result.serviceToken;
          sendStep({
            step: "openbaoInit",
            success: true,
            message: "OpenBao initialized and configured",
          });
        } else {
          // Already initialized — try to use existing service token
          openbaoServiceToken = process.env.OPENBAO_SERVICE_TOKEN || null;
          sendStep({
            step: "openbaoInit",
            success: true,
            message: "OpenBao already initialized",
          });
        }
      } catch (err) {
        console.error("OpenBao initialization failed:", err);
        sendStep({
          step: "openbaoInit",
          success: false,
          message: `OpenBao init failed: ${err instanceof Error ? err.message : "unknown error"}`,
        });
        // Non-fatal — continue without OpenBao
      }

      // ── Step 3: Create SSO providers ──────────────────────────────
      try {
        const authentikToken = await authenticateWithBootstrap();
        const domain = body.orgDomain || process.env.DOMAIN || "localhost";
        const providers = await createAllProviders(authentikToken, domain);

        // Store in DB temporarily (existing pattern)
        await storeProviderCredentials(providers);

        envUpdates.CONSOLE_OAUTH_CLIENT_ID = providers.console.clientId;
        envUpdates.CONSOLE_OAUTH_CLIENT_SECRET = providers.console.clientSecret;
        envUpdates.GRAFANA_OAUTH_CLIENT_ID = providers.grafana.clientId;
        envUpdates.GRAFANA_OAUTH_CLIENT_SECRET = providers.grafana.clientSecret;

        const isLocalhost = domain.includes("localhost");
        const scheme = isLocalhost ? "http" : "https";
        envUpdates.GRAFANA_OAUTH_REDIRECT_URL =
          `${scheme}://monitor.${domain}/login/generic_oauth`;

        sendStep({
          step: "ssoProviders",
          success: true,
          message: "SSO providers created (Console + Grafana)",
        });
      } catch (err) {
        console.error("SSO provider creation failed:", err);
        sendStep({
          step: "ssoProviders",
          success: false,
          message: `SSO setup failed: ${err instanceof Error ? err.message : "unknown error"}`,
        });
        sendDone(false);
        return;
      }

      // ── Step 4: Generate Paperless API token ──────────────────────
      let paperlessToken: string | null = null;
      try {
        paperlessToken = await generatePaperlessApiToken();
        if (paperlessToken) {
          envUpdates.PAPERLESS_API_TOKEN = paperlessToken;
          sendStep({
            step: "paperlessToken",
            success: true,
            message: "Paperless API connected",
          });
        } else {
          sendStep({
            step: "paperlessToken",
            success: false,
            message: "Paperless not ready — configure later in admin",
          });
        }
      } catch (err) {
        console.error("Paperless token generation failed:", err);
        sendStep({
          step: "paperlessToken",
          success: false,
          message: "Paperless not ready — configure later in admin",
        });
      }

      // ── Step 5: Store secrets in OpenBao ──────────────────────────
      try {
        // Use the in-memory service token if we just initialized,
        // otherwise fall back to the existing openbao.ts module
        const useDirectToken = !!openbaoServiceToken;
        let secretsStored = 0;

        if (body.aiProvider) {
          envUpdates.AI_PROVIDER = body.aiProvider;
        }

        if (body.anthropicApiKey) {
          envUpdates.ANTHROPIC_API_KEY = body.anthropicApiKey;
          if (useDirectToken) {
            await writeSecretWithToken(openbaoServiceToken!, "services/anthropic", {
              api_key: body.anthropicApiKey,
            });
          } else if (await checkHealth()) {
            await writeSecret("services/anthropic", {
              api_key: body.anthropicApiKey,
            });
          }
          secretsStored++;
        }

        if (body.openrouterApiKey) {
          envUpdates.OPENROUTER_API_KEY = body.openrouterApiKey;
          if (useDirectToken) {
            await writeSecretWithToken(openbaoServiceToken!, "services/openrouter", {
              api_key: body.openrouterApiKey,
            });
          } else if (await checkHealth()) {
            await writeSecret("services/openrouter", {
              api_key: body.openrouterApiKey,
            });
          }
          secretsStored++;
        }

        if (paperlessToken) {
          if (useDirectToken) {
            await writeSecretWithToken(openbaoServiceToken!, "services/paperless", {
              api_token: paperlessToken,
            });
          } else if (await checkHealth()) {
            await writeSecret("services/paperless", {
              api_token: paperlessToken,
            });
          }
          secretsStored++;
        }

        sendStep({
          step: "secretsStored",
          success: true,
          message:
            secretsStored > 0
              ? `${secretsStored} secret(s) stored in vault`
              : "No secrets to store",
        });
      } catch (err) {
        console.error("Secret storage failed:", err);
        sendStep({
          step: "secretsStored",
          success: false,
          message: "Secret storage failed — secrets saved to .env only",
        });
      }

      // ── Step 6: Update .env ───────────────────────────────────────
      try {
        await updateEnvFile(envUpdates);
        sendStep({
          step: "envUpdated",
          success: true,
          message: "Configuration saved to .env",
        });
      } catch (err) {
        console.error("Env file update failed:", err);
        sendStep({
          step: "envUpdated",
          success: false,
          message: `Failed to update .env: ${err instanceof Error ? err.message : "unknown error"}`,
        });
        sendDone(false);
        return;
      }

      // ── Step 7: Store org identity + mark complete ────────────────
      try {
        await storeOrgIdentity({
          orgName: body.orgName,
          orgDomain: body.orgDomain,
          operatorName: body.operatorName,
          operatorEmail: body.operatorEmail,
        });

        await clearProviderCredentials();
        await markSetupComplete("setup-wizard");

        sendStep({
          step: "setupComplete",
          success: true,
          message: "Setup marked complete",
        });
      } catch (err) {
        console.error("Failed to mark setup complete:", err);
        sendStep({
          step: "setupComplete",
          success: false,
          message: "Failed to finalize setup",
        });
      }

      // ── Step 8: Restart services ──────────────────────────────────
      try {
        const adminMcpUrl = process.env.ADMIN_MCP_URL;
        const adminMcpToken = process.env.ADMIN_MCP_TOKEN;

        if (adminMcpUrl && adminMcpToken) {
          const res = await fetch(`${adminMcpUrl}/tools/restart-services`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${adminMcpToken}`,
            },
            body: JSON.stringify({ services: ["console", "grafana"] }),
          });
          const data = (await res.json()) as { message?: string };
          sendStep({
            step: "servicesRestarted",
            success: res.ok,
            message: data.message || "Restart initiated",
          });
        } else {
          sendStep({
            step: "servicesRestarted",
            success: true,
            message: "Restart services manually to apply changes",
          });
        }
      } catch (err) {
        console.error("Service restart failed:", err);
        sendStep({
          step: "servicesRestarted",
          success: false,
          message: "Service restart failed — restart manually",
        });
      }

      sendDone(true);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
