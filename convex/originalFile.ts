import type { Doc } from "./_generated/dataModel";

export type OriginalFileFields = Pick<
  Doc<"videos">,
  "status" | "s3Key" | "s3MultipartUploadId" | "uploadCompletedAt"
>;

// Shared by the UI and actions; only server-validated completion grants early access.
export function canDownloadOriginal(video: OriginalFileFields) {
  return Boolean(
    video.s3Key &&
    !video.s3MultipartUploadId &&
    (video.status === "ready" ||
      ((video.status === "processing" || video.status === "failed") &&
        typeof video.uploadCompletedAt === "number" &&
        Number.isFinite(video.uploadCompletedAt))),
  );
}
