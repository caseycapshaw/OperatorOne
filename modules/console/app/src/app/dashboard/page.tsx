import { Activity } from "lucide-react";
import { getDashboardData } from "@/lib/queries";
import { ChatPanel } from "@/components/chat/chat-panel";
import { DashboardSidebar } from "@/components/chat/dashboard-sidebar";
import { EmptyState } from "@/components/console/empty-state";

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <EmptyState
        icon={<Activity className="h-10 w-10" />}
        title="Command View"
        description="You are not yet assigned to an organization. Contact your administrator."
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 animate-[grid-fade_0.3s_ease-out]">
      {/* Dashboard stats & panels — top */}
      <div className="shrink-0">
        <DashboardSidebar data={data} />
      </div>

      {/* Chat — fills remaining height */}
      <div className="flex min-h-0 flex-1 flex-col border border-grid-border bg-grid-panel/80 shadow-[var(--shadow-glow-cyan-sm)]">
        <div className="border-b border-grid-border px-4 py-2">
          <span className="text-xs uppercase tracking-widest">
            <span className="text-text-primary">Operator</span><span className="text-neon-cyan">One</span>
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
