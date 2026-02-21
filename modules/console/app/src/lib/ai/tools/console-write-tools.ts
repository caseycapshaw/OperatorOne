import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requests,
  tickets,
  requestComments,
  ticketComments,
  activityLog,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hasMinRole } from "@/lib/roles";
import type { Role } from "@/lib/ai/agents/types";

export function consoleWriteTools(orgId: string, clientId: string, role: Role) {
  return {
    create_request: tool({
      description: "Create a new request on behalf of the current user",
      inputSchema: z.object({
        title: z.string().min(1).max(500),
        description: z.string().min(1),
        category: z.enum(["general", "technical", "billing", "feature", "bug", "other"]).default("general"),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      }),
      execute: async ({ title, description, category, priority }) => {
        const [newRequest] = await db
          .insert(requests)
          .values({
            organizationId: orgId,
            clientId,
            title,
            description,
            category,
            priority,
          })
          .returning();

        await db.insert(activityLog).values({
          organizationId: orgId,
          clientId,
          type: "request_created",
          title: `New request: ${title}`,
          metadata: { requestId: newRequest.id, source: "ai_chat" },
        });

        return {
          id: newRequest.id,
          title: newRequest.title,
          status: newRequest.status,
          priority: newRequest.priority,
          category: newRequest.category,
        };
      },
    }),

    update_request_status: tool({
      description: "Update the status of a request (admin+ only)",
      inputSchema: z.object({
        requestId: z.string().uuid(),
        status: z.enum(["submitted", "under_review", "in_progress", "completed", "cancelled"]),
      }),
      execute: async ({ requestId, status }) => {
        if (!hasMinRole(role, "admin")) {
          return { error: "Insufficient permissions. Admin role required." };
        }

        const [request] = await db
          .select()
          .from(requests)
          .where(and(eq(requests.id, requestId), eq(requests.organizationId, orgId)))
          .limit(1);

        if (!request) return { error: "Request not found" };

        const [updated] = await db
          .update(requests)
          .set({ status, updatedAt: new Date() })
          .where(eq(requests.id, requestId))
          .returning();

        await db.insert(activityLog).values({
          organizationId: orgId,
          clientId,
          type: "request_updated",
          title: `Request status changed to ${status}: ${request.title}`,
          metadata: { requestId, oldStatus: request.status, newStatus: status, source: "ai_chat" },
        });

        return { id: updated.id, title: updated.title, status: updated.status };
      },
    }),

    add_comment: tool({
      description: "Add a comment to a request or ticket",
      inputSchema: z.object({
        entityId: z.string().uuid(),
        entityType: z.enum(["request", "ticket"]),
        body: z.string().min(1),
        isInternal: z.boolean().default(false),
      }),
      execute: async ({ entityId, entityType, body, isInternal }) => {
        // Only admin+ can write internal comments
        if (isInternal && !hasMinRole(role, "admin")) {
          return { error: "Insufficient permissions for internal comments." };
        }

        // Verify entity belongs to org
        if (entityType === "request") {
          const [request] = await db
            .select()
            .from(requests)
            .where(and(eq(requests.id, entityId), eq(requests.organizationId, orgId)))
            .limit(1);
          if (!request) return { error: "Request not found" };
        } else {
          const [ticket] = await db
            .select()
            .from(tickets)
            .where(and(eq(tickets.id, entityId), eq(tickets.organizationId, orgId)))
            .limit(1);
          if (!ticket) return { error: "Ticket not found" };
        }

        const [comment] = entityType === "request"
          ? await db
              .insert(requestComments)
              .values({
                requestId: entityId,
                clientId,
                authorName: "AI Assistant",
                body,
                isInternal,
              })
              .returning()
          : await db
              .insert(ticketComments)
              .values({
                ticketId: entityId,
                clientId,
                authorName: "AI Assistant",
                body,
                isInternal,
              })
              .returning();

        await db.insert(activityLog).values({
          organizationId: orgId,
          clientId,
          type: "comment_added",
          title: `AI comment on ${entityType} ${entityId}`,
          metadata: { entityId, entityType, source: "ai_chat" },
        });

        return { id: comment.id, body: comment.body, isInternal: comment.isInternal };
      },
    }),

    create_ticket: tool({
      description: "Create a new support ticket",
      inputSchema: z.object({
        title: z.string().min(1).max(500),
        description: z.string().min(1),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      }),
      execute: async ({ title, description, priority }) => {
        const [newTicket] = await db
          .insert(tickets)
          .values({
            organizationId: orgId,
            clientId,
            title,
            description,
            priority,
          })
          .returning();

        await db.insert(activityLog).values({
          organizationId: orgId,
          clientId,
          type: "ticket_created",
          title: `New ticket: ${title}`,
          metadata: { ticketId: newTicket.id, source: "ai_chat" },
        });

        return {
          id: newTicket.id,
          title: newTicket.title,
          status: newTicket.status,
          priority: newTicket.priority,
        };
      },
    }),

    update_ticket_status: tool({
      description: "Update the status of a ticket (admin+ only)",
      inputSchema: z.object({
        ticketId: z.string().uuid(),
        status: z.enum(["open", "in_progress", "waiting_on_client", "resolved", "closed"]),
      }),
      execute: async ({ ticketId, status }) => {
        if (!hasMinRole(role, "admin")) {
          return { error: "Insufficient permissions. Admin role required." };
        }

        const [ticket] = await db
          .select()
          .from(tickets)
          .where(and(eq(tickets.id, ticketId), eq(tickets.organizationId, orgId)))
          .limit(1);

        if (!ticket) return { error: "Ticket not found" };

        const updates: Record<string, unknown> = { status, updatedAt: new Date() };
        if (status === "resolved") updates.resolvedAt = new Date();

        const [updated] = await db
          .update(tickets)
          .set(updates)
          .where(eq(tickets.id, ticketId))
          .returning();

        await db.insert(activityLog).values({
          organizationId: orgId,
          clientId,
          type: "ticket_resolved",
          title: `Ticket status changed to ${status}: ${ticket.title}`,
          metadata: { ticketId, oldStatus: ticket.status, newStatus: status, source: "ai_chat" },
        });

        return { id: updated.id, title: updated.title, status: updated.status };
      },
    }),
  };
}
