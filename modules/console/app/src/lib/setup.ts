import { db } from "@/lib/db";
import { setupConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function isSetupComplete(): Promise<boolean> {
  try {
    const rows = await db
      .select()
      .from(setupConfig)
      .where(eq(setupConfig.status, "completed"))
      .limit(1);
    return rows.length > 0;
  } catch {
    // Table may not exist on first boot before migration
    return false;
  }
}

export async function isSetupMode(): Promise<boolean> {
  const oauthConfigured = !!process.env.AUTH_AUTHENTIK_ID;
  if (oauthConfigured) return false;
  const complete = await isSetupComplete();
  return !complete;
}

export async function getSetupConfig() {
  try {
    const rows = await db.select().from(setupConfig).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function markSetupComplete(completedBy: string) {
  const existing = await getSetupConfig();
  if (existing) {
    await db
      .update(setupConfig)
      .set({
        status: "completed",
        completedAt: new Date(),
        completedBy,
        updatedAt: new Date(),
      })
      .where(eq(setupConfig.id, existing.id));
  } else {
    await db.insert(setupConfig).values({
      status: "completed",
      completedAt: new Date(),
      completedBy,
    });
  }
}

export interface ProviderCredentials {
  console: { clientId: string; clientSecret: string };
  grafana: { clientId: string; clientSecret: string };
}

export async function storeProviderCredentials(
  creds: ProviderCredentials,
): Promise<void> {
  const existing = await getSetupConfig();
  if (existing) {
    await db
      .update(setupConfig)
      .set({ providerCredentials: creds, updatedAt: new Date() })
      .where(eq(setupConfig.id, existing.id));
  } else {
    await db.insert(setupConfig).values({
      status: "in_progress",
      providerCredentials: creds,
    });
  }
}

export async function getProviderCredentials(): Promise<ProviderCredentials | null> {
  const config = await getSetupConfig();
  if (!config?.providerCredentials) return null;
  return config.providerCredentials as ProviderCredentials;
}

export async function clearProviderCredentials(): Promise<void> {
  const existing = await getSetupConfig();
  if (existing) {
    await db
      .update(setupConfig)
      .set({ providerCredentials: null, updatedAt: new Date() })
      .where(eq(setupConfig.id, existing.id));
  }
}

export interface OrgIdentity {
  orgName: string;
  orgDomain: string;
  operatorName: string;
  operatorEmail: string;
}

export async function storeOrgIdentity(identity: OrgIdentity): Promise<void> {
  const existing = await getSetupConfig();
  if (existing) {
    await db
      .update(setupConfig)
      .set({ orgIdentity: identity, updatedAt: new Date() })
      .where(eq(setupConfig.id, existing.id));
  } else {
    await db.insert(setupConfig).values({
      status: "in_progress",
      orgIdentity: identity,
    });
  }
}

export async function getOrgIdentity(): Promise<OrgIdentity | null> {
  const config = await getSetupConfig();
  if (!config?.orgIdentity) return null;
  return config.orgIdentity as OrgIdentity;
}

export async function clearOrgIdentity(): Promise<void> {
  const existing = await getSetupConfig();
  if (existing) {
    await db
      .update(setupConfig)
      .set({ orgIdentity: null, updatedAt: new Date() })
      .where(eq(setupConfig.id, existing.id));
  }
}

export function getSetupCode(): string | undefined {
  return process.env.SETUP_CODE || undefined;
}

export async function markSetupInProgress() {
  const existing = await getSetupConfig();
  if (existing) {
    await db
      .update(setupConfig)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(setupConfig.id, existing.id));
  } else {
    await db.insert(setupConfig).values({ status: "in_progress" });
  }
}
