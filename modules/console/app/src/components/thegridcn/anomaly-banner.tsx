"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface AnomalyBannerProps {
  message: string;
  severity?: "info" | "warning" | "critical";
  dismissible?: boolean;
  className?: string;
}

const severityStyles = {
  info: {
    bg: "bg-neon-blue/5",
    border: "border-neon-blue/30",
    text: "text-neon-blue",
    icon: "text-neon-blue",
  },
  warning: {
    bg: "bg-neon-orange/5",
    border: "border-neon-orange/30",
    text: "text-neon-orange",
    icon: "text-neon-orange",
  },
  critical: {
    bg: "bg-neon-red/5",
    border: "border-neon-red/30",
    text: "text-neon-red",
    icon: "text-neon-red",
  },
};

export function AnomalyBanner({
  message,
  severity = "info",
  dismissible = true,
  className,
}: AnomalyBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const styles = severityStyles[severity];

  return (
    <div
      className={cn(
        "flex items-center gap-3 border px-4 py-2",
        styles.bg,
        styles.border,
        className
      )}
    >
      <AlertTriangle className={cn("h-4 w-4 shrink-0", styles.icon)} />
      <span className={cn("flex-1 text-xs", styles.text)}>{message}</span>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="text-text-muted hover:text-text-primary"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
