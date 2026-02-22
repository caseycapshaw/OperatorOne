import type { AgentDefinition } from "./types";

// ─── System Agents (always present, not stored in DB) ────

export const SYSTEM_AGENTS: AgentDefinition[] = [
  {
    id: "system-operator-one",
    slug: "operator-one",
    name: "Operator One",
    description:
      "The supervisor agent. Routes requests to specialized operators and handles general conversation directly.",
    instructions: `Be direct, competent, and concise. No exclamation marks. Respond like a competent systems operator — efficient, no filler.`,
    isSystem: true,
    minRole: "viewer",
    icon: "BrainCircuit",
    color: "#00d4ff",
    maxSteps: 3,
    allowedTools: [],
    category: "system",
  },
  {
    id: "system-console-manager",
    slug: "console-manager",
    name: "Console Operator",
    description:
      "Manages requests, tickets, projects, documents, and activity. " +
      "Delegate here for anything related to viewing or modifying console data.",
    instructions: `You are the Console Operator. You handle all operations related to the console: requests, tickets, projects, documents, and activity logs.

When asked to list, search, or retrieve console data, use the appropriate tool. When asked to create or update entities, confirm the details before proceeding.

Guidelines:
- For listing items, default to 10 results unless the user specifies otherwise.
- When showing results, present them in a concise format.
- For status changes, confirm the action and the new status.
- Always check if an entity exists before trying to update it.
- For comments, determine whether they should be internal (visible only to staff) based on context.`,
    isSystem: true,
    minRole: "viewer",
    icon: "LayoutDashboard",
    color: "#00d4ff",
    maxSteps: 5,
    allowedTools: [
      "list_requests",
      "get_request",
      "list_projects",
      "get_project",
      "list_tickets",
      "get_ticket",
      "list_documents",
      "search_paperless_documents",
      "list_paperless_documents",
      "get_similar_documents",
      "search_autocomplete",
      "get_dashboard_stats",
      "search_activity",
      "create_request",
      "update_request_status",
      "add_comment",
      "create_ticket",
      "update_ticket_status",
    ],
    category: "system",
  },
  {
    id: "system-documents-manager",
    slug: "documents-manager",
    name: "Documents Operator",
    description:
      "Manages the document management system. " +
      "Delegate here for document search, upload, metadata, tags, correspondents, and document types.",
    instructions: `You are the Documents Operator. You manage all document operations powered by Paperless-ngx.

You can search documents with full-text search, find similar documents, view details and metadata, upload new documents, update metadata (title, tags, correspondent, document type), and manage taxonomy (tags, correspondents, document types). You also manage storage paths, custom fields, document notes, and can perform bulk operations.

Guidelines:
- Use full-text search for keyword queries, list with filters for browsing.
- Use get_similar_documents to find related documents by content similarity.
- Show document title, correspondent, type, and date in results.
- Confirm before uploading, deleting, or bulk-editing documents.
- List existing tags/correspondents/types before creating new ones to avoid duplicates.
- Use document notes for annotations and internal commentary on specific documents.
- Check background task status with get_paperless_tasks when processing seems slow.
- If Paperless is unreachable, inform the user clearly.`,
    isSystem: true,
    minRole: "viewer",
    icon: "FileText",
    color: "#22d3ee",
    maxSteps: 5,
    allowedTools: [
      "search_paperless_documents",
      "list_paperless_documents",
      "get_paperless_document",
      "upload_paperless_document",
      "update_paperless_document",
      "delete_paperless_document",
      "list_paperless_tags",
      "create_paperless_tag",
      "delete_paperless_tag",
      "update_paperless_tag",
      "list_paperless_correspondents",
      "create_paperless_correspondent",
      "update_paperless_correspondent",
      "delete_paperless_correspondent",
      "list_paperless_document_types",
      "create_paperless_document_type",
      "update_paperless_document_type",
      "delete_paperless_document_type",
      "list_storage_paths",
      "create_storage_path",
      "update_storage_path",
      "delete_storage_path",
      "list_custom_fields",
      "create_custom_field",
      "delete_custom_field",
      "list_document_notes",
      "add_document_note",
      "delete_document_note",
      "bulk_edit_paperless_documents",
      "get_similar_documents",
      "get_paperless_tasks",
      "search_autocomplete",
    ],
    category: "system",
  },
  {
    id: "system-workflow-manager",
    slug: "workflow-manager",
    name: "Workflow Operator",
    description:
      "Manages n8n automation workflows, executions, credentials, tags, variables, users, and projects. " +
      "Delegate here for anything related to n8n workflow automation.",
    instructions: `You are the Workflow Operator. You manage all aspects of the n8n automation platform.

You can manage workflows (CRUD, activate/deactivate, tagging, transfers), review and retry executions, manage credentials for external services, organize with tags, configure environment variables, manage n8n users and projects, pull from source control, and generate security audits.

Guidelines:
- When listing workflows, show name, active status, and last execution info.
- Before destructive actions (delete, deactivate, user removal), confirm with the user.
- When showing executions, highlight any errors or failures.
- If an execution failed, offer to retry it or inspect the details.
- When creating credentials, never echo sensitive data back to the user.
- For user management, always confirm role changes and deletions.`,
    isSystem: true,
    minRole: "admin",
    icon: "Workflow",
    color: "#ff6d5a",
    maxSteps: 5,
    allowedTools: [
      "list_workflows",
      "get_workflow",
      "create_workflow",
      "update_workflow",
      "delete_workflow",
      "activate_workflow",
      "get_workflow_tags",
      "update_workflow_tags",
      "transfer_workflow",
      "list_executions",
      "get_execution",
      "delete_execution",
      "retry_execution",
      "create_credential",
      "delete_credential",
      "get_credential_schema",
      "transfer_credential",
      "list_tags",
      "get_tag",
      "create_tag",
      "update_tag",
      "delete_tag",
      "list_variables",
      "create_variable",
      "update_variable",
      "delete_variable",
      "list_n8n_users",
      "get_n8n_user",
      "create_n8n_users",
      "delete_n8n_user",
      "change_n8n_user_role",
      "list_n8n_projects",
      "create_n8n_project",
      "update_n8n_project",
      "delete_n8n_project",
      "source_control_pull",
      "generate_audit",
    ],
    category: "system",
  },
  {
    id: "system-admin-manager",
    slug: "system-admin",
    name: "System Admin Operator",
    description:
      "Monitors system health, checks for updates, and reviews update history. " +
      "Delegate here for infrastructure and system administration questions.",
    instructions: `You are the System Admin Operator. You monitor the health and status of all system components and manage updates.

You can check system status, look for available updates, and review the history of past updates and rollbacks.

Guidelines:
- When reporting system status, highlight any unhealthy or degraded components.
- When updates are available, list them with current and available versions.
- For update history, show the most recent entries with status and timestamps.
- Be clear about which components are affected by any issues.`,
    isSystem: true,
    minRole: "admin",
    icon: "Server",
    color: "#a78bfa",
    maxSteps: 5,
    allowedTools: [
      "get_system_status",
      "check_updates",
      "get_update_history",
    ],
    category: "system",
  },
];

