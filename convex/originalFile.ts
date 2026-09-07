// Shared by the UI and actions; only server-validated completion grants early access.
export function canDownloadOriginal(video: {
  status: string;
  s3Key?: string;
  s3MultipartUploadId?: string;
  uploadCompletedAt?: number;
}) {
  return Boolean(
    video.s3Key &&
    !video.s3MultipartUploadId &&
    (video.status === "ready" ||
      ((video.status === "processing" || video.status === "failed") &&
        typeof video.uploadCompletedAt === "number" &&
        Number.isFinite(video.uploadCompletedAt))),
  );
}
