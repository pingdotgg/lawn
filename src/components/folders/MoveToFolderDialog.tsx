import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";

type FolderItem = {
  _id: Id<"folders">;
  name: string;
  videoCount: number;
};

interface MoveToFolderDialogProps {
  videoId: Id<"videos">;
  currentFolderId?: Id<"folders">;
  folders: FolderItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoveToFolderDialog({
  videoId,
  currentFolderId,
  folders,
  open,
  onOpenChange,
}: MoveToFolderDialogProps) {
  const [selected, setSelected] = useState<Id<"folders"> | "root">(
    currentFolderId ?? "root",
  );
  const [isLoading, setIsLoading] = useState(false);
  const moveVideo = useMutation(api.videos.move);

  const handleMove = async () => {
    const targetFolderId = selected === "root" ? undefined : selected;
    if (targetFolderId === currentFolderId) return;

    setIsLoading(true);
    try {
      await moveVideo({ videoId, folderId: targetFolderId });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to move video:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isUnchanged =
    (selected === "root" && !currentFolderId) ||
    selected === currentFolderId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
          <DialogDescription>
            Choose a destination for this video.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setSelected("root")}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors border-2",
              selected === "root"
                ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#f0f0e8] font-bold"
                : "border-transparent hover:bg-[#e8e8e0] text-[#1a1a1a]",
            )}
          >
            <span className="font-bold">Project root</span>
          </button>
          {folders.map((folder) => (
            <button
              key={folder._id}
              type="button"
              onClick={() => setSelected(folder._id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors border-2",
                selected === folder._id
                  ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#f0f0e8] font-bold"
                  : "border-transparent hover:bg-[#e8e8e0] text-[#1a1a1a]",
              )}
            >
              <Folder className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{folder.name}</span>
              <span
                className={cn(
                  "ml-auto text-xs font-mono",
                  selected === folder._id ? "text-[#f0f0e8]/60" : "text-[#888]",
                )}
              >
                {folder.videoCount}
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isUnchanged || isLoading}
            onClick={handleMove}
          >
            {isLoading ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
