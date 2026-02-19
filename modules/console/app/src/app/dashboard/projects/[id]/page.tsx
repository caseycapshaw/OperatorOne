import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Clock, SkipForward } from "lucide-react";
import { getProject } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { Separator } from "@/components/ui/separator";
import {
  projectStatusLabels,
  projectStatusVariants,
  milestoneStatusLabels,
  milestoneStatusVariants,
} from "@/components/console/status-helpers";
import { formatDate } from "@/lib/utils";

const milestoneIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  skipped: SkipForward,
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-[grid-fade_0.3s_ease-out]">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/projects"
          className="text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-text-primary">
            {project.name}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={projectStatusVariants[project.status]}>
              {projectStatusLabels[project.status]}
            </Badge>
            <span className="text-[10px] text-text-muted">
              {project.progress}% complete
            </span>
          </div>
        </div>
      </div>

      <HudFrame title="Overview">
        <div className="space-y-4">
          {project.description && (
            <p className="text-sm text-text-secondary">{project.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {project.startDate && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted">
                  Start Date
                </p>
                <p className="text-text-secondary">
                  {formatDate(project.startDate)}
                </p>
              </div>
            )}
            {project.targetDate && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted">
                  Target Date
                </p>
                <p className="text-text-secondary">
                  {formatDate(project.targetDate)}
                </p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div>
            <div className="h-2 w-full bg-grid-border">
              <div
                className="h-full bg-neon-cyan transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>
      </HudFrame>

      <HudFrame title="Milestones">
        {project.milestones.length > 0 ? (
          <div className="space-y-1">
            {project.milestones.map((ms, i) => {
              const Icon = milestoneIcons[ms.status];
              const isCompleted = ms.status === "completed";

              return (
                <div key={ms.id}>
                  <div className="flex items-start gap-3 p-2">
                    <div className="mt-0.5">
                      <Icon
                        className={`h-4 w-4 ${
                          isCompleted ? "text-neon-green" : "text-text-muted"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-sm ${
                            isCompleted
                              ? "text-text-muted line-through"
                              : "text-text-primary"
                          }`}
                        >
                          {ms.title}
                        </p>
                        <Badge variant={milestoneStatusVariants[ms.status]}>
                          {milestoneStatusLabels[ms.status]}
                        </Badge>
                      </div>
                      {ms.description && (
                        <p className="mt-1 text-xs text-text-secondary">
                          {ms.description}
                        </p>
                      )}
                      {ms.dueDate && (
                        <p className="mt-1 text-[10px] text-text-muted">
                          Due: {formatDate(ms.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  {i < project.milestones.length - 1 && <Separator />}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-text-muted">
            No milestones defined yet
          </p>
        )}
      </HudFrame>
    </div>
  );
}
