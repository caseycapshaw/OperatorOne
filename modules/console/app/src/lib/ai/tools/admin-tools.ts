import { tool } from "ai";
import { z } from "zod";
import { adminClient } from "../admin-client";

export function adminTools() {
  return {
    get_system_status: tool({
      description: "Get health and status of all system components (containers, versions)",
      inputSchema: z.object({}),
      execute: async () => {
        return adminClient.getSystemStatus();
      },
    }),

    check_updates: tool({
      description: "Check all components for available updates",
      inputSchema: z.object({
        component: z.string().optional(),
      }),
      execute: async ({ component }) => {
        return adminClient.checkUpdates(component);
      },
    }),

    get_update_history: tool({
      description: "Get history of updates and rollbacks performed on the system",
      inputSchema: z.object({
        limit: z.number().min(1).max(50).default(20),
      }),
      execute: async ({ limit }) => {
        return adminClient.getUpdateHistory(limit);
      },
    }),
  };
}
