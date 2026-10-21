"use client";

import { commentTagKey, type CommentTagFilter } from "@convex/commentTags";
import { cn } from "@/lib/utils";

export function CommentTagFilters({
  tags,
  filter,
  onSolo,
  onToggle,
}: {
  tags: readonly string[];
  filter: CommentTagFilter;
  onSolo: (tag: string) => void;
  onToggle: (tag: string) => void;
}) {
  if (tags.length === 0) return null;

  return (
    <div
      className="flex flex-shrink-0 flex-wrap gap-1.5 border-b border-[#1a1a1a]/10 px-4 py-2"
      role="group"
      aria-label="Comment tags"
    >
      {tags.map((tag) => {
        const on = filter.kind === "all" || filter.keys.includes(commentTagKey(tag));
        return (
          <button
            key={commentTagKey(tag)}
            type="button"
            aria-pressed={on}
            title="Click to show only this tag. Right-click or shift-click to toggle it."
            className={cn(
              "border px-1.5 py-0.5 text-[11px] font-medium select-none",
              on
                ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#f0f0e8]"
                : "border-[#ccc] bg-transparent text-[#888] line-through",
            )}
            onClick={(event) => {
              if (event.shiftKey) onToggle(tag);
              else onSolo(tag);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              onToggle(tag);
            }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
