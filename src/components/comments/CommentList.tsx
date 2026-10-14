"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FunctionReturnType } from "convex/server";
import {
  activeTagsForFilter,
  collectCommentTags,
  commentTagKey,
  filterThreadedComments,
  pruneCommentTagFilter,
  soloCommentTag,
  toggleCommentTag,
  type CommentTagFilter,
} from "@convex/commentTags";
import { CommentItem } from "./CommentItem";
import { CommentTagFilters } from "./CommentTagFilters";
import { ScrollArea } from "@/components/ui/scroll-area";

type ThreadedComments = FunctionReturnType<typeof api.comments.getThreaded>;

interface CommentListProps {
  videoId: Id<"videos">;
  comments?: ThreadedComments;
  onTimestampClick: (seconds: number) => void;
  highlightedCommentId?: Id<"comments">;
  canResolve?: boolean;
  canTag?: boolean;
}

export function CommentList(props: CommentListProps) {
  const {
    videoId,
    comments: providedComments,
    onTimestampClick,
    highlightedCommentId,
    canResolve = false,
    canTag = false,
  } = props;
  const hasProvidedComments = "comments" in props;
  const queriedComments = useQuery(
    api.comments.getThreaded,
    hasProvidedComments ? "skip" : { videoId },
  );
  const comments = hasProvidedComments ? providedComments : queriedComments;
  const [filter, setFilter] = useState<CommentTagFilter>({ kind: "all" });
  const tags = useMemo(() => (comments ? collectCommentTags(comments) : []), [comments]);
  const tagKeys = useMemo(() => tags.map((tag) => commentTagKey(tag)), [tags]);
  const pruned = pruneCommentTagFilter(filter, tagKeys);
  if (pruned !== filter) setFilter(pruned);

  const visibleComments = useMemo(() => {
    if (!comments) return undefined;
    return filterThreadedComments(comments, activeTagsForFilter(pruned));
  }, [comments, pruned]);

  if (comments === undefined || visibleComments === undefined) {
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
      <CommentTagFilters
        tags={tags}
        filter={pruned}
        onSolo={(tag) => setFilter(soloCommentTag(tag))}
        onToggle={(tag) => setFilter((current) => toggleCommentTag(current, tag, tagKeys))}
      />
      {visibleComments.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-center text-sm text-[#888]">No comments match the selected tags.</p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col divide-y divide-[#1a1a1a]/10 dark:divide-white/10">
            {visibleComments.map((comment) => (
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
        </ScrollArea>
      )}
    </div>
  );
}
