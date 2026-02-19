"use client";

import { cn } from "@/lib/utils";

interface HudFrameProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  variant?: "default" | "accent" | "warning" | "danger";
}

const variantStyles = {
  default: {
    border: "border-grid-border",
    corner: "bg-neon-cyan",
    title: "text-neon-cyan",
    glow: "shadow-[var(--shadow-glow-cyan-sm)]",
  },
  accent: {
    border: "border-neon-blue/30",
    corner: "bg-neon-blue",
    title: "text-neon-blue",
    glow: "shadow-[0_0_6px_rgba(41,121,255,0.2)]",
  },
  warning: {
    border: "border-neon-orange/30",
    corner: "bg-neon-orange",
    title: "text-neon-orange",
    glow: "shadow-[0_0_6px_rgba(255,109,0,0.2)]",
  },
  danger: {
    border: "border-neon-red/30",
    corner: "bg-neon-red",
    title: "text-neon-red",
    glow: "shadow-[0_0_6px_rgba(255,23,68,0.2)]",
  },
};

export function HudFrame({
  children,
  title,
  className,
  variant = "default",
}: HudFrameProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "relative border bg-grid-panel/80 backdrop-blur-sm",
        styles.border,
        styles.glow,
        className
      )}
    >
      {/* Corner accents */}
      <div className={cn("absolute top-0 left-0 h-3 w-[1px]", styles.corner)} />
      <div className={cn("absolute top-0 left-0 h-[1px] w-3", styles.corner)} />
      <div className={cn("absolute top-0 right-0 h-3 w-[1px]", styles.corner)} />
      <div className={cn("absolute top-0 right-0 h-[1px] w-3", styles.corner)} />
      <div className={cn("absolute bottom-0 left-0 h-3 w-[1px]", styles.corner)} />
      <div className={cn("absolute bottom-0 left-0 h-[1px] w-3", styles.corner)} />
      <div className={cn("absolute bottom-0 right-0 h-3 w-[1px]", styles.corner)} />
      <div className={cn("absolute bottom-0 right-0 h-[1px] w-3", styles.corner)} />

      {title && (
        <div className="border-b border-grid-border px-4 py-2">
          <span className={cn("text-xs uppercase tracking-widest", styles.title)}>
            {title}
          </span>
        </div>
      )}

      <div className="p-4">{children}</div>
    </div>
  );
}
