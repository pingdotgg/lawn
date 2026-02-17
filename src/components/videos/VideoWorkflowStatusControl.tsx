import { type MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

function workflowStatusBadgeClasses(status: VideoWorkflowStatus) {
  if (status === "done") return "bg-[#d7f2d7] text-[#1f4d1f]";
  if (status === "rework") return "bg-[#fde9c5] text-[#7a4a00]";
  return "bg-[#e8e8e0] text-[#555]";
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
  const badgeSizeClasses =
    size === "lg" ? "text-sm px-3 py-1.5 font-bold" : "text-xs px-2 py-0.5";

  const handleClick = (event: MouseEvent) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={handleClick}>
        <button
          type="button"
          className={cn("inline-flex", className)}
          aria-label="Update review status"
          title="Update review status"
        >
          <Badge
            className={cn(
              "border border-[#1a1a1a]/20",
              workflowStatusBadgeClasses(status),
              badgeSizeClasses,
            )}
          >
            {workflowStatusLabel(status)}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={handleClick}>
        <DropdownMenuLabel>Review Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={status}
          onValueChange={(nextStatus) => onChange(nextStatus as VideoWorkflowStatus)}
        >
          {VIDEO_WORKFLOW_STATUS_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
