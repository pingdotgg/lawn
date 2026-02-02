"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { BUCKET_NAME, buildPublicUrl, resolvePublicThumbnailUrl } from "./s3";

// S3 client setup for Railway's S3-compatible storage
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client() {
  return new S3Client({
    region: process.env.RAILWAY_REGION || "us-east-1",
    endpoint: process.env.RAILWAY_ENDPOINT,
    credentials: {
      accessKeyId: process.env.RAILWAY_ACCESS_KEY_ID!,
      secretAccessKey: process.env.RAILWAY_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true, // Use path-style URLs for Railway
  });
}

function getExtensionFromKey(key: string, fallback = "mp4") {
  const ext = key.split(".").pop();
  if (!ext) return fallback;
  // Guard against very long or suspicious extensions.
  if (ext.length > 8) return fallback;
  return ext.toLowerCase();
}

function sanitizeFilename(input: string) {
  const trimmed = input.trim();
  const base = trimmed.length > 0 ? trimmed : "video";
  // Keep filenames simple and portable across platforms.
  const sanitized = base
    .replace(/["']/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_");
  return sanitized.slice(0, 120);
}

function buildDownloadFilename(title: string | undefined, key: string) {
  const ext = getExtensionFromKey(key);
  const safeTitle = sanitizeFilename(title ?? "video");
  return safeTitle.endsWith(`.${ext}`) ? safeTitle : `${safeTitle}.${ext}`;
}

// Get a presigned URL for direct upload (simpler than multipart)
export const getUploadUrl = action({
  args: {
    videoId: v.id("videos"),
    filename: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const s3 = getS3Client();

    // Generate a unique key for this video
    const ext = args.filename.split(".").pop() || "mp4";
    const key = `videos/${args.videoId}/${Date.now()}.${ext}`;

    // Create presigned PUT URL
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: args.contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // Update video with upload info
    await ctx.runMutation(internal.videos.setUploadInfo, {
      videoId: args.videoId,
      s3Key: key,
      s3UploadId: "direct", // No multipart upload ID needed
      fileSize: args.fileSize,
      contentType: args.contentType,
    });

    return { url, key };
  },
});

export const getThumbnailUploadUrl = action({
  args: {
    videoId: v.id("videos"),
    contentType: v.string(),
  },
  returns: v.object({
    url: v.string(),
    key: v.string(),
    publicUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    const s3 = getS3Client();

    const key = `thumbnails/${args.videoId}/thumb.jpg`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: args.contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const publicUrl = buildPublicUrl(key);

    return { url, key, publicUrl };
  },
});

export const getThumbnailUrls = action({
  args: {
    videoIds: v.array(v.id("videos")),
  },
  returns: v.array(
    v.object({
      videoId: v.id("videos"),
      url: v.union(v.string(), v.null()),
    })
  ),
  handler: async (
    ctx,
    args
  ): Promise<Array<{ videoId: Id<"videos">; url: string | null }>> => {
    if (args.videoIds.length === 0) return [];

    const records: Array<{
      videoId: Id<"videos">;
      thumbnailKey?: string;
      thumbnailUrl?: string;
    }> = await ctx.runQuery(internal.videos.getThumbnailKeys, {
      videoIds: args.videoIds,
    });

    return records.map((record) => ({
      videoId: record.videoId,
      url: resolvePublicThumbnailUrl(record),
    }));
  },
});

// Mark upload as complete (called after successful PUT)
export const markUploadComplete = action({
  args: {
    videoId: v.id("videos"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.videos.markAsReady, {
      videoId: args.videoId,
      s3Key: args.key,
    });
    return { success: true };
  },
});

// Mark upload as failed
export const markUploadFailed = action({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.videos.markAsFailed, {
      videoId: args.videoId,
    });
    return { success: true };
  },
});

// Get presigned URL for video playback
export const getPlaybackUrl = action({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const s3 = getS3Client();

    // Get video from database
    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });

    if (!video || !video.s3Key) {
      throw new Error("Video not found or not ready");
    }

    // Generate presigned URL for playback (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: video.s3Key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return { url };
  },
});

// Get presigned URL for video download (forces attachment)
export const getDownloadUrl = action({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<{ url: string; filename: string }> => {
    const s3 = getS3Client();

    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });

    if (!video || !video.s3Key) {
      throw new Error("Video not found or not ready");
    }

    const filename = buildDownloadFilename(video.title, video.s3Key);

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: video.s3Key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
      ResponseContentType: video.contentType ?? "video/mp4",
    });

    // Shorter lifetime is fine for downloads triggered by user interaction.
    const url = await getSignedUrl(s3, command, { expiresIn: 600 });

    return { url, filename };
  },
});

// Get presigned URL for shared video playback
export const getSharedPlaybackUrl = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const s3 = getS3Client();

    // Get share link and video
    const result = await ctx.runQuery(api.videos.getByShareToken, {
      token: args.token,
    });

    if (!result || !result.video.s3Key) {
      throw new Error("Video not found or not ready");
    }

    // Generate presigned URL for playback
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: result.video.s3Key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return { url };
  },
});

// Get presigned URL for shared video download (respects allowDownload)
export const getSharedDownloadUrl = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ url: string; filename: string }> => {
    const s3 = getS3Client();

    const result = await ctx.runQuery(api.videos.getByShareToken, {
      token: args.token,
    });

    if (!result || !result.video?.s3Key) {
      throw new Error("Video not found or not ready");
    }

    if (!result.allowDownload) {
      throw new Error("Downloads are not allowed for this share link");
    }

    const filename = buildDownloadFilename(result.video.title, result.video.s3Key);

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: result.video.s3Key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
      ResponseContentType: result.video.contentType ?? "video/mp4",
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 600 });

    return { url, filename };
  },
});

export const getSharedThumbnailUrl = action({
  args: { token: v.string() },
  returns: v.object({
    url: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args): Promise<{ url: string | null }> => {
    const result = await ctx.runQuery(api.videos.getByShareToken, {
      token: args.token,
    });

    if (!result?.video) {
      return { url: null };
    }

    return { url: resolvePublicThumbnailUrl(result.video) };
  },
});
