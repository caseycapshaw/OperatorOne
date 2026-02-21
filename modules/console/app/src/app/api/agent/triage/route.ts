import { NextResponse } from "next/server";
import { triageEntity } from "@/lib/ai/triage";
import { getChatSessionContext } from "@/lib/ai/session-context";

export async function POST(req: Request) {
  try {
    const internalToken = req.headers.get("x-internal-token");
    const isInternalCall =
      !!process.env.INTERNAL_API_TOKEN &&
      internalToken === process.env.INTERNAL_API_TOKEN;

    let orgId: string;

    if (isInternalCall) {
      // Trusted internal caller (e.g., server actions) — accept orgId from body
      const body = await req.json();
      const { entityType, entityId, orgId: bodyOrgId } = body;

      if (!entityType || !entityId || !bodyOrgId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      if (entityType !== "request" && entityType !== "ticket") {
        return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
      }

      orgId = bodyOrgId;

      triageEntity({ entityType, entityId, orgId }).catch((err) => {
        console.error("Background triage failed:", err);
      });

      return NextResponse.json({ ok: true, status: "triage_started" });
    }

    // Session-based auth — derive orgId from authenticated user
    const ctx = await getChatSessionContext();
    if (!ctx) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (entityType !== "request" && entityType !== "ticket") {
      return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
    }

    orgId = ctx.orgId;

    triageEntity({ entityType, entityId, orgId }).catch((err) => {
      console.error("Background triage failed:", err);
    });

    return NextResponse.json({ ok: true, status: "triage_started" });
  } catch (err) {
    console.error("Triage route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
