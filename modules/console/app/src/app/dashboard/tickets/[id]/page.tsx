import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTicket } from "@/lib/queries";
import { addTicketComment } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { Separator } from "@/components/ui/separator";
import { CommentThread } from "@/components/console/comment-thread";
import {
  ticketStatusLabels,
  ticketStatusVariants,
  priorityLabels,
  priorityVariants,
} from "@/components/console/status-helpers";
import { formatDate } from "@/lib/utils";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-[grid-fade_0.3s_ease-out]">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tickets"
          className="text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-text-primary">
            {ticket.title}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={ticketStatusVariants[ticket.status]}>
              {ticketStatusLabels[ticket.status]}
            </Badge>
            <Badge variant={priorityVariants[ticket.priority]}>
              {priorityLabels[ticket.priority]}
            </Badge>
          </div>
        </div>
      </div>

      <HudFrame title="Details">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">
              Submitted
            </p>
            <p className="text-sm text-text-secondary">
              {formatDate(ticket.createdAt)}
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
              {ticket.description}
            </p>
          </div>

          {ticket.resolvedAt && (
            <>
              <Separator />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted">
                  Resolved
                </p>
                <p className="text-sm text-neon-green">
                  {formatDate(ticket.resolvedAt)}
                </p>
              </div>
            </>
          )}
        </div>
      </HudFrame>

      <HudFrame title="Discussion">
        <CommentThread
          comments={ticket.comments}
          formAction={addTicketComment}
          entityId={ticket.id}
          entityIdField="ticketId"
        />
      </HudFrame>
    </div>
  );
}
