"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatTimestamp } from "@/lib/utils";
import { Send, X } from "lucide-react";

interface CommentInputProps {
  videoId: Id<"videos">;
  timestampSeconds: number;
  parentId?: Id<"comments">;
  onSubmit?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  showTimestamp?: boolean;
}

export function CommentInput({
  videoId,
  timestampSeconds,
  parentId,
  onSubmit,
  onCancel,
  autoFocus = false,
  placeholder = "Add a comment...",
  showTimestamp = false,
}: CommentInputProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const createComment = useMutation(api.comments.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      await createComment({
        videoId,
        text: text.trim(),
        timestampSeconds,
        parentId,
      });
      setText("");
      onSubmit?.();
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
    if (e.key === "Escape") {
      onCancel?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {showTimestamp && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span>Comment at</span>
          <span className="font-mono text-blue-600">
            {formatTimestamp(timestampSeconds)}
          </span>
        </div>
      )}
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="min-h-[80px] pr-20 resize-none"
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8"
            disabled={!text.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-neutral-400">
        Press {navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to submit
      </p>
    </form>
  );
}
