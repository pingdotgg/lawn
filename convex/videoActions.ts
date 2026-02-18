"use node";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";
import { action, ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  buildMuxPlaybackUrl,
  buildMuxThumbnailUrl,
  createMuxAssetFromInputUrl,
  createPublicPlaybackId,
  deletePlaybackId,
  getMuxAsset,
} from "./mux";
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

function getValueId(value: unknown, field: string): Id<"videos"> | null {
  const raw = (value as Record<string, unknown>)[field];
  return typeof raw === "string" && raw.length > 0 ? (raw as Id<"videos">) : null;
}

async function ensureOriginalBucketKey(
  ctx: ActionCtx,
  value: unknown,
): Promise<string> {
  const existing = getValueString(value, "s3Key");
  if (existing) return existing;

  const videoId = getValueId(value, "_id");
  if (!videoId) {
    throw new Error("Video not found or not ready");
  }

  const playbackId = getValueString(value, "muxPlaybackId");
  if (!playbackId) {
    throw new Error("Original bucket file not found for this video");
  }

  const sourceUrl = `https://stream.mux.com/${playbackId}/high.mp4`;
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error("Failed to prepare original bucket download");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const key = `videos/${videoId}/original.mp4`;
  const contentType = getValueString(value, "contentType") ?? "video/mp4";

  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  await ctx.runMutation(internal.videos.setOriginalBucketKey, {
    videoId,
    s3Key: key,
  });

  return key;
}

async function requireVideoMemberAccess(
  ctx: ActionCtx,
  videoId: Id<"videos">
) {
  const video = (await ctx.runQuery(api.videos.get, { videoId })) as
    | { role?: string }
    | null;
  if (!video || video.role === "viewer") {
    throw new Error("Requires member role or higher");
  }
}

function buildPublicPlaybackSession(
  playbackId: string,
): { url: string; posterUrl: string } {
  return {
    url: buildMuxPlaybackUrl(playbackId),
    posterUrl: buildMuxThumbnailUrl(playbackId),
  };
}

async function ensurePublicPlaybackId(
  ctx: ActionCtx,
  params: {
    videoId?: Id<"videos">;
    muxAssetId?: string | null;
    muxPlaybackId: string;
  },
): Promise<string> {
  const { videoId, muxAssetId, muxPlaybackId } = params;
  if (!muxAssetId) return muxPlaybackId;

  const asset = await getMuxAsset(muxAssetId);
  const playbackIds = (asset.playback_ids ?? []) as Array<{
    id?: string;
    policy?: string;
  }>;

  let publicPlaybackId = playbackIds.find((entry) => entry.policy === "public" && entry.id)?.id;
  if (!publicPlaybackId) {
    const created = await createPublicPlaybackId(muxAssetId);
    publicPlaybackId = created.id;
  }

  const resolvedPlaybackId = publicPlaybackId ?? muxPlaybackId;
  if (videoId && resolvedPlaybackId !== muxPlaybackId) {
    await ctx.runMutation(internal.videos.setMuxPlaybackId, {
      videoId,
      muxPlaybackId: resolvedPlaybackId,
      thumbnailUrl: buildMuxThumbnailUrl(resolvedPlaybackId),
    });
  }

  return resolvedPlaybackId;
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
    const key = `videos/${args.videoId}/${Date.now()}.${ext}`;
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
      const asset = await createMuxAssetFromInputUrl(args.videoId, ingestUrl);
      if (asset.id) {
        await ctx.runMutation(internal.videos.setMuxAssetReference, {
          videoId: args.videoId,
          muxAssetId: asset.id,
        });
      }
    } catch (error) {
      await ctx.runMutation(internal.videos.markAsFailed, {
        videoId: args.videoId,
        uploadError: "Mux ingest failed after upload.",
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
      uploadError: "Upload failed before Mux could process the asset.",
    });

    return { success: true };
  },
});

export const getPlaybackSession = action({
  args: { videoId: v.id("videos") },
  returns: v.object({
    url: v.string(),
    posterUrl: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ url: string; posterUrl: string }> => {
    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });

    if (!video || !video.muxPlaybackId || video.status !== "ready") {
      throw new Error("Video not found or not ready");
    }

    const playbackId = await ensurePublicPlaybackId(ctx, {
      videoId: args.videoId,
      muxAssetId: video.muxAssetId,
      muxPlaybackId: video.muxPlaybackId,
    });
    return buildPublicPlaybackSession(playbackId);
  },
});

export const getPlaybackUrl = action({
  args: { videoId: v.id("videos") },
  returns: v.object({
    url: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string }> => {
    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });

    if (!video || !video.muxPlaybackId || video.status !== "ready") {
      throw new Error("Video not found or not ready");
    }

    const playbackId = await ensurePublicPlaybackId(ctx, {
      videoId: args.videoId,
      muxAssetId: video.muxAssetId,
      muxPlaybackId: video.muxPlaybackId,
    });
    const session = buildPublicPlaybackSession(playbackId);
    return { url: session.url };
  },
});

