// Also used for legacy s3Key values that contain a full bucket URL.
export function normalizeBucketKey(key: string) {
  if (!key.startsWith("http://") && !key.startsWith("https://")) return key;
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
}

export function parseMuxPassthrough(value: string | undefined): {
  videoId?: string;
  s3Key?: string;
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
      };
    }
  } catch {
    /* Ignore malformed provider metadata. */
  }
  return {};
}
