"use client";

import { Wrench, Loader2, CheckCircle2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOL_LABELS: Record<string, string> = {
  list_requests: "Listing requests",
  get_request: "Getting request details",
  list_projects: "Listing projects",
  get_project: "Getting project details",
  list_tickets: "Listing tickets",
  get_ticket: "Getting ticket details",
  list_documents: "Listing documents",
  get_dashboard_stats: "Getting dashboard stats",
  search_activity: "Searching activity",
  create_request: "Creating request",
  update_request_status: "Updating request status",
  add_comment: "Adding comment",
  create_ticket: "Creating ticket",
  update_ticket_status: "Updating ticket status",
  list_workflows: "Listing workflows",
  get_workflow: "Getting workflow details",
  activate_workflow: "Toggling workflow",
  list_executions: "Listing executions",
  get_system_status: "Checking system status",
  check_updates: "Checking for updates",
  get_update_history: "Getting update history",
};

const DELEGATION_LABELS: Record<string, string> = {
  delegate_to_console_manager: "Console Manager",
  delegate_to_workflow_manager: "Workflow Manager",
  delegate_to_system_admin: "System Admin Manager",
};

function isDelegationTool(toolName: string): boolean {
  return toolName.startsWith("delegate_to_");
}

function getDelegationLabel(toolName: string): string {
  return (
    DELEGATION_LABELS[toolName] ??
    toolName
      .replace("delegate_to_", "")
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

interface ChatToolResultProps {
  toolName: string;
  state: string;
  result?: unknown;
}

export function ChatToolResult({ toolName, state }: ChatToolResultProps) {
  const isLoading = state === "call" || state === "partial-call";
  const isDelegation = isDelegationTool(toolName);

  if (isDelegation) {
    const agentName = getDelegationLabel(toolName);
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 text-xs py-2 px-3 border",
          isLoading
            ? "border-neon-cyan/30 bg-neon-cyan/10 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
            : "border-neon-cyan/10 bg-neon-cyan/5",
        )}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-neon-cyan" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-neon-green" />
        )}
        <Bot className="h-3.5 w-3.5 text-neon-cyan" />
        <span className="uppercase tracking-wider font-medium text-neon-cyan">
          {isLoading ? `${agentName} working` : `via ${agentName}`}
        </span>
        {isLoading && (
          <span className="flex gap-1 ml-1">
            <span className="h-1 w-1 rounded-full bg-neon-cyan animate-pulse" />
            <span className="h-1 w-1 rounded-full bg-neon-cyan animate-pulse [animation-delay:200ms]" />
            <span className="h-1 w-1 rounded-full bg-neon-cyan animate-pulse [animation-delay:400ms]" />
          </span>
        )}
      </div>
    );
  }

  const label = TOOL_LABELS[toolName] || toolName;
  return (
    <div className="flex items-center gap-2 text-[11px] text-text-muted py-1">
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin text-neon-cyan" />
      ) : (
        <CheckCircle2 className="h-3 w-3 text-neon-green" />
      )}
      <Wrench className="h-3 w-3" />
      <span className="uppercase tracking-wider">
        {isLoading ? label + "..." : label}
      </span>
    </div>
  );
}
