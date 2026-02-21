import { NextResponse } from "next/server";
import { readSecret, writeSecret, checkHealth } from "@/lib/openbao";
import { getActiveProvider } from "@/lib/ai/provider";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { hasMinRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 7) + "•".repeat(Math.min(key.length - 11, 20)) + key.slice(-4);
}

function resolveKeyStatus(
  key: string,
  source: "openbao" | "env" | "none",
): { configured: boolean; masked: string; source: "openbao" | "env" | "none" } {
  return key
    ? { configured: true, masked: maskKey(key), source }
    : { configured: false, masked: "", source: "none" };
}

export async function GET() {
  const ctx = await getChatSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const openbaoAvailable = await checkHealth();

  let anthropicKey = "";
  let anthropicSource: "openbao" | "env" | "none" = "none";
  let n8nKey = "";
  let n8nSource: "openbao" | "env" | "none" = "none";
  let openrouterKey = "";
  let openrouterSource: "openbao" | "env" | "none" = "none";
  let paperlessToken = "";
  let paperlessSource: "openbao" | "env" | "none" = "none";

  if (openbaoAvailable) {
    const [anthropicSecret, n8nSecret, openrouterSecret, paperlessSecret] = await Promise.all([
      readSecret("services/anthropic"),
      readSecret("services/n8n"),
      readSecret("services/openrouter"),
      readSecret("services/paperless"),
    ]);
    if (anthropicSecret?.api_key) {
      anthropicKey = anthropicSecret.api_key;
      anthropicSource = "openbao";
    }
    if (n8nSecret?.api_key) {
      n8nKey = n8nSecret.api_key;
      n8nSource = "openbao";
    }
    if (openrouterSecret?.api_key) {
      openrouterKey = openrouterSecret.api_key;
      openrouterSource = "openbao";
    }
    if (paperlessSecret?.api_token) {
      paperlessToken = paperlessSecret.api_token;
      paperlessSource = "openbao";
    }
  }

  if (!anthropicKey && process.env.ANTHROPIC_API_KEY) {
    anthropicKey = process.env.ANTHROPIC_API_KEY;
    anthropicSource = "env";
  }

  if (!n8nKey && process.env.N8N_API_KEY) {
    n8nKey = process.env.N8N_API_KEY;
    n8nSource = "env";
  }

  if (!openrouterKey && process.env.OPENROUTER_API_KEY) {
    openrouterKey = process.env.OPENROUTER_API_KEY;
    openrouterSource = "env";
  }

  if (!paperlessToken && process.env.PAPERLESS_API_TOKEN) {
    paperlessToken = process.env.PAPERLESS_API_TOKEN;
    paperlessSource = "env";
  }

  return NextResponse.json({
    anthropicApiKey: resolveKeyStatus(anthropicKey, anthropicSource),
    n8nApiKey: resolveKeyStatus(n8nKey, n8nSource),
    openrouterApiKey: resolveKeyStatus(openrouterKey, openrouterSource),
    paperlessApiToken: resolveKeyStatus(paperlessToken, paperlessSource),
    aiProvider: getActiveProvider(),
    openbaoAvailable,
  });
}

export async function PATCH(request: Request) {
  const ctx = await getChatSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      anthropicApiKey?: string;
      n8nApiKey?: string;
      openrouterApiKey?: string;
      paperlessApiToken?: string;
    };

    if (body.anthropicApiKey !== undefined) {
      const key = body.anthropicApiKey.trim();
      if (!key) {
        return NextResponse.json(
          { error: "API key cannot be empty" },
          { status: 400 },
        );
      }
      if (!key.startsWith("sk-ant-")) {
        return NextResponse.json(
          { error: "Invalid Anthropic API key format" },
          { status: 400 },
        );
      }

      const openbaoAvailable = await checkHealth();
      if (openbaoAvailable) {
        const written = await writeSecret("services/anthropic", { api_key: key });
        if (!written) {
          return NextResponse.json(
            { error: "Failed to write secret to OpenBao" },
            { status: 500 },
          );
        }
        return NextResponse.json({ success: true, source: "openbao" });
      }

      return NextResponse.json(
        { error: "OpenBao is not available. Cannot save secrets." },
        { status: 503 },
      );
    }

    if (body.n8nApiKey !== undefined) {
      const key = body.n8nApiKey.trim();
      if (!key) {
        return NextResponse.json(
          { error: "API key cannot be empty" },
          { status: 400 },
        );
      }

      const openbaoAvailable = await checkHealth();
      if (openbaoAvailable) {
        const written = await writeSecret("services/n8n", { api_key: key });
        if (!written) {
          return NextResponse.json(
            { error: "Failed to write secret to OpenBao" },
            { status: 500 },
          );
        }
        return NextResponse.json({ success: true, source: "openbao" });
      }

      return NextResponse.json(
        { error: "OpenBao is not available. Cannot save secrets." },
        { status: 503 },
      );
    }

    if (body.openrouterApiKey !== undefined) {
      const key = body.openrouterApiKey.trim();
      if (!key) {
        return NextResponse.json(
          { error: "API key cannot be empty" },
          { status: 400 },
        );
      }
      if (!key.startsWith("sk-or-")) {
        return NextResponse.json(
          { error: "Invalid OpenRouter API key format (expected sk-or-... prefix)" },
          { status: 400 },
        );
      }

      const openbaoAvailable = await checkHealth();
      if (openbaoAvailable) {
        const written = await writeSecret("services/openrouter", { api_key: key });
        if (!written) {
          return NextResponse.json(
            { error: "Failed to write secret to OpenBao" },
            { status: 500 },
          );
        }
        return NextResponse.json({ success: true, source: "openbao" });
      }

      return NextResponse.json(
        { error: "OpenBao is not available. Cannot save secrets." },
        { status: 503 },
      );
    }

    if (body.paperlessApiToken !== undefined) {
      const token = body.paperlessApiToken.trim();
      if (!token) {
        return NextResponse.json(
          { error: "API token cannot be empty" },
          { status: 400 },
        );
      }

      const openbaoAvailable = await checkHealth();
      if (openbaoAvailable) {
        const written = await writeSecret("services/paperless", { api_token: token });
        if (!written) {
          return NextResponse.json(
            { error: "Failed to write secret to OpenBao" },
            { status: 500 },
          );
        }
        return NextResponse.json({ success: true, source: "openbao" });
      }

      return NextResponse.json(
        { error: "OpenBao is not available. Cannot save secrets." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "No updates provided" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Secrets update failed:", error);
    return NextResponse.json(
      { error: "Failed to update secrets" },
      { status: 500 },
    );
  }
}
