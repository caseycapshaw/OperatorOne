import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, organizationMembers, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface ChatSessionContext {
  clientId: string;
  orgId: string;
  orgName: string;
  role: "owner" | "admin" | "member" | "viewer";
}

export async function getChatSessionContext(): Promise<ChatSessionContext | null> {
  const session = await auth();
  if (!session?.user?.authentikUid) return null;

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.authentikUid, session.user.authentikUid))
    .limit(1);

  if (!client) return null;

  const [membership] = await db
    .select({
      orgId: organizationMembers.organizationId,
      role: organizationMembers.role,
      orgName: organizations.name,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.clientId, client.id))
    .limit(1);

  if (!membership) return null;

  return {
    clientId: client.id,
    orgId: membership.orgId,
    orgName: membership.orgName,
    role: membership.role,
  };
}
