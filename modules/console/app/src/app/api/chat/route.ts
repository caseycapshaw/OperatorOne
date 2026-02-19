import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { getChatSessionContext } from "@/lib/ai/session-context";
import { getAvailableAgents, getSupervisorDefinition, buildDelegationTools } from "@/lib/ai/agents/agent-registry";
import { createSupervisor } from "@/lib/ai/agents/supervisor";
import { getAnthropicProvider } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { conversations, messages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const ctx = await getChatSessionContext();
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }

  const provider = await getAnthropicProvider();

  const body = await req.json();
  const { messages: chatMessages, conversationId } = body as {
    messages: UIMessage[];
    conversationId?: string;
  };

  const [availableAgents, supervisorDef] = await Promise.all([
    getAvailableAgents(ctx),
    getSupervisorDefinition(ctx),
  ]);
  const delegationTools = buildDelegationTools(availableAgents, ctx, provider);
  const supervisor = createSupervisor(delegationTools, availableAgents, ctx, provider, supervisorDef);

  return createAgentUIStreamResponse({
    agent: supervisor,
    uiMessages: chatMessages,
    onFinish: async ({ messages: finishedMessages }) => {
      try {
        // Extract the last user message text
        const userMsg = chatMessages[chatMessages.length - 1];
        const userText =
          userMsg?.parts
            ?.filter(
              (p): p is { type: "text"; text: string } => p.type === "text",
            )
            .map((p) => p.text)
            .join("\n") ?? "";

        // Extract assistant response text from finished messages
        const lastAssistant = finishedMessages
          ?.filter((m: UIMessage) => m.role === "assistant")
          .pop();
        const assistantText =
          lastAssistant?.parts
            ?.filter(
              (p): p is { type: "text"; text: string } => p.type === "text",
            )
            .map((p) => p.text)
            .join("\n") ?? "";

        if (!assistantText) return;

        if (!conversationId) {
          const title = userText.slice(0, 100) || "New conversation";

          const [conv] = await db
            .insert(conversations)
            .values({
              organizationId: ctx.orgId,
              clientId: ctx.clientId,
              title,
            })
            .returning();

          if (userText) {
            await db.insert(messages).values({
              conversationId: conv.id,
              role: "user",
              content: userText,
            });
          }

          await db.insert(messages).values({
            conversationId: conv.id,
            role: "assistant",
            content: assistantText,
          });
        } else {
          if (userText) {
            await db.insert(messages).values({
              conversationId,
              role: "user",
              content: userText,
            });
          }

          await db.insert(messages).values({
            conversationId,
            role: "assistant",
            content: assistantText,
          });

          await db
            .update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, conversationId));
        }
      } catch (err) {
        console.error("Failed to persist conversation:", err);
      }
    },
  });
}
