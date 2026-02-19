"use client";

import { cn } from "@/lib/utils";

interface GlowContainerProps {
  children: React.ReactNode;
  color?: "cyan" | "orange" | "red" | "green" | "blue";
  className?: string;
  intensity?: "low" | "medium" | "high";
}

const glowColors = {
  cyan: "shadow-[var(--shadow-glow-cyan)]",
  orange: "shadow-[var(--shadow-glow-orange)]",
  red: "shadow-[var(--shadow-glow-red)]",
  green: "shadow-[var(--shadow-glow-green)]",
  blue: "shadow-[0_0_10px_rgba(41,121,255,0.3),0_0_40px_rgba(41,121,255,0.1)]",
};

const borderColors = {
  cyan: "border-neon-cyan/30",
  orange: "border-neon-orange/30",
  red: "border-neon-red/30",
  green: "border-neon-green/30",
  blue: "border-neon-blue/30",
};

export function GlowContainer({
  children,
  color = "cyan",
  className,
}: GlowContainerProps) {
  return (
    <div
      className={cn(
        "border bg-grid-panel/60 backdrop-blur-sm",
        borderColors[color],
        glowColors[color],
        className
      )}
    >
      {children}
    </div>
  );
}
