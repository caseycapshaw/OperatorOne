const ADMIN_MCP_URL = process.env.ADMIN_MCP_URL || "http://admin-mcp-server:3000";
const ADMIN_MCP_TOKEN = process.env.ADMIN_MCP_TOKEN || "";

async function adminFetch(path: string) {
  try {
    const res = await fetch(`${ADMIN_MCP_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${ADMIN_MCP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      return { error: `Admin API error (${res.status}): ${text}` };
    }

    return res.json();
  } catch (err) {
    return { error: `Admin API unavailable: ${err instanceof Error ? err.message : "unknown"}` };
  }
}

export const adminClient = {
  async getSystemStatus() {
    return adminFetch("/tools/system-status");
  },

  async checkUpdates(component?: string) {
    const params = component ? `?component=${encodeURIComponent(component)}` : "";
    return adminFetch(`/tools/check-updates${params}`);
  },

  async getUpdateHistory(limit = 20) {
    return adminFetch(`/tools/update-history?limit=${limit}`);
  },
};
