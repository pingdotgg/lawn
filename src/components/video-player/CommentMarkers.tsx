"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTimestamp } from "@/lib/utils";

interface Comment {
  _id: string;
  timestampSeconds: number;
  resolved: boolean;
}

interface CommentMarkersProps {
  comments: Comment[];
  duration: number;
  currentTime: number;
  onMarkerClick: (comment: Comment) => void;
  onTimelineClick?: (time: number) => void;
}

export function CommentMarkers({
  comments,
  duration,
  currentTime,
  onMarkerClick,
  onTimelineClick,
}: CommentMarkersProps) {
  if (duration === 0) return null;

  // Group comments that are very close together (within 2 seconds)
  const groupedComments = comments.reduce<{ position: number; comments: Comment[] }[]>(
    (acc, comment) => {
      const position = (comment.timestampSeconds / duration) * 100;
      const existingGroup = acc.find(
        (g) => Math.abs(g.position - position) < 1 // Within 1% of timeline
      );
      if (existingGroup) {
        existingGroup.comments.push(comment);
      } else {
        acc.push({ position, comments: [comment] });
      }
      return acc;
    },
    []
  );

  return (
    <div
      className="relative h-3 bg-zinc-900/80 border border-zinc-800 rounded-full mt-3 cursor-pointer overflow-hidden"
      onClick={(e) => {
        if (!onTimelineClick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width <= 0) return;
        const x = e.clientX - rect.left;
        const percentage = Math.min(Math.max(x / rect.width, 0), 1);
        const time = percentage * duration;
        onTimelineClick(time);
      }}
    >
      {/* Progress indicator */}
      <div
        className="absolute inset-y-0 left-0 bg-zinc-700/80 pointer-events-none"
        style={{ width: `${(currentTime / duration) * 100}%` }}
      />

      {/* Comment markers */}
      {groupedComments.map((group, index) => {
        const allResolved = group.comments.every((c) => c.resolved);
        const commentCount = group.comments.length;

        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-950 shadow-sm",
                  commentCount > 1 ? "w-4 h-4" : "w-3 h-3",
                  allResolved
                    ? "bg-green-500 ring-green-500/50"
                    : "bg-orange-500 ring-orange-500/50"
                )}
                style={{ left: `${group.position}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkerClick(group.comments[0]);
                }}
              >
                {commentCount > 1 && (
                  <span className="text-[10px] font-medium text-white">
                    {commentCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {commentCount} comment{commentCount !== 1 ? "s" : ""} at{" "}
                {formatTimestamp(group.comments[0].timestampSeconds)}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
