import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full border-2 border-[#1a1a1a] bg-[#f0f0e8] px-3 py-2 text-sm text-[#1a1a1a] font-mono transition-all placeholder:text-[#888] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[#2d5a2d] focus-visible:shadow-[4px_4px_0px_0px_var(--shadow-accent)] disabled:cursor-not-allowed disabled:opacity-40 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
