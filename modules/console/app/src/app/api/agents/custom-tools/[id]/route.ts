import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { db } from "@/lib/db";
import { customTools } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hasMinRole } from "@/lib/roles";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [tool] = await db
    .select()
    .from(customTools)
    .where(and(eq(customTools.id, id), eq(customTools.organizationId, ctx.orgId)))
    .limit(1);

  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(tool);
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
    .from(customTools)
    .where(and(eq(customTools.id, id), eq(customTools.organizationId, ctx.orgId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.inputSchema !== undefined) updates.inputSchema = body.inputSchema;
  if (body.httpEndpoint !== undefined) updates.httpEndpoint = body.httpEndpoint;
  if (body.httpMethod !== undefined) updates.httpMethod = body.httpMethod;
  if (body.httpHeaders !== undefined) updates.httpHeaders = body.httpHeaders;
  if (body.bodyTemplate !== undefined) updates.bodyTemplate = body.bodyTemplate;
  if (body.minRole !== undefined) updates.minRole = body.minRole;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const [updated] = await db
    .update(customTools)
    .set(updates)
    .where(eq(customTools.id, id))
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
    .from(customTools)
    .where(and(eq(customTools.id, id), eq(customTools.organizationId, ctx.orgId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(customTools)
    .where(and(eq(customTools.id, id), eq(customTools.organizationId, ctx.orgId)));

  return NextResponse.json({ ok: true });
}
