/**
 * AI model catalog and resolution for OperatorOne.
 *
 * Model selection priority:
 * 1. Per-agent modelOverride (from agents table / agent editor UI)
 * 2. Org DB setting organizations.ai_model (set via admin dropdown)
 * 3. AI_MODEL env var (set in .env / Docker Compose)
 * 4. Hardcoded DEFAULT_MODEL_ID
 *
 * Models are fetched dynamically from the active provider's API
 * with in-memory caching (5-min TTL) and hardcoded fallbacks.
 */

import { db } from "@/lib/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAnthropicApiKey } from "@/lib/secrets";
import type { ActiveProvider } from "@/lib/ai/provider";

/* ── Types ────────────────────────────────────── */

export interface ModelInfo {
  id: string;
  name: string;
  shortName: string;
  provider?: string;
  contextLength?: number;
  inputPrice?: string;
  outputPrice?: string;
}

export interface AvailableModelsResult {
  models: ModelInfo[];
  source: "api" | "fallback";
}

/* ── Constants ────────────────────────────────── */

export const DEFAULT_MODEL_ID = "claude-sonnet-4-5-20250929";

/* ── Fallback Lists ──────────────────────────── */

export const FALLBACK_ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    shortName: "Sonnet 4.5",
    provider: "anthropic",
  },
  {
    id: "claude-opus-4-5-20250918",
    name: "Claude Opus 4.5",
    shortName: "Opus 4.5",
    provider: "anthropic",
  },
  {
    id: "claude-haiku-3-5-20241022",
    name: "Claude Haiku 3.5",
    shortName: "Haiku 3.5",
    provider: "anthropic",
  },
];

export const FALLBACK_OPENROUTER_MODELS: ModelInfo[] = [
  {
    id: "anthropic/claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    shortName: "Sonnet 4.5",
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-opus-4-5-20250918",
    name: "Claude Opus 4.5",
    shortName: "Opus 4.5",
    provider: "anthropic",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    shortName: "GPT-4o",
    provider: "openai",
  },
  {
    id: "openai/gpt-5.2",
    name: "GPT-5.2",
    shortName: "GPT-5.2",
    provider: "openai",
  },
  {
    id: "google/gemini-3.1",
    name: "Gemini 3.1",
    shortName: "Gemini 3.1",
    provider: "google",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    shortName: "Gemini 2.5 Pro",
    provider: "google",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    shortName: "Gemini 2.5 Flash",
    provider: "google",
  },
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    shortName: "Kimi K2.5",
    provider: "moonshotai",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    shortName: "DeepSeek V3",
    provider: "deepseek",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    shortName: "Llama 3.3 70B",
    provider: "meta-llama",
  },
];

/** @deprecated Use FALLBACK_ANTHROPIC_MODELS — kept for backward compat */
export const AVAILABLE_MODELS = FALLBACK_ANTHROPIC_MODELS;

/* ── API Fetch — Anthropic ───────────────────── */

interface AnthropicModelResponse {
  data: Array<{
    id: string;
    display_name: string;
    type: string;
  }>;
  has_more: boolean;
  last_id?: string;
}

export async function fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  const models: ModelInfo[] = [];
  let afterId: string | undefined;

  do {
    const url = new URL("https://api.anthropic.com/v1/models");
    url.searchParams.set("limit", "100");
    if (afterId) url.searchParams.set("after_id", afterId);

    const res = await fetch(url.toString(), {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!res.ok) {
      throw new Error(`Anthropic models API returned ${res.status}`);
    }

    const data: AnthropicModelResponse = await res.json();

    for (const m of data.data) {
      models.push({
        id: m.id,
        name: m.display_name || m.id,
        shortName: deriveShortName(m.display_name || m.id),
        provider: "anthropic",
      });
    }

    if (data.has_more && data.last_id) {
      afterId = data.last_id;
    } else {
      break;
    }
  } while (true);

  return models;
}

/* ── API Fetch — OpenRouter ──────────────────── */

const CURATED_PROVIDERS = [
  "anthropic",
  "openai",
  "google",
  "moonshotai",
  "meta-llama",
  "mistralai",
  "deepseek",
  "cohere",
];

// Per-provider caps (providers not listed are uncapped within the global limit)
const PROVIDER_MAX: Record<string, number> = {
  openai: 2,
};

const MAX_OPENROUTER_MODELS = 30;

interface OpenRouterModelResponse {
  data: Array<{
    id: string;
    name: string;
    context_length?: number;
    pricing?: {
      prompt?: string;
      completion?: string;
    };
  }>;
}

