import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { db } from "@/lib/db";
import { agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { SYSTEM_AGENTS } from "@/lib/ai/agents/predefined";
import { ALL_TOOL_NAMES } from "@/lib/ai/agents/tool-registry";
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

export async function GET() {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // DB agents for this org
  const dbAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.organizationId, ctx.orgId));

  const dbSlugs = new Set(dbAgents.map((a) => a.slug));

  // System agents (filtered by role), excluding any overridden by DB records
  const systemAgents = SYSTEM_AGENTS.filter(
    (a) => hasMinRole(ctx.role, a.minRole) && !dbSlugs.has(a.slug),
  ).map((a) => ({ ...a, organizationId: ctx.orgId, isActive: true }));

  const filteredDb = dbAgents.filter((a) =>
    hasMinRole(ctx.role, a.minRole as Role),
  );

  return NextResponse.json([...systemAgents, ...filteredDb]);
}

export async function POST(req: Request) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const body = await req.json();
  const {
    slug,
    name,
    description,
    instructions,
    minRole,
    icon,
    color,
    modelOverride,
    maxSteps,
    allowedTools,
    toolSettings,
  } = body;

  if (!slug || !name || !description || !instructions) {
    return NextResponse.json(
      { error: "Missing required fields: slug, name, description, instructions" },
      { status: 400 },
    );
  }

  // Validate allowedTools
  if (allowedTools && Array.isArray(allowedTools)) {
    const invalid = allowedTools.filter(
      (t: string) => !ALL_TOOL_NAMES.includes(t),
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Unknown tools: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }
  }

  const category = body.category === "system" ? "system" : body.category === "template" ? "template" : "custom";

  const [agent] = await db
    .insert(agents)
    .values({
      organizationId: ctx.orgId,
      createdBy: ctx.clientId,
      slug,
      name,
      description,
      instructions,
      minRole: minRole || "viewer",
      icon: icon || null,
      color: color || null,
      modelOverride: modelOverride || null,
      maxSteps: maxSteps || 5,
      allowedTools: allowedTools || [],
      toolSettings: toolSettings || {},
      category,
    })
    .returning();

  return NextResponse.json(agent, { status: 201 });
}
