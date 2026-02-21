import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { db } from "@/lib/db";
import { agents, agentSkills } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { hasMinRole } from "@/lib/roles";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify agent belongs to org
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.organizationId, ctx.orgId)))
    .limit(1);

  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const skills = await db
    .select()
    .from(agentSkills)
    .where(eq(agentSkills.agentId, id))
    .orderBy(asc(agentSkills.sortOrder));

  return NextResponse.json(skills);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const { id } = await params;

  // Verify agent belongs to org
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.organizationId, ctx.orgId)))
    .limit(1);

  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, content } = body;

  if (!name || !content) {
    return NextResponse.json(
      { error: "Missing required fields: name, content" },
      { status: 400 },
    );
  }

  // Get max sortOrder for this agent
  const existing = await db
    .select({ sortOrder: agentSkills.sortOrder })
    .from(agentSkills)
    .where(eq(agentSkills.agentId, id))
    .orderBy(asc(agentSkills.sortOrder));

  const nextOrder = existing.length > 0
    ? Math.max(...existing.map((s) => s.sortOrder)) + 1
    : 0;

  const [skill] = await db
    .insert(agentSkills)
    .values({
      agentId: id,
      name,
      description: description || null,
      content,
      sortOrder: nextOrder,
    })
    .returning();

  return NextResponse.json(skill, { status: 201 });
}
