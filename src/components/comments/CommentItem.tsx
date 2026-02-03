"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp, formatRelativeTime, getInitials, cn } from "@/lib/utils";
import { Check, MoreVertical, Trash2, Reply } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { CommentInput } from "./CommentInput";

interface Comment {
  _id: Id<"comments">;
  videoId: Id<"videos">;
  userId: Id<"users">;
  text: string;
  timestampSeconds: number;
  parentId?: Id<"comments">;
  resolved: boolean;
  userName: string;
  userAvatarUrl?: string;
  _creationTime: number;
}

interface CommentItemProps {
  comment: Comment;
  onTimestampClick: (seconds: number) => void;
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

  return (
    <div
      className={cn(
        "p-3 transition-all border-2",
        isHighlighted
          ? "bg-[#2d5a2d]/10 border-[#2d5a2d]"
          : "bg-[#e8e8e0] border-[#1a1a1a] hover:bg-[#f0f0e8]",
        comment.resolved && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-7 w-7">
          <AvatarImage src={comment.userAvatarUrl} />
          <AvatarFallback className="text-[10px]">
            {getInitials(comment.userName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm text-[#1a1a1a] truncate">
                {comment.userName}
              </span>
              <button
                onClick={() => onTimestampClick(comment.timestampSeconds)}
                className="text-xs text-[#2d5a2d] hover:text-[#1a1a1a] font-mono font-bold shrink-0"
              >
                {formatTimestamp(comment.timestampSeconds)}
              </button>
              {comment.resolved && (
                <Badge variant="success" className="text-[10px] shrink-0">
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
          <p className="text-sm text-[#1a1a1a] mt-1 whitespace-pre-wrap break-words">
            {comment.text}
          </p>
          <p className="text-[11px] text-[#888] mt-1">
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
