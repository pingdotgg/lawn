"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

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

const BUCKET_NAME = process.env.RAILWAY_BUCKET_NAME || "videos";

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
