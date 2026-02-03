import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#1a1a1a] text-[#f0f0e8] hover:bg-[#333333]",
        primary:
          "bg-[#2d5a2d] text-[#f0f0e8] hover:bg-[#3a6a3a]",
        destructive:
          "bg-[#dc2626] text-white hover:bg-[#b91c1c]",
        outline:
          "border-2 border-[#1a1a1a] bg-transparent text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f0f0e8]",
        secondary:
          "bg-[#e8e8e0] text-[#1a1a1a] hover:bg-[#d8d8d0]",
        ghost:
          "text-[#1a1a1a] hover:bg-[#e8e8e0]",
        link:
          "text-[#1a1a1a] underline underline-offset-4 hover:text-[#2d5a2d]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
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