export const getPublicPlaybackSession = action({
  args: { publicId: v.string() },
  returns: v.object({
    url: v.string(),
    posterUrl: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ url: string; posterUrl: string }> => {
    const result = await ctx.runQuery(api.videos.getByPublicId, {
      publicId: args.publicId,
    });

    if (!result?.video?.muxPlaybackId) {
      throw new Error("Video not found or not ready");
    }

    const playbackId = await ensurePublicPlaybackId(ctx, {
      videoId: result.video._id,
      muxAssetId: result.video.muxAssetId,
      muxPlaybackId: result.video.muxPlaybackId,
    });
    return buildPublicPlaybackSession(playbackId);
  },
});

export const getSharedPlaybackSession = action({
  args: { grantToken: v.string() },
  returns: v.object({
    url: v.string(),
    posterUrl: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ url: string; posterUrl: string }> => {
    const result = await ctx.runQuery(api.videos.getByShareGrant, {
      grantToken: args.grantToken,
    });

    if (!result?.video?.muxPlaybackId) {
      throw new Error("Video not found or not ready");
    }

    const playbackId = await ensurePublicPlaybackId(ctx, {
      videoId: result.video._id,
      muxAssetId: result.video.muxAssetId,
      muxPlaybackId: result.video.muxPlaybackId,
    });
    return buildPublicPlaybackSession(playbackId);
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

    const existingKey = getValueString(video, "s3Key");
    if (video.status !== "ready" && !existingKey) {
      throw new Error("Original bucket file is not available yet");
    }

    const key = existingKey ?? (await ensureOriginalBucketKey(ctx, video));
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

export const getSharedPlaybackUrl = action({
  args: { token: v.string() },
  returns: v.object({
    url: v.string(),
  }),
  handler: async () => {
    throw new Error("Shared token playback URL endpoint is deprecated");
  },
});

export const getSharedDownloadUrl = action({
  args: { token: v.string() },
  returns: v.object({
    url: v.string(),
    filename: v.string(),
  }),
  handler: async () => {
    throw new Error("DOWNLOAD_DISABLED_FOR_EXTERNAL");
  },
});

export const getSharedThumbnailUrl = action({
  args: { token: v.string() },
  returns: v.object({
    url: v.union(v.string(), v.null()),
  }),
  handler: async () => {
    return { url: null };
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

const rotatePlaybackIdsToPublicHandler = async (
  ctx: ActionCtx,
  args: { batchSize?: number },
): Promise<{ scanned: number; updated: number }> => {
    let cursor: string | undefined;
    let scanned = 0;
    let updated = 0;

    while (true) {
      const page = await ctx.runQuery(internal.videos.listVideosForPlaybackMigration, {
        cursor,
        batchSize: args.batchSize,
      });

      scanned += page.videos.length;

      for (const item of page.videos) {
        if (item.status !== "ready" || !item.muxAssetId) {
          continue;
        }

        const asset = await getMuxAsset(item.muxAssetId);
        const playbackIds = (asset.playback_ids ?? []) as Array<{
          id?: string;
          policy?: string;
        }>;

        let publicPlaybackId = playbackIds.find((entry) => entry.policy === "public" && entry.id)?.id;

        if (!publicPlaybackId) {
          const created = await createPublicPlaybackId(item.muxAssetId);
          publicPlaybackId = created.id;
        }

        if (!publicPlaybackId) {
          continue;
        }

        if (item.muxPlaybackId && item.muxPlaybackId !== publicPlaybackId) {
          const currentPlayback = playbackIds.find((entry) => entry.id === item.muxPlaybackId);
          if (currentPlayback?.policy === "signed") {
            try {
              await deletePlaybackId(item.muxAssetId, item.muxPlaybackId);
            } catch {
              // Best effort. We still patch the video to the public playback id.
            }
          }
        }

        if (item.muxPlaybackId !== publicPlaybackId) {
          await ctx.runMutation(internal.videos.setMuxPlaybackId, {
            videoId: item.videoId,
            muxPlaybackId: publicPlaybackId,
            thumbnailUrl: buildMuxThumbnailUrl(publicPlaybackId),
          });
          updated += 1;
        }
      }

      if (page.done) {
        break;
      }
      cursor = page.cursor;
    }

    return { scanned, updated };
};

export const rotatePlaybackIdsToSigned = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    scanned: v.number(),
    updated: v.number(),
  }),
  handler: rotatePlaybackIdsToPublicHandler,
});

export const rotatePlaybackIdsToPublic = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    scanned: v.number(),
    updated: v.number(),
  }),
  handler: rotatePlaybackIdsToPublicHandler,
});
