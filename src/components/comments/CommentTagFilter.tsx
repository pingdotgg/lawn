"use client";

import { cn } from "@/lib/utils";
import { isTagActive, type ActiveTagFilter } from "@/lib/commentTags";

interface CommentTagFilterProps {
  tags: string[];
  activeFilter: ActiveTagFilter;
  onExclusiveSelect: (tag: string) => void;
  onToggle: (tag: string) => void;
  onShowAll?: () => void;
}

/**
 * Badge row at the top of the discussion panel.
 * Left-click: exclusive filter on that tag.
 * Right-click: toggle that tag without resetting the rest.
 */
export function CommentTagFilter({
  tags,
  activeFilter,
  onExclusiveSelect,
  onToggle,
  onShowAll,
}: CommentTagFilterProps) {
  if (tags.length === 0) return null;

  const allActive = activeFilter === null;
  const showShowAll = !allActive;

  return (
    <div
      className="flex flex-shrink-0 flex-wrap items-center gap-1.5 border-b border-[#1a1a1a]/10 px-4 py-2.5 dark:border-white/10"
      role="toolbar"
      aria-label="Filter comments by tag"
    >
      {tags.map((tag) => {
        const active = isTagActive(activeFilter, tag);
        return (
          <button
            key={tag.toLowerCase()}
            type="button"
            onClick={() => onExclusiveSelect(tag)}
            onContextMenu={(event) => {
              event.preventDefault();
              onToggle(tag);
            }}
            title={
              active
                ? "Left-click: show only this tag. Right-click: hide this tag."
                : "Left-click: show only this tag. Right-click: include this tag."
            }
            aria-pressed={active}
            className={cn(
              "inline-flex items-center border-2 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase transition-colors",
              active
                ? "border-[#1a1a1a] bg-[#2d5a2d] text-[#f0f0e8]"
                : "border-[#1a1a1a]/40 bg-transparent text-[#888] opacity-60 hover:opacity-100",
            )}
          >
            {tag}
          </button>
        );
      })}
      {showShowAll && onShowAll ? (
        <button
          type="button"
          onClick={onShowAll}
          className="ml-1 text-[10px] font-bold tracking-wider text-[#2d5a2d] uppercase underline underline-offset-2 hover:text-[#1a1a1a]"
        >
          Show all
        </button>
      ) : null}
    </div>
  );
}
