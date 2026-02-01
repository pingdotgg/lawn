import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded border border-[#2a4a2a] bg-[#0f1f0f] px-3 py-2 text-sm text-[#c8e6c8] transition-colors placeholder:text-[#4a6a4a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7cb87c]/30 focus-visible:border-[#7cb87c]/50 disabled:cursor-not-allowed disabled:opacity-40 resize-none",
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