export async function fetchOpenRouterModels(): Promise<ModelInfo[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) {
    throw new Error(`OpenRouter models API returned ${res.status}`);
  }

  const data: OpenRouterModelResponse = await res.json();

  const filtered = data.data.filter((m) =>
    CURATED_PROVIDERS.some((prefix) => m.id.startsWith(`${prefix}/`)),
  );

  const providerOrder = new Map(CURATED_PROVIDERS.map((p, i) => [p, i]));

  filtered.sort((a, b) => {
    const provA = a.id.split("/")[0];
    const provB = b.id.split("/")[0];
    const orderA = providerOrder.get(provA) ?? 99;
    const orderB = providerOrder.get(provB) ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (b.context_length ?? 0) - (a.context_length ?? 0);
  });

  // Enforce per-provider caps (sorted list means we keep the top N per provider)
  const providerCounts = new Map<string, number>();
  const capped = filtered.filter((m) => {
    const prov = m.id.split("/")[0];
    const max = PROVIDER_MAX[prov];
    if (max === undefined) return true;
    const count = (providerCounts.get(prov) ?? 0) + 1;
    providerCounts.set(prov, count);
    return count <= max;
  });

  return capped.slice(0, MAX_OPENROUTER_MODELS).map((m) => {
    const provider = m.id.split("/")[0];

    const promptPrice = m.pricing?.prompt
      ? `$${(parseFloat(m.pricing.prompt) * 1_000_000).toFixed(2)}`
      : undefined;
    const completionPrice = m.pricing?.completion
      ? `$${(parseFloat(m.pricing.completion) * 1_000_000).toFixed(2)}`
      : undefined;

    return {
      id: m.id,
      name: m.name,
      shortName: deriveShortName(m.name),
      provider,
      contextLength: m.context_length,
      inputPrice: promptPrice,
      outputPrice: completionPrice,
    };
  });
}

/* ── Helpers ──────────────────────────────────── */

function deriveShortName(name: string): string {
  return name
    .replace(/^(Anthropic|OpenAI|Google|Meta|Mistral|DeepSeek|Cohere)\s*[:·\-]?\s*/i, "")
    .trim();
}

/* ── In-Memory Cache ─────────────────────────── */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  models: ModelInfo[];
  source: "api" | "fallback";
  fetchedAt: number;
}

const modelCache = new Map<string, CacheEntry>();

export async function getAvailableModels(
  provider: ActiveProvider,
): Promise<AvailableModelsResult> {
  const cached = modelCache.get(provider);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return { models: cached.models, source: cached.source };
  }

  try {
    let models: ModelInfo[];

    if (provider === "anthropic") {
      const apiKey = await getAnthropicApiKey();
      if (!apiKey) {
        return { models: FALLBACK_ANTHROPIC_MODELS, source: "fallback" };
      }
      models = await fetchAnthropicModels(apiKey);
      if (models.length === 0) {
        return { models: FALLBACK_ANTHROPIC_MODELS, source: "fallback" };
      }
    } else {
      models = await fetchOpenRouterModels();
      if (models.length === 0) {
        return { models: FALLBACK_OPENROUTER_MODELS, source: "fallback" };
      }
    }

    modelCache.set(provider, {
      models,
      source: "api",
      fetchedAt: Date.now(),
    });

    return { models, source: "api" };
  } catch (err) {
    console.error(`Failed to fetch ${provider} models:`, err);
    const fallback =
      provider === "anthropic"
        ? FALLBACK_ANTHROPIC_MODELS
        : FALLBACK_OPENROUTER_MODELS;
    return { models: fallback, source: "fallback" };
  }
}

export function invalidateModelCache(provider?: ActiveProvider): void {
  if (provider) {
    modelCache.delete(provider);
  } else {
    modelCache.clear();
  }
}

/* ── Validation ──────────────────────────────── */

export async function isValidModelId(
  id: string,
  provider: ActiveProvider,
): Promise<boolean> {
  const { models } = await getAvailableModels(provider);
  return models.some((m) => m.id === id);
}

export function getModelName(id: string): string {
  const all = [...FALLBACK_ANTHROPIC_MODELS, ...FALLBACK_OPENROUTER_MODELS];
  return all.find((m) => m.id === id)?.name ?? id;
}

/* ── Model Resolution ────────────────────────── */

/**
 * Resolve the default model for an org.
 * Checks: org DB → AI_MODEL env → hardcoded default.
 * Does NOT check per-agent modelOverride (that's handled by callers).
 * Does NOT validate the model ID — accepts whatever the admin saved.
 */
export async function resolveDefaultModel(orgId?: string): Promise<string> {
  if (orgId) {
    const [org] = await db
      .select({ aiModel: organizations.aiModel })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (org?.aiModel) {
      return org.aiModel;
    }
  }

  const envModel = process.env.AI_MODEL;
  if (envModel) {
    return envModel;
  }

  return DEFAULT_MODEL_ID;
}
