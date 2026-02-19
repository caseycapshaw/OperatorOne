import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/queries";
import { getCurrentClient } from "@/lib/session";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { AdminForm } from "@/components/console/admin-form";
import { AdminIntegrations } from "@/components/console/admin-integrations";

export default async function AdminPage() {
  const [org, client] = await Promise.all([
    getCurrentOrganization(),
    getCurrentClient(),
  ]);

  if (!org || !client) {
    redirect("/login");
  }

  return (
    <div className="space-y-6 animate-[grid-fade_0.3s_ease-out]">
      <div>
        <h1 className="text-lg font-bold uppercase tracking-widest text-text-primary">
          Admin
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Organization identity, integrations, and system configuration
        </p>
      </div>

      <HudFrame title="Identity">
        <AdminForm
          initial={{
            orgName: org.name,
            orgDomain: org.domain ?? "",
            operatorName: client.name,
            operatorEmail: client.email,
          }}
        />
      </HudFrame>

      <AdminIntegrations />
    </div>
  );
}
