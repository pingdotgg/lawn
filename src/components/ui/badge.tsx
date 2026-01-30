import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-red-500/15 text-red-400 border border-red-500/20",
        secondary:
          "bg-white/5 text-white/70 border border-white/10",
        destructive:
          "bg-red-500/15 text-red-400 border border-red-500/20",
        outline:
          "border border-white/10 text-white/50",
        success:
          "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
        warning:
          "bg-red-500/15 text-red-400 border border-red-500/20",
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
