"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { MAX_COMMENT_TAG_LENGTH, MAX_COMMENT_TAGS } from "@convex/commentTags";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp, formatRelativeTime, getInitials, cn } from "@/lib/utils";
import { Check, MoreVertical, Tag, Trash2, Reply } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useRef, useState } from "react";
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
  tags?: string[];
  _creationTime: number;
}

function tagMutationMessage(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return "Couldn't update the tag";
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
  const [draftTag, setDraftTag] = useState("");
  const [isSavingTag, setIsSavingTag] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const toggleResolved = useMutation(api.comments.toggleResolved);
  const deleteComment = useMutation(api.comments.remove);
  const addTag = useMutation(api.comments.addTag);
  const removeTag = useMutation(api.comments.removeTag);
  const tags = comment.tags ?? [];

  useEffect(() => {
    if (!isAddingTag) return;
    const timeoutId = window.setTimeout(() => tagInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isAddingTag]);

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

  const handleAddTag = async () => {
    const next = draftTag.trim();
    if (!next || isSavingTag) return;
    setIsSavingTag(true);
    setTagError(null);
    try {
      await addTag({ commentId: comment._id, tag: next });
      setDraftTag("");
      setIsAddingTag(false);
    } catch (error) {
      setTagError(tagMutationMessage(error));
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    setTagError(null);
    try {
      await removeTag({ commentId: comment._id, tag });
    } catch (error) {
      setTagError(tagMutationMessage(error));
    }
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
                {canTag && tags.length < MAX_COMMENT_TAGS && (
                  <DropdownMenuItem onSelect={() => setIsAddingTag(true)}>
                    <Tag className="mr-2 h-4 w-4" />
                    Add tag
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
          <p className="mt-1 text-sm break-words whitespace-pre-wrap text-[#1a1a1a]">
            <CommentText text={comment.text} />
          </p>
          {(tags.length > 0 || isAddingTag || tagError) && (
            <div className="mt-2 space-y-1">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 border border-[#ccc] px-1.5 py-0.5 text-[11px] font-medium text-[#1a1a1a]"
                    >
                      {tag}
                      {canTag && (
                        <button
                          type="button"
                          aria-label={`Remove tag ${tag}`}
                          className="text-[#888] hover:text-[#1a1a1a]"
                          onClick={() => void handleRemoveTag(tag)}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {isAddingTag && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleAddTag();
                  }}
                >
                  <input
                    ref={tagInputRef}
                    aria-label="New tag"
                    value={draftTag}
                    maxLength={MAX_COMMENT_TAG_LENGTH}
                    disabled={isSavingTag}
                    placeholder="Tag"
                    onChange={(event) => setDraftTag(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Escape") return;
                      event.preventDefault();
                      setDraftTag("");
                      setTagError(null);
                      setIsAddingTag(false);
                    }}
                    className="h-7 w-full border border-[#1a1a1a] bg-transparent px-2 text-xs text-[#1a1a1a] outline-none placeholder:text-[#888]"
                  />
                </form>
              )}
              {tagError && <p className="text-[11px] text-[#dc2626]">{tagError}</p>}
            </div>
          )}
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
