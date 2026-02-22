/**
 * Authentik API client for setup wizard operations.
 * Uses the bootstrap token to authenticate and create OAuth2 providers.
 */

const AUTHENTIK_API_URL =
  process.env.AUTHENTIK_API_URL || "http://authentik-server:9000";

interface AuthorizationFlow {
  pk: string;
  slug: string;
  name: string;
}

interface ScopeMapping {
  pk: string;
  name: string;
  scope_name: string;
}

interface OAuth2Provider {
  pk: number;
  name: string;
  client_id: string;
  client_secret: string;
}

interface AuthentikApplication {
  pk: string;
  name: string;
  slug: string;
}

async function authentikFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${AUTHENTIK_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Authentik API error at ${path}: ${res.status} ${body}`);
    throw new Error(
      `Authentik API request failed (status ${res.status})`,
    );
  }

  return res.json() as Promise<T>;
}

/**
 * Authenticate with Authentik using the bootstrap token.
 * Requires AUTHENTIK_BOOTSTRAP_TOKEN env var to be set.
 */
export async function authenticateWithBootstrap(): Promise<string> {
  const bootstrapToken = process.env.AUTHENTIK_BOOTSTRAP_TOKEN;
  if (!bootstrapToken) {
    throw new Error(
      "AUTHENTIK_BOOTSTRAP_TOKEN environment variable is required",
    );
  }

  // Verify the token works
  const res = await fetch(`${AUTHENTIK_API_URL}/api/v3/core/users/me/`, {
    headers: { Authorization: `Bearer ${bootstrapToken}` },
  });
  if (!res.ok) {
    console.error(`Bootstrap token verification failed: ${res.status}`);
    throw new Error("Authentik bootstrap token is invalid or expired");
  }

  return bootstrapToken;
}

/**
 * Set the Authentik admin (akadmin) password.
 * Uses the bootstrap token to authenticate, then sets the new password.
 */
export async function setAdminPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  // Get current user info to find the PK
  const me = await authentikFetch<{ user: { pk: number } }>(
    "/api/v3/core/users/me/",
    token,
  );

  // Set the new password
  await authentikFetch<void>(
    `/api/v3/core/users/${me.user.pk}/set_password/`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ password: newPassword }),
    },
  );
}

/**
 * Find the default authorization flow.
 */
export async function getAuthorizationFlow(
  token: string,
): Promise<AuthorizationFlow> {
  const data = await authentikFetch<{ results: AuthorizationFlow[] }>(
    "/api/v3/flows/instances/?designation=authorization&ordering=slug",
    token,
  );

  if (!data.results.length) {
    throw new Error("No authorization flow found in Authentik");
  }

  return data.results[0];
}

/**
 * Find the default invalidation flow (required by Authentik 2024.12+).
 */
export async function getInvalidationFlow(
  token: string,
): Promise<AuthorizationFlow> {
  const data = await authentikFetch<{ results: AuthorizationFlow[] }>(
    "/api/v3/flows/instances/?designation=invalidation&ordering=slug",
    token,
  );

  if (!data.results.length) {
    throw new Error("No invalidation flow found in Authentik");
  }

  return data.results[0];
}

/**
 * Get available scope mappings for OAuth2 providers.
 */
export async function getScopeMappings(
  token: string,
): Promise<ScopeMapping[]> {
  const data = await authentikFetch<{ results: ScopeMapping[] }>(
    "/api/v3/propertymappings/provider/scope/?ordering=scope_name",
    token,
  );
  return data.results;
}

/**
 * Get the first available RSA signing key (for RS256 JWTs).
 */
async function getSigningKey(token: string): Promise<string | null> {
  const data = await authentikFetch<{
    results: { pk: string; private_key_type: string }[];
  }>("/api/v3/crypto/certificatekeypairs/?has_key=true", token);

  const rsaKey = data.results.find((k) => k.private_key_type === "rsa");
  return rsaKey?.pk ?? null;
}

/**
 * Create an OAuth2 provider in Authentik.
 */
export async function createOAuth2Provider(
  token: string,
  config: {
    name: string;
    authorizationFlowPk: string;
    invalidationFlowPk: string;
    signingKeyPk: string | null;
    redirectUris: string;
    scopeMappingPks: string[];
  },
): Promise<OAuth2Provider> {
  const body: Record<string, unknown> = {
    name: config.name,
    authorization_flow: config.authorizationFlowPk,
    invalidation_flow: config.invalidationFlowPk,
    client_type: "confidential",
    redirect_uris: [{ matching_mode: "strict", url: config.redirectUris }],
    property_mappings: config.scopeMappingPks,
    access_code_validity: "minutes=1",
    access_token_validity: "minutes=5",
    refresh_token_validity: "days=30",
    sub_mode: "hashed_user_id",
    include_claims_in_id_token: true,
    issuer_mode: "per_provider",
  };
  if (config.signingKeyPk) {
    body.signing_key = config.signingKeyPk;
  }
  return authentikFetch<OAuth2Provider>(
    "/api/v3/providers/oauth2/",
    token,
    { method: "POST", body: JSON.stringify(body) },
  );
}

/**
 * Create an application in Authentik bound to a provider.
 */
export async function createApplication(
  token: string,
  config: {
    name: string;
    slug: string;
    providerPk: number;
  },
): Promise<AuthentikApplication> {
  return authentikFetch<AuthentikApplication>(
    "/api/v3/core/applications/",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        name: config.name,
        slug: config.slug,
        provider: config.providerPk,
        meta_launch_url: "",
        open_in_new_tab: false,
      }),
    },
  );
}

/**
 * Create both Console and Grafana OAuth2 providers + applications.
 * Returns the generated client credentials for each.
 */
export async function createAllProviders(
  token: string,
  domain: string,
): Promise<{
  console: { clientId: string; clientSecret: string };
  grafana: { clientId: string; clientSecret: string };
}> {
  const flow = await getAuthorizationFlow(token);
  const invalidationFlow = await getInvalidationFlow(token);
  const scopeMappings = await getScopeMappings(token);

  // Get signing key for RS256 JWTs (Auth.js requires RS256)
  const signingKey = await getSigningKey(token);

  // Filter to standard OIDC scopes: openid, profile, email
  const standardScopes = ["openid", "profile", "email"];
  const selectedMappings = scopeMappings.filter((m) =>
    standardScopes.includes(m.scope_name),
  );
  const scopePks = selectedMappings.map((m) => m.pk);

  const isLocalhost = domain.includes("localhost");
  const scheme = isLocalhost ? "http" : "https";

  // Create Console OAuth2 provider
  const consoleProvider = await createOAuth2Provider(token, {
    name: "Console",
    authorizationFlowPk: flow.pk,
    invalidationFlowPk: invalidationFlow.pk,
    signingKeyPk: signingKey,
    redirectUris: `${scheme}://console.${domain}/api/auth/callback/authentik`,
    scopeMappingPks: scopePks,
  });

  // Create Console application
  await createApplication(token, {
    name: "Console",
    slug: "console",
    providerPk: consoleProvider.pk,
  });

  // Create Grafana OAuth2 provider
  const grafanaProvider = await createOAuth2Provider(token, {
    name: "Grafana",
    authorizationFlowPk: flow.pk,
    invalidationFlowPk: invalidationFlow.pk,
    signingKeyPk: signingKey,
    redirectUris: `${scheme}://monitor.${domain}/login/generic_oauth`,
    scopeMappingPks: scopePks,
  });

  // Create Grafana application
  await createApplication(token, {
    name: "Grafana",
    slug: "grafana",
    providerPk: grafanaProvider.pk,
  });

  return {
    console: {
      clientId: consoleProvider.client_id,
      clientSecret: consoleProvider.client_secret,
    },
    grafana: {
      clientId: grafanaProvider.client_id,
      clientSecret: grafanaProvider.client_secret,
    },
  };
}
