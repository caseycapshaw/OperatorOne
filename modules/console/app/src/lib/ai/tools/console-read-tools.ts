import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requests,
  requestComments,
  projects,
  milestones,
  tickets,
  ticketComments,
  activityLog,
} from "@/db/schema";
import { paperlessClient } from "../paperless-client";
import { eq, desc, and, sql, ilike, or } from "drizzle-orm";

export function consoleReadTools(orgId: string) {
  return {
    list_requests: tool({
      description: "List requests for the organization, optionally filtered by status",
      inputSchema: z.object({
        status: z.enum(["submitted", "under_review", "in_progress", "completed", "cancelled"]).optional(),
        limit: z.number().min(1).max(50).default(10),
      }),
      execute: async ({ status, limit }) => {
        const conditions = [eq(requests.organizationId, orgId)];
        if (status) conditions.push(eq(requests.status, status));

        const results = await db
          .select()
          .from(requests)
          .where(and(...conditions))
          .orderBy(desc(requests.createdAt))
          .limit(limit);

        return results.map((r) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          priority: r.priority,
          category: r.category,
          createdAt: r.createdAt?.toISOString(),
        }));
      },
    }),

    get_request: tool({
      description: "Get a specific request with its comments",
      inputSchema: z.object({
        requestId: z.string().uuid(),
      }),
      execute: async ({ requestId }) => {
        const [request] = await db
          .select()
          .from(requests)
          .where(and(eq(requests.id, requestId), eq(requests.organizationId, orgId)))
          .limit(1);

        if (!request) return { error: "Request not found" };

        const comments = await db
          .select()
          .from(requestComments)
          .where(eq(requestComments.requestId, requestId))
          .orderBy(requestComments.createdAt);

        return {
          ...request,
          createdAt: request.createdAt?.toISOString(),
          updatedAt: request.updatedAt?.toISOString(),
          comments: comments.map((c) => ({
            id: c.id,
            authorName: c.authorName,
            body: c.body,
            isInternal: c.isInternal,
            createdAt: c.createdAt?.toISOString(),
          })),
        };
      },
    }),

    list_projects: tool({
      description: "List projects for the organization, optionally filtered by status",
      inputSchema: z.object({
        status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
        limit: z.number().min(1).max(50).default(10),
      }),
      execute: async ({ status, limit }) => {
        const conditions = [eq(projects.organizationId, orgId)];
        if (status) conditions.push(eq(projects.status, status));

        const results = await db
          .select()
          .from(projects)
          .where(and(...conditions))
          .orderBy(desc(projects.updatedAt))
          .limit(limit);

        return results.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          progress: p.progress,
          startDate: p.startDate?.toISOString(),
          targetDate: p.targetDate?.toISOString(),
        }));
      },
    }),

    get_project: tool({
      description: "Get a specific project with its milestones",
      inputSchema: z.object({
        projectId: z.string().uuid(),
      }),
      execute: async ({ projectId }) => {
        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)))
          .limit(1);

        if (!project) return { error: "Project not found" };

        const projectMilestones = await db
          .select()
          .from(milestones)
          .where(eq(milestones.projectId, projectId))
          .orderBy(milestones.sortOrder);

        return {
          ...project,
          createdAt: project.createdAt?.toISOString(),
          updatedAt: project.updatedAt?.toISOString(),
          startDate: project.startDate?.toISOString(),
          targetDate: project.targetDate?.toISOString(),
          milestones: projectMilestones.map((m) => ({
            id: m.id,
            title: m.title,
            status: m.status,
            dueDate: m.dueDate?.toISOString(),
            completedAt: m.completedAt?.toISOString(),
          })),
        };
      },
    }),

    list_tickets: tool({
      description: "List support tickets, optionally filtered by status and/or priority",
      inputSchema: z.object({
        status: z.enum(["open", "in_progress", "waiting_on_client", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        limit: z.number().min(1).max(50).default(10),
      }),
      execute: async ({ status, priority, limit }) => {
        const conditions = [eq(tickets.organizationId, orgId)];
        if (status) conditions.push(eq(tickets.status, status));
        if (priority) conditions.push(eq(tickets.priority, priority));

        const results = await db
          .select()
          .from(tickets)
          .where(and(...conditions))
          .orderBy(desc(tickets.createdAt))
          .limit(limit);

        return results.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          createdAt: t.createdAt?.toISOString(),
        }));
      },
    }),

    get_ticket: tool({
      description: "Get a specific ticket with its comments",
      inputSchema: z.object({
        ticketId: z.string().uuid(),
      }),
      execute: async ({ ticketId }) => {
        const [ticket] = await db
          .select()
          .from(tickets)
          .where(and(eq(tickets.id, ticketId), eq(tickets.organizationId, orgId)))
          .limit(1);

        if (!ticket) return { error: "Ticket not found" };

        const comments = await db
          .select()
          .from(ticketComments)
          .where(eq(ticketComments.ticketId, ticketId))
          .orderBy(ticketComments.createdAt);

        return {
          ...ticket,
          createdAt: ticket.createdAt?.toISOString(),
          updatedAt: ticket.updatedAt?.toISOString(),
          resolvedAt: ticket.resolvedAt?.toISOString(),
          comments: comments.map((c) => ({
            id: c.id,
            authorName: c.authorName,
            body: c.body,
            isInternal: c.isInternal,
            createdAt: c.createdAt?.toISOString(),
          })),
        };
      },
    }),

    list_documents: tool({
      description: "List recent documents from the document management system (Paperless-ngx)",
      inputSchema: z.object({
        limit: z.number().min(1).max(50).default(10),
      }),
      execute: async ({ limit }) => {
        try {
          const result = await paperlessClient.listDocuments({
            ordering: "-created",
          });
          if (result && !("error" in result)) {
            return (result.results ?? []).slice(0, limit).map((d: Record<string, unknown>) => ({
              id: d.id,
              title: d.title,
              correspondent: d.correspondent,
              document_type: d.document_type,
              tags: d.tags,
              created: d.created,
            }));
          }
          return result;
        } catch {
          return { error: "Paperless-ngx is unavailable" };
        }
      },
    }),

    get_dashboard_stats: tool({
      description: "Get summary statistics: open requests, active projects, open tickets",
      inputSchema: z.object({}),
      execute: async () => {
        const [requestStats] = await db
          .select({
            total: sql<number>`count(*)`,
            open: sql<number>`count(*) filter (where ${requests.status} in ('submitted', 'under_review', 'in_progress'))`,
          })
          .from(requests)
          .where(eq(requests.organizationId, orgId));

        const [projectStats] = await db
          .select({
            total: sql<number>`count(*)`,
            active: sql<number>`count(*) filter (where ${projects.status} = 'in_progress')`,
          })
          .from(projects)
          .where(eq(projects.organizationId, orgId));

        const [ticketStats] = await db
          .select({
            total: sql<number>`count(*)`,
            open: sql<number>`count(*) filter (where ${tickets.status} in ('open', 'in_progress'))`,
          })
          .from(tickets)
          .where(eq(tickets.organizationId, orgId));

        return { requests: requestStats, projects: projectStats, tickets: ticketStats };
      },
    }),

    search_activity: tool({
      description: "Search the activity log by keyword",
      inputSchema: z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
      }),
      execute: async ({ query, limit }) => {
        const results = await db
          .select()
          .from(activityLog)
          .where(
            and(
              eq(activityLog.organizationId, orgId),
              ilike(activityLog.title, `%${query}%`),
            ),
          )
          .orderBy(desc(activityLog.createdAt))
          .limit(limit);

        return results.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          createdAt: a.createdAt?.toISOString(),
        }));
      },
    }),
  };
}
