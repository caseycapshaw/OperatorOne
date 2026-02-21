import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, getCurrentOrgId } from "@/lib/session";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { hasMinRole } from "@/lib/roles";

export async function GET() {
  try {
    const client = await requireAuth();
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      orgName: org.name,
      orgDomain: org.domain ?? "",
      orgSlug: org.slug,
      operatorName: client.name,
      operatorEmail: client.email,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  const ctx = await getChatSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasMinRole(ctx.role, "admin")) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { orgName, orgDomain, operatorName, operatorEmail } = body as {
      orgName?: string;
      orgDomain?: string;
      operatorName?: string;
      operatorEmail?: string;
    };

    // Update organization
    if (orgName || orgDomain !== undefined) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (orgName) {
        updates.name = orgName;
        updates.slug = orgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "default";
      }
      if (orgDomain !== undefined) {
        updates.domain = orgDomain || null;
      }
      await db
        .update(organizations)
        .set(updates)
        .where(eq(organizations.id, ctx.orgId));
    }

    // Update client (operator) record
    if (operatorName || operatorEmail) {
      const clientUpdates: Record<string, unknown> = { updatedAt: new Date() };
      if (operatorName) clientUpdates.name = operatorName;
      if (operatorEmail) clientUpdates.email = operatorEmail;
      await db
        .update(clients)
        .set(clientUpdates)
        .where(eq(clients.id, ctx.clientId));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}
