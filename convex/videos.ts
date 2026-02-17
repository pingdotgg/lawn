import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { identityName, requireProjectAccess, requireVideoAccess } from "./auth";
import { Id } from "./_generated/dataModel";

const workflowStatusValidator = v.union(
  v.literal("review"),
  v.literal("rework"),
  v.literal("done"),
);

type WorkflowStatus =
  | "review"
  | "rework"
  | "done";
type StoredWorkflowStatus =
  | WorkflowStatus
  | "needs_review"
  | "needs_feedback_addressed"
  | "todo"
  | "in_review"
  | "approved"
  | undefined;

function normalizeWorkflowStatus(status: StoredWorkflowStatus): WorkflowStatus {
  if (status === "done" || status === "approved") return "done";
  if (
    status === "rework" ||
    status === "needs_feedback_addressed" ||
    status === "in_review"
  ) {
    return "rework";
  }
  return "review";
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
      muxAssetStatus: "preparing",
      workflowStatus: "review",
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

    return await Promise.all(
      videos.map(async (video) => {
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_video", (q) => q.eq("videoId", video._id))
          .collect();

        return {
          ...video,
          uploaderName: video.uploaderName ?? "Unknown",
          workflowStatus: normalizeWorkflowStatus(video.workflowStatus),
          commentCount: comments.length,
        };
      }),
    );
  },
});

export const get = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const { video, membership } = await requireVideoAccess(ctx, args.videoId);
    return {
      ...video,
      uploaderName: video.uploaderName ?? "Unknown",
      workflowStatus: normalizeWorkflowStatus(video.workflowStatus),
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

export const updateWorkflowStatus = mutation({
  args: {
    videoId: v.id("videos"),
    workflowStatus: workflowStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "viewer");

    await ctx.db.patch(args.videoId, {
      workflowStatus: args.workflowStatus,
    });
  },
});

export const remove = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "admin");

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    const shareLinks = await ctx.db
      .query("shareLinks")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    for (const link of shareLinks) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.videoId);
  },
});

export const setUploadInfo = internalMutation({
  args: {
    videoId: v.id("videos"),
    s3Key: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      s3Key: args.s3Key,
      muxUploadId: undefined,
      muxAssetId: undefined,
      muxPlaybackId: undefined,
      muxAssetStatus: "preparing",
      thumbnailUrl: undefined,
      duration: undefined,
      uploadError: undefined,
      fileSize: args.fileSize,
      contentType: args.contentType,
      status: "uploading",
    });
  },
});

export const markAsProcessing = internalMutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      status: "processing",
      muxAssetStatus: "preparing",
      uploadError: undefined,
    });
  },
});

export const markAsReady = internalMutation({
  args: {
    videoId: v.id("videos"),
    muxAssetId: v.string(),
    muxPlaybackId: v.string(),
    duration: v.optional(v.number()),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      muxAssetId: args.muxAssetId,
      muxPlaybackId: args.muxPlaybackId,
      muxAssetStatus: "ready",
      duration: args.duration,
      thumbnailUrl: args.thumbnailUrl,
      uploadError: undefined,
      status: "ready",
    });
  },
});

export const markAsFailed = internalMutation({
  args: {
    videoId: v.id("videos"),
    uploadError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      muxAssetStatus: "errored",
      uploadError: args.uploadError,
      status: "failed",
    });
  },
});

export const setOriginalBucketKey = internalMutation({
  args: {
    videoId: v.id("videos"),
    s3Key: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      s3Key: args.s3Key,
    });
  },
});

export const setMuxAssetReference = internalMutation({
  args: {
    videoId: v.id("videos"),
    muxAssetId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      muxAssetId: args.muxAssetId,
      muxAssetStatus: "preparing",
      status: "processing",
    });
  },
});

export const getVideoByMuxUploadId = internalQuery({
  args: {
    muxUploadId: v.string(),
  },
  returns: v.union(
    v.object({
      videoId: v.id("videos"),
    }),
    v.null()
  ),
  handler: async (ctx, args): Promise<{ videoId: Id<"videos"> } | null> => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_mux_upload_id", (q) => q.eq("muxUploadId", args.muxUploadId))
      .unique();

    if (!video) return null;
    return { videoId: video._id };
  },
});

export const getVideoByMuxAssetId = internalQuery({
  args: {
    muxAssetId: v.string(),
  },
  returns: v.union(
    v.object({
      videoId: v.id("videos"),
    }),
    v.null()
  ),
  handler: async (ctx, args): Promise<{ videoId: Id<"videos"> } | null> => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_mux_asset_id", (q) => q.eq("muxAssetId", args.muxAssetId))
      .unique();

    if (!video) return null;
    return { videoId: video._id };
  },
});

export const getVideoForPlayback = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const { video } = await requireVideoAccess(ctx, args.videoId, "viewer");
    return video;
  },
});

export const getByShareToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!shareLink) return null;

    if (shareLink.expiresAt && shareLink.expiresAt < Date.now()) {
      return null;
    }

    const video = await ctx.db.get(shareLink.videoId);
    if (!video || video.status !== "ready") return null;

    return {
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        s3Key: video.s3Key,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl,
        muxPlaybackId: video.muxPlaybackId,
        contentType: video.contentType,
      },
      allowDownload: shareLink.allowDownload,
      hasPassword: !!shareLink.password,
    };
  },
});

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
