import { ToolLoopAgent, stepCountIs } from "ai";
import type { ModelFactory } from "@/lib/ai/provider";
import { resolveDefaultModel } from "@/lib/ai/models";
import { resolveTools } from "./tool-registry";
import type { AgentDefinition, AgentContext } from "./types";
import { db } from "@/lib/db";
import { agentSkills } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function createSubAgent(definition: AgentDefinition, ctx: AgentContext, provider: ModelFactory) {
  const tools = resolveTools(definition.allowedTools, ctx, definition.toolSettings);
  const defaultModel = await resolveDefaultModel(ctx.orgId);
  const model = definition.modelOverride || defaultModel;

  // Load active skills for DB-backed agents
  const skills = isUuid(definition.id)
    ? await db
        .select()
        .from(agentSkills)
        .where(and(eq(agentSkills.agentId, definition.id), eq(agentSkills.isActive, true)))
        .orderBy(asc(agentSkills.sortOrder))
    : [];

  let instructions = definition.instructions;
  if (skills.length > 0) {
    const skillsBlock = skills.map((s) => `### ${s.name}\n${s.content}`).join("\n\n");
    instructions += `\n\n## Skills\n\n${skillsBlock}`;
  }

  return new ToolLoopAgent({
    id: `agent-${definition.slug}`,
    model: provider(model),
    instructions,
    tools,
    stopWhen: stepCountIs(definition.maxSteps),
  });
}
