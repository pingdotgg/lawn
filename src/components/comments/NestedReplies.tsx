import { CommentText } from "./CommentText";
import { formatTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface NestedReplyNode {
  _id: string;
  userName: string;
  text: string;
  timestampSeconds: number;
  replies: NestedReplyNode[];
}

interface NestedRepliesProps {
  replies: NestedReplyNode[];
  onSeek: (seconds: number) => void;
  depth?: number;
  /** Soft-cap so public/share layouts stay readable on small screens. */
  maxDepth?: number;
}

/**
 * Read-only recursive reply tree for public watch / share pages.
 */
export function NestedReplies({
  replies,
  onSeek,
  depth = 1,
  maxDepth = 5,
}: NestedRepliesProps) {
  if (replies.length === 0 || depth > maxDepth) return null;

  return (
    <div
      className={cn(
        "mt-3 space-y-2 border-l-2 border-[#1a1a1a] pl-3",
        depth === 1 ? "ml-4" : "ml-2",
      )}
    >
      {replies.map((reply) => (
        <div key={reply._id} className="text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[#1a1a1a]">{reply.userName}</span>
            <button
              type="button"
              className="font-mono text-xs text-[#2d5a2d] hover:text-[#1a1a1a]"
              onClick={() => onSeek(reply.timestampSeconds)}
            >
              {formatTimestamp(reply.timestampSeconds)}
            </button>
          </div>
          <p className="break-words whitespace-pre-wrap text-[#1a1a1a]">
            <CommentText text={reply.text} />
          </p>
          <NestedReplies
            replies={reply.replies}
            onSeek={onSeek}
            depth={depth + 1}
            maxDepth={maxDepth}
          />
        </div>
      ))}
    </div>
  );
}
