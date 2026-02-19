import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full border border-grid-border bg-grid-dark/80 px-3 py-1 text-sm text-text-primary shadow-sm transition-colors",
          "placeholder:text-text-muted",
          "focus-visible:outline-none focus-visible:border-neon-cyan/50 focus-visible:shadow-[var(--shadow-glow-cyan-sm)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
