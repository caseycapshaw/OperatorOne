import { SignJWT, jwtVerify } from "jose";

const ISSUER = "op1-setup";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET environment variable is required for setup token signing",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSetupToken(): Promise<string> {
  return new SignJWT({ purpose: "setup" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecret());
}

export async function verifySetupToken(
  token: string,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
    });
    return payload.purpose === "setup";
  } catch {
    return false;
  }
}

/**
 * Extract and verify the setup JWT from an Authorization header.
 * Returns true if valid, false otherwise.
 */
export async function verifySetupAuth(
  request: Request,
): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return verifySetupToken(token);
}

/**
 * Verify CSRF protection header is present.
 * Rejects requests that don't include the custom X-Setup-Request header.
 */
export function verifyCsrfHeader(request: Request): boolean {
  return request.headers.get("x-setup-request") === "1";
}
