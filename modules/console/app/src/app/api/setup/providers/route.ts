import { NextResponse } from "next/server";
import { verifySetupAuth, verifyCsrfHeader } from "@/lib/setup-jwt";
import {
  isSetupComplete,
  storeProviderCredentials,
  getProviderCredentials,
} from "@/lib/setup";
import {
  authenticateWithBootstrap,
  createAllProviders,
} from "@/lib/authentik-client";

function maskSecret(s: string): string {
  return s.length > 8 ? s.slice(0, 4) + "..." + s.slice(-4) : "****";
}

export async function POST(request: Request) {
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

  const authorized = await verifySetupAuth(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If providers were already created (e.g. page refresh), return stored credentials
  const existing = await getProviderCredentials();
  if (existing) {
    return NextResponse.json({
      success: true,
      console: {
        clientId: existing.console.clientId,
        clientSecretMasked: maskSecret(existing.console.clientSecret),
      },
      grafana: {
        clientId: existing.grafana.clientId,
        clientSecretMasked: maskSecret(existing.grafana.clientSecret),
      },
    });
  }

  // Require DOMAIN env var — do not derive from Host header
  const domain = process.env.DOMAIN;
  if (!domain) {
    console.error("DOMAIN environment variable is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    // Authenticate with Authentik using bootstrap token
    const authentikToken = await authenticateWithBootstrap();

    // Create OAuth2 providers and applications
    const providers = await createAllProviders(authentikToken, domain);

    // Store full credentials server-side in DB
    await storeProviderCredentials(providers);

    // Return only client IDs + masked secrets to browser
    return NextResponse.json({
      success: true,
      console: {
        clientId: providers.console.clientId,
        clientSecretMasked: maskSecret(providers.console.clientSecret),
      },
      grafana: {
        clientId: providers.grafana.clientId,
        clientSecretMasked: maskSecret(providers.grafana.clientSecret),
      },
    });
  } catch (error) {
    console.error("Provider creation failed:", error);
    return NextResponse.json(
      { error: "Provider creation failed" },
      { status: 500 },
    );
  }
}
