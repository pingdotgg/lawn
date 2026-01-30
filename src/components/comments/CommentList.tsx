"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CommentItem } from "./CommentItem";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommentListProps {
  videoId: Id<"videos">;
  onTimestampClick: (seconds: number) => void;
  highlightedCommentId?: Id<"comments">;
  canResolve?: boolean;
}

export function CommentList({
  videoId,
  onTimestampClick,
  highlightedCommentId,
  canResolve = false,
}: CommentListProps) {
  const comments = useQuery(api.comments.getThreaded, { videoId });

  if (comments === undefined) {
    return (
      <div className="p-4 text-center text-zinc-500">Loading...</div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="text-zinc-500 text-sm text-center">
          No comments yet.<br />
          Click on the timeline to add one.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {comments.map((comment) => (
          <div key={comment._id}>
            <CommentItem
              comment={comment}
              onTimestampClick={onTimestampClick}
              isHighlighted={highlightedCommentId === comment._id}
              canResolve={canResolve}
            />
            {comment.replies.length > 0 && (
              <div className="ml-6 mt-2 space-y-2 border-l border-zinc-800 pl-4">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply._id}
                    comment={reply}
                    onTimestampClick={onTimestampClick}
                    isHighlighted={highlightedCommentId === reply._id}
                    isReply
                    canResolve={canResolve}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
