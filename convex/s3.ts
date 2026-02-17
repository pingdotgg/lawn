import { S3Client } from "@aws-sdk/client-s3";

export const BUCKET_NAME = process.env.RAILWAY_BUCKET_NAME || "videos";

function getBasePublicUrl(): string {
  const baseUrl = process.env.RAILWAY_PUBLIC_URL || process.env.RAILWAY_ENDPOINT;
  if (!baseUrl) {
    throw new Error("Missing RAILWAY_PUBLIC_URL or RAILWAY_ENDPOINT for bucket URLs");
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

export function getS3Client(): S3Client {
  const accessKeyId = process.env.RAILWAY_ACCESS_KEY_ID;
  const secretAccessKey = process.env.RAILWAY_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing Railway S3 credentials");
  }

  return new S3Client({
    region: process.env.RAILWAY_REGION || "us-east-1",
    endpoint: process.env.RAILWAY_ENDPOINT,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}
