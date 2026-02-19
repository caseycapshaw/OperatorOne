import { tool } from "ai";
import { z } from "zod";
import { n8nClient } from "../n8n-client";

export function n8nTools(_toolSettings?: Record<string, Record<string, string>>) {
  return {
    // ─── Workflows ──────────────────────────────────────────

    list_workflows: tool({
      description: "List n8n workflows, optionally filtered by active status",
      inputSchema: z.object({
        active: z.boolean().optional(),
      }),
      execute: async ({ active }) => {
        return n8nClient.listWorkflows(active);
      },
    }),

    get_workflow: tool({
      description: "Get details of a specific n8n workflow including its nodes and connections",
      inputSchema: z.object({
        workflowId: z.string(),
      }),
      execute: async ({ workflowId }) => {
        return n8nClient.getWorkflow(workflowId);
      },
    }),

    create_workflow: tool({
      description: "Create a new n8n workflow with nodes and connections",
      inputSchema: z.object({
        name: z.string().describe("Workflow name"),
        nodes: z.array(z.record(z.string(), z.unknown())).describe("Array of node definitions"),
        connections: z.record(z.string(), z.unknown()).describe("Node connection mappings"),
        settings: z.record(z.string(), z.unknown()).optional().describe("Workflow settings"),
      }),
      execute: async ({ name, nodes, connections, settings }) => {
        return n8nClient.createWorkflow({ name, nodes, connections, settings });
      },
    }),

    update_workflow: tool({
      description: "Update an existing n8n workflow (name, nodes, connections, or settings)",
      inputSchema: z.object({
        workflowId: z.string(),
        name: z.string().optional(),
        nodes: z.array(z.record(z.string(), z.unknown())).optional(),
        connections: z.record(z.string(), z.unknown()).optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
      }),
      execute: async ({ workflowId, ...body }) => {
        return n8nClient.updateWorkflow(workflowId, body);
      },
    }),

    delete_workflow: tool({
      description: "Permanently delete an n8n workflow",
      inputSchema: z.object({
        workflowId: z.string(),
      }),
      execute: async ({ workflowId }) => {
        return n8nClient.deleteWorkflow(workflowId);
      },
    }),

    activate_workflow: tool({
      description: "Activate or deactivate an n8n workflow",
      inputSchema: z.object({
        workflowId: z.string(),
        active: z.boolean(),
      }),
      execute: async ({ workflowId, active }) => {
        return n8nClient.activateWorkflow(workflowId, active);
      },
    }),

    get_workflow_tags: tool({
      description: "Get tags assigned to a specific n8n workflow",
      inputSchema: z.object({
        workflowId: z.string(),
      }),
      execute: async ({ workflowId }) => {
        return n8nClient.getWorkflowTags(workflowId);
      },
    }),

    update_workflow_tags: tool({
      description: "Replace all tags on an n8n workflow with the given tag IDs",
      inputSchema: z.object({
        workflowId: z.string(),
        tagIds: z.array(z.string()).describe("Array of tag IDs to assign"),
      }),
      execute: async ({ workflowId, tagIds }) => {
        return n8nClient.updateWorkflowTags(workflowId, tagIds);
      },
    }),

    transfer_workflow: tool({
      description: "Transfer an n8n workflow to a different n8n project",
      inputSchema: z.object({
        workflowId: z.string(),
        destinationProjectId: z.string().describe("Target n8n project ID"),
      }),
      execute: async ({ workflowId, destinationProjectId }) => {
        return n8nClient.transferWorkflow(workflowId, destinationProjectId);
      },
    }),

    // ─── Executions ─────────────────────────────────────────

    list_executions: tool({
      description: "List recent workflow executions, optionally filtered by workflow or status",
      inputSchema: z.object({
        workflowId: z.string().optional(),
        status: z.enum(["success", "error", "waiting"]).optional(),
        limit: z.number().min(1).max(50).default(10),
      }),
      execute: async ({ workflowId, status, limit }) => {
        return n8nClient.listExecutions({ workflowId, status, limit });
      },
    }),

    get_execution: tool({
      description: "Get full details of a specific workflow execution including node-level results",
      inputSchema: z.object({
        executionId: z.string(),
      }),
      execute: async ({ executionId }) => {
        return n8nClient.getExecution(executionId);
      },
    }),

    delete_execution: tool({
      description: "Delete a specific workflow execution record",
      inputSchema: z.object({
        executionId: z.string(),
      }),
      execute: async ({ executionId }) => {
        return n8nClient.deleteExecution(executionId);
      },
    }),

    retry_execution: tool({
      description: "Retry a failed workflow execution",
      inputSchema: z.object({
        executionId: z.string(),
      }),
      execute: async ({ executionId }) => {
        return n8nClient.retryExecution(executionId);
      },
    }),

    // ─── Credentials ────────────────────────────────────────

    create_credential: tool({
      description: "Create a new credential in n8n for connecting to external services",
      inputSchema: z.object({
        name: z.string().describe("Display name for the credential"),
        type: z.string().describe("Credential type (e.g. 'slackApi', 'githubApi')"),
        data: z.record(z.string(), z.unknown()).describe("Credential data fields (keys/tokens/passwords)"),
      }),
      execute: async ({ name, type, data }) => {
        return n8nClient.createCredential({ name, type, data });
      },
    }),

    delete_credential: tool({
      description: "Delete a credential from n8n",
      inputSchema: z.object({
        credentialId: z.string(),
      }),
      execute: async ({ credentialId }) => {
        return n8nClient.deleteCredential(credentialId);
      },
    }),

    get_credential_schema: tool({
      description: "Get the JSON schema for a credential type to see required fields",
      inputSchema: z.object({
        credentialTypeName: z.string().describe("Credential type name (e.g. 'slackApi')"),
      }),
      execute: async ({ credentialTypeName }) => {
        return n8nClient.getCredentialSchema(credentialTypeName);
      },
    }),

    transfer_credential: tool({
      description: "Transfer a credential to a different n8n project",
      inputSchema: z.object({
        credentialId: z.string(),
        destinationProjectId: z.string().describe("Target n8n project ID"),
      }),
      execute: async ({ credentialId, destinationProjectId }) => {
        return n8nClient.transferCredential(credentialId, destinationProjectId);
      },
    }),

    // ─── Tags ───────────────────────────────────────────────

    list_tags: tool({
      description: "List all tags in n8n used for organizing workflows",
      inputSchema: z.object({}),
      execute: async () => {
        return n8nClient.listTags();
      },
    }),

    get_tag: tool({
      description: "Get details of a specific n8n tag",
      inputSchema: z.object({
        tagId: z.string(),
      }),
      execute: async ({ tagId }) => {
        return n8nClient.getTag(tagId);
      },
    }),

    create_tag: tool({
      description: "Create a new tag in n8n for organizing workflows",
      inputSchema: z.object({
        name: z.string().describe("Tag name"),
      }),
      execute: async ({ name }) => {
        return n8nClient.createTag(name);
      },
    }),

    update_tag: tool({
      description: "Rename an existing n8n tag",
      inputSchema: z.object({
        tagId: z.string(),
        name: z.string().describe("New tag name"),
      }),
      execute: async ({ tagId, name }) => {
        return n8nClient.updateTag(tagId, name);
      },
    }),

    delete_tag: tool({
      description: "Delete an n8n tag",
      inputSchema: z.object({
        tagId: z.string(),
      }),
      execute: async ({ tagId }) => {
        return n8nClient.deleteTag(tagId);
      },
    }),

    // ─── Variables ──────────────────────────────────────────

    list_variables: tool({
      description: "List all environment variables in n8n",
      inputSchema: z.object({}),
      execute: async () => {
        return n8nClient.listVariables();
      },
    }),

    create_variable: tool({
      description: "Create a new environment variable in n8n",
      inputSchema: z.object({
        key: z.string().describe("Variable key"),
        value: z.string().describe("Variable value"),
      }),
      execute: async ({ key, value }) => {
        return n8nClient.createVariable(key, value);
      },
    }),

    update_variable: tool({
      description: "Update an existing n8n environment variable",
      inputSchema: z.object({
        variableId: z.string(),
        key: z.string().describe("Variable key"),
        value: z.string().describe("Variable value"),
      }),
      execute: async ({ variableId, key, value }) => {
        return n8nClient.updateVariable(variableId, key, value);
      },
    }),

    delete_variable: tool({
      description: "Delete an n8n environment variable",
      inputSchema: z.object({
        variableId: z.string(),
      }),
      execute: async ({ variableId }) => {
        return n8nClient.deleteVariable(variableId);
      },
    }),

    // ─── Users ──────────────────────────────────────────────

    list_n8n_users: tool({
      description: "List all users in the n8n instance",
      inputSchema: z.object({}),
      execute: async () => {
        return n8nClient.listUsers();
      },
    }),

    get_n8n_user: tool({
      description: "Get an n8n user by ID or email address",
      inputSchema: z.object({
        idOrEmail: z.string().describe("User ID or email address"),
      }),
      execute: async ({ idOrEmail }) => {
        return n8nClient.getUser(idOrEmail);
      },
    }),

    create_n8n_users: tool({
      description: "Invite one or more users to the n8n instance",
      inputSchema: z.object({
        users: z.array(z.object({
          email: z.string().describe("User email"),
          role: z.enum(["global:admin", "global:member"]).optional().describe("User role"),
        })).describe("Users to invite"),
      }),
      execute: async ({ users }) => {
        return n8nClient.createUsers(users);
      },
    }),

    delete_n8n_user: tool({
      description: "Delete a user from the n8n instance",
      inputSchema: z.object({
        userId: z.string(),
        transferId: z.string().optional().describe("User ID to transfer workflows/credentials to"),
      }),
      execute: async ({ userId, transferId }) => {
        return n8nClient.deleteUser(userId, { transferId });
      },
    }),

    change_n8n_user_role: tool({
      description: "Change an n8n user's global role",
      inputSchema: z.object({
        userId: z.string(),
        newRoleName: z.enum(["global:admin", "global:member"]).describe("New role"),
      }),
      execute: async ({ userId, newRoleName }) => {
        return n8nClient.changeUserRole(userId, newRoleName);
      },
    }),

    // ─── Projects ───────────────────────────────────────────

    list_n8n_projects: tool({
      description: "List all projects (organizational units) in n8n",
      inputSchema: z.object({}),
      execute: async () => {
        return n8nClient.listN8nProjects();
      },
    }),

    create_n8n_project: tool({
      description: "Create a new project (organizational unit) in n8n",
      inputSchema: z.object({
        name: z.string().describe("Project name"),
      }),
      execute: async ({ name }) => {
        return n8nClient.createN8nProject(name);
      },
    }),

    update_n8n_project: tool({
      description: "Rename an n8n project",
      inputSchema: z.object({
        projectId: z.string(),
        name: z.string().describe("New project name"),
      }),
      execute: async ({ projectId, name }) => {
        return n8nClient.updateN8nProject(projectId, name);
      },
    }),

    delete_n8n_project: tool({
      description: "Delete an n8n project",
      inputSchema: z.object({
        projectId: z.string(),
      }),
      execute: async ({ projectId }) => {
        return n8nClient.deleteN8nProject(projectId);
      },
    }),

    // ─── Source Control ─────────────────────────────────────

    source_control_pull: tool({
      description: "Pull workflow changes from the connected source control repository",
      inputSchema: z.object({
        force: z.boolean().optional().describe("Force pull, overwriting local changes"),
      }),
      execute: async ({ force }) => {
        return n8nClient.sourceControlPull(force);
      },
    }),

    // ─── Audit ──────────────────────────────────────────────

    generate_audit: tool({
      description: "Generate a security audit report for the n8n instance",
      inputSchema: z.object({
        categories: z.array(z.string()).optional().describe("Audit categories to include (omit for all)"),
      }),
      execute: async ({ categories }) => {
        return n8nClient.generateAudit(categories);
      },
    }),
  };
}
