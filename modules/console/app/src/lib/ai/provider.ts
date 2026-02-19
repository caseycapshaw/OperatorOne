/**
 * AI provider factory with runtime API key resolution.
 * Supports Anthropic (direct) and OpenRouter as switchable backends.
 * Reads key from OpenBao first, falls back to env var.
 *
 * Set AI_PROVIDER=openrouter to use OpenRouter; defaults to anthropic.
 */

import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getAnthropicApiKey, getOpenRouterApiKey } from "@/lib/secrets";

export type ModelFactory = (modelId: string) => LanguageModel;

export type ActiveProvider = "anthropic" | "openrouter";

export function getActiveProvider(): ActiveProvider {
  const env = process.env.AI_PROVIDER?.toLowerCase();
  if (env === "openrouter") return "openrouter";
  return "anthropic";
}

export async function getModelFactory(): Promise<ModelFactory> {
  const active = getActiveProvider();

  if (active === "openrouter") {
    const apiKey = await getOpenRouterApiKey();
    if (!apiKey) {
      throw new Error(
        "OpenRouter API key not configured. Set it in Admin > API Keys or OPENROUTER_API_KEY env var.",
      );
    }
    const provider = createOpenRouter({ apiKey });
    return (modelId: string) => {
      // Auto-prefix bare Claude model IDs so existing agent definitions work unchanged
      const resolved =
        modelId.includes("/") ? modelId : `anthropic/${modelId}`;
      return provider(resolved);
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
