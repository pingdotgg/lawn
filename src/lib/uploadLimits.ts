export const GIBIBYTE = 1024 ** 3;
export const MEBIBYTE = 1024 ** 2;

export const MAX_VIDEO_FILE_SIZE_BYTES = 30 * GIBIBYTE;
export const SINGLE_PUT_MAX_BYTES = 5 * GIBIBYTE;
export const MULTIPART_PART_SIZE_BYTES = 64 * MEBIBYTE;
export const MULTIPART_UPLOAD_CONCURRENCY = 4;
export const MAX_SIGN_PARTS_BATCH = 20;

export function formatMaxUploadSize() {
  return "30 GiB";
}

export function isFileTooLarge(fileSize: number) {
  return fileSize > MAX_VIDEO_FILE_SIZE_BYTES;
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildFileFingerprint(file: File) {
  const sampleSize = 64 * 1024;
  const firstSample = file.slice(0, Math.min(sampleSize, file.size));
  const lastSample = file.slice(Math.max(0, file.size - sampleSize));
  const metadata = new TextEncoder().encode(
    `${file.name}:${file.size}:${file.lastModified}:${file.type}`,
  );
  const samples = new Uint8Array(
    metadata.byteLength + firstSample.size + lastSample.size,
  );
  samples.set(metadata, 0);
  samples.set(new Uint8Array(await firstSample.arrayBuffer()), metadata.byteLength);
  samples.set(
    new Uint8Array(await lastSample.arrayBuffer()),
    metadata.byteLength + firstSample.size,
  );

  const digest = await crypto.subtle.digest("SHA-256", samples);
  return bytesToHex(new Uint8Array(digest));
}
