import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export const requestStatusLabels: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const requestStatusVariants: Record<string, BadgeVariant> = {
  submitted: "info",
  under_review: "warning",
  in_progress: "default",
  completed: "success",
  cancelled: "secondary",
};

export const requestCategoryLabels: Record<string, string> = {
  general: "General",
  technical: "Technical",
  billing: "Billing",
  feature: "Feature",
  bug: "Bug",
  other: "Other",
};

export const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
  critical: "Critical",
};

export const priorityVariants: Record<string, BadgeVariant> = {
  low: "secondary",
  medium: "info",
  high: "warning",
  urgent: "danger",
  critical: "danger",
};

export const projectStatusLabels: Record<string, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const projectStatusVariants: Record<string, BadgeVariant> = {
  planning: "info",
  in_progress: "default",
  on_hold: "warning",
  completed: "success",
  cancelled: "secondary",
};

export const milestoneStatusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
};

export const milestoneStatusVariants: Record<string, BadgeVariant> = {
  pending: "secondary",
  in_progress: "default",
  completed: "success",
  skipped: "secondary",
};

export const ticketStatusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_client: "Waiting on Client",
  resolved: "Resolved",
  closed: "Closed",
};

export const ticketStatusVariants: Record<string, BadgeVariant> = {
  open: "info",
  in_progress: "default",
  waiting_on_client: "warning",
  resolved: "success",
  closed: "secondary",
};
