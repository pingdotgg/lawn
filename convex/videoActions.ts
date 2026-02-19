"use node";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";
import { action, ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  buildChunkify720pPathPrefix,
  createChunkify720pJob,
  createChunkifySourceFromUrl,
  resolveChunkifyDirectStorageId,
} from "./chunkify";
import { BUCKET_NAME, getS3Client } from "./s3";

function getExtensionFromKey(key: string, fallback = "mp4") {
  let source = key;
  if (key.startsWith("http://") || key.startsWith("https://")) {
    try {
      source = new URL(key).pathname;
    } catch {
      source = key;
    }
  }

  const ext = source.split(".").pop();
  if (!ext) return fallback;
  if (ext.length > 8 || /[^a-zA-Z0-9]/.test(ext)) return fallback;
  return ext.toLowerCase();
}

function sanitizeFilename(input: string) {
  const trimmed = input.trim();
  const base = trimmed.length > 0 ? trimmed : "video";
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

function normalizeBucketKey(key: string): string {
  if (key.startsWith("http://") || key.startsWith("https://")) {
    try {
      const pathname = new URL(key).pathname.replace(/^\/+/, "");
      const bucketPrefix = `${BUCKET_NAME}/`;
      return pathname.startsWith(bucketPrefix)
        ? pathname.slice(bucketPrefix.length)
        : pathname;
    } catch {
      return key;
    }
  }
  return key;
}

async function buildSignedBucketObjectUrl(
  key: string,
  options?: {
    expiresIn?: number;
    filename?: string;
    contentType?: string;
  },
): Promise<string> {
  const normalizedKey = normalizeBucketKey(key);
  const s3 = getS3Client();
  const filename = options?.filename;
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: normalizedKey,
    ResponseContentDisposition: filename
      ? `attachment; filename="${filename}"`
      : undefined,
    ResponseContentType: options?.contentType,
  });
  return await getSignedUrl(s3, command, { expiresIn: options?.expiresIn ?? 600 });
}

function getValueString(value: unknown, field: string): string | null {
  const raw = (value as Record<string, unknown>)[field];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

async function requireVideoMemberAccess(
  ctx: ActionCtx,
  videoId: Id<"videos">,
) {
  const video = (await ctx.runQuery(api.videos.get, { videoId })) as
    | { role?: string }
    | null;
  if (!video || video.role === "viewer") {
    throw new Error("Requires member role or higher");
  }
}

export const getUploadUrl = action({
  args: {
    videoId: v.id("videos"),
    filename: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
  },
  returns: v.object({
    url: v.string(),
    uploadId: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireVideoMemberAccess(ctx, args.videoId);

    const s3 = getS3Client();
    const ext = getExtensionFromKey(args.filename);
    const key = `videos/${args.videoId}/original/source.${ext}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: args.contentType,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    await ctx.runMutation(internal.videos.setUploadInfo, {
      videoId: args.videoId,
      s3Key: key,
      fileSize: args.fileSize,
      contentType: args.contentType,
    });

    return { url, uploadId: key };
  },
});

export const markUploadComplete = action({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireVideoMemberAccess(ctx, args.videoId);

    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });

    if (!video || !video.s3Key) {
      throw new Error("Original bucket file not found for this video");
    }

    await ctx.runMutation(internal.videos.markAsProcessing, {
      videoId: args.videoId,
    });

    try {
      const ingestUrl = await buildSignedBucketObjectUrl(video.s3Key, {
        expiresIn: 60 * 60 * 24,
      });
      const source = await createChunkifySourceFromUrl(ingestUrl, {
        videoId: args.videoId,
      });

      const directStorageId = await resolveChunkifyDirectStorageId();
      const storagePath = directStorageId
        ? buildChunkify720pPathPrefix(args.videoId)
        : undefined;

      const job = await createChunkify720pJob({
        sourceId: source.id,
        videoId: args.videoId,
        storageId: directStorageId ?? undefined,
        storagePath,
        metadata: {
          videoId: args.videoId,
          directStorage: directStorageId ? "true" : "false",
        },
      });

      await ctx.runMutation(internal.videos.setTranscodeJobInfo, {
        videoId: args.videoId,
        transcodeJobId: job.id,
      });
    } catch (error) {
      await ctx.runMutation(internal.videos.markAsFailed, {
        videoId: args.videoId,
        transcodeError: "Chunkify ingest/transcode initialization failed.",
      });
      throw error;
    }

    return { success: true };
  },
});

export const markUploadFailed = action({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireVideoMemberAccess(ctx, args.videoId);

    await ctx.runMutation(internal.videos.markAsFailed, {
      videoId: args.videoId,
      transcodeError: "Upload failed before Chunkify could process the source.",
    });

    return { success: true };
  },
});

export const getDownloadUrl = action({
  args: { videoId: v.id("videos") },
  returns: v.object({
    url: v.string(),
    filename: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; filename: string }> => {
    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });

    if (!video) {
      throw new Error("Video not found");
    }

    const key = getValueString(video, "s3Key");
    if (!key) {
      throw new Error("Original bucket file is not available yet");
    }

    const filename = buildDownloadFilename(video.title, key);

    return {
      url: await buildSignedBucketObjectUrl(key, {
        expiresIn: 600,
        filename,
        contentType: video.contentType ?? "video/mp4",
      }),
      filename,
    };
  },
});

export const runPublicAccessBackfill = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    scanned: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    let cursor: string | undefined;
    let scanned = 0;
    let updated = 0;

    while (true) {
      const result = await ctx.runMutation(internal.videos.backfillVisibilityAndPublicIds, {
        cursor,
        batchSize: args.batchSize,
      });

      scanned += result.scanned;
      updated += result.updated;

      if (result.done) {
        break;
      }

      cursor = result.cursor;
    }

    return { scanned, updated };
  },
});
