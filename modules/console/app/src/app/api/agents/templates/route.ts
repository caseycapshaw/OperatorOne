import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { db } from "@/lib/db";
import { agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { TEMPLATE_AGENTS } from "@/lib/ai/agents/predefined";
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

  // Get already-installed template slugs for this org
  const installed = await db
    .select({ slug: agents.slug })
    .from(agents)
    .where(
      and(
        eq(agents.organizationId, ctx.orgId),
        eq(agents.category, "template"),
      ),
    );

  const installedSlugs = new Set(installed.map((a) => a.slug));

  const templates = TEMPLATE_AGENTS.map((t) => ({
    ...t,
    installed: installedSlugs.has(t.slug),
  }));

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const { slug } = await req.json();
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const template = TEMPLATE_AGENTS.find((t) => t.slug === slug);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Check if already installed
  const [existing] = await db
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.organizationId, ctx.orgId),
        eq(agents.slug, slug),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Template already installed" },
      { status: 409 },
    );
  }

  const [agent] = await db
    .insert(agents)
    .values({
      organizationId: ctx.orgId,
      createdBy: ctx.clientId,
      slug: template.slug,
      name: template.name,
      description: template.description,
      instructions: template.instructions,
      minRole: template.minRole,
      icon: template.icon || null,
      color: template.color || null,
      maxSteps: template.maxSteps,
      allowedTools: template.allowedTools,
      category: "template",
    })
    .returning();

  return NextResponse.json(agent, { status: 201 });
}
