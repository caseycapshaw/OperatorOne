import { NextResponse } from "next/server";
import { isSetupComplete } from "@/lib/setup";

export async function GET(request: Request) {
  // Reject cross-origin browser requests
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const setupComplete = await isSetupComplete();
  return NextResponse.json(
    { setupComplete },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
