/**
 * AI provider factory with runtime API key resolution.
 * Supports Anthropic (direct) and OpenRouter as switchable backends.
 *
 * Provider selection priority:
 * 1. Org's stored preference (organizations.ai_provider column)
 * 2. Auto-detection: use whichever key is configured (prefer Anthropic if both)
 * 3. AI_PROVIDER env var as last resort
 */

import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getAnthropicApiKey, getOpenRouterApiKey } from "@/lib/secrets";
import { db } from "@/lib/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export type ModelFactory = (modelId: string) => LanguageModel;

export type ActiveProvider = "anthropic" | "openrouter";

export interface ResolvedProvider {
  provider: ActiveProvider;
  reason: "preference" | "auto-only-key" | "auto-both" | "fallback-other" | "env";
}

/**
 * Resolve which AI provider to use for a given org.
 * Checks org DB preference → key availability → env var fallback.
 */
export async function resolveProvider(orgId?: string): Promise<ResolvedProvider> {
  let preference: string | null = "auto";

  if (orgId) {
    const [org] = await db
      .select({ aiProvider: organizations.aiProvider })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (org?.aiProvider) {
      preference = org.aiProvider;
    }
  }

  const [anthropicKey, openrouterKey] = await Promise.all([
    getAnthropicApiKey(),
    getOpenRouterApiKey(),
  ]);

  const hasAnthropic = !!anthropicKey;
  const hasOpenRouter = !!openrouterKey;

  if (preference === "auto" || !preference) {
    if (hasAnthropic && hasOpenRouter) {
      return { provider: "anthropic", reason: "auto-both" };
    }
    if (hasAnthropic) {
      return { provider: "anthropic", reason: "auto-only-key" };
    }
    if (hasOpenRouter) {
      return { provider: "openrouter", reason: "auto-only-key" };
    }
    // Neither key — fall through to env var
  } else if (preference === "anthropic") {
    if (hasAnthropic) {
      return { provider: "anthropic", reason: "preference" };
    }
    if (hasOpenRouter) {
      return { provider: "openrouter", reason: "fallback-other" };
    }
  } else if (preference === "openrouter") {
    if (hasOpenRouter) {
      return { provider: "openrouter", reason: "preference" };
    }
    if (hasAnthropic) {
      return { provider: "anthropic", reason: "fallback-other" };
    }
  }

  // Last resort: AI_PROVIDER env var
  const env = process.env.AI_PROVIDER?.toLowerCase();
  if (env === "openrouter" && hasOpenRouter) {
    return { provider: "openrouter", reason: "env" };
  }
  if (env === "anthropic" && hasAnthropic) {
    return { provider: "anthropic", reason: "env" };
  }

  throw new Error(
    "No AI provider available. Configure an Anthropic or OpenRouter API key in Admin > Integrations.",
  );
}

/**
 * Returns the active provider name for display (backward compat).
 * Does NOT check key availability — just reads env var.
 */
export function getActiveProvider(): ActiveProvider {
  const env = process.env.AI_PROVIDER?.toLowerCase();
  if (env === "openrouter") return "openrouter";
  return "anthropic";
}

export async function getModelFactory(orgId?: string): Promise<ModelFactory> {
  const resolved = await resolveProvider(orgId);

  if (resolved.provider === "openrouter") {
    const apiKey = await getOpenRouterApiKey();
    if (!apiKey) {
      throw new Error(
        "OpenRouter API key not configured. Set it in Admin > API Keys or OPENROUTER_API_KEY env var.",
      );
    }
    const provider = createOpenRouter({ apiKey });
    return (modelId: string) => {
      // Auto-prefix bare Claude model IDs so existing agent definitions work unchanged
      const prefixed =
        modelId.includes("/") ? modelId : `anthropic/${modelId}`;
      return provider(prefixed);
    };
  }

  // Default: Anthropic
  const apiKey = await getAnthropicApiKey();
  if (!apiKey) {
    throw new Error(
      "Anthropic API key not configured. Set it in Admin > API Keys or ANTHROPIC_API_KEY env var.",
    );
  }
  const provider = createAnthropic({ apiKey });
  return (modelId: string) => provider(modelId);
}

/** @deprecated Use getModelFactory() instead */
export async function getAnthropicProvider() {
  return getModelFactory();
}
