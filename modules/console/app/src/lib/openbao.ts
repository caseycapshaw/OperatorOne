/**
 * OpenBao HTTP client for server-side secrets management.
 * Communicates with OpenBao via KV v2 API using a service token.
 */

const OPENBAO_ADDR = process.env.OPENBAO_ADDR || "http://openbao:8200";
const OPENBAO_TOKEN = process.env.OPENBAO_SERVICE_TOKEN || "";

interface KVReadResponse {
  data: {
    data: Record<string, string>;
    metadata: {
      created_time: string;
      version: number;
    };
  };
}

interface KVListResponse {
  data: {
    keys: string[];
  };
}

async function baoFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${OPENBAO_ADDR}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "X-Vault-Token": OPENBAO_TOKEN,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function readSecret(path: string): Promise<Record<string, string> | null> {
  try {
    const res = await baoFetch(`/v1/secret/data/${path}`);
    if (!res.ok) return null;
    const body = (await res.json()) as KVReadResponse;
    return body.data.data;
  } catch {
    return null;
  }
}

export async function writeSecret(path: string, data: Record<string, string>): Promise<boolean> {
  try {
    const res = await baoFetch(`/v1/secret/data/${path}`, {
      method: "POST",
      body: JSON.stringify({ data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteSecret(path: string): Promise<boolean> {
  try {
    const res = await baoFetch(`/v1/secret/metadata/${path}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listSecrets(path: string): Promise<string[]> {
  try {
    const res = await baoFetch(`/v1/secret/metadata/${path}?list=true`);
    if (!res.ok) return [];
    const body = (await res.json()) as KVListResponse;
    return body.data.keys;
  } catch {
    return [];
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(
      `${OPENBAO_ADDR}/v1/sys/health?standbyok=true`,
      { signal: AbortSignal.timeout(3000), cache: "no-store" },
    );
    return res.ok;
  } catch {
    return false;
  }
}
