/**
 * Anthropic AI provider with runtime API key resolution.
 * Reads key from OpenBao first, falls back to env var.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { getAnthropicApiKey } from "@/lib/secrets";

export async function getAnthropicProvider() {
  const apiKey = await getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("Anthropic API key not configured. Set it in Admin > API Keys or ANTHROPIC_API_KEY env var.");
  }
  return createAnthropic({ apiKey });
}
