export interface ToolSettingField {
  key: string;
  label: string;
  type: "text" | "url" | "number" | "boolean";
  description?: string;
}

const n8nApiUrlSetting: ToolSettingField = {
  key: "n8nApiUrl",
  label: "n8n API URL",
  type: "url",
  description: "Override the default n8n API endpoint",
};

// All n8n tools share the same optional API URL override
const N8N_TOOL_NAMES = [
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
] as const;

export const TOOL_SETTINGS_SCHEMA: Record<string, ToolSettingField[]> =
  Object.fromEntries(N8N_TOOL_NAMES.map((name) => [name, [n8nApiUrlSetting]]));
