// Also used for legacy s3Key values that contain a full bucket URL.
export function normalizeBucketKey(key: string) {
  if (!key.startsWith("http://") && !key.startsWith("https://")) return key;
  try {
    const url = new URL(key);
    let pathname = url.pathname.replace(/^\/+/, "");
    const baseUrl = process.env.RAILWAY_PUBLIC_URL || process.env.RAILWAY_ENDPOINT;
    if (baseUrl) {
      const base = new URL(baseUrl);
      const basePath = base.pathname.replace(/^\/+|\/+$/g, "");
      if (url.origin === base.origin && basePath && pathname.startsWith(`${basePath}/`)) {
        pathname = pathname.slice(basePath.length + 1);
      }
    }
    const bucketPrefix = `${process.env.RAILWAY_BUCKET_NAME || "videos"}/`;
    if (
      process.env.RAILWAY_PUBLIC_URL_INCLUDE_BUCKET !== "false" &&
      pathname.startsWith(bucketPrefix)
    ) {
      pathname = pathname.slice(bucketPrefix.length);
    }
    return decodeURIComponent(pathname);
  } catch {
    return key; // Preserve malformed legacy keys so cleanup can still be recorded.
  }
}

export function parseMuxPassthrough(value: string | undefined): {
  videoId?: string;
  s3Key?: string;
  s3KeyHash?: string;
} {
  if (!value) return {};
  if (!value.startsWith("{")) return { videoId: value };
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      "videoId" in parsed &&
      typeof parsed.videoId === "string"
    ) {
      return {
        videoId: parsed.videoId,
        s3Key: "s3Key" in parsed && typeof parsed.s3Key === "string" ? parsed.s3Key : undefined,
        s3KeyHash:
          "s3KeyHash" in parsed && typeof parsed.s3KeyHash === "string"
            ? parsed.s3KeyHash
            : undefined,
      };
    }
  } catch {
    /* Ignore malformed provider metadata. */
  }
  return {};
}

export async function hashUploadKey(key: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createMuxPassthrough(videoId: string, s3Key?: string) {
  const value =
    s3Key === undefined
      ? videoId
      : JSON.stringify({ videoId, s3KeyHash: await hashUploadKey(s3Key) });
  if (value.length > 255)
    throw new Error("Video reference exceeds Mux's 255-character passthrough limit");
  return value;
}
