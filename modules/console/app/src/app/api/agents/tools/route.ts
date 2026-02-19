import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { getToolCatalog } from "@/lib/ai/agents/tool-registry";

export async function GET() {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const catalog = getToolCatalog(ctx.role);
  return NextResponse.json(catalog);
}
