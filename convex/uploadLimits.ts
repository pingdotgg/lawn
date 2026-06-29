export const GIBIBYTE = 1024 ** 3;
export const MEBIBYTE = 1024 ** 2;

export const MAX_VIDEO_FILE_SIZE_BYTES = 50 * GIBIBYTE;
export const SINGLE_PUT_MAX_BYTES = 256 * MEBIBYTE;
export const MULTIPART_PART_SIZE_BYTES = 64 * MEBIBYTE;

export const PRESIGN_SINGLE_PUT_EXPIRES_SEC = 3600;
export const PRESIGN_PART_EXPIRES_SEC = 86400;
export const MAX_SIGN_PARTS_BATCH = 20;
export const STALE_UPLOAD_THRESHOLD_MS = 24 * 60 * 60 * 1000;
export const STALE_UPLOAD_SWEEP_BATCH_SIZE = 100;
export const ORPHANED_MULTIPART_UPLOAD_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
export const ORPHANED_MULTIPART_SWEEP_BATCH_SIZE = 100;

export function computePartCount(fileSize: number, partSize = MULTIPART_PART_SIZE_BYTES) {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    throw new Error("Video file size must be greater than zero.");
  }
  return Math.ceil(fileSize / partSize);
}

export function usesMultipartUpload(fileSize: number) {
  return fileSize > SINGLE_PUT_MAX_BYTES;
}

export function assertVideoFileSizeAllowed(fileSize: number) {
  if (fileSize > MAX_VIDEO_FILE_SIZE_BYTES) {
    throw new Error("Video file is too large. Maximum size is 50 GiB.");
  }
}
