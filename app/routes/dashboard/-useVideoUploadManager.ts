import { useAction, useMutation } from "convex/react";
import { useCallback, useRef, useState } from "react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import type { UploadStatus } from "@/components/upload/UploadProgress";
import { buildFileFingerprint, isFileTooLarge, formatMaxUploadSize } from "@/lib/uploadLimits";
import {
  deleteUploadResumeSession,
  findUploadResumeSessionByFingerprint,
  loadUploadResumeSession,
  type UploadCreationIntent,
  uploadCreationIntentsMatch,
} from "@/lib/uploadResumeDb";
import {
  createAsyncTaskQueue,
  isProcessingRetryError,
  isResumableUploadError,
  uploadVideoFile,
} from "@/lib/videoUpload";

// Multipart uploads already use four parallel part PUTs, so two files bound the browser at eight.
const UPLOAD_FILE_CONCURRENCY = 2;

export interface ManagedUploadItem {
  id: string;
  projectId: Id<"projects">;
  creationIntent: UploadCreationIntent;
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

function isMissingVideoError(error: unknown) {
  return error instanceof Error && error.message.includes("Video not found");
}

function createQueuedUpload(
  projectId: Id<"projects">,
  file: File,
  creationIntent: UploadCreationIntent,
) {
  const tooLarge = isFileTooLarge(file.size);
  return {
    id: createUploadId(),
    projectId,
    creationIntent,
    file,
    progress: 0,
    status: tooLarge ? ("error" as const) : ("pending" as const),
    error: tooLarge
      ? `Video file is too large. Maximum size is ${formatMaxUploadSize()}.`
      : undefined,
    abortController: new AbortController(),
  } satisfies ManagedUploadItem;
}

export function useVideoUploadManager() {
  const createVideo = useMutation(api.videos.create);
  const createVersion = useMutation(api.videos.createVersion);
  const initiateVideoUpload = useAction(api.videoActions.initiateVideoUpload);
  const signUploadParts = useAction(api.videoActions.signUploadParts);
  const completeMultipartUpload = useAction(api.videoActions.completeMultipartUpload);
  const markUploadComplete = useAction(api.videoActions.markUploadComplete);
  const markUploadFailed = useAction(api.videoActions.markUploadFailed);
  const abortVideoUpload = useAction(api.videoActions.abortVideoUpload);
  const [uploads, setUploads] = useState<ManagedUploadItem[]>([]);
  const uploadsRef = useRef<ManagedUploadItem[]>([]);
  const claimedResumeVideoIdsRef = useRef(new Set<Id<"videos">>());
  const uploadQueueRef = useRef<ReturnType<typeof createAsyncTaskQueue> | null>(null);
  uploadQueueRef.current ??= createAsyncTaskQueue(UPLOAD_FILE_CONCURRENCY);
  const uploadQueue = uploadQueueRef.current;

  const updateUploads = useCallback(
    (updater: (currentUploads: ManagedUploadItem[]) => ManagedUploadItem[]) => {
      setUploads((currentUploads) => {
        const nextUploads = updater(currentUploads);
        uploadsRef.current = nextUploads;
        return nextUploads;
      });
    },
    [],
  );

  const processUpload = useCallback(
    async (queuedUpload: ManagedUploadItem) => {
      const { id: uploadId, file, creationIntent, abortController } = queuedUpload;
      if (!abortController || abortController.signal.aborted || queuedUpload.status === "error") {
        return undefined;
      }

      const preparedUpload = await (async () => {
        const fingerprint = await buildFileFingerprint(file);
        if (abortController.signal.aborted) throw new Error("Upload cancelled");

        const resumeCandidate = await findUploadResumeSessionByFingerprint(
          fingerprint,
          creationIntent,
        );
        if (abortController.signal.aborted) throw new Error("Upload cancelled");

        const existingResume =
          resumeCandidate && !claimedResumeVideoIdsRef.current.has(resumeCandidate.videoId)
            ? resumeCandidate
            : undefined;
        if (existingResume) {
          claimedResumeVideoIdsRef.current.add(existingResume.videoId);
        }
        return { fingerprint, existingResume };
      })().catch((error) => {
        if (abortController.signal.aborted) {
          updateUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
        } else {
          updateUploads((prev) =>
            prev.map((upload) =>
              upload.id === uploadId
                ? {
                    ...upload,
                    status: "error",
                    error: error instanceof Error ? error.message : "Upload failed",
                  }
                : upload,
            ),
          );
        }
        return undefined;
      });
      if (!preparedUpload) return undefined;
      const { fingerprint, existingResume } = preparedUpload;

      updateUploads((prev) =>
        prev.map((upload) =>
          upload.id === uploadId ? { ...upload, resuming: Boolean(existingResume) } : upload,
        ),
      );

      const createVideoForIntent = async () => {
        if (creationIntent.kind === "version") {
          const created = await createVersion({
            sourceVideoId: creationIntent.sourceVideoId,
            fileSize: file.size,
            contentType: file.type || "video/mp4",
          });
          return created.videoId;
        }

        return await createVideo({
          projectId: creationIntent.projectId,
          title: file.name.replace(/\.[^/.]+$/, ""),
          fileSize: file.size,
          contentType: file.type || "video/mp4",
        });
      };

      let createdVideoId: Id<"videos"> | undefined = existingResume?.videoId;

      try {
        if (!createdVideoId) {
          createdVideoId = await createVideoForIntent();
        }
        if (abortController.signal.aborted) {
          throw new Error("Upload cancelled");
        }

        const loadedResume = await loadUploadResumeSession(createdVideoId);
        let resumeSession =
          loadedResume && uploadCreationIntentsMatch(loadedResume, creationIntent)
            ? loadedResume
            : existingResume;
        if (loadedResume && !uploadCreationIntentsMatch(loadedResume, creationIntent)) {
          await deleteUploadResumeSession(loadedResume.videoId);
        }

        const runUpload = async (videoId: Id<"videos">, currentResume: typeof resumeSession) => {
          updateUploads((prev) =>
            prev.map((upload) =>
              upload.id === uploadId
                ? {
                    ...upload,
                    videoId,
                    status: "uploading",
                    resuming: Boolean(currentResume),
                  }
                : upload,
            ),
          );

          await uploadVideoFile({
            file,
            creationIntent,
            videoId,
            actions: {
              initiateVideoUpload,
              signUploadParts,
              completeMultipartUpload,
              markUploadComplete,
            },
            signal: abortController.signal,
            resumeSession: currentResume,
            fileFingerprint: fingerprint,
            onResumingChange: (resuming) => {
              updateUploads((prev) =>
                prev.map((upload) => (upload.id === uploadId ? { ...upload, resuming } : upload)),
              );
            },
            onProgress: (update) => {
              updateUploads((prev) =>
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
            onProcessing: () => {
              updateUploads((prev) =>
                prev.map((upload) =>
                  upload.id === uploadId
                    ? {
                        ...upload,
                        status: "processing",
                        progress: 100,
                        bytesPerSecond: 0,
                        estimatedSecondsRemaining: 0,
                      }
                    : upload,
                ),
              );
            },
          });
        };

        try {
          await runUpload(createdVideoId, resumeSession);
        } catch (error) {
          const staleResumeVideo =
            Boolean(existingResume) &&
            error instanceof Error &&
            error.message.includes("Video not found");
          if (!staleResumeVideo) {
            throw error;
          }

          await deleteUploadResumeSession(createdVideoId);
          createdVideoId = await createVideoForIntent();
          resumeSession = undefined;
          await runUpload(createdVideoId, resumeSession);
        }

        updateUploads((prev) =>
          prev.map((upload) =>
            upload.id === uploadId
              ? { ...upload, status: "complete", progress: 100, resuming: false }
              : upload,
          ),
        );

        setTimeout(
          () => {
            updateUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
          },
          creationIntent.kind === "version" ? 10_000 : 3000,
        );

        return createdVideoId;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed";
        const cancelled = abortController.signal.aborted;
        const resumable = isResumableUploadError(error);
        const canRetryProcessing = isProcessingRetryError(error);

        updateUploads((prev) =>
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
          if (createdVideoId) {
            try {
              await deleteUploadResumeSession(createdVideoId);
            } catch (cleanupError) {
              console.error(cleanupError);
            }
            try {
              await abortVideoUpload({ videoId: createdVideoId });
            } catch (cleanupError) {
              if (!isMissingVideoError(cleanupError)) {
                console.error(cleanupError);
              }
            }
          }
          updateUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
        } else if (createdVideoId && !resumable && !canRetryProcessing) {
          try {
            await deleteUploadResumeSession(createdVideoId);
          } catch (cleanupError) {
            console.error(cleanupError);
          }
          try {
            await markUploadFailed({ videoId: createdVideoId });
          } catch (cleanupError) {
            if (!isMissingVideoError(cleanupError)) {
              console.error(cleanupError);
            }
          }
        }
        return undefined;
      } finally {
        if (existingResume) {
          claimedResumeVideoIdsRef.current.delete(existingResume.videoId);
        }
      }
    },
    [
      createVideo,
      createVersion,
      initiateVideoUpload,
      signUploadParts,
      completeMultipartUpload,
      markUploadComplete,
      markUploadFailed,
      abortVideoUpload,
      updateUploads,
    ],
  );

  const uploadFilesToProject = useCallback(
    async (projectId: Id<"projects">, files: File[]) => {
      const queuedUploads = files.map((file) =>
        createQueuedUpload(projectId, file, { kind: "standalone", projectId }),
      );

      updateUploads((prev) => [...prev, ...queuedUploads]);
      await Promise.all(
        queuedUploads.map((upload) =>
          upload.status === "error"
            ? Promise.resolve(undefined)
            : uploadQueue.add(() => processUpload(upload)),
        ),
      );
    },
    [processUpload, updateUploads, uploadQueue],
  );

  const uploadNewVersion = useCallback(
    async (
      sourceVideoId: Id<"videos">,
      versionStackId: Id<"videos">,
      projectId: Id<"projects">,
      file: File,
    ) => {
      const queuedUpload = createQueuedUpload(projectId, file, {
        kind: "version" as const,
        sourceVideoId,
        versionStackId,
      });

      updateUploads((prev) => [...prev, queuedUpload]);
      if (queuedUpload.status === "error") return undefined;
      return await uploadQueue.add(() => processUpload(queuedUpload));
    },
    [processUpload, updateUploads, uploadQueue],
  );

  const cancelUpload = useCallback(
    (uploadId: string) => {
      const upload = uploadsRef.current.find((item) => item.id === uploadId);
      if (upload?.abortController) {
        upload.abortController.abort();
      }
      if (upload?.videoId) {
        abortVideoUpload({ videoId: upload.videoId }).catch((error) => {
          if (!isMissingVideoError(error)) {
            console.error(error);
          }
        });
        deleteUploadResumeSession(upload.videoId).catch(console.error);
      }
      updateUploads((prev) => prev.filter((item) => item.id !== uploadId));
    },
    [abortVideoUpload, updateUploads],
  );

  const retryProcessing = useCallback(
    async (uploadId: string) => {
      const upload = uploadsRef.current.find((item) => item.id === uploadId);
      if (!upload?.videoId || !upload.canRetryProcessing) return;

      updateUploads((prev) =>
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
        updateUploads((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? { ...item, status: "complete", progress: 100, resuming: false }
              : item,
          ),
        );
        setTimeout(
          () => {
            updateUploads((prev) => prev.filter((item) => item.id !== uploadId));
          },
          upload.creationIntent.kind === "version" ? 10_000 : 3000,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Processing failed";
        const canRetryProcessing = isProcessingRetryError(error);
        if (!canRetryProcessing) {
          await deleteUploadResumeSession(upload.videoId);
        }
        updateUploads((prev) =>
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
    [markUploadComplete, updateUploads],
  );

  return {
    uploads,
    uploadFilesToProject,
    uploadNewVersion,
    cancelUpload,
    retryProcessing,
  };
}
