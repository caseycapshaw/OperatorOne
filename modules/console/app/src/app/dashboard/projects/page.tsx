import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { getProjects } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { EmptyState } from "@/components/console/empty-state";
import {
  projectStatusLabels,
  projectStatusVariants,
} from "@/components/console/status-helpers";
import { formatDate } from "@/lib/utils";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="space-y-6 animate-[grid-fade_0.3s_ease-out]">
      <div>
        <h1 className="text-lg font-bold uppercase tracking-widest text-text-primary">
          Projects
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Track the progress of your projects
        </p>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((proj) => (
            <Link key={proj.id} href={`/dashboard/projects/${proj.id}`}>
              <HudFrame className="h-full transition-all hover:border-neon-cyan/30">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-medium text-text-primary">
                      {proj.name}
                    </h3>
                    <Badge variant={projectStatusVariants[proj.status]}>
                      {projectStatusLabels[proj.status]}
                    </Badge>
                  </div>

                  {proj.description && (
                    <p className="line-clamp-2 text-xs text-text-secondary">
                      {proj.description}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-text-muted">Progress</span>
                      <span className="text-neon-cyan">{proj.progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-grid-border">
                      <div
                        className="h-full bg-neon-cyan transition-all"
                        style={{ width: `${proj.progress}%` }}
                      />
                    </div>
                  </div>

                  {proj.targetDate && (
                    <p className="text-[10px] text-text-muted">
                      Target: {formatDate(proj.targetDate)}
                    </p>
                  )}
                </div>
              </HudFrame>
            </Link>
          ))}
        </div>
      ) : (
        <HudFrame>
          <EmptyState
            icon={<FolderKanban className="h-8 w-8" />}
            title="No projects yet"
            description="Projects will appear here once created by your team"
          />
        </HudFrame>
      )}
    </div>
  );
}
