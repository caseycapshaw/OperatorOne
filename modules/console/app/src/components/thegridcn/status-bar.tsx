"use client";

import { cn } from "@/lib/utils";

interface StatusBarProps {
  items: { label: string; value: string; color?: string }[];
  className?: string;
}

export function StatusBar({ items, className }: StatusBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-y border-grid-border bg-grid-dark/80 px-4 py-2",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-text-muted">
            {item.label}
          </span>
          <span
            className={cn(
              "text-xs font-medium",
              item.color ?? "text-neon-cyan"
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
