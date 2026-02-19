import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isSetupComplete } from "@/lib/setup";
import { createSetupToken, verifyCsrfHeader } from "@/lib/setup-jwt";
import { markSetupInProgress } from "@/lib/setup";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Timing-safe string comparison using HMAC to normalize to fixed-length buffers.
 */
function safeCompare(a: string, b: string): boolean {
  const key = "rate-compare-key";
  const hmacA = createHmac("sha256", key).update(a).digest();
  const hmacB = createHmac("sha256", key).update(b).digest();
  return timingSafeEqual(hmacA, hmacB);
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  // Block if setup already completed
  const complete = await isSetupComplete();
  if (complete) {
    return NextResponse.json(
      { error: "Setup already completed" },
      { status: 403 },
    );
  }

  // CSRF check
  if (!verifyCsrfHeader(request)) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 403 },
    );
  }

  // Rate limiting: 5 attempts per 15-minute window
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const body = await request.json();
  const { password } = body as { password?: string };

  if (!password) {
    return NextResponse.json(
      { error: "Password required" },
      { status: 400 },
    );
  }

  const bootstrapPassword = process.env.AUTHENTIK_BOOTSTRAP_PASSWORD;
  if (!bootstrapPassword) {
    console.error("AUTHENTIK_BOOTSTRAP_PASSWORD environment variable is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  if (!safeCompare(password, bootstrapPassword)) {
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 },
    );
  }

  await markSetupInProgress();
  const token = await createSetupToken();

  return NextResponse.json({ token });
}
