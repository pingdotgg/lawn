"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FunctionReturnType } from "convex/server";
import { CommentItem } from "./CommentItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ThreadedComments = FunctionReturnType<typeof api.comments.getThreaded>;
type ThreadedComment = ThreadedComments[number];

/** Soft-cap nesting depth in the UI so layout stays usable on mobile. */
const MAX_REPLY_DEPTH = 5;

interface CommentListProps {
  videoId: Id<"videos">;
  comments?: ThreadedComments;
  onTimestampClick: (seconds: number) => void;
  highlightedCommentId?: Id<"comments">;
  canResolve?: boolean;
}

interface CommentThreadProps {
  comment: ThreadedComment;
  depth: number;
  parentName?: string;
  onTimestampClick: (seconds: number) => void;
  highlightedCommentId?: Id<"comments">;
  canResolve: boolean;
}

function CommentThread({
  comment,
  depth,
  parentName,
  onTimestampClick,
  highlightedCommentId,
  canResolve,
}: CommentThreadProps) {
  const isReply = depth > 0;
  const canReply = depth < MAX_REPLY_DEPTH;

  return (
    <div className="relative">
      <CommentItem
        comment={comment}
        onTimestampClick={onTimestampClick}
        isHighlighted={highlightedCommentId === comment._id}
        isReply={isReply}
        canReply={canReply}
        canResolve={canResolve}
        replyToName={parentName}
      />
      {comment.replies.length > 0 && (
        <div
          className={cn(
            "relative space-y-1",
            // First nesting level uses the existing pl-14 rail; deeper levels indent less so mobile stays usable.
            depth === 0 ? "space-y-2 pr-4 pb-4 pl-14" : "ml-3 space-y-1 border-l border-[#1a1a1a]/15 pr-2 pl-3 sm:ml-4 sm:pl-4 dark:border-white/10",
          )}
        >
          {depth === 0 && (
            <div className="absolute top-0 bottom-6 left-[1.35rem] w-px bg-[#1a1a1a]/10 dark:bg-white/10" />
          )}
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply._id}
              comment={reply}
              depth={depth + 1}
              parentName={comment.userName}
              onTimestampClick={onTimestampClick}
              highlightedCommentId={highlightedCommentId}
              canResolve={canResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentList({
  videoId,
  comments: providedComments,
  onTimestampClick,
  highlightedCommentId,
  canResolve = false,
}: CommentListProps) {
  const queriedComments = useQuery(api.comments.getThreaded, { videoId });
  const comments = providedComments ?? queriedComments;

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
          <CommentThread
            key={comment._id}
            comment={comment}
            depth={0}
            onTimestampClick={onTimestampClick}
            highlightedCommentId={highlightedCommentId}
            canResolve={canResolve}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
