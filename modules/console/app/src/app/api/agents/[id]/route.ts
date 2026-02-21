import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { db } from "@/lib/db";
import { agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ALL_TOOL_NAMES } from "@/lib/ai/agents/tool-registry";
import { hasMinRole } from "@/lib/roles";
import type { Role } from "@/lib/ai/agents/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.organizationId, ctx.orgId)))
    .limit(1);

  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(agent);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const { id } = await params;

  const [existing] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.organizationId, ctx.orgId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.instructions !== undefined) updates.instructions = body.instructions;
  if (body.minRole !== undefined) updates.minRole = body.minRole;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.color !== undefined) updates.color = body.color;
  if (body.modelOverride !== undefined) updates.modelOverride = body.modelOverride;
  if (body.maxSteps !== undefined) updates.maxSteps = body.maxSteps;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  if (body.toolSettings !== undefined) updates.toolSettings = body.toolSettings;

  if (body.allowedTools !== undefined) {
    const invalid = (body.allowedTools as string[]).filter(
      (t) => !ALL_TOOL_NAMES.includes(t),
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Unknown tools: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }
    updates.allowedTools = body.allowedTools;
  }

  const [updated] = await db
    .update(agents)
    .set(updates)
    .where(eq(agents.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const { id } = await params;

  const [existing] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.organizationId, ctx.orgId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.isSystem) {
    return NextResponse.json(
      { error: "Cannot delete system agents" },
      { status: 403 },
    );
  }

  await db
    .delete(agents)
    .where(and(eq(agents.id, id), eq(agents.organizationId, ctx.orgId)));

  return NextResponse.json({ ok: true });
}
