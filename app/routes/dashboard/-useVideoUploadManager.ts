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
  type UploadCreationIntent,
  uploadCreationIntentsMatch,
} from "@/lib/uploadResumeDb";
import { isProcessingRetryError, isResumableUploadError, uploadVideoFile } from "@/lib/videoUpload";

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

  const uploadFile = useCallback(
    async (projectId: Id<"projects">, file: File, creationIntent: UploadCreationIntent) => {
      const uploadId = createUploadId();
      const abortController = new AbortController();

      if (isFileTooLarge(file.size)) {
        setUploads((prev) => [
          ...prev,
          {
            id: uploadId,
            projectId,
            creationIntent,
            file,
            progress: 0,
            status: "error",
            error: `Video file is too large. Maximum size is ${formatMaxUploadSize()}.`,
            abortController,
          },
        ]);
        return;
      }

      const fingerprint = await buildFileFingerprint(file);
      const existingResume = await findUploadResumeSessionByFingerprint(
        fingerprint,
        creationIntent,
      );

      setUploads((prev) => [
        ...prev,
        {
          id: uploadId,
          projectId,
          creationIntent,
          file,
          progress: 0,
          status: "pending",
          abortController,
          resuming: Boolean(existingResume),
        },
      ]);

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

        const loadedResume = await loadUploadResumeSession(createdVideoId);
        let resumeSession =
          loadedResume && uploadCreationIntentsMatch(loadedResume, creationIntent)
            ? loadedResume
            : existingResume;
        if (loadedResume && !uploadCreationIntentsMatch(loadedResume, creationIntent)) {
          await deleteUploadResumeSession(loadedResume.videoId);
        }

        const runUpload = async (videoId: Id<"videos">, currentResume: typeof resumeSession) => {
          setUploads((prev) =>
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
              setUploads((prev) =>
                prev.map((upload) => (upload.id === uploadId ? { ...upload, resuming } : upload)),
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
            onProcessing: () => {
              setUploads((prev) =>
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

        setUploads((prev) =>
          prev.map((upload) =>
            upload.id === uploadId
              ? { ...upload, status: "complete", progress: 100, resuming: false }
              : upload,
          ),
        );

        setTimeout(
          () => {
            setUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
          },
          creationIntent.kind === "version" ? 10_000 : 3000,
        );

        return createdVideoId;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed";
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
          if (createdVideoId) {
            await deleteUploadResumeSession(createdVideoId);
            try {
              await abortVideoUpload({ videoId: createdVideoId });
            } catch (cleanupError) {
              if (!isMissingVideoError(cleanupError)) {
                console.error(cleanupError);
              }
            }
          }
          setUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
        } else if (createdVideoId && !resumable && !canRetryProcessing) {
          await deleteUploadResumeSession(createdVideoId);
          try {
            await markUploadFailed({ videoId: createdVideoId });
          } catch (cleanupError) {
            if (!isMissingVideoError(cleanupError)) {
              console.error(cleanupError);
            }
          }
        }

        return undefined;
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
    ],
  );

  const uploadFilesToProject = useCallback(
    async (projectId: Id<"projects">, files: File[]) => {
      for (const file of files) {
        await uploadFile(projectId, file, { kind: "standalone", projectId });
      }
    },
    [uploadFile],
  );

  const uploadNewVersion = useCallback(
    async (
      sourceVideoId: Id<"videos">,
      versionStackId: Id<"videos">,
      projectId: Id<"projects">,
      file: File,
    ) => {
      return await uploadFile(projectId, file, {
        kind: "version",
        sourceVideoId,
        versionStackId,
      });
    },
    [uploadFile],
  );

  const cancelUpload = useCallback(
    (uploadId: string) => {
      const upload = uploads.find((item) => item.id === uploadId);
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
        setTimeout(
          () => {
            setUploads((prev) => prev.filter((item) => item.id !== uploadId));
          },
          upload.creationIntent.kind === "version" ? 10_000 : 3000,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Processing failed";
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
    uploadNewVersion,
    cancelUpload,
    retryProcessing,
  };
}
