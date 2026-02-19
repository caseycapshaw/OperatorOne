import Link from "next/link";
import { Send } from "lucide-react";
import { DataCard } from "@/components/thegridcn/data-card";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { Badge } from "@/components/ui/badge";
import {
  requestStatusLabels,
  requestStatusVariants,
} from "@/components/console/status-helpers";
import { formatRelative } from "@/lib/utils";

interface DashboardSidebarProps {
  data: {
    recentRequests: Array<{
      id: string;
      title: string;
      status: string;
      createdAt: Date;
    }>;
    stats: {
      requests: { total: number; open: number } | null;
    };
  };
}

export function DashboardSidebar({ data }: DashboardSidebarProps) {
  const { recentRequests, stats } = data;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Stat card */}
      <DataCard
        label="Open Requests"
        value={stats.requests?.open ?? 0}
        subtext={`${stats.requests?.total ?? 0} total`}
        icon={<Send className="h-4 w-4" />}
      />

      {/* Recent requests */}
      <HudFrame title="Recent Requests">
        {recentRequests.length > 0 ? (
          <div className="space-y-1">
            {recentRequests.slice(0, 4).map((req) => (
              <Link
                key={req.id}
                href={`/dashboard/requests/${req.id}`}
                className="flex items-center justify-between p-1.5 text-xs transition-colors hover:bg-grid-dark/50"
              >
                <span className="min-w-0 truncate text-text-primary">
                  {req.title}
                </span>
                <Badge
                  variant={requestStatusVariants[req.status]}
                  className="ml-2 shrink-0 text-[9px]"
                >
                  {requestStatusLabels[req.status]}
                </Badge>
              </Link>
            ))}
            <Link
              href="/dashboard/requests"
              className="block pt-1 text-center text-[10px] uppercase tracking-widest text-neon-cyan hover:underline"
            >
              View All
            </Link>
          </div>
        ) : (
          <p className="py-2 text-center text-[10px] text-text-muted">
            No requests yet
          </p>
        )}
      </HudFrame>
    </div>
  );
}
