"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp, formatRelativeTime, getInitials, cn } from "@/lib/utils";
import { Check, MoreVertical, Tag, Trash2, Reply, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { CommentInput } from "./CommentInput";
import { CommentText } from "./CommentText";

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
  tags?: string[];
}

interface CommentItemProps {
  comment: Comment;
  onTimestampClick: (seconds: number) => void;
  isHighlighted?: boolean;
  isReply?: boolean;
  canResolve?: boolean;
  canTag?: boolean;
}

export function CommentItem({
  comment,
  onTimestampClick,
  isHighlighted = false,
  isReply = false,
  canResolve = false,
  canTag = false,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const toggleResolved = useMutation(api.comments.toggleResolved);
  const deleteComment = useMutation(api.comments.remove);
  const setTags = useMutation(api.comments.setTags);

  const tags = comment.tags ?? [];

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

  const persistTags = async (next: string[]) => {
    setTagError(null);
    try {
      await setTags({ commentId: comment._id, tags: next });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update tags";
      setTagError(message);
      console.error("Failed to update tags:", error);
    }
  };

  const handleAddTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    const exists = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewTag("");
      setIsAddingTag(false);
      return;
    }
    await persistTags([...tags, trimmed]);
    setNewTag("");
    setIsAddingTag(false);
  };

  const handleRemoveTag = async (tag: string) => {
    await persistTags(tags.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
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
                onClick={() => onTimestampClick(comment.timestampSeconds)}
                className="shrink-0 font-mono text-xs font-bold text-[#2d5a2d] hover:text-[#1a1a1a]"
              >
                {formatTimestamp(comment.timestampSeconds)}
              </button>
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
                {canTag && (
                  <DropdownMenuItem
                    onClick={() => {
                      setIsAddingTag(true);
                      setTagError(null);
                    }}
                  >
                    <Tag className="mr-2 h-4 w-4" />
                    Add tag
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
          <p className="mt-1 text-sm break-words whitespace-pre-wrap text-[#1a1a1a]">
            <CommentText text={comment.text} />
          </p>
          {(tags.length > 0 || isAddingTag) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.toLowerCase()}
                  className="inline-flex items-center gap-1 border border-[#1a1a1a]/30 bg-[#e8e8e0] px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#1a1a1a] uppercase"
                >
                  {tag}
                  {canTag && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveTag(tag)}
                      className="inline-flex h-3 w-3 items-center justify-center text-[#888] hover:text-[#dc2626]"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              ))}
              {isAddingTag && (
                <form
                  className="flex items-center gap-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleAddTag();
                  }}
                >
                  <input
                    autoFocus
                    value={newTag}
                    onChange={(event) => setNewTag(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setIsAddingTag(false);
                        setNewTag("");
                        setTagError(null);
                      }
                    }}
                    onBlur={() => {
                      if (!newTag.trim()) {
                        setIsAddingTag(false);
                        setTagError(null);
                      }
                    }}
                    placeholder="tag name"
                    maxLength={32}
                    className="h-6 w-24 border border-[#1a1a1a] bg-[#f0f0e8] px-1.5 font-mono text-[10px] text-[#1a1a1a] outline-none placeholder:text-[#888]"
                  />
                  <Button type="submit" size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]">
                    Add
                  </Button>
                </form>
              )}
            </div>
          )}
          {tagError ? <p className="mt-1 text-[11px] text-[#dc2626]">{tagError}</p> : null}
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
