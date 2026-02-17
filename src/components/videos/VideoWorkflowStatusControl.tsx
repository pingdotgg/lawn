import { type MouseEvent } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export type VideoWorkflowStatus =
  | "review"
  | "rework"
  | "done";

export const VIDEO_WORKFLOW_STATUS_OPTIONS: Array<{
  value: VideoWorkflowStatus;
  label: string;
}> = [
  { value: "review", label: "Review" },
  { value: "rework", label: "Rework" },
  { value: "done", label: "Done" },
];

function workflowStatusLabel(status: VideoWorkflowStatus) {
  const option = VIDEO_WORKFLOW_STATUS_OPTIONS.find((item) => item.value === status);
  return option?.label ?? "Review";
}

function workflowStatusDotColor(status: VideoWorkflowStatus) {
  if (status === "done") return "bg-[#2d5a2d]";
  if (status === "rework") return "bg-[#c27800]";
  return "bg-[#888]";
}

export type VideoWorkflowStatusControlProps = {
  status: VideoWorkflowStatus;
  onChange: (status: VideoWorkflowStatus) => void;
  size?: "sm" | "lg";
  stopPropagation?: boolean;
  className?: string;
};

export function VideoWorkflowStatusControl({
  status,
  onChange,
  size = "sm",
  stopPropagation = false,
  className,
}: VideoWorkflowStatusControlProps) {
  const handleClick = (event: MouseEvent) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
  };

  const isLg = size === "lg";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={handleClick}>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 font-bold uppercase tracking-wider transition-colors hover:text-[#1a1a1a]",
            isLg ? "text-xs text-[#1a1a1a]" : "text-[10px] text-[#666]",
            className,
          )}
          aria-label="Update review status"
          title="Update review status"
        >
          <span className={cn(
            "rounded-full shrink-0",
            workflowStatusDotColor(status),
            isLg ? "h-2.5 w-2.5" : "h-2 w-2",
          )} />
          {workflowStatusLabel(status)}
          <ChevronDown className={cn(
            "opacity-50",
            isLg ? "h-3.5 w-3.5" : "h-3 w-3",
          )} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={handleClick}>
        <DropdownMenuRadioGroup
          value={status}
          onValueChange={(nextStatus) => onChange(nextStatus as VideoWorkflowStatus)}
        >
          {VIDEO_WORKFLOW_STATUS_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="gap-2">
              <span className={cn(
                "h-2 w-2 rounded-full shrink-0",
                workflowStatusDotColor(option.value),
              )} />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
