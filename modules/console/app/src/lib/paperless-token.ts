/**
 * Paperless-ngx API token generation.
 * Uses the admin credentials from env to obtain an API token
 * via the Paperless token endpoint.
 */

const PAPERLESS_URL =
  process.env.PAPERLESS_API_URL?.replace(/\/api\/?$/, "") ||
  "http://op1-paperless:8000";

/**
 * Generate a Paperless-ngx API token using admin credentials.
 * Retries up to 3 times with 5s delay since Paperless may still be booting.
 *
 * Returns the token string, or null if Paperless is not available.
 */
export async function generatePaperlessApiToken(): Promise<string | null> {
  const username = process.env.PAPERLESS_ADMIN_USER || "admin";
  const password = process.env.PAPERLESS_ADMIN_PASSWORD;

  if (!password) {
    console.warn(
      "PAPERLESS_ADMIN_PASSWORD not set — skipping Paperless token generation",
    );
    return null;
  }

  const maxRetries = 3;
  const retryDelayMs = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${PAPERLESS_URL}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });

      if (res.ok) {
        const data = (await res.json()) as { token: string };
        return data.token;
      }

      console.warn(
        `Paperless token request failed (attempt ${attempt}/${maxRetries}): ${res.status}`,
      );
    } catch (err) {
      console.warn(
        `Paperless token request error (attempt ${attempt}/${maxRetries}):`,
        err instanceof Error ? err.message : err,
      );
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  return null;
}
