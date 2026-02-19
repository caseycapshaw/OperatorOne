import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { db } from "@/lib/db";
import { agents, agentSkills } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import type { Role } from "@/lib/ai/agents/types";

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
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

  if (!body.skills || !Array.isArray(body.skills)) {
    return NextResponse.json(
      { error: "Invalid format: expected { version, skills: [...] }" },
      { status: 400 },
    );
  }

  // Get current max sortOrder
  const existing = await db
    .select({ sortOrder: agentSkills.sortOrder })
    .from(agentSkills)
    .where(eq(agentSkills.agentId, id))
    .orderBy(asc(agentSkills.sortOrder));

  let nextOrder = existing.length > 0
    ? Math.max(...existing.map((s) => s.sortOrder)) + 1
    : 0;

  const created = [];
  for (const skill of body.skills) {
    if (!skill.name || !skill.content) continue;

    const [row] = await db
      .insert(agentSkills)
      .values({
        agentId: id,
        name: skill.name,
        description: skill.description || null,
        content: skill.content,
        sortOrder: nextOrder++,
      })
      .returning();

    created.push(row);
  }

  return NextResponse.json({ imported: created.length, skills: created }, { status: 201 });
}
