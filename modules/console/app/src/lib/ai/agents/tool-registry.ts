import type { ToolSet } from "ai";
import { consoleReadTools } from "../tools/console-read-tools";
import { consoleWriteTools } from "../tools/console-write-tools";
import { n8nTools } from "../tools/n8n-tools";
import { adminTools } from "../tools/admin-tools";
import { paperlessTools } from "../tools/paperless-tools";
import { hasMinRole } from "@/lib/roles";
import type { AgentContext, Role } from "./types";

export interface ToolCatalogEntry {
  name: string;
  description: string;
  minRole: Role;
  category: string;
}

const TOOL_CATALOG: ToolCatalogEntry[] = [
  // Console (Read) tools
  { name: "list_requests", description: "List requests for the organization", minRole: "viewer", category: "Console (Read)" },
  { name: "get_request", description: "Get a specific request with comments", minRole: "viewer", category: "Console (Read)" },
  { name: "list_projects", description: "List projects for the organization", minRole: "viewer", category: "Console (Read)" },
  { name: "get_project", description: "Get a specific project with milestones", minRole: "viewer", category: "Console (Read)" },
  { name: "list_tickets", description: "List support tickets", minRole: "viewer", category: "Console (Read)" },
  { name: "get_ticket", description: "Get a specific ticket with comments", minRole: "viewer", category: "Console (Read)" },
  { name: "list_documents", description: "List documents for the organization", minRole: "viewer", category: "Console (Read)" },
  { name: "get_dashboard_stats", description: "Get summary statistics", minRole: "viewer", category: "Console (Read)" },
  { name: "search_activity", description: "Search the activity log", minRole: "viewer", category: "Console (Read)" },

  // Console (Write) tools
  { name: "create_request", description: "Create a new request", minRole: "member", category: "Console (Write)" },
  { name: "update_request_status", description: "Update request status (admin+)", minRole: "member", category: "Console (Write)" },
  { name: "add_comment", description: "Add a comment to a request or ticket", minRole: "member", category: "Console (Write)" },
  { name: "create_ticket", description: "Create a new support ticket", minRole: "member", category: "Console (Write)" },
  { name: "update_ticket_status", description: "Update ticket status (admin+)", minRole: "member", category: "Console (Write)" },

  // n8n Workflows
  { name: "list_workflows", description: "List n8n workflows", minRole: "admin", category: "n8n Workflows" },
  { name: "get_workflow", description: "Get workflow details", minRole: "admin", category: "n8n Workflows" },
  { name: "create_workflow", description: "Create a new workflow", minRole: "admin", category: "n8n Workflows" },
  { name: "update_workflow", description: "Update a workflow", minRole: "admin", category: "n8n Workflows" },
  { name: "delete_workflow", description: "Delete a workflow", minRole: "admin", category: "n8n Workflows" },
  { name: "activate_workflow", description: "Activate or deactivate a workflow", minRole: "admin", category: "n8n Workflows" },
  { name: "get_workflow_tags", description: "Get tags on a workflow", minRole: "admin", category: "n8n Workflows" },
  { name: "update_workflow_tags", description: "Update tags on a workflow", minRole: "admin", category: "n8n Workflows" },
  { name: "transfer_workflow", description: "Transfer workflow to another project", minRole: "admin", category: "n8n Workflows" },

  // n8n Executions
  { name: "list_executions", description: "List recent workflow executions", minRole: "admin", category: "n8n Executions" },
  { name: "get_execution", description: "Get execution details with node results", minRole: "admin", category: "n8n Executions" },
  { name: "delete_execution", description: "Delete an execution record", minRole: "admin", category: "n8n Executions" },
  { name: "retry_execution", description: "Retry a failed execution", minRole: "admin", category: "n8n Executions" },

  // n8n Credentials
  { name: "create_credential", description: "Create a credential for external services", minRole: "admin", category: "n8n Credentials" },
  { name: "delete_credential", description: "Delete a credential", minRole: "admin", category: "n8n Credentials" },
  { name: "get_credential_schema", description: "Get schema for a credential type", minRole: "admin", category: "n8n Credentials" },
  { name: "transfer_credential", description: "Transfer credential to another project", minRole: "admin", category: "n8n Credentials" },

  // n8n Tags
  { name: "list_tags", description: "List all n8n tags", minRole: "admin", category: "n8n Tags" },
  { name: "get_tag", description: "Get tag details", minRole: "admin", category: "n8n Tags" },
  { name: "create_tag", description: "Create a new tag", minRole: "admin", category: "n8n Tags" },
  { name: "update_tag", description: "Rename a tag", minRole: "admin", category: "n8n Tags" },
  { name: "delete_tag", description: "Delete a tag", minRole: "admin", category: "n8n Tags" },

  // n8n Variables
  { name: "list_variables", description: "List n8n environment variables", minRole: "admin", category: "n8n Variables" },
  { name: "create_variable", description: "Create an environment variable", minRole: "admin", category: "n8n Variables" },
  { name: "update_variable", description: "Update an environment variable", minRole: "admin", category: "n8n Variables" },
  { name: "delete_variable", description: "Delete an environment variable", minRole: "admin", category: "n8n Variables" },

  // n8n Users
  { name: "list_n8n_users", description: "List all n8n users", minRole: "admin", category: "n8n Users" },
  { name: "get_n8n_user", description: "Get n8n user by ID or email", minRole: "admin", category: "n8n Users" },
  { name: "create_n8n_users", description: "Invite users to n8n", minRole: "admin", category: "n8n Users" },
  { name: "delete_n8n_user", description: "Delete an n8n user", minRole: "admin", category: "n8n Users" },
  { name: "change_n8n_user_role", description: "Change an n8n user's role", minRole: "admin", category: "n8n Users" },

  // n8n Projects
  { name: "list_n8n_projects", description: "List n8n projects", minRole: "admin", category: "n8n Projects" },
  { name: "create_n8n_project", description: "Create an n8n project", minRole: "admin", category: "n8n Projects" },
  { name: "update_n8n_project", description: "Rename an n8n project", minRole: "admin", category: "n8n Projects" },
  { name: "delete_n8n_project", description: "Delete an n8n project", minRole: "admin", category: "n8n Projects" },

  // n8n Admin
  { name: "source_control_pull", description: "Pull from source control repository", minRole: "admin", category: "n8n Admin" },
  { name: "generate_audit", description: "Generate a security audit report", minRole: "admin", category: "n8n Admin" },

  // System Admin
  { name: "get_system_status", description: "Get system component health", minRole: "admin", category: "System Admin" },
  { name: "check_updates", description: "Check for available updates", minRole: "admin", category: "System Admin" },
  { name: "get_update_history", description: "Get update/rollback history", minRole: "admin", category: "System Admin" },

  // Paperless (Read)
  { name: "search_paperless_documents", description: "Full-text search across Paperless documents", minRole: "viewer", category: "Paperless (Read)" },
  { name: "list_paperless_documents", description: "List Paperless documents with filters", minRole: "viewer", category: "Paperless (Read)" },
  { name: "get_paperless_document", description: "Get full document details from Paperless", minRole: "viewer", category: "Paperless (Read)" },

  // Paperless (Write)
  { name: "upload_paperless_document", description: "Upload a document to Paperless", minRole: "member", category: "Paperless (Write)" },
  { name: "update_paperless_document", description: "Update document metadata in Paperless", minRole: "member", category: "Paperless (Write)" },
  { name: "delete_paperless_document", description: "Delete a document from Paperless", minRole: "admin", category: "Paperless (Write)" },

  // Paperless (Tags)
  { name: "list_paperless_tags", description: "List all Paperless tags", minRole: "viewer", category: "Paperless (Tags)" },
  { name: "create_paperless_tag", description: "Create a Paperless tag", minRole: "member", category: "Paperless (Tags)" },
  { name: "update_paperless_tag", description: "Update/rename a Paperless tag", minRole: "member", category: "Paperless (Tags)" },
  { name: "delete_paperless_tag", description: "Delete a Paperless tag", minRole: "admin", category: "Paperless (Tags)" },

  // Paperless (Meta)
  { name: "list_paperless_correspondents", description: "List Paperless correspondents", minRole: "viewer", category: "Paperless (Meta)" },
  { name: "create_paperless_correspondent", description: "Create a Paperless correspondent", minRole: "member", category: "Paperless (Meta)" },
  { name: "update_paperless_correspondent", description: "Update/rename a Paperless correspondent", minRole: "member", category: "Paperless (Meta)" },
  { name: "delete_paperless_correspondent", description: "Delete a Paperless correspondent", minRole: "admin", category: "Paperless (Meta)" },
  { name: "list_paperless_document_types", description: "List Paperless document types", minRole: "viewer", category: "Paperless (Meta)" },
  { name: "create_paperless_document_type", description: "Create a Paperless document type", minRole: "member", category: "Paperless (Meta)" },
  { name: "update_paperless_document_type", description: "Update/rename a Paperless document type", minRole: "member", category: "Paperless (Meta)" },
  { name: "delete_paperless_document_type", description: "Delete a Paperless document type", minRole: "admin", category: "Paperless (Meta)" },

  // Paperless (Storage Paths)
  { name: "list_storage_paths", description: "List Paperless storage paths", minRole: "viewer", category: "Paperless (Storage Paths)" },
  { name: "create_storage_path", description: "Create a Paperless storage path", minRole: "member", category: "Paperless (Storage Paths)" },
  { name: "update_storage_path", description: "Update a Paperless storage path", minRole: "member", category: "Paperless (Storage Paths)" },
  { name: "delete_storage_path", description: "Delete a Paperless storage path", minRole: "admin", category: "Paperless (Storage Paths)" },

  // Paperless (Custom Fields)
  { name: "list_custom_fields", description: "List Paperless custom fields", minRole: "viewer", category: "Paperless (Custom Fields)" },
  { name: "create_custom_field", description: "Create a Paperless custom field", minRole: "admin", category: "Paperless (Custom Fields)" },
  { name: "delete_custom_field", description: "Delete a Paperless custom field", minRole: "admin", category: "Paperless (Custom Fields)" },

  // Paperless (Notes)
  { name: "list_document_notes", description: "List notes on a Paperless document", minRole: "viewer", category: "Paperless (Notes)" },
  { name: "add_document_note", description: "Add a note to a Paperless document", minRole: "member", category: "Paperless (Notes)" },
  { name: "delete_document_note", description: "Delete a note from a Paperless document", minRole: "admin", category: "Paperless (Notes)" },

  // Paperless (Bulk & Discovery)
  { name: "bulk_edit_paperless_documents", description: "Bulk edit multiple Paperless documents", minRole: "admin", category: "Paperless (Bulk & Discovery)" },
  { name: "get_similar_documents", description: "Find similar documents in Paperless", minRole: "viewer", category: "Paperless (Bulk & Discovery)" },
  { name: "get_paperless_tasks", description: "Get Paperless background task status", minRole: "viewer", category: "Paperless (Bulk & Discovery)" },
  { name: "search_autocomplete", description: "Get Paperless search autocomplete suggestions", minRole: "viewer", category: "Paperless (Bulk & Discovery)" },
];

