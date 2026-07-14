/**
 * Pure helpers for project asset content-type allowlisting and classification.
 * Safe to import from client and Convex default runtime (no Node APIs).
 */

export type ProjectAssetKind = "image" | "audio" | "document" | "other";

const IMAGE_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const AUDIO_CONTENT_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp3",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
]);

const DOCUMENT_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

/** MIME types accepted when extension alone is not required. */
const ALLOWED_ASSET_CONTENT_TYPES = new Set([
  ...IMAGE_CONTENT_TYPES,
  ...AUDIO_CONTENT_TYPES,
  ...DOCUMENT_CONTENT_TYPES,
]);

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const AUDIO_EXTENSIONS = new Set(["wav", "mp3", "aac", "m4a"]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "docx", "txt"]);
const OTHER_EXTENSIONS = new Set(["aup3"]);

const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  m4a: "audio/mp4",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  aup3: "application/octet-stream",
};

const VIDEO_FILE_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "avi", "mkv"]);

export const PROJECT_ASSET_ACCEPT =
  "video/*,image/png,image/jpeg,image/webp,image/gif,audio/*,.pdf,.docx,.txt,.aup3,.wav,.mp3,.aac,.m4a,.png,.jpg,.jpeg,.webp,.gif";

export function normalizeContentType(contentType: string | null | undefined): string {
  if (!contentType) return "";
  return contentType.split(";")[0]!.trim().toLowerCase();
}

export function getFileExtension(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function isVideoUploadFile(filename: string, contentType?: string | null): boolean {
  const normalized = normalizeContentType(contentType);
  if (normalized.startsWith("video/")) return true;
  return VIDEO_FILE_EXTENSIONS.has(getFileExtension(filename));
}

/**
 * Resolve a canonical content type for an asset from browser MIME + extension.
 * Returns null when the file is not an allowed project asset.
 */
export function resolveProjectAssetContentType(
  filename: string,
  contentType?: string | null,
): string | null {
  const ext = getFileExtension(filename);
  const normalized = normalizeContentType(contentType);

  // Extension-first for known asset types (browsers often mislabel or omit MIME).
  if (ext && EXTENSION_TO_CONTENT_TYPE[ext]) {
    // Reject video extensions even if someone spoofs a doc MIME.
    if (VIDEO_FILE_EXTENSIONS.has(ext)) return null;
    return EXTENSION_TO_CONTENT_TYPE[ext]!;
  }

  if (normalized && ALLOWED_ASSET_CONTENT_TYPES.has(normalized)) {
    // Normalize aliases
    if (normalized === "image/jpg") return "image/jpeg";
    if (normalized === "audio/mp3" || normalized === "audio/x-wav" || normalized === "audio/wave") {
      if (normalized === "audio/mp3") return "audio/mpeg";
      return "audio/wav";
    }
    if (normalized === "audio/m4a" || normalized === "audio/x-m4a") return "audio/mp4";
    return normalized;
  }

  // .aup3 and similar binaries may arrive as empty type or octet-stream.
  if (ext === "aup3") {
    return "application/octet-stream";
  }

  return null;
}

export function classifyProjectAssetKind(
  contentType: string,
  filename?: string,
): ProjectAssetKind {
  const normalized = normalizeContentType(contentType);
  const ext = filename ? getFileExtension(filename) : "";

  if (IMAGE_CONTENT_TYPES.has(normalized) || IMAGE_EXTENSIONS.has(ext)) {
    return "image";
  }
  if (AUDIO_CONTENT_TYPES.has(normalized) || AUDIO_EXTENSIONS.has(ext)) {
    return "audio";
  }
  if (DOCUMENT_CONTENT_TYPES.has(normalized) || DOCUMENT_EXTENSIONS.has(ext)) {
    return "document";
  }
  if (ext === "aup3" || OTHER_EXTENSIONS.has(ext) || normalized === "application/octet-stream") {
    return "other";
  }
  return "other";
}

export function isAllowedProjectAsset(filename: string, contentType?: string | null): boolean {
  if (isVideoUploadFile(filename, contentType)) return false;
  return resolveProjectAssetContentType(filename, contentType) !== null;
}

export function describeAllowedProjectAssets(): string {
  return "images (png/jpg/webp/gif), audio (wav/mp3/aac/m4a), docs (pdf/docx/txt), aup3";
}

export function titleFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const withoutExt = base.replace(/\.[^/.]+$/, "");
  return withoutExt.trim().length > 0 ? withoutExt.trim() : base;
}
