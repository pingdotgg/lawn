import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#2d5a2d] text-[#c8e6c8] shadow-sm hover:bg-[#3a6a3a] active:bg-[#1a4a1a]",
        destructive:
          "bg-[#5a2d2d] text-[#e8c8c8] shadow-sm hover:bg-[#6a3a3a] active:bg-[#4a1a1a]",
        outline:
          "border border-[#2a4a2a] bg-transparent text-[#7cb87c] hover:bg-[#1a3a1a] hover:border-[#3a6a3a]",
        secondary:
          "bg-[#1a2a1a] text-[#7cb87c] shadow-sm hover:bg-[#243d24]",
        ghost:
          "text-[#6a9a6a] hover:bg-[#1a2a1a] hover:text-[#7cb87c]",
        link:
          "text-[#7cb87c] underline-offset-4 hover:underline hover:text-[#a0d0a0]",
      },
      size: {
        default: "h-9 px-4 py-2 rounded",
        sm: "h-8 px-3 text-xs rounded",
        lg: "h-10 px-6 rounded",
        icon: "h-9 w-9 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
