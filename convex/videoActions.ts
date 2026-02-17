"use node";

import { v } from "convex/values";
import { action, ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  buildMuxDownloadUrl,
  buildMuxPlaybackUrl,
  buildMuxThumbnailUrl,
  createMuxDirectUpload,
} from "./mux";

function sanitizeFilename(input: string) {
  const trimmed = input.trim();
  const base = trimmed.length > 0 ? trimmed : "video";
  const sanitized = base
    .replace(/["']/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_");
  return sanitized.slice(0, 120);
}

function buildDownloadFilename(title: string | undefined) {
  const safeTitle = sanitizeFilename(title ?? "video");
  return safeTitle.endsWith(".mp4") ? safeTitle : `${safeTitle}.mp4`;
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

    const upload = await createMuxDirectUpload(args.videoId);

    await ctx.runMutation(internal.videos.setUploadInfo, {
      videoId: args.videoId,
      muxUploadId: upload.id,
      fileSize: args.fileSize,
      contentType: args.contentType,
    });

    return { url: upload.url, uploadId: upload.id };
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

    await ctx.runMutation(internal.videos.markAsProcessing, {
      videoId: args.videoId,
    });

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

    return { url: buildMuxPlaybackUrl(video.muxPlaybackId) };
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

    if (!video || !video.muxPlaybackId || video.status !== "ready") {
      throw new Error("Video not found or not ready");
    }

    const filename = buildDownloadFilename(video.title);

    return {
      url: buildMuxDownloadUrl(video.muxPlaybackId),
      filename,
    };
  },
});

export const getSharedPlaybackUrl = action({
  args: { token: v.string() },
  returns: v.object({
    url: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string }> => {
    const result = await ctx.runQuery(api.videos.getByShareToken, {
      token: args.token,
    });

    if (!result || !result.video.muxPlaybackId) {
      throw new Error("Video not found or not ready");
    }

    return { url: buildMuxPlaybackUrl(result.video.muxPlaybackId) };
  },
});

export const getSharedDownloadUrl = action({
  args: { token: v.string() },
  returns: v.object({
    url: v.string(),
    filename: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; filename: string }> => {
    const result = await ctx.runQuery(api.videos.getByShareToken, {
      token: args.token,
    });

    if (!result || !result.video?.muxPlaybackId) {
      throw new Error("Video not found or not ready");
    }

    if (!result.allowDownload) {
      throw new Error("Downloads are not allowed for this share link");
    }

    const filename = buildDownloadFilename(result.video.title);

    return {
      url: buildMuxDownloadUrl(result.video.muxPlaybackId),
      filename,
    };
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

    if (result.video.thumbnailUrl) {
      return { url: result.video.thumbnailUrl };
    }

    if (result.video.muxPlaybackId) {
      return { url: buildMuxThumbnailUrl(result.video.muxPlaybackId) };
    }

    return { url: null };
  },
});
