import { db } from "@/lib/db";
import { getCurrentClient, getCurrentOrgId } from "@/lib/session";
import {
  organizations,
  requests,
  requestComments,
  projects,
  milestones,
  tickets,
  ticketComments,
  documents,
  activityLog,
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// ─── Organization ────────────────────────────

export async function getCurrentOrganization() {
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org ?? null;
}

// ─── Dashboard ──────────────────────────────

export async function getDashboardData() {
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;

  const [recentRequests, activeProjects, recentDocuments, recentActivity] =
    await Promise.all([
      db
        .select()
        .from(requests)
        .where(eq(requests.organizationId, orgId))
        .orderBy(desc(requests.createdAt))
        .limit(5),
      db
        .select()
        .from(projects)
        .where(eq(projects.organizationId, orgId))
        .orderBy(desc(projects.updatedAt))
        .limit(5),
      db
        .select()
        .from(documents)
        .where(eq(documents.organizationId, orgId))
        .orderBy(desc(documents.createdAt))
        .limit(5),
      db
        .select()
        .from(activityLog)
        .where(eq(activityLog.organizationId, orgId))
        .orderBy(desc(activityLog.createdAt))
        .limit(10),
    ]);

  // Stats
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

  return {
    recentRequests,
    activeProjects,
    recentDocuments,
    recentActivity,
    stats: {
      requests: requestStats,
      projects: projectStats,
      tickets: ticketStats,
    },
  };
}

// ─── Requests ───────────────────────────────

export async function getRequests() {
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];

  return db
    .select()
    .from(requests)
    .where(eq(requests.organizationId, orgId))
    .orderBy(desc(requests.createdAt));
}

export async function getRequest(id: string) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;

  const [request] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, id), eq(requests.organizationId, orgId)))
    .limit(1);

  if (!request) return null;

  const comments = await db
    .select()
    .from(requestComments)
    .where(
      and(
        eq(requestComments.requestId, id),
        eq(requestComments.isInternal, false)
      )
    )
    .orderBy(requestComments.createdAt);

  return { ...request, comments };
}

// ─── Projects ───────────────────────────────

export async function getProjects() {
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];

  return db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, orgId))
    .orderBy(desc(projects.updatedAt));
}

export async function getProject(id: string) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)))
    .limit(1);

  if (!project) return null;

  const projectMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, id))
    .orderBy(milestones.sortOrder);

  return { ...project, milestones: projectMilestones };
}

// ─── Tickets ────────────────────────────────

export async function getTickets() {
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];

  return db
    .select()
    .from(tickets)
    .where(eq(tickets.organizationId, orgId))
    .orderBy(desc(tickets.createdAt));
}

export async function getTicket(id: string) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, id), eq(tickets.organizationId, orgId)))
    .limit(1);

  if (!ticket) return null;

  const comments = await db
    .select()
    .from(ticketComments)
    .where(
      and(
        eq(ticketComments.ticketId, id),
        eq(ticketComments.isInternal, false)
      )
    )
    .orderBy(ticketComments.createdAt);

  return { ...ticket, comments };
}

// ─── Documents ──────────────────────────────

export async function getDocuments() {
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];

  return db
    .select()
    .from(documents)
    .where(eq(documents.organizationId, orgId))
    .orderBy(desc(documents.createdAt));
}
