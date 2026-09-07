import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Keep the entire editor subtree mounted when expanding over dashboard navigation. */
export function VideoEditorLayout({
  theaterMode,
  children,
}: {
  theaterMode: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-video-editor
      className={cn("flex h-full min-h-0 flex-col", theaterMode && "fixed inset-0 z-40 bg-black")}
    >
      {children}
    </div>
  );
}
