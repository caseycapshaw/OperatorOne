import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan",
        secondary: "border-grid-border bg-grid-panel text-text-secondary",
        success: "border-neon-green/30 bg-neon-green/10 text-neon-green",
        warning: "border-neon-orange/30 bg-neon-orange/10 text-neon-orange",
        danger: "border-neon-red/30 bg-neon-red/10 text-neon-red",
        info: "border-neon-blue/30 bg-neon-blue/10 text-neon-blue",
        purple: "border-neon-purple/30 bg-neon-purple/10 text-neon-purple",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
