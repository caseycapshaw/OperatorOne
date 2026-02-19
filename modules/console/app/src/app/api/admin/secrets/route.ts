import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { readSecret, writeSecret, checkHealth } from "@/lib/openbao";

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
  try {
    await requireAuth();

    const openbaoAvailable = await checkHealth();

    let anthropicKey = "";
    let anthropicSource: "openbao" | "env" | "none" = "none";
    let n8nKey = "";
    let n8nSource: "openbao" | "env" | "none" = "none";

    if (openbaoAvailable) {
      const [anthropicSecret, n8nSecret] = await Promise.all([
        readSecret("services/anthropic"),
        readSecret("services/n8n"),
      ]);
      if (anthropicSecret?.api_key) {
        anthropicKey = anthropicSecret.api_key;
        anthropicSource = "openbao";
      }
      if (n8nSecret?.api_key) {
        n8nKey = n8nSecret.api_key;
        n8nSource = "openbao";
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

    return NextResponse.json({
      anthropicApiKey: resolveKeyStatus(anthropicKey, anthropicSource),
      n8nApiKey: resolveKeyStatus(n8nKey, n8nSource),
      openbaoAvailable,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAuth();

    const body = (await request.json()) as {
      anthropicApiKey?: string;
      n8nApiKey?: string;
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
