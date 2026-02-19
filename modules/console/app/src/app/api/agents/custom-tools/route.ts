import { NextResponse } from "next/server";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { db } from "@/lib/db";
import { customTools } from "@/db/schema";
import { eq } from "drizzle-orm";
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

  const tools = await db
    .select()
    .from(customTools)
    .where(eq(customTools.organizationId, ctx.orgId));

  return NextResponse.json(tools);
}

export async function POST(req: Request) {
  const ctx = await getChatSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    slug,
    description,
    inputSchema,
    httpEndpoint,
    httpMethod,
    httpHeaders,
    bodyTemplate,
    minRole,
  } = body;

  if (!name || !slug || !description || !inputSchema || !httpEndpoint) {
    return NextResponse.json(
      { error: "Missing required fields: name, slug, description, inputSchema, httpEndpoint" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(customTools)
    .values({
      organizationId: ctx.orgId,
      createdBy: ctx.clientId,
      name,
      slug,
      description,
      inputSchema,
      httpEndpoint,
      httpMethod: httpMethod || "POST",
      httpHeaders: httpHeaders || {},
      bodyTemplate: bodyTemplate || null,
      minRole: minRole || "admin",
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
