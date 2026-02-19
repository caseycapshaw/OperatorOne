import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, organizationMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the current authenticated client record from the database.
 * Returns null if not authenticated or client not found.
 */
export async function getCurrentClient() {
  const session = await auth();
  if (!session?.user?.authentikUid) return null;

  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.authentikUid, session.user.authentikUid))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Get the current client's organization ID.
 * Returns the first organization membership found.
 */
export async function getCurrentOrgId() {
  const client = await getCurrentClient();
  if (!client) return null;

  const membership = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.clientId, client.id))
    .limit(1);

  return membership[0]?.organizationId ?? null;
}

/**
 * Require authentication - throws redirect if not authenticated.
 */
export async function requireAuth() {
  const client = await getCurrentClient();
  if (!client) {
    throw new Error("UNAUTHORIZED");
  }
  return client;
}
