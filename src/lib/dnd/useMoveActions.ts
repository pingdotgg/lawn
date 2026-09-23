import { useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { runBulkVideoAction } from "@/lib/videoSelection";
import type { DragPayload } from "./payload";

type MoveOutcome = { ok: boolean; error?: string };

/**
 * Wraps `videos.move` and `projects.move` with conservative optimistic updates
 * (remove the moved item from the visible source list cache) and surfaces a
 * uniform error result so callers can show a toast. Convex rolls the optimistic
 * state back automatically if the server rejects the move.
 */
export function useMoveActions() {
  const moveVideo = useMutation(api.videos.move).withOptimisticUpdate((localStore, { videoId }) => {
    // Remove the moved video from whichever cached `videos.list` contains it
    // (its source folder), so the card vanishes from the current view instantly.
    for (const { args, value } of localStore.getAllQueries(api.videos.list)) {
      if (!value) continue;
      if (!value.page.some((video) => video._id === videoId)) continue;
      localStore.setQuery(api.videos.list, args, {
        ...value,
        page: value.page.filter((video) => video._id !== videoId),
      });
    }
  });

  const moveManyVideos = useMutation(api.videos.moveMany).withOptimisticUpdate(
    (localStore, { videoIds }) => {
      const moved = new Set(videoIds);
      for (const { args, value } of localStore.getAllQueries(api.videos.list)) {
        if (!value) continue;
        if (!value.page.some((video) => moved.has(video._id))) continue;
        localStore.setQuery(api.videos.list, args, {
          ...value,
          page: value.page.filter((video) => !moved.has(video._id)),
        });
      }
    },
  );

  const moveFolder = useMutation(api.projects.move).withOptimisticUpdate(
    (localStore, { projectId }) => {
      // Remove the moved folder from the source listing (folder view or team root).
      for (const { args, value } of localStore.getAllQueries(api.projects.listChildren)) {
        if (!value) continue;
        if (!value.some((folder) => folder._id === projectId)) continue;
        localStore.setQuery(
          api.projects.listChildren,
          args,
          value.filter((folder) => folder._id !== projectId),
        );
      }
      for (const { args, value } of localStore.getAllQueries(api.projects.list)) {
        if (!value) continue;
        if (!value.some((folder) => folder._id === projectId)) continue;
        localStore.setQuery(
          api.projects.list,
          args,
          value.filter((folder) => folder._id !== projectId),
        );
      }
    },
  );

  const moveVideoTo = useCallback(
    async (videoId: Id<"videos">, destProjectId: Id<"projects">): Promise<MoveOutcome> => {
      try {
        await moveVideo({ videoId, projectId: destProjectId });
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to move video",
        };
      }
    },
    [moveVideo],
  );

  const moveVideosTo = useCallback(
    (videoIds: readonly Id<"videos">[], destProjectId: Id<"projects">): Promise<MoveOutcome> =>
      runBulkVideoAction(
        videoIds,
        (chunk) => moveManyVideos({ videoIds: chunk, projectId: destProjectId }),
        "Failed to move videos",
      ),
    [moveManyVideos],
  );

  const moveFolderTo = useCallback(
    async (folderId: Id<"projects">, destParentId?: Id<"projects">): Promise<MoveOutcome> => {
      try {
        await moveFolder({ projectId: folderId, newParentId: destParentId });
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to move folder",
        };
      }
    },
    [moveFolder],
  );

  /**
   * Dispatches a drop: a video payload moves into `destProjectId` (required);
   * a folder payload moves under `destProjectId`, or to top level when omitted.
   */
  const moveFromDrop = useCallback(
    (payload: DragPayload, destProjectId?: Id<"projects">): Promise<MoveOutcome> => {
      if (payload.kind === "video") {
        if (!destProjectId) {
          return Promise.resolve({
            ok: false,
            error: "Videos must live in a folder",
          });
        }
        return moveVideoTo(payload.videoId, destProjectId);
      }
      return moveFolderTo(payload.projectId, destProjectId);
    },
    [moveVideoTo, moveFolderTo],
  );

  return useMemo(
    () => ({ moveVideoTo, moveVideosTo, moveFolderTo, moveFromDrop }),
    [moveVideoTo, moveVideosTo, moveFolderTo, moveFromDrop],
  );
}