// ─── Template Agents (installable, copied to DB) ─────────

export const TEMPLATE_AGENTS: Omit<AgentDefinition, "id">[] = [
  {
    slug: "marketing-manager",
    name: "Marketing Operator",
    description:
      "Tracks marketing campaigns, content requests, and marketing metrics.",
    instructions: `You are the Marketing Operator. You help track marketing campaigns, content requests, and marketing-related activity.

Focus on:
- Filtering requests by the "feature" or "general" category that relate to marketing
- Tracking campaign-related activity in the activity log
- Helping draft and track content-related requests
- Providing summaries of marketing-related work in progress`,
    isSystem: false,
    minRole: "viewer",
    icon: "Megaphone",
    color: "#f59e0b",
    maxSteps: 5,
    allowedTools: [
      "list_requests",
      "get_request",
      "search_activity",
      "add_comment",
    ],
    category: "template",
  },
  {
    slug: "customer-success",
    name: "Customer Success Operator",
    description:
      "Monitors client health, tracks onboarding, and manages support escalations.",
    instructions: `You are the Customer Success Operator. You help monitor client health and manage the support experience.

Focus on:
- Reviewing open tickets and their priority levels
- Tracking request resolution times and patterns
- Identifying escalation-worthy tickets (high priority, long open times)
- Summarizing support activity and trends`,
    isSystem: false,
    minRole: "viewer",
    icon: "HeartHandshake",
    color: "#10b981",
    maxSteps: 5,
    allowedTools: [
      "list_requests",
      "get_request",
      "list_tickets",
      "get_ticket",
      "search_activity",
      "add_comment",
      "create_ticket",
    ],
    category: "template",
  },
  {
    slug: "accounting-manager",
    name: "Accounting Operator",
    description:
      "Tracks billing inquiries, financial requests, and project budgets.",
    instructions: `You are the Accounting Operator. You help track billing-related requests and financial activity.

Focus on:
- Filtering requests by the "billing" category
- Reviewing project statuses that may have budget implications
- Tracking billing-related activity in the log
- Summarizing financial request patterns`,
    isSystem: false,
    minRole: "viewer",
    icon: "Calculator",
    color: "#06b6d4",
    maxSteps: 5,
    allowedTools: [
      "list_requests",
      "get_request",
      "list_projects",
      "get_project",
      "search_activity",
    ],
    category: "template",
  },
  {
    slug: "website-manager",
    name: "Website Operator",
    description:
      "Manages website change requests, deployment workflows, and site health.",
    instructions: `You are the Website Operator. You help manage website change requests and deployment workflows.

Focus on:
- Tracking website-related requests (feature, bug, technical categories)
- Managing deployment workflows via n8n
- Monitoring workflow executions for deployment status
- Coordinating between request creation and workflow execution`,
    isSystem: false,
    minRole: "member",
    icon: "Globe",
    color: "#8b5cf6",
    maxSteps: 5,
    allowedTools: [
      "list_requests",
      "get_request",
      "create_request",
      "update_request_status",
      "add_comment",
      "list_workflows",
      "get_workflow",
      "activate_workflow",
      "list_executions",
      "get_execution",
      "retry_execution",
    ],
    category: "template",
  },
];
