"use client";

import { cn } from "@/lib/utils";

interface DataCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function DataCard({
  label,
  value,
  subtext,
  icon,
  trend,
  className,
}: DataCardProps) {
  return (
    <div
      className={cn(
        "relative border border-grid-border bg-grid-panel/80 p-4",
        "shadow-[var(--shadow-glow-cyan-sm)]",
        "transition-all duration-200 hover:border-neon-cyan/40",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-text-muted">
            {label}
          </p>
          <p className="text-2xl font-bold text-neon-cyan tabular-nums">
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-text-secondary">{subtext}</p>
          )}
        </div>
        {icon && (
          <div className="text-neon-cyan/50">{icon}</div>
        )}
      </div>

      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span
            className={cn(
              "text-[10px] font-medium",
              trend === "up" && "text-neon-green",
              trend === "down" && "text-neon-red",
              trend === "neutral" && "text-text-muted"
            )}
          >
            {trend === "up" && "\u25B2"}
            {trend === "down" && "\u25BC"}
            {trend === "neutral" && "\u25CF"}
          </span>
        </div>
      )}

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent" />
    </div>
  );
}
