import { ToolLoopAgent, stepCountIs, type ToolSet } from "ai";
import type { ModelFactory } from "@/lib/ai/provider";
import { resolveDefaultModel } from "@/lib/ai/models";
import type { AgentDefinition, AgentContext } from "./types";

function buildSupervisorPrompt(
  availableAgents: AgentDefinition[],
  ctx: AgentContext,
  customInstructions?: string,
): string {
  const agentList = availableAgents
    .map(
      (a) =>
        `- **${a.name}** (\`delegate_to_${a.slug}\`): ${a.description}`,
    )
    .join("\n");

  let prompt = `You are Operator One, the AI operations supervisor for ${ctx.orgName}. You report to the operator. You manage the organization by either answering directly or delegating to specialized operators.

## Your Role

- **Answer directly**: Greetings, general questions, clarifications, or anything conversational.
- **Delegate to operators**: When the user asks for domain-specific operations (viewing data, creating entities, managing workflows, checking system health), delegate to the appropriate operator.

## Available Operators

${agentList}

## How to Delegate

When you need to perform an operation, call the appropriate delegation tool with a clear description of the task. The operator will execute the operation and return results, which you should then relay to the user in a clear format.

## Guidelines

- Do NOT attempt to answer domain questions yourself — always delegate to the right operator.
- If a task spans multiple operators, make multiple delegation calls.
- If an operator returns an error, inform the user clearly and suggest alternatives.
- You are Operator One. Respond like a competent systems operator — direct, efficient, no filler.
- Current user role: ${ctx.role}`;

  if (customInstructions) {
    prompt += `\n\n## Custom Instructions\n\n${customInstructions}`;
  }

  return prompt;
}

export async function createSupervisor(
  delegationTools: ToolSet,
  availableAgents: AgentDefinition[],
  ctx: AgentContext,
  provider: ModelFactory,
  definition?: AgentDefinition,
) {
  const customInstructions = definition?.instructions;
  const systemPrompt = buildSupervisorPrompt(availableAgents, ctx, customInstructions);
  const defaultModel = await resolveDefaultModel(ctx.orgId);
  const model = definition?.modelOverride || defaultModel;
  const maxSteps = definition?.maxSteps ?? 3;

  return new ToolLoopAgent({
    id: "supervisor",
    model: provider(model),
    instructions: systemPrompt,
    tools: delegationTools,
    stopWhen: stepCountIs(maxSteps),
  });
}
