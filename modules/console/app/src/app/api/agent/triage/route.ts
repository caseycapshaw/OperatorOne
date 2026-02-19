import { NextResponse } from "next/server";
import { triageEntity } from "@/lib/ai/triage";

export async function POST(req: Request) {
  // This endpoint is called internally by server actions (fire-and-forget).
  // In production, add an internal auth check (e.g., shared secret header).
  try {
    const { entityType, entityId, orgId } = await req.json();

    if (!entityType || !entityId || !orgId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (entityType !== "request" && entityType !== "ticket") {
      return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
    }

    // Fire-and-forget: we don't await the full triage, just kick it off
    // Using waitUntil-like pattern for edge compatibility
    triageEntity({ entityType, entityId, orgId }).catch((err) => {
      console.error("Background triage failed:", err);
    });

    return NextResponse.json({ ok: true, status: "triage_started" });
  } catch (err) {
    console.error("Triage route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
