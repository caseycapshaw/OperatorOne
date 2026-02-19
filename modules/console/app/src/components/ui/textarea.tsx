import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full border border-grid-border bg-grid-dark/80 px-3 py-2 text-sm text-text-primary shadow-sm",
        "placeholder:text-text-muted",
        "focus-visible:outline-none focus-visible:border-neon-cyan/50 focus-visible:shadow-[var(--shadow-glow-cyan-sm)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
