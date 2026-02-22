import { generateText } from "ai";
import { getModelFactory } from "@/lib/ai/provider";
import { resolveDefaultModel } from "@/lib/ai/models";
import { db } from "@/lib/db";
import {
  requests,
  tickets,
  requestComments,
  ticketComments,
  activityLog,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

interface TriageInput {
  entityType: "request" | "ticket";
  entityId: string;
  orgId: string;
}

export async function triageEntity({ entityType, entityId, orgId }: TriageInput) {
  let entity: Record<string, unknown> | null = null;

  if (entityType === "request") {
    const [r] = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, entityId), eq(requests.organizationId, orgId)))
      .limit(1);
    entity = r ? { ...r, createdAt: r.createdAt?.toISOString(), updatedAt: r.updatedAt?.toISOString() } : null;
  } else {
    const [t] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, entityId), eq(tickets.organizationId, orgId)))
      .limit(1);
    entity = t ? { ...t, createdAt: t.createdAt?.toISOString(), updatedAt: t.updatedAt?.toISOString() } : null;
  }

  if (!entity) return;

  // Get recent similar items for context
  const recentActivity = await db
    .select()
    .from(activityLog)
    .where(eq(activityLog.organizationId, orgId))
    .orderBy(desc(activityLog.createdAt))
    .limit(5);

  const systemPrompt = `You are Operator One's triage system. A new ${entityType} has been submitted. Your job:
1. Acknowledge the ${entityType} with a brief, professional comment.
2. Assess if the priority seems appropriate based on the title and description.
3. If the priority seems wrong, note what you think it should be (but don't change it without admin action).
4. Identify if this is similar to any recent activity.

Be concise — 2-3 sentences max. Direct and competent. No exclamation marks.`;

  const userContent = `New ${entityType}:
Title: ${entity.title}
Description: ${entity.description}
Priority: ${entity.priority}
${entityType === "request" ? `Category: ${entity.category}` : ""}

Recent activity: ${recentActivity.map((a) => a.title).join("; ")}`;

  try {
    const [provider, modelId] = await Promise.all([
      getModelFactory(orgId),
      resolveDefaultModel(orgId),
    ]);
    const { text } = await generateText({
      model: provider(modelId),
      system: systemPrompt,
      prompt: userContent,
      maxOutputTokens: 200,
    });

    // Add the triage comment to the correct table
    if (entityType === "request") {
      await db.insert(requestComments).values({
        requestId: entityId,
        clientId: null,
        authorName: "AI Assistant",
        body: text,
        isInternal: false,
      });
    } else {
      await db.insert(ticketComments).values({
        ticketId: entityId,
        clientId: null,
        authorName: "AI Assistant",
        body: text,
        isInternal: false,
      });
    }

    // Log the triage action
    await db.insert(activityLog).values({
      organizationId: orgId,
      clientId: null,
      type: "ai_chat_action",
      title: `AI triaged ${entityType}: ${entity.title}`,
      metadata: { entityId, entityType, action: "triage" },
    });
  } catch (err) {
    console.error(`Triage failed for ${entityType} ${entityId}:`, err);
  }
}
