"use client";

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FunctionReturnType } from "convex/server";
import { CommentItem } from "./CommentItem";
import { ScrollArea } from "@/components/ui/scroll-area";

type ThreadedComments = FunctionReturnType<typeof api.comments.getThreaded>;

interface CommentListProps {
  comments: ThreadedComments | undefined;
  onTimestampClick: (seconds: number) => void;
  highlightedCommentId?: Id<"comments">;
  canResolve?: boolean;
}

export function CommentList({
  comments,
  onTimestampClick,
  highlightedCommentId,
  canResolve = false,
}: CommentListProps) {
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
    <ScrollArea className="h-full">
      <div className="flex flex-col divide-y divide-[#1a1a1a]/10 dark:divide-white/10">
        {comments.map((comment) => (
          <div key={comment._id} className="relative">
            <CommentItem
              comment={comment}
              onTimestampClick={onTimestampClick}
              isHighlighted={highlightedCommentId === comment._id}
              canResolve={canResolve}
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
