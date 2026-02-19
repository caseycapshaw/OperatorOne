import Link from "next/link";
import { Send, Plus } from "lucide-react";
import { getRequests } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { EmptyState } from "@/components/console/empty-state";
import {
  requestStatusLabels,
  requestStatusVariants,
  requestCategoryLabels,
  priorityLabels,
  priorityVariants,
} from "@/components/console/status-helpers";
import { formatRelative } from "@/lib/utils";

export default async function RequestsPage() {
  const requests = await getRequests();

  return (
    <div className="space-y-6 animate-[grid-fade_0.3s_ease-out]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-widest text-text-primary">
            Requests
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            View and manage your service requests
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/requests/new">
            <Plus className="h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      {requests.length > 0 ? (
        <HudFrame>
          <div className="divide-y divide-grid-border">
            {requests.map((req) => (
              <Link
                key={req.id}
                href={`/dashboard/requests/${req.id}`}
                className="flex items-center gap-4 p-3 transition-colors hover:bg-grid-dark/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {req.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-text-muted">
                      {requestCategoryLabels[req.category]}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {formatRelative(req.createdAt)}
                    </span>
                  </div>
                </div>
                <Badge variant={priorityVariants[req.priority]}>
                  {priorityLabels[req.priority]}
                </Badge>
                <Badge variant={requestStatusVariants[req.status]}>
                  {requestStatusLabels[req.status]}
                </Badge>
              </Link>
            ))}
          </div>
        </HudFrame>
      ) : (
        <HudFrame>
          <EmptyState
            icon={<Send className="h-8 w-8" />}
            title="No requests yet"
            description="Submit your first service request to get started"
            action={
              <Button asChild size="sm">
                <Link href="/dashboard/requests/new">
                  <Plus className="h-4 w-4" />
                  New Request
                </Link>
              </Button>
            }
          />
        </HudFrame>
      )}
    </div>
  );
}
