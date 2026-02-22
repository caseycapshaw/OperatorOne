/**
 * OpenBao initialization from Node.js.
 * Ports the logic from scripts/init-openbao.sh for use in the setup wizard.
 * The bash script remains for standalone use.
 */

const OPENBAO_ADDR = process.env.OPENBAO_ADDR || "http://openbao:8200";

interface InitResult {
  unsealKey: string;
  rootToken: string;
  serviceToken: string;
}

/**
 * Check whether OpenBao has already been initialized.
 */
export async function isOpenBaoInitialized(): Promise<boolean> {
  try {
    const res = await fetch(`${OPENBAO_ADDR}/v1/sys/init`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { initialized: boolean };
    return data.initialized;
  } catch {
    return false;
  }
}

/**
 * Full OpenBao initialization sequence:
 *   1. Initialize with 1 key share / 1 threshold
 *   2. Unseal with the returned key
 *   3. Enable KV v2 secrets engine at secret/
 *   4. Create console-admin policy
 *   5. Create long-lived service token
 *
 * Returns unseal key, root token, and service token for storage.
 * Throws if any step fails.
 */
export async function initializeOpenBao(): Promise<InitResult> {
  // 1. Initialize
  const initRes = await fetch(`${OPENBAO_ADDR}/v1/sys/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret_shares: 1, secret_threshold: 1 }),
    cache: "no-store",
  });

  if (!initRes.ok) {
    const body = await initRes.text();
    throw new Error(`OpenBao init failed (${initRes.status}): ${body}`);
  }

  const initData = (await initRes.json()) as {
    keys: string[];
    root_token: string;
  };

  const unsealKey = initData.keys[0];
  const rootToken = initData.root_token;

  if (!unsealKey || !rootToken) {
    throw new Error("OpenBao init returned empty keys or root token");
  }

  // 2. Unseal
  const unsealRes = await fetch(`${OPENBAO_ADDR}/v1/sys/unseal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: unsealKey }),
    cache: "no-store",
  });

  if (!unsealRes.ok) {
    throw new Error(`OpenBao unseal failed (${unsealRes.status})`);
  }

  const authHeaders = {
    "X-Vault-Token": rootToken,
    "Content-Type": "application/json",
  };

  // 3. Enable KV v2 at secret/
  const mountRes = await fetch(`${OPENBAO_ADDR}/v1/sys/mounts/secret`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ type: "kv", options: { version: "2" } }),
    cache: "no-store",
  });

  if (!mountRes.ok) {
    const body = await mountRes.text();
    // 400 = already mounted, which is fine
    if (mountRes.status !== 400) {
      throw new Error(
        `OpenBao mount KV v2 failed (${mountRes.status}): ${body}`,
      );
    }
  }

  // 4. Create console-admin policy
  const policy = [
    'path "secret/data/*" { capabilities = ["create", "read", "update", "delete", "list"] }',
    'path "secret/metadata/*" { capabilities = ["list", "read", "delete"] }',
    'path "sys/health" { capabilities = ["read"] }',
  ].join("\n");

  const policyRes = await fetch(
    `${OPENBAO_ADDR}/v1/sys/policies/acl/console-admin`,
    {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ policy }),
      cache: "no-store",
    },
  );

  if (!policyRes.ok) {
    throw new Error(`OpenBao policy creation failed (${policyRes.status})`);
  }

  // 5. Create long-lived service token (1 year TTL, renewable)
  const tokenRes = await fetch(`${OPENBAO_ADDR}/v1/auth/token/create`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      policies: ["console-admin"],
      ttl: "8760h",
      renewable: true,
      display_name: "console-service",
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    throw new Error(
      `OpenBao service token creation failed (${tokenRes.status})`,
    );
  }

  const tokenData = (await tokenRes.json()) as {
    auth: { client_token: string };
  };

  const serviceToken = tokenData.auth.client_token;
  if (!serviceToken) {
    throw new Error("OpenBao returned empty service token");
  }

  return { unsealKey, rootToken, serviceToken };
}

/**
 * Write a secret to OpenBao KV v2 using a specific token.
 * Unlike the openbao.ts writeSecret which uses the process env token,
 * this accepts the token directly — needed during setup before env is updated.
 */
export async function writeSecretWithToken(
  token: string,
  path: string,
  data: Record<string, string>,
): Promise<boolean> {
  try {
    const res = await fetch(`${OPENBAO_ADDR}/v1/secret/data/${path}`, {
      method: "POST",
      headers: {
        "X-Vault-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
