"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/utils";
import { hasDrawing, type DrawingData } from "@/lib/drawing";
import { Pencil, Send, X } from "lucide-react";

interface CommentInputProps {
  videoId: Id<"videos">;
  timestampSeconds: number;
  parentId?: Id<"comments">;
  onSubmit?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  showTimestamp?: boolean;
  variant?: "default" | "seamless";
  /** Optional freehand drawing attached to this comment. */
  drawing?: DrawingData | null;
  onClearDrawing?: () => void;
  onRequestDrawMode?: () => void;
  drawModeActive?: boolean;
}

export function CommentInput({
  videoId,
  timestampSeconds,
  parentId,
  onSubmit,
  onCancel,
  autoFocus = false,
  placeholder,
  showTimestamp = false,
  variant = "default",
  drawing = null,
  onClearDrawing,
  onRequestDrawMode,
  drawModeActive = false,
}: CommentInputProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createComment = useMutation(api.comments.create);

  const hasAttachedDrawing = hasDrawing(drawing);
  const canSubmit = (Boolean(text.trim()) || hasAttachedDrawing) && !isLoading;

  const defaultPlaceholder = showTimestamp
    ? `Comment at ${formatTimestamp(timestampSeconds)}...`
    : "Add a comment...";
  const finalPlaceholder = placeholder || defaultPlaceholder;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const submitComment = async () => {
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      await createComment({
        videoId,
        text: text.trim(),
        timestampSeconds,
        parentId,
        ...(hasAttachedDrawing && drawing
          ? {
              drawing: {
                width: drawing.width,
                height: drawing.height,
                strokes: drawing.strokes.map((stroke) => ({
                  points: stroke.points.map((p) => ({ x: p.x, y: p.y })),
                })),
              },
            }
          : {}),
      });
      setText("");
      onClearDrawing?.();
      onSubmit?.();
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitComment();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      void submitComment();
    }
    if (e.key === "Escape") {
      onCancel?.();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={
        variant === "seamless" ? "relative w-full bg-[#f0f0e8]" : "relative w-full pr-1 pb-1"
      }
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={finalPlaceholder}
        autoFocus={autoFocus}
        className={
          variant === "seamless"
            ? "block max-h-64 min-h-[100px] w-full resize-none border-0 bg-transparent px-4 pt-4 pb-12 font-sans text-sm leading-relaxed text-[#1a1a1a] transition-all outline-none placeholder:text-[#888] focus:ring-0"
            : "block max-h-64 min-h-[100px] w-full resize-none border-2 border-[#1a1a1a] bg-[#f0f0e8] px-3 pt-3 pb-12 font-sans text-sm leading-relaxed text-[#1a1a1a] shadow-[4px_4px_0px_0px_var(--shadow-color)] transition-all outline-none placeholder:text-[#888] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_var(--shadow-color)] focus:ring-0"
        }
        rows={3}
      />
      <div
        className={
          variant === "seamless"
            ? "absolute right-3 bottom-3 flex items-center gap-2"
            : "absolute right-3 bottom-3 flex items-center gap-2"
        }
      >
        {onRequestDrawMode && (
          <Button
            type="button"
            variant={drawModeActive || hasAttachedDrawing ? "primary" : "outline"}
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onRequestDrawMode}
            title={
              hasAttachedDrawing
                ? "Edit drawing on video"
                : drawModeActive
                  ? "Drawing mode active"
                  : "Draw on frame"
            }
            aria-label="Draw on frame"
            aria-pressed={drawModeActive}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {hasAttachedDrawing && onClearDrawing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 px-2 text-[10px] font-bold"
            onClick={onClearDrawing}
            title="Remove drawing"
          >
            Clear draw
          </Button>
        )}
        {onCancel && (
          <Button
            type="button"
            variant={variant === "seamless" ? "ghost" : "outline"}
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="submit"
          variant={variant === "seamless" ? "ghost" : "primary"}
          size="icon"
          className="h-8 w-8 shrink-0 disabled:opacity-50"
          disabled={!canSubmit}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {hasAttachedDrawing && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-bold text-[#2d5a2d]">
          <Pencil className="h-3 w-3" />
          Drawing attached
          {drawing?.strokes?.length ? (
            <span className="font-mono font-normal text-[#888]">
              · {drawing.strokes.length} stroke{drawing.strokes.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      )}
    </form>
  );
}
