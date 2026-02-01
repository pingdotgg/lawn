import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[#2d5a2d]/50 text-[#7cb87c] border border-[#2d5a2d]",
        secondary:
          "bg-[#1a2a1a] text-[#6a9a6a] border border-[#2a4a2a]",
        destructive:
          "bg-[#5a2d2d]/50 text-[#e57373] border border-[#5a2d2d]",
        outline:
          "border border-[#2a4a2a] text-[#6a9a6a]",
        success:
          "bg-[#2d5a2d]/50 text-[#81c784] border border-[#2d5a2d]",
        warning:
          "bg-[#5a4a2d]/50 text-[#ffb74d] border border-[#5a4a2d]",
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
