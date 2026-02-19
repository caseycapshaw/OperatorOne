import Link from "next/link";
import { Ticket } from "lucide-react";
import { getTickets } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { EmptyState } from "@/components/console/empty-state";
import {
  ticketStatusLabels,
  ticketStatusVariants,
  priorityLabels,
  priorityVariants,
} from "@/components/console/status-helpers";
import { formatRelative } from "@/lib/utils";

export default async function TicketsPage() {
  const tickets = await getTickets();

  return (
    <div className="space-y-6 animate-[grid-fade_0.3s_ease-out]">
      <div>
        <h1 className="text-lg font-bold uppercase tracking-widest text-text-primary">
          Tickets
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Support tickets and issue tracking
        </p>
      </div>

      {tickets.length > 0 ? (
        <HudFrame>
          <div className="divide-y divide-grid-border">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/tickets/${ticket.id}`}
                className="flex items-center gap-4 p-3 transition-colors hover:bg-grid-dark/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {ticket.title}
                  </p>
                  <p className="mt-1 text-[10px] text-text-muted">
                    {formatRelative(ticket.createdAt)}
                  </p>
                </div>
                <Badge variant={priorityVariants[ticket.priority]}>
                  {priorityLabels[ticket.priority]}
                </Badge>
                <Badge variant={ticketStatusVariants[ticket.status]}>
                  {ticketStatusLabels[ticket.status]}
                </Badge>
              </Link>
            ))}
          </div>
        </HudFrame>
      ) : (
        <HudFrame>
          <EmptyState
            icon={<Ticket className="h-8 w-8" />}
            title="No tickets"
            description="Support tickets will appear here when created"
          />
        </HudFrame>
      )}
    </div>
  );
}
