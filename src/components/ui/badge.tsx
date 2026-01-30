import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-amber-500/15 text-amber-400 border border-amber-500/20",
        secondary:
          "bg-zinc-800 text-zinc-300 border border-zinc-700",
        destructive:
          "bg-red-500/15 text-red-400 border border-red-500/20",
        outline:
          "border border-zinc-700 text-zinc-400",
        success:
          "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
        warning:
          "bg-amber-500/15 text-amber-400 border border-amber-500/20",
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
