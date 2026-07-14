"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp, formatRelativeTime, getInitials, cn } from "@/lib/utils";
import { Check, MoreVertical, Pencil, Trash2, Reply } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { CommentInput } from "./CommentInput";
import { CommentText } from "./CommentText";
import { hasDrawing, type DrawingData } from "@/lib/drawing";

interface Comment {
  _id: Id<"comments">;
  videoId: Id<"videos">;
  text: string;
  timestampSeconds: number;
  parentId?: Id<"comments">;
  resolved: boolean;
  userName: string;
  userAvatarUrl?: string;
  _creationTime: number;
  drawing?: DrawingData | null;
}

export type CommentSeekOptions = {
  drawing?: DrawingData | null;
  commentId?: Id<"comments">;
};

interface CommentItemProps {
  comment: Comment;
  onTimestampClick: (seconds: number, options?: CommentSeekOptions) => void;
  isHighlighted?: boolean;
  isReply?: boolean;
  canResolve?: boolean;
}

export function CommentItem({
  comment,
  onTimestampClick,
  isHighlighted = false,
  isReply = false,
  canResolve = false,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const toggleResolved = useMutation(api.comments.toggleResolved);
  const deleteComment = useMutation(api.comments.remove);
  const commentHasDrawing = hasDrawing(comment.drawing);

  const handleToggleResolved = async () => {
    try {
      await toggleResolved({ commentId: comment._id });
    } catch (error) {
      console.error("Failed to toggle resolved:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteComment({ commentId: comment._id });
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleSeek = () => {
    onTimestampClick(comment.timestampSeconds, {
      drawing: comment.drawing ?? null,
      commentId: comment._id,
    });
  };

  return (
    <div
      className={cn(
        "group relative transition-all",
        isReply ? "py-2" : "p-4",
        isHighlighted ? "bg-[#2d5a2d]/10" : "hover:bg-[#1a1a1a]/5",
        comment.resolved && "opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shadow-sm">
          <AvatarImage src={comment.userAvatarUrl} />
          <AvatarFallback className="text-[10px]">{getInitials(comment.userName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-bold text-[#1a1a1a]">{comment.userName}</span>
              <button
                onClick={handleSeek}
                className="shrink-0 font-mono text-xs font-bold text-[#2d5a2d] hover:text-[#1a1a1a]"
              >
                {formatTimestamp(comment.timestampSeconds)}
              </button>
              {commentHasDrawing && (
                <button
                  type="button"
                  onClick={handleSeek}
                  className="inline-flex shrink-0 items-center gap-1 border border-[#2d5a2d] bg-[#2d5a2d]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#2d5a2d] hover:bg-[#2d5a2d] hover:text-[#f0f0e8]"
                  title="View drawing on frame"
                >
                  <Pencil className="h-3 w-3" />
                  Drawing
                </button>
              )}
              {comment.resolved && (
                <Badge variant="success" className="shrink-0 text-[10px]">
                  Resolved
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isReply && (
                  <DropdownMenuItem onClick={() => setIsReplying(true)}>
                    <Reply className="mr-2 h-4 w-4" />
                    Reply
                  </DropdownMenuItem>
                )}
                {canResolve && !isReply && (
                  <DropdownMenuItem onClick={handleToggleResolved}>
                    <Check className="mr-2 h-4 w-4" />
                    {comment.resolved ? "Unresolve" : "Resolve"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-[#dc2626] focus:text-[#dc2626]"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {comment.text ? (
            <p className="mt-1 text-sm break-words whitespace-pre-wrap text-[#1a1a1a]">
              <CommentText text={comment.text} />
            </p>
          ) : commentHasDrawing ? (
            <p className="mt-1 text-sm text-[#888] italic">Frame drawing</p>
          ) : null}
          <p className="mt-1 text-[11px] text-[#888]">
            {formatRelativeTime(comment._creationTime)}
          </p>
        </div>
      </div>

      {isReplying && (
        <div className="mt-3 ml-10">
          <CommentInput
            videoId={comment.videoId}
            timestampSeconds={comment.timestampSeconds}
            parentId={comment._id}
            onSubmit={() => setIsReplying(false)}
            onCancel={() => setIsReplying(false)}
            autoFocus
            placeholder="Write a reply..."
          />
        </div>
      )}
    </div>
  );
}
