import NextAuth from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients, organizations, organizationMembers } from "@/db/schema";
import { getOrgIdentity, clearOrgIdentity } from "@/lib/setup";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: "authentik",
      name: "Authentik",
      type: "oidc",
      // In dev, issuer must use Docker service name for server-to-server
      // OIDC discovery. AUTH_AUTHENTIK_ISSUER is the internal URL.
      issuer: process.env.AUTH_AUTHENTIK_ISSUER,
      clientId: process.env.AUTH_AUTHENTIK_ID,
      clientSecret: process.env.AUTH_AUTHENTIK_SECRET,
      token: process.env.AUTH_AUTHENTIK_TOKEN_URL || undefined,
      userinfo: process.env.AUTH_AUTHENTIK_USERINFO_URL || undefined,
      // Authorization URL must be browser-accessible (not Docker-internal)
      authorization: {
        url: process.env.AUTH_AUTHENTIK_AUTH_URL || undefined,
        params: { scope: "openid profile email" },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username,
          email: profile.email,
          image: profile.picture ?? null,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "authentik" || !account.providerAccountId) {
        return false;
      }

      // Auto-provision client record on first login
      const existing = await db
        .select()
        .from(clients)
        .where(eq(clients.authentikUid, account.providerAccountId))
        .limit(1);

      if (existing.length === 0) {
        // Check for stored org identity from setup wizard
        const identity = await getOrgIdentity();

        const clientName = identity?.operatorName || user.name || "Unknown";
        const clientEmail = identity?.operatorEmail || user.email || "";

        const [newClient] = await db
          .insert(clients)
          .values({
            authentikUid: account.providerAccountId,
            email: clientEmail,
            name: clientName,
            avatarUrl: user.image ?? null,
          })
          .returning();

        // Auto-create default org + admin membership if no orgs exist yet
        const existingOrgs = await db.select().from(organizations).limit(1);
        if (existingOrgs.length === 0) {
          const orgName = identity?.orgName || "My Organization";
          const orgSlug = orgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "default";

          const [org] = await db
            .insert(organizations)
            .values({
              name: orgName,
              slug: orgSlug,
              domain: identity?.orgDomain || null,
            })
            .returning();
          await db.insert(organizationMembers).values({
            organizationId: org.id,
            clientId: newClient.id,
            role: "admin",
          });

          if (identity) {
            await clearOrgIdentity();
          }
        }
      } else {
        // Update name/email/avatar on each login
        await db
          .update(clients)
          .set({
            email: user.email ?? existing[0].email,
            name: user.name ?? existing[0].name,
            avatarUrl: user.image ?? existing[0].avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(clients.authentikUid, account.providerAccountId));
      }

      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        token.authentikUid = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.authentikUid) {
        session.user.authentikUid = token.authentikUid as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
