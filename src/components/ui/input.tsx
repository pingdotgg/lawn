import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded border border-[#2a4a2a] bg-[#0f1f0f] px-3 py-1 text-sm text-[#c8e6c8] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#4a6a4a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7cb87c]/30 focus-visible:border-[#7cb87c]/50 disabled:cursor-not-allowed disabled:opacity-40",
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
