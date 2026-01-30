import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-colors placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-40 resize-none",
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
