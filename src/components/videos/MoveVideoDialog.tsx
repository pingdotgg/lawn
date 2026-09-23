import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMoveActions } from "@/lib/dnd/useMoveActions";

export type MoveVideoTarget = {
  _id: Id<"videos">;
  title: string;
  projectId: Id<"projects">;
  versionNumber: number;
};

type MoveVideoDialogProps = {
  teamId: Id<"teams">;
  /** The videos being moved, plus their current folder so we can exclude it. */
  videos: MoveVideoTarget[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MoveVideoDialog({ teamId, videos, open, onOpenChange }: MoveVideoDialogProps) {
  const folders = useQuery(api.projects.listForMove, open ? { teamId } : "skip");
  const { moveVideoTo, moveVideosTo } = useMoveActions();
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const video = videos.length === 1 ? videos[0] : null;
  const videosKey = videos.map((item) => item._id).join(",");

  // Clear a stale error when the dialog is reopened for other videos.
  useEffect(() => {
    if (open) setError(null);
  }, [open, videosKey]);

  // Videos can move into any folder except the one they already live in.
  const destinations = useMemo(() => {
    const sourceProjectIds = new Set(videos.map((item) => item.projectId));
    return (folders ?? []).filter((folder) => !sourceProjectIds.has(folder._id));
  }, [folders, videos]);

  const handleMove = async (destProjectId: Id<"projects">) => {
    if (videos.length === 0) return;
    setIsMoving(true);
    setError(null);
    const result = video
      ? await moveVideoTo(video._id, destProjectId)
      : await moveVideosTo(
          videos.map((item) => item._id),
          destProjectId,
        );
    setIsMoving(false);
    if (result.ok) {
      onOpenChange(false);
    } else {
      setError(result.error ?? "Failed to move video");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {video
              ? `Move all versions of "${video.title}"`
              : videos.length > 1
                ? `Move ${videos.length} videos`
                : "Move videos"}
          </DialogTitle>
          <DialogDescription>
            {video
              ? `Choose a folder for every version of this video, including the latest version (v${video.versionNumber}).`
              : "Choose a folder for every version of these videos."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="border-2 border-[#dc2626] bg-[#fef2f2] px-3 py-2 text-sm font-bold text-[#dc2626]">
            {error}
          </p>
        )}

        {folders === undefined ? (
          <p className="text-sm text-[#888]">Loading folders...</p>
        ) : (
          <div className="max-h-80 divide-y-2 divide-[#1a1a1a] overflow-y-auto border-2 border-[#1a1a1a]">
            {destinations.map((folder) => (
              <button
                key={folder._id}
                type="button"
                disabled={isMoving}
                className="w-full px-4 py-3 text-left transition-colors hover:bg-[#e8e8e0] disabled:opacity-50"
                onClick={() => handleMove(folder._id)}
              >
                <p className="truncate font-bold text-[#1a1a1a]">{folder.path}</p>
              </button>
            ))}
            {destinations.length === 0 && (
              <p className="px-4 py-3 text-sm text-[#888]">No other folders to move into.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
