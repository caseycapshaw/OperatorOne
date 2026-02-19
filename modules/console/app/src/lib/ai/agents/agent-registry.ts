import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { ModelFactory } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { SYSTEM_AGENTS } from "./predefined";
import { createSubAgent } from "./agent-factory";
import type { AgentDefinition, AgentContext, Role } from "./types";

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

function dbAgentToDefinition(row: typeof agents.$inferSelect): AgentDefinition {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
    isSystem: row.isSystem,
    minRole: row.minRole as Role,
    icon: row.icon,
    color: row.color,
    modelOverride: row.modelOverride,
    maxSteps: row.maxSteps,
    allowedTools: (row.allowedTools as string[]) ?? [],
    toolSettings: (row.toolSettings as Record<string, Record<string, string>>) ?? {},
    category: row.category as AgentDefinition["category"],
  };
}

const SUPERVISOR_SLUG = "operator-one";

export async function getSupervisorDefinition(
  ctx: AgentContext,
): Promise<AgentDefinition> {
  // Check for a DB override of operator-one for this org
  const [dbRow] = await db
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.organizationId, ctx.orgId),
        eq(agents.slug, SUPERVISOR_SLUG),
        eq(agents.isActive, true),
      ),
    )
    .limit(1);

  if (dbRow) {
    return dbAgentToDefinition(dbRow);
  }

  // Fall back to the system definition
  const systemDef = SYSTEM_AGENTS.find((a) => a.slug === SUPERVISOR_SLUG);
  if (!systemDef) {
    throw new Error("Operator One system definition not found");
  }
  return systemDef;
}

export async function getAvailableAgents(
  ctx: AgentContext,
): Promise<AgentDefinition[]> {
  // DB agents (template + custom + overridden system) for this org, active only
  const dbAgents = await db
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.organizationId, ctx.orgId),
        eq(agents.isActive, true),
      ),
    );

  const dbDefinitions = dbAgents.map(dbAgentToDefinition);
  const dbSlugs = new Set(dbDefinitions.map((a) => a.slug));

  // System agents filtered by role, excluding any overridden by DB
  // Exclude the supervisor — it's not a sub-agent to delegate to
  const systemAgents = SYSTEM_AGENTS.filter(
    (a) =>
      a.slug !== SUPERVISOR_SLUG &&
      hasMinRole(ctx.role, a.minRole) &&
      !dbSlugs.has(a.slug),
  );

  const customAgents = dbDefinitions.filter(
    (a) => a.slug !== SUPERVISOR_SLUG && hasMinRole(ctx.role, a.minRole),
  );

  return [...systemAgents, ...customAgents];
}

export function buildDelegationTools(
  availableAgents: AgentDefinition[],
  ctx: AgentContext,
  provider: ModelFactory,
) {
  const delegationTools: ToolSet = {};

  for (const agentDef of availableAgents) {
    const toolName = `delegate_to_${agentDef.slug}`;

    delegationTools[toolName] = tool({
      description: `${agentDef.name}: ${agentDef.description}`,
      inputSchema: z.object({
        task: z
          .string()
          .describe("The task or question to delegate to this agent"),
      }),
      execute: async ({ task }) => {
        try {
          const subAgent = await createSubAgent(agentDef, ctx, provider);
          const result = await subAgent.generate({ prompt: task });
          return { agent: agentDef.name, response: result.text };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unknown error";
          return {
            agent: agentDef.name,
            error: `Agent encountered an error: ${message}`,
          };
        }
      },
    });
  }

  return delegationTools;
}
