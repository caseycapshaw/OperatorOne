/**
 * GET /api/admin/models
 * Returns available AI models for the active provider.
 * Supports ?refresh=true query param to bust the cache.
 */

import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { hasMinRole } from "@/lib/roles";
import { resolveProvider } from "@/lib/ai/provider";
import { getAvailableModels, invalidateModelCache } from "@/lib/ai/models";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await getChatSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "true";

  let provider: "anthropic" | "openrouter" = "anthropic";
  try {
    const resolved = await resolveProvider(ctx.orgId);
    provider = resolved.provider;
  } catch {
    // No provider keys configured — return anthropic fallback
  }

  if (refresh) {
    invalidateModelCache(provider);
  }

  const result = await getAvailableModels(provider);

  return NextResponse.json({
    models: result.models,
    source: result.source,
    provider,
  });
}
