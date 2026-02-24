import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors border-2",
  {
    variants: {
      variant: {
        default:
          "bg-[#1a1a1a] text-[#f0f0e8] border-[#1a1a1a]",
        secondary:
          "bg-[#e8e8e0] text-[#1a1a1a] border-[#1a1a1a]",
        destructive:
          "bg-[#dc2626] text-white border-[#1a1a1a]",
        outline:
          "border-[#1a1a1a] text-[#1a1a1a] bg-transparent",
        success:
          "bg-[#2d5a2d] text-[#f0f0e8] border-[#1a1a1a]",
        warning:
          "bg-[#ca8a04] text-white border-[#1a1a1a]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
