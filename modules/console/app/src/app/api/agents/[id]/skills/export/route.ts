import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { db } from "@/lib/db";
import { agents, agentSkills } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

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
    .where(and(eq(agentSkills.agentId, id), eq(agentSkills.isActive, true)))
    .orderBy(asc(agentSkills.sortOrder));

  const exportData = {
    version: 1,
    skills: skills.map((s) => ({
      name: s.name,
      description: s.description,
      content: s.content,
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${agent.slug}-skills.json"`,
    },
  });
}
