import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getRequest } from "@/lib/queries";
import { addRequestComment } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { Separator } from "@/components/ui/separator";
import { CommentThread } from "@/components/console/comment-thread";
import {
  requestStatusLabels,
  requestStatusVariants,
  requestCategoryLabels,
  priorityLabels,
  priorityVariants,
} from "@/components/console/status-helpers";
import { formatDate } from "@/lib/utils";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getRequest(id);
  if (!request) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-[grid-fade_0.3s_ease-out]">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/requests"
          className="text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-text-primary">
            {request.title}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={requestStatusVariants[request.status]}>
              {requestStatusLabels[request.status]}
            </Badge>
            <Badge variant={priorityVariants[request.priority]}>
              {priorityLabels[request.priority]}
            </Badge>
            <span className="text-[10px] text-text-muted">
              {requestCategoryLabels[request.category]}
            </span>
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
              {formatDate(request.createdAt)}
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
              {request.description}
            </p>
          </div>
        </div>
      </HudFrame>

      <HudFrame title="Discussion">
        <CommentThread
          comments={request.comments}
          formAction={addRequestComment}
          entityId={request.id}
          entityIdField="requestId"
        />
      </HudFrame>
    </div>
  );
}
