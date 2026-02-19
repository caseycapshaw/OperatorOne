/**
 * Centralized secret reader with OpenBao-first, env-fallback pattern.
 * Caches OpenBao health status to avoid repeated checks.
 */

import { readSecret, checkHealth } from "./openbao";

let healthCache: { available: boolean; checkedAt: number } | null = null;
const HEALTH_CACHE_TTL = 60_000; // 60 seconds

async function isOpenBaoAvailable(): Promise<boolean> {
  const now = Date.now();
  if (healthCache && now - healthCache.checkedAt < HEALTH_CACHE_TTL) {
    return healthCache.available;
  }
  const available = await checkHealth();
  healthCache = { available, checkedAt: now };
  return available;
}

export async function getAnthropicApiKey(): Promise<string | undefined> {
  if (await isOpenBaoAvailable()) {
    const secret = await readSecret("services/anthropic");
    if (secret?.api_key) return secret.api_key;
  }
  return process.env.ANTHROPIC_API_KEY || undefined;
}

export async function getN8nApiKey(): Promise<string | undefined> {
  if (await isOpenBaoAvailable()) {
    const secret = await readSecret("services/n8n");
    if (secret?.api_key) return secret.api_key;
  }
  return process.env.N8N_API_KEY || undefined;
}

export async function getOpenRouterApiKey(): Promise<string | undefined> {
  if (await isOpenBaoAvailable()) {
    const secret = await readSecret("services/openrouter");
    if (secret?.api_key) return secret.api_key;
  }
  return process.env.OPENROUTER_API_KEY || undefined;
}

export async function getOpenBaoStatus(): Promise<boolean> {
  return isOpenBaoAvailable();
}
