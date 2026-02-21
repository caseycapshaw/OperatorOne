"use server";

import { db } from "@/lib/db";
import { getCurrentClient, getCurrentOrgId } from "@/lib/session";
import {
  requests,
  requestComments,
  tickets,
  ticketComments,
  activityLog,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─── Triage Helper ──────────────────────────

function triggerTriage(entityType: "request" | "ticket", entityId: string, orgId: string) {
  // Non-blocking fetch to the triage endpoint (internal service-to-service call)
  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.INTERNAL_API_TOKEN) {
    headers["x-internal-token"] = process.env.INTERNAL_API_TOKEN;
  }
  fetch(`${baseUrl}/api/agent/triage`, {
    method: "POST",
    headers,
    body: JSON.stringify({ entityType, entityId, orgId }),
  }).catch((err) => {
    console.error("Failed to trigger triage:", err);
  });
}

// ─── Requests ───────────────────────────────

export async function createRequest(formData: FormData) {
  const client = await getCurrentClient();
  if (!client) redirect("/login");

  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization found");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as
    | "general"
    | "technical"
    | "billing"
    | "feature"
    | "bug"
    | "other";
  const priority = formData.get("priority") as
    | "low"
    | "medium"
    | "high"
    | "urgent";

  const [newRequest] = await db
    .insert(requests)
    .values({
      organizationId: orgId,
      clientId: client.id,
      title,
      description,
      category: category || "general",
      priority: priority || "medium",
    })
    .returning();

  await db.insert(activityLog).values({
    organizationId: orgId,
    clientId: client.id,
    type: "request_created",
    title: `New request: ${title}`,
    metadata: { requestId: newRequest.id },
  });

  // Fire-and-forget AI triage
  triggerTriage("request", newRequest.id, orgId);

  revalidatePath("/dashboard/requests");
  revalidatePath("/dashboard");
  redirect(`/dashboard/requests/${newRequest.id}`);
}

export async function addRequestComment(formData: FormData) {
  const client = await getCurrentClient();
  if (!client) redirect("/login");

  const requestId = formData.get("requestId") as string;
  const body = formData.get("body") as string;

  if (!body?.trim()) return;

  // Verify the request belongs to the client's org
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization found");

  const [request] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, requestId), eq(requests.organizationId, orgId)))
    .limit(1);

  if (!request) throw new Error("Request not found");

  await db.insert(requestComments).values({
    requestId,
    clientId: client.id,
    authorName: client.name,
    body: body.trim(),
  });

  await db.insert(activityLog).values({
    organizationId: orgId,
    clientId: client.id,
    type: "comment_added",
    title: `Comment on: ${request.title}`,
    metadata: { requestId },
  });

  revalidatePath(`/dashboard/requests/${requestId}`);
}

// ─── Tickets ────────────────────────────────

export async function createTicket(formData: FormData) {
  const client = await getCurrentClient();
  if (!client) redirect("/login");

  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization found");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as
    | "low"
    | "medium"
    | "high"
    | "critical";

  const [newTicket] = await db
    .insert(tickets)
    .values({
      organizationId: orgId,
      clientId: client.id,
      title,
      description,
      priority: priority || "medium",
    })
    .returning();

  await db.insert(activityLog).values({
    organizationId: orgId,
    clientId: client.id,
    type: "ticket_created",
    title: `New ticket: ${title}`,
    metadata: { ticketId: newTicket.id },
  });

  // Fire-and-forget AI triage
  triggerTriage("ticket", newTicket.id, orgId);

  revalidatePath("/dashboard/tickets");
  revalidatePath("/dashboard");
  redirect(`/dashboard/tickets/${newTicket.id}`);
}

export async function addTicketComment(formData: FormData) {
  const client = await getCurrentClient();
  if (!client) redirect("/login");

  const ticketId = formData.get("ticketId") as string;
  const body = formData.get("body") as string;

  if (!body?.trim()) return;

  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization found");

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.organizationId, orgId)))
    .limit(1);

  if (!ticket) throw new Error("Ticket not found");

  await db.insert(ticketComments).values({
    ticketId,
    clientId: client.id,
    authorName: client.name,
    body: body.trim(),
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
}
