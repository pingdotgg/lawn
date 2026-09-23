import { ChevronDown, FolderInput, Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  VIDEO_WORKFLOW_STATUS_OPTIONS,
  workflowStatusDotColor,
  type VideoWorkflowStatus,
} from "@/components/videos/VideoWorkflowStatusControl";
import { cn } from "@/lib/utils";

type VideoSelectionBarProps = {
  count: number;
  onMove?: () => void;
  onSetStatus?: (status: VideoWorkflowStatus) => void;
  onDelete?: () => void;
  onClear: () => void;
};

const actionClassName =
  "inline-flex h-9 items-center gap-1.5 px-3 text-sm font-bold text-[#1a1a1a] transition-colors hover:bg-[#1a1a1a] hover:text-[#f0f0e8] disabled:pointer-events-none disabled:opacity-40";

export function VideoSelectionBar({
  count,
  onMove,
  onSetStatus,
  onDelete,
  onClear,
}: VideoSelectionBarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Selected videos"
      className="fixed right-4 bottom-4 z-40 flex items-center border-2 border-[#1a1a1a] bg-[#f0f0e8] p-1 shadow-[4px_4px_0px_0px_var(--shadow-color)]"
    >
      <span
        className="px-3 font-mono text-sm font-bold text-[#1a1a1a] tabular-nums"
        aria-live="polite"
      >
        {count} selected
      </span>
      {onMove && (
        <button
          type="button"
          className={actionClassName}
          aria-label="Move selected videos"
          onClick={onMove}
        >
          <FolderInput className="h-4 w-4" />
          <span className="hidden sm:inline">Move</span>
        </button>
      )}
      {onSetStatus && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={actionClassName}>
              Status
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {VIDEO_WORKFLOW_STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                className="gap-2"
                onSelect={() => onSetStatus(option.value)}
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    workflowStatusDotColor(option.value),
                  )}
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {onDelete && (
        <button
          type="button"
          className={cn(
            actionClassName,
            "text-[#dc2626] hover:bg-[#dc2626]/10 hover:text-[#dc2626]",
          )}
          aria-label="Delete selected videos"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      )}
      <button
        type="button"
        className={cn(actionClassName, "w-9 justify-center px-0")}
        aria-label="Clear selection"
        title="Clear selection (Esc)"
        onClick={onClear}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
