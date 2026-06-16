import { useAction, useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import type { UploadStatus } from "@/components/upload/UploadProgress";
import { buildFileFingerprint, isFileTooLarge, formatMaxUploadSize } from "@/lib/uploadLimits";
import {
  deleteUploadResumeSession,
  findUploadResumeSessionByFingerprint,
  loadUploadResumeSession,
} from "@/lib/uploadResumeDb";
import {
  isProcessingRetryError,
  isResumableUploadError,
  uploadVideoFile,
} from "@/lib/videoUpload";

export interface ManagedUploadItem {
  id: string;
  projectId: Id<"projects">;
  file: File;
  videoId?: Id<"videos">;
  progress: number;
  status: UploadStatus;
  error?: string;
  bytesPerSecond?: number;
  estimatedSecondsRemaining?: number | null;
  abortController?: AbortController;
  resuming?: boolean;
  canRetryProcessing?: boolean;
}

function createUploadId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function useVideoUploadManager() {
  const createVideo = useMutation(api.videos.create);
  const initiateVideoUpload = useAction(api.videoActions.initiateVideoUpload);
  const signUploadParts = useAction(api.videoActions.signUploadParts);
  const completeMultipartUpload = useAction(api.videoActions.completeMultipartUpload);
  const markUploadComplete = useAction(api.videoActions.markUploadComplete);
  const markUploadFailed = useAction(api.videoActions.markUploadFailed);
  const abortVideoUpload = useAction(api.videoActions.abortVideoUpload);
  const [uploads, setUploads] = useState<ManagedUploadItem[]>([]);

  const uploadActions = {
    initiateVideoUpload,
    signUploadParts,
    completeMultipartUpload,
    markUploadComplete,
  };

  const uploadFilesToProject = useCallback(
    async (projectId: Id<"projects">, files: File[]) => {
      for (const file of files) {
        const uploadId = createUploadId();
        const title = file.name.replace(/\.[^/.]+$/, "");
        const abortController = new AbortController();
        const fingerprint = await buildFileFingerprint(file);

        if (isFileTooLarge(file.size)) {
          setUploads((prev) => [
            ...prev,
            {
              id: uploadId,
              projectId,
              file,
              progress: 0,
              status: "error",
              error: `Video file is too large. Maximum size is ${formatMaxUploadSize()}.`,
              abortController,
            },
          ]);
          continue;
        }

        const existingResume = await findUploadResumeSessionByFingerprint(
          fingerprint,
          projectId,
        );

        setUploads((prev) => [
          ...prev,
          {
            id: uploadId,
            projectId,
            file,
            progress: 0,
            status: "pending",
            abortController,
            resuming: Boolean(existingResume),
          },
        ]);

        let createdVideoId: Id<"videos"> | undefined = existingResume?.videoId;

        try {
          if (!createdVideoId) {
            createdVideoId = await createVideo({
              projectId,
              title,
              fileSize: file.size,
              contentType: file.type || "video/mp4",
            });
          }

          let resumeSession =
            (await loadUploadResumeSession(createdVideoId)) ?? existingResume;

          const runUpload = async () => {
            setUploads((prev) =>
              prev.map((upload) =>
                upload.id === uploadId
                  ? {
                      ...upload,
                      videoId: createdVideoId,
                      status: "uploading",
                      resuming: Boolean(resumeSession),
                    }
                  : upload,
              ),
            );

            await uploadVideoFile({
              file,
              projectId,
              videoId: createdVideoId!,
              actions: uploadActions,
              signal: abortController.signal,
              resumeSession,
              fileFingerprint: fingerprint,
              onResumingChange: (resuming) => {
                setUploads((prev) =>
                  prev.map((upload) =>
                    upload.id === uploadId ? { ...upload, resuming } : upload,
                  ),
                );
              },
              onProgress: (update) => {
                setUploads((prev) =>
                  prev.map((upload) =>
                    upload.id === uploadId
                      ? {
                          ...upload,
                          progress: update.progress,
                          bytesPerSecond: update.bytesPerSecond,
                          estimatedSecondsRemaining: update.estimatedSecondsRemaining,
                        }
                      : upload,
                  ),
                );
              },
            });
          };

          try {
            await runUpload();
          } catch (error) {
            const staleResumeVideo =
              Boolean(existingResume) &&
              error instanceof Error &&
              error.message.includes("Video not found");
            if (!staleResumeVideo) {
              throw error;
            }

            await deleteUploadResumeSession(createdVideoId);
            createdVideoId = await createVideo({
              projectId,
              title,
              fileSize: file.size,
              contentType: file.type || "video/mp4",
            });
            resumeSession = undefined;
            await runUpload();
          }

          setUploads((prev) =>
            prev.map((upload) =>
              upload.id === uploadId
                ? { ...upload, status: "complete", progress: 100, resuming: false }
                : upload,
            ),
          );

          setTimeout(() => {
            setUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
          }, 3000);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Upload failed";
          const cancelled = abortController.signal.aborted;
          const resumable = isResumableUploadError(error);
          const canRetryProcessing = isProcessingRetryError(error);

          setUploads((prev) =>
            prev.map((upload) =>
              upload.id === uploadId
                ? {
                    ...upload,
                    status: cancelled ? "pending" : "error",
                    error: cancelled ? undefined : errorMessage,
                    canRetryProcessing,
                  }
                : upload,
            ),
          );

          if (cancelled) {
            setUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
          } else if (createdVideoId && !resumable && !canRetryProcessing) {
            deleteUploadResumeSession(createdVideoId).catch(console.error);
            markUploadFailed({ videoId: createdVideoId }).catch(console.error);
          }
        }
      }
    },
    [
      createVideo,
      initiateVideoUpload,
      signUploadParts,
      completeMultipartUpload,
      markUploadComplete,
      markUploadFailed,
    ],
  );

  const cancelUpload = useCallback(
    (uploadId: string) => {
      const upload = uploads.find((item) => item.id === uploadId);
      if (upload?.abortController) {
        upload.abortController.abort();
      }
      if (upload?.videoId) {
        abortVideoUpload({ videoId: upload.videoId }).catch(console.error);
        deleteUploadResumeSession(upload.videoId).catch(console.error);
      }
      setUploads((prev) => prev.filter((item) => item.id !== uploadId));
    },
    [uploads, abortVideoUpload],
  );

  const retryProcessing = useCallback(
    async (uploadId: string) => {
      const upload = uploads.find((item) => item.id === uploadId);
      if (!upload?.videoId || !upload.canRetryProcessing) return;

      setUploads((prev) =>
        prev.map((item) =>
          item.id === uploadId
            ? {
                ...item,
                status: "processing",
                error: undefined,
                canRetryProcessing: false,
              }
            : item,
        ),
      );

      try {
        await markUploadComplete({ videoId: upload.videoId });
        await deleteUploadResumeSession(upload.videoId);
        setUploads((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? { ...item, status: "complete", progress: 100, resuming: false }
              : item,
          ),
        );
        setTimeout(() => {
          setUploads((prev) => prev.filter((item) => item.id !== uploadId));
        }, 3000);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Processing failed";
        const canRetryProcessing = isProcessingRetryError(error);
        if (!canRetryProcessing) {
          await deleteUploadResumeSession(upload.videoId);
        }
        setUploads((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? {
                  ...item,
                  status: "error",
                  error: errorMessage,
                  canRetryProcessing,
                }
              : item,
          ),
        );
      }
    },
    [uploads, markUploadComplete],
  );

  return {
    uploads,
    uploadFilesToProject,
    cancelUpload,
    retryProcessing,
  };
}
