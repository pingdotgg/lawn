import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { requireProjectAccess, requireVideoAccess } from "./auth";
import { Id } from "./_generated/dataModel";
import { resolvePublicThumbnailUrl } from "./s3";

async function resolveThumbnailUrlSafe(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  input: {
    thumbnailStorageId?: Id<"_storage">;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  },
): Promise<string | undefined> {
  if (input.thumbnailStorageId) {
    try {
      const url = await ctx.storage.getUrl(input.thumbnailStorageId);
      if (url) return url;
    } catch (error) {
      console.error("Failed to resolve Convex storage thumbnail URL:", error);
    }
  }

  if (!input.thumbnailUrl && !input.thumbnailKey) {
    return undefined;
  }

  try {
    return resolvePublicThumbnailUrl(input) ?? undefined;
  } catch (error) {
    console.error("Failed to resolve public thumbnail URL:", error);
    return input.thumbnailUrl?.startsWith("http") ? input.thumbnailUrl : undefined;
  }
}

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireProjectAccess(ctx, args.projectId, "member");

    const videoId = await ctx.db.insert("videos", {
      projectId: args.projectId,
      uploadedByClerkId: user.subject,
      uploaderName: identityName(user),
      title: args.title,
      description: args.description,
      fileSize: args.fileSize,
      contentType: args.contentType,
      status: "uploading",
    });

    return videoId;
  },
});

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId);

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    const videosWithUploader = await Promise.all(
      videos.map(async (video) => {
        const resolvedThumbnailUrl = await resolveThumbnailUrlSafe(ctx, video);
        return {
          ...video,
          thumbnailUrl: resolvedThumbnailUrl ?? video.thumbnailUrl,
          uploaderName: video.uploaderName ?? "Unknown",
        };
      })
    );

    return videosWithUploader;
  },
});

export const get = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const { video, membership } = await requireVideoAccess(ctx, args.videoId);
    const resolvedThumbnailUrl = await resolveThumbnailUrlSafe(ctx, video);
    return {
      ...video,
      thumbnailUrl: resolvedThumbnailUrl ?? video.thumbnailUrl,
      uploaderName: video.uploaderName ?? "Unknown",
      role: membership.role,
    };
  },
});

export const update = mutation({
  args: {
    videoId: v.id("videos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "member");

    const updates: Partial<{ title: string; description: string }> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.videoId, updates);
  },
});

export const setThumbnailUrl = mutation({
  args: {
    videoId: v.id("videos"),
    thumbnailUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "member");
    await ctx.db.patch(args.videoId, { thumbnailUrl: args.thumbnailUrl });
    return null;
  },
});

export const setThumbnailKey = mutation({
  args: {
    videoId: v.id("videos"),
    thumbnailKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "member");
    await ctx.db.patch(args.videoId, { thumbnailKey: args.thumbnailKey });
    return null;
  },
});

export const generateThumbnailUploadUrl = mutation({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "member");
    return await ctx.storage.generateUploadUrl();
  },
});

export const setThumbnailStorageId = mutation({
  args: {
    videoId: v.id("videos"),
    thumbnailStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "member");
    await ctx.db.patch(args.videoId, {
      thumbnailStorageId: args.thumbnailStorageId,
    });
    return null;
  },
});

export const getThumbnailKeys = internalQuery({
  args: {
    videoIds: v.array(v.id("videos")),
  },
  returns: v.array(
    v.object({
      videoId: v.id("videos"),
      thumbnailStorageId: v.optional(v.id("_storage")),
      thumbnailKey: v.optional(v.string()),
      thumbnailUrl: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const results: Array<{
      videoId: Id<"videos">;
      thumbnailStorageId?: Id<"_storage">;
      thumbnailKey?: string;
      thumbnailUrl?: string;
    }> = [];
    for (const videoId of args.videoIds) {
      const { video } = await requireVideoAccess(ctx, videoId, "viewer");
      results.push({
        videoId,
        thumbnailStorageId: video.thumbnailStorageId,
        thumbnailKey: video.thumbnailKey,
        thumbnailUrl: video.thumbnailUrl,
      });
    }
    return results;
  },
});

export const remove = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "admin");

    // Delete comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Delete share links
    const shareLinks = await ctx.db
      .query("shareLinks")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    for (const link of shareLinks) {
      await ctx.db.delete(link._id);
    }

    // TODO: Delete from S3 as well
    await ctx.db.delete(args.videoId);
  },
});

// Internal mutation to set upload info
export const setUploadInfo = internalMutation({
  args: {
    videoId: v.id("videos"),
    s3Key: v.string(),
    s3UploadId: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      s3Key: args.s3Key,
      s3UploadId: args.s3UploadId,
      fileSize: args.fileSize,
      contentType: args.contentType,
      status: "uploading",
    });
  },
});

// Internal mutation to mark video as ready
export const markAsReady = internalMutation({
  args: {
    videoId: v.id("videos"),
    s3Key: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      s3Key: args.s3Key,
      s3UploadId: undefined, // Clear upload ID
      status: "ready",
    });
  },
});

// Internal mutation to mark video as failed
export const markAsFailed = internalMutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      status: "failed",
    });
  },
});

// Query to get video for playback (used by actions)
export const getVideoForPlayback = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    // Require at least viewer access before returning the S3 key.
    const { video } = await requireVideoAccess(ctx, args.videoId, "viewer");
    return video;
  },
});

// Get video by share token (public, no auth required)
export const getByShareToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!shareLink) return null;

    // Check expiration
    if (shareLink.expiresAt && shareLink.expiresAt < Date.now()) {
      return null;
    }

    const video = await ctx.db.get(shareLink.videoId);
    if (!video || video.status !== "ready") return null;
    const resolvedThumbnailUrl = await resolveThumbnailUrlSafe(ctx, video);

    return {
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnailUrl: resolvedThumbnailUrl ?? video.thumbnailUrl,
        thumbnailKey: video.thumbnailKey,
        thumbnailStorageId: video.thumbnailStorageId,
        s3Key: video.s3Key,
        contentType: video.contentType,
      },
      allowDownload: shareLink.allowDownload,
      hasPassword: !!shareLink.password,
    };
  },
});

// Verify share link password
export const verifySharePassword = mutation({
  args: {
    token: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!shareLink || shareLink.password !== args.password) {
      return false;
    }

    return true;
  },
});

// Increment view count for share link
export const incrementViewCount = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (shareLink) {
      await ctx.db.patch(shareLink._id, {
        viewCount: shareLink.viewCount + 1,
      });
    }
  },
});

// Update video duration (called after client gets video metadata)
export const updateDuration = mutation({
  args: {
    videoId: v.id("videos"),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "member");
    await ctx.db.patch(args.videoId, { duration: args.duration });
  },
});
