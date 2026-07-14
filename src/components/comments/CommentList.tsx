"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FunctionReturnType } from "convex/server";
import { CommentItem } from "./CommentItem";
import { CommentTagFilter } from "./CommentTagFilter";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  collectUniqueTags,
  commentMatchesTagFilter,
  exclusiveSelectTag,
  toggleTagFilter,
  type ActiveTagFilter,
} from "@/lib/commentTags";

type ThreadedComments = FunctionReturnType<typeof api.comments.getThreaded>;

interface CommentListProps {
  videoId: Id<"videos">;
  comments?: ThreadedComments;
  onTimestampClick: (seconds: number) => void;
  highlightedCommentId?: Id<"comments">;
  canResolve?: boolean;
  canTag?: boolean;
}

export function CommentList({
  videoId,
  comments: providedComments,
  onTimestampClick,
  highlightedCommentId,
  canResolve = false,
  canTag = false,
}: CommentListProps) {
  const queriedComments = useQuery(api.comments.getThreaded, { videoId });
  const comments = providedComments ?? queriedComments;
  const [activeFilter, setActiveFilter] = useState<ActiveTagFilter>(null);

  const availableTags = useMemo(
    () => (comments ? collectUniqueTags(comments) : []),
    [comments],
  );

  const filteredComments = useMemo(() => {
    if (!comments) return comments;
    if (activeFilter === null) return comments;
    return comments.filter((comment) => commentMatchesTagFilter(comment, activeFilter));
  }, [comments, activeFilter]);

  if (comments === undefined) {
    return <div className="p-4 text-center text-[#888]">Loading...</div>;
  }

  if (comments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-center text-sm text-[#888]">
          No comments yet.
          <br />
          Click on the timeline to add one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CommentTagFilter
        tags={availableTags}
        activeFilter={activeFilter}
        onExclusiveSelect={(tag) => setActiveFilter(exclusiveSelectTag(activeFilter, tag))}
        onToggle={(tag) => setActiveFilter(toggleTagFilter(activeFilter, tag, availableTags))}
        onShowAll={() => setActiveFilter(null)}
      />
      <ScrollArea className="min-h-0 flex-1">
        {filteredComments && filteredComments.length === 0 ? (
          <div className="flex items-center justify-center p-6">
            <p className="text-center text-sm text-[#888]">
              No comments match the selected tags.
              <br />
              <button
                type="button"
                className="mt-1 font-bold text-[#2d5a2d] underline underline-offset-2"
                onClick={() => setActiveFilter(null)}
              >
                Show all
              </button>
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[#1a1a1a]/10 dark:divide-white/10">
            {filteredComments?.map((comment) => (
              <div key={comment._id} className="relative">
                <CommentItem
                  comment={comment}
                  onTimestampClick={onTimestampClick}
                  isHighlighted={highlightedCommentId === comment._id}
                  canResolve={canResolve}
                  canTag={canTag}
                />
                {comment.replies.length > 0 && (
                  <div className="relative space-y-4 pr-4 pb-4 pl-14">
                    <div className="absolute top-0 bottom-6 left-[1.35rem] w-px bg-[#1a1a1a]/10 dark:bg-white/10" />
                    {comment.replies.map((reply) => (
                      <CommentItem
                        key={reply._id}
                        comment={reply}
                        onTimestampClick={onTimestampClick}
                        isHighlighted={highlightedCommentId === reply._id}
                        isReply
                        canResolve={canResolve}
                        canTag={canTag}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
