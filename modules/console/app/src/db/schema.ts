import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────

export const requestStatusEnum = pgEnum("request_status", [
  "submitted",
  "under_review",
  "in_progress",
  "completed",
  "cancelled",
]);

export const requestCategoryEnum = pgEnum("request_category", [
  "general",
  "technical",
  "billing",
  "feature",
  "bug",
  "other",
]);

export const requestPriorityEnum = pgEnum("request_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pending",
  "in_progress",
  "completed",
  "skipped",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "waiting_on_client",
  "resolved",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const orgRoleEnum = pgEnum("org_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "request_created",
  "request_updated",
  "comment_added",
  "project_updated",
  "milestone_completed",
  "ticket_created",
  "ticket_resolved",
  "document_uploaded",
  "ai_chat_action",
]);

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const setupStatusEnum = pgEnum("setup_status", [
  "pending",
  "in_progress",
  "completed",
]);

export const agentCategoryEnum = pgEnum("agent_category", [
  "system",
  "template",
  "custom",
]);

// ─── Tables ─────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  authentikUid: varchar("authentik_uid", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  role: orgRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
});

export const requests = pgTable("requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  category: requestCategoryEnum("category").notNull().default("general"),
  priority: requestPriorityEnum("priority").notNull().default("medium"),
  status: requestStatusEnum("status").notNull().default("submitted"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const requestComments = pgTable("request_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => requests.id, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "set null" }),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  body: text("body").notNull(),
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("planning"),
  progress: integer("progress").notNull().default(0),
  startDate: timestamp("start_date", { withTimezone: true }),
  targetDate: timestamp("target_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const milestones = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: milestoneStatusEnum("status").notNull().default("pending"),
  sortOrder: integer("sort_order").notNull().default(0),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  priority: ticketPriorityEnum("priority").notNull().default("medium"),
  status: ticketStatusEnum("status").notNull().default("open"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ticketComments = pgTable("ticket_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "set null" }),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  body: text("body").notNull(),
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @deprecated Documents are now managed by Paperless-ngx.
 * This table has no data (no write path ever existed).
 * Kept for schema compatibility — will be removed in a future major version.
 * Use the Paperless API via `paperlessClient` instead.
 */
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 255 }),
  uploadedById: uuid("uploaded_by_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  type: activityTypeEnum("type").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  toolInvocations: jsonb("tool_invocations"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const setupConfig = pgTable("setup_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: setupStatusEnum("status").notNull().default("pending"),
  providerCredentials: jsonb("provider_credentials"),
  orgIdentity: jsonb("org_identity"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completedBy: varchar("completed_by", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => clients.id, {
      onDelete: "set null",
    }),
    slug: varchar("slug", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    instructions: text("instructions").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    minRole: orgRoleEnum("min_role").notNull().default("viewer"),
    icon: varchar("icon", { length: 50 }),
    color: varchar("color", { length: 7 }),
    modelOverride: varchar("model_override", { length: 100 }),
    maxSteps: integer("max_steps").notNull().default(5),
    allowedTools: jsonb("allowed_tools").notNull().default([]),
    toolSettings: jsonb("tool_settings").notNull().default({}),
    category: agentCategoryEnum("category").notNull().default("custom"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("agents_org_slug").on(table.organizationId, table.slug)],
);

export const agentSkills = pgTable("agent_skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const customTools = pgTable("custom_tools", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => clients.id, { onDelete: "set null" }),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  description: text("description").notNull(),
  inputSchema: jsonb("input_schema").notNull(),
  httpEndpoint: text("http_endpoint").notNull(),
  httpMethod: varchar("http_method", { length: 10 }).notNull().default("POST"),
  httpHeaders: jsonb("http_headers").notNull().default({}),
  bodyTemplate: text("body_template"),
  minRole: orgRoleEnum("min_role").notNull().default("admin"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [unique("custom_tools_org_slug").on(table.organizationId, table.slug)]);

// ─── Type Exports ───────────────────────────────────────

export type Organization = typeof organizations.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Request = typeof requests.$inferSelect;
export type RequestComment = typeof requestComments.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TicketComment = typeof ticketComments.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type SetupConfig = typeof setupConfig.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type AgentSkill = typeof agentSkills.$inferSelect;
export type CustomTool = typeof customTools.$inferSelect;
