import { useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { VideoWorkflowStatus } from "@/components/videos/VideoWorkflowStatusControl";
import { runBulkVideoAction } from "@/lib/videoSelection";

/** Bulk delete / status updates with optimistic updates on cached `videos.list` pages. */
export function useBulkVideoActions() {
  const removeStacks = useMutation(api.videos.removeStacks).withOptimisticUpdate(
    (localStore, { videoIds }) => {
      const removed = new Set(videoIds);
      for (const { args, value } of localStore.getAllQueries(api.videos.list)) {
        if (!value) continue;
        if (!value.page.some((video) => removed.has(video._id))) continue;
        localStore.setQuery(api.videos.list, args, {
          ...value,
          page: value.page.filter((video) => !removed.has(video._id)),
        });
      }
    },
  );

  const updateWorkflowStatusMany = useMutation(
    api.videos.updateWorkflowStatusMany,
  ).withOptimisticUpdate((localStore, { videoIds, workflowStatus }) => {
    const updated = new Set(videoIds);
    for (const { args, value } of localStore.getAllQueries(api.videos.list)) {
      if (!value) continue;
      if (!value.page.some((video) => updated.has(video._id))) continue;
      localStore.setQuery(api.videos.list, args, {
        ...value,
        page: value.page.map((video) =>
          updated.has(video._id) ? { ...video, workflowStatus } : video,
        ),
      });
    }
  });

  const deleteVideos = useCallback(
    (videoIds: readonly Id<"videos">[]) =>
      runBulkVideoAction(
        videoIds,
        (chunk) => removeStacks({ videoIds: chunk }),
        "Failed to delete videos",
      ),
    [removeStacks],
  );

  const setWorkflowStatus = useCallback(
    (videoIds: readonly Id<"videos">[], workflowStatus: VideoWorkflowStatus) =>
      runBulkVideoAction(
        videoIds,
        (chunk) => updateWorkflowStatusMany({ videoIds: chunk, workflowStatus }),
        "Failed to update status",
      ),
    [updateWorkflowStatusMany],
  );

  return useMemo(() => ({ deleteVideos, setWorkflowStatus }), [deleteVideos, setWorkflowStatus]);
}
