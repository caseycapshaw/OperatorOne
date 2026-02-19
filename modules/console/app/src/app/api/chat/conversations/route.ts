import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { db } from "@/lib/db";
import { conversations } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.organizationId, ctx.orgId),
        eq(conversations.clientId, ctx.clientId),
      ),
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(50);

  return NextResponse.json(results);
}

export async function POST(req: Request) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json();

  const [conv] = await db
    .insert(conversations)
    .values({
      organizationId: ctx.orgId,
      clientId: ctx.clientId,
      title: title || "New conversation",
    })
    .returning();

  return NextResponse.json(conv);
}
