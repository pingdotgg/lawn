export const BUCKET_NAME = process.env.RAILWAY_BUCKET_NAME || "videos";

function getBasePublicUrl(): string {
  const baseUrl = process.env.RAILWAY_PUBLIC_URL;
  if (!baseUrl) {
    throw new Error("Missing RAILWAY_PUBLIC_URL for public thumbnail URLs");
  }
  return baseUrl;
}

export function buildPublicUrl(key: string): string {
  const includeBucket = process.env.RAILWAY_PUBLIC_URL_INCLUDE_BUCKET !== "false";
  const url = new URL(getBasePublicUrl());
  const basePath = url.pathname.endsWith("/")
    ? url.pathname.slice(0, -1)
    : url.pathname;
  const objectPath = includeBucket ? `${BUCKET_NAME}/${key}` : key;
  url.pathname = `${basePath}/${objectPath}`;
  return url.toString();
}

export function resolvePublicThumbnailUrl(input: {
  thumbnailUrl?: string;
  thumbnailKey?: string;
}): string | null {
  if (input.thumbnailUrl?.startsWith("http")) {
    return input.thumbnailUrl;
  }

  if (input.thumbnailKey?.startsWith("http")) {
    return input.thumbnailKey;
  }

  const key = input.thumbnailKey ?? input.thumbnailUrl;
  if (!key) {
    return null;
  }

  return buildPublicUrl(key);
}
