import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { db } from "@/lib/db";
import { agents, agentSkills } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hasMinRole } from "@/lib/roles";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const { id, skillId } = await params;

  // Verify agent belongs to org
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.organizationId, ctx.orgId)))
    .limit(1);

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const [existing] = await db
    .select()
    .from(agentSkills)
    .where(and(eq(agentSkills.id, skillId), eq(agentSkills.agentId, id)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.content !== undefined) updates.content = body.content;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  const [updated] = await db
    .update(agentSkills)
    .set(updates)
    .where(eq(agentSkills.id, skillId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const { id, skillId } = await params;

  // Verify agent belongs to org
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.organizationId, ctx.orgId)))
    .limit(1);

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  await db
    .delete(agentSkills)
    .where(and(eq(agentSkills.id, skillId), eq(agentSkills.agentId, id)));

  return NextResponse.json({ ok: true });
}
