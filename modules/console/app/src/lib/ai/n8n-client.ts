import { getN8nApiKey } from "@/lib/secrets";

const N8N_API_URL = process.env.N8N_API_URL || "http://op1-n8n:5678/api/v1";

async function n8nFetch(path: string, options?: RequestInit) {
  const apiKey = await getN8nApiKey() ?? "";
  const res = await fetch(`${N8N_API_URL}${path}`, {
    ...options,
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    return { error: `n8n API error (${res.status}): ${text}` };
  }

  return res.json();
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

function enc(id: string) {
  return encodeURIComponent(id);
}

export const n8nClient = {
  // ─── Workflows ──────────────────────────────────────────

  async listWorkflows(active?: boolean) {
    const data = await n8nFetch(`/workflows${buildQuery({ active })}`);
    if ("error" in data) return data;
    return (data.data ?? data).map((w: Record<string, unknown>) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      updatedAt: w.updatedAt,
    }));
  },

  async getWorkflow(id: string) {
    return n8nFetch(`/workflows/${enc(id)}`);
  },

  async createWorkflow(body: Record<string, unknown>) {
    return n8nFetch("/workflows", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async updateWorkflow(id: string, body: Record<string, unknown>) {
    return n8nFetch(`/workflows/${enc(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async deleteWorkflow(id: string) {
    return n8nFetch(`/workflows/${enc(id)}`, { method: "DELETE" });
  },

  async activateWorkflow(id: string, active: boolean) {
    const endpoint = active ? "activate" : "deactivate";
    return n8nFetch(`/workflows/${enc(id)}/${endpoint}`, { method: "POST" });
  },

  async getWorkflowTags(id: string) {
    return n8nFetch(`/workflows/${enc(id)}/tags`);
  },

  async updateWorkflowTags(id: string, tagIds: string[]) {
    return n8nFetch(`/workflows/${enc(id)}/tags`, {
      method: "PUT",
      body: JSON.stringify(tagIds.map((tagId) => ({ id: tagId }))),
    });
  },

  async transferWorkflow(id: string, destinationProjectId: string) {
    return n8nFetch(`/workflows/${enc(id)}/transfer`, {
      method: "PUT",
      body: JSON.stringify({ destinationProjectId }),
    });
  },

  // ─── Executions ─────────────────────────────────────────

  async listExecutions(opts: { workflowId?: string; status?: string; limit?: number }) {
    const data = await n8nFetch(`/executions${buildQuery(opts)}`);
    if ("error" in data) return data;
    return (data.data ?? data).map((e: Record<string, unknown>) => ({
      id: e.id,
      workflowId: e.workflowId,
      status: e.status ?? (e.finished ? "success" : "error"),
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
    }));
  },

  async getExecution(id: string) {
    return n8nFetch(`/executions/${enc(id)}`);
  },

  async deleteExecution(id: string) {
    return n8nFetch(`/executions/${enc(id)}`, { method: "DELETE" });
  },

  async retryExecution(id: string) {
    return n8nFetch(`/executions/${enc(id)}/retry`, { method: "POST" });
  },

  // ─── Credentials ────────────────────────────────────────

  async createCredential(body: Record<string, unknown>) {
    return n8nFetch("/credentials", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async deleteCredential(id: string) {
    return n8nFetch(`/credentials/${enc(id)}`, { method: "DELETE" });
  },

  async getCredentialSchema(typeName: string) {
    return n8nFetch(`/credentials/schema/${enc(typeName)}`);
  },

  async transferCredential(id: string, destinationProjectId: string) {
    return n8nFetch(`/credentials/${enc(id)}/transfer`, {
      method: "PUT",
      body: JSON.stringify({ destinationProjectId }),
    });
  },

  // ─── Tags ───────────────────────────────────────────────

  async listTags() {
    return n8nFetch("/tags");
  },

  async getTag(id: string) {
    return n8nFetch(`/tags/${enc(id)}`);
  },

  async createTag(name: string) {
    return n8nFetch("/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async updateTag(id: string, name: string) {
    return n8nFetch(`/tags/${enc(id)}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  },

  async deleteTag(id: string) {
    return n8nFetch(`/tags/${enc(id)}`, { method: "DELETE" });
  },

  // ─── Variables ──────────────────────────────────────────

  async listVariables() {
    return n8nFetch("/variables");
  },

  async createVariable(key: string, value: string) {
    return n8nFetch("/variables", {
      method: "POST",
      body: JSON.stringify({ key, value }),
    });
  },

  async updateVariable(id: string, key: string, value: string) {
    return n8nFetch(`/variables/${enc(id)}`, {
      method: "PUT",
      body: JSON.stringify({ key, value }),
    });
  },

  async deleteVariable(id: string) {
    return n8nFetch(`/variables/${enc(id)}`, { method: "DELETE" });
  },

  // ─── Users ──────────────────────────────────────────────

  async listUsers() {
    return n8nFetch("/users");
  },

  async getUser(idOrEmail: string) {
    return n8nFetch(`/users/${enc(idOrEmail)}`);
  },

  async createUsers(users: Array<{ email: string; role?: string }>) {
    return n8nFetch("/users", {
      method: "POST",
      body: JSON.stringify(users),
    });
  },

  async deleteUser(id: string, opts?: { transferId?: string }) {
    const query = opts?.transferId ? buildQuery({ transferId: opts.transferId }) : "";
    return n8nFetch(`/users/${enc(id)}${query}`, { method: "DELETE" });
  },

  async changeUserRole(id: string, newRoleName: string) {
    return n8nFetch(`/users/${enc(id)}/role`, {
      method: "PATCH",
      body: JSON.stringify({ newRoleName }),
    });
  },

  // ─── Projects ───────────────────────────────────────────

  async listN8nProjects() {
    return n8nFetch("/projects");
  },

  async createN8nProject(name: string) {
    return n8nFetch("/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async updateN8nProject(id: string, name: string) {
    return n8nFetch(`/projects/${enc(id)}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  },

  async deleteN8nProject(id: string) {
    return n8nFetch(`/projects/${enc(id)}`, { method: "DELETE" });
  },

  // ─── Source Control ─────────────────────────────────────

  async sourceControlPull(force?: boolean) {
    return n8nFetch("/source-control/pull", {
      method: "POST",
      body: JSON.stringify({ force: force ?? false }),
    });
  },

  // ─── Audit ──────────────────────────────────────────────

  async generateAudit(categories?: string[]) {
    return n8nFetch("/audit", {
      method: "POST",
      body: JSON.stringify(categories ? { categories } : {}),
    });
  },
};