function buildAllTools(
  ctx: AgentContext,
  toolSettings?: Record<string, Record<string, string>>,
): Record<string, unknown> {
  const tools: Record<string, unknown> = {};
  Object.assign(tools, consoleReadTools(ctx.orgId));
  // Paperless read tools are available to all roles; role filtering
  // happens per-tool via the TOOL_CATALOG minRole entries
  Object.assign(tools, paperlessTools());
  if (hasMinRole(ctx.role, "member")) {
    Object.assign(tools, consoleWriteTools(ctx.orgId, ctx.clientId, ctx.role));
  }
  if (hasMinRole(ctx.role, "admin")) {
    Object.assign(tools, n8nTools(toolSettings));
    Object.assign(tools, adminTools());
  }
  return tools;
}

export function resolveTools(
  allowedToolNames: string[],
  ctx: AgentContext,
  toolSettings?: Record<string, Record<string, string>>,
): ToolSet {
  const allTools = buildAllTools(ctx, toolSettings);
  const resolved: ToolSet = {};

  for (const name of allowedToolNames) {
    const catalogEntry = TOOL_CATALOG.find((t) => t.name === name);
    if (!catalogEntry) continue;
    if (!hasMinRole(ctx.role, catalogEntry.minRole)) continue;
    if (name in allTools) {
      resolved[name] = allTools[name] as ToolSet[string];
    }
  }

  return resolved;
}

export function getToolCatalog(role: Role): ToolCatalogEntry[] {
  return TOOL_CATALOG.filter((t) => hasMinRole(role, t.minRole));
}

export const ALL_TOOL_NAMES = TOOL_CATALOG.map((t) => t.name);
