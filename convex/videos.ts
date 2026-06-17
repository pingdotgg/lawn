import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query, MutationCtx } from "./_generated/server";
import { identityName, requireProjectAccess, requireVideoAccess } from "./auth";
import { Id } from "./_generated/dataModel";
import { generateUniqueToken } from "./security";
import { resolveActiveShareGrant } from "./shareAccess";
import {
  assertTeamCanStoreBytes,
  assertTeamHasActiveSubscription,
} from "./billingHelpers";
import { assertVideoFileSizeAllowed } from "./uploadLimits";

const workflowStatusValidator = v.union(
  v.literal("review"),
  v.literal("rework"),
  v.literal("done"),
);

const visibilityValidator = v.union(v.literal("public"), v.literal("private"));

type WorkflowStatus =
  | "review"
  | "rework"
  | "done";

function normalizeWorkflowStatus(status: WorkflowStatus | undefined): WorkflowStatus {
  return status ?? "review";
}

async function generatePublicId(ctx: MutationCtx) {
  return await generateUniqueToken(
    32,
    async (candidate) =>
      (await ctx.db
        .query("videos")
        .withIndex("by_public_id", (q) => q.eq("publicId", candidate))
        .unique()) !== null,
    5,
  );
}

async function deleteShareAccessGrantsForLink(
  ctx: MutationCtx,
  linkId: Id<"shareLinks">,
) {
  const grants = await ctx.db
    .query("shareAccessGrants")
    .withIndex("by_share_link", (q) => q.eq("shareLinkId", linkId))
    .collect();

  for (const grant of grants) {
    await ctx.db.delete(grant._id);
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
    const { user, project } = await requireProjectAccess(ctx, args.projectId, "member");
    assertVideoFileSizeAllowed(args.fileSize ?? 0);
    await assertTeamCanStoreBytes(ctx, project.teamId, args.fileSize ?? 0);
    const publicId = await generatePublicId(ctx);

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
      visibility: "public",
      publicId,
      uploadUpdatedAt: Date.now(),
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

export const getByPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();

    if (!video || video.visibility !== "public" || video.status !== "ready") {
      return null;
    }

    return {
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl,
        muxAssetId: video.muxAssetId,
        muxPlaybackId: video.muxPlaybackId,
        contentType: video.contentType,
        s3Key: video.s3Key,
      },
    };
  },
});

export const getByPublicIdForDownload = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();

    if (!video || video.visibility !== "public") {
      return null;
    }

    return {
      video: {
        _id: video._id,
        title: video.title,
        contentType: video.contentType,
        s3Key: video.s3Key,
        status: video.status,
      },
    };
  },
});

export const getPublicIdByVideoId = query({
  args: { videoId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const normalizedVideoId = ctx.db.normalizeId("videos", args.videoId);
    if (!normalizedVideoId) {
      return null;
    }

    const video = await ctx.db.get(normalizedVideoId);
    if (!video || video.visibility !== "public" || video.status !== "ready" || !video.publicId) {
      return null;
    }

    return video.publicId;
  },
});

export const getByShareGrant = query({
  args: { grantToken: v.string() },
  handler: async (ctx, args) => {
    const resolved = await resolveActiveShareGrant(ctx, args.grantToken);
    if (!resolved) {
      return null;
    }

    const video = await ctx.db.get(resolved.shareLink.videoId);
    if (!video || video.status !== "ready") {
      return null;
    }

    return {
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl,
        muxAssetId: video.muxAssetId,
        muxPlaybackId: video.muxPlaybackId,
        contentType: video.contentType,
        s3Key: video.s3Key,
      },
      grantExpiresAt: resolved.grant.expiresAt,
    };
  },
});

export const getByShareGrantForDownload = query({
  args: { grantToken: v.string() },
  handler: async (ctx, args) => {
    const resolved = await resolveActiveShareGrant(ctx, args.grantToken);
    if (!resolved) {
      return null;
    }

    const video = await ctx.db.get(resolved.shareLink.videoId);
    if (!video) {
      return null;
    }

    return {
      allowDownload: resolved.shareLink.allowDownload,
      grantExpiresAt: resolved.grant.expiresAt,
      video: {
        _id: video._id,
        title: video.title,
        contentType: video.contentType,
        s3Key: video.s3Key,
        status: video.status,
      },
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

export const setVisibility = mutation({
  args: {
    videoId: v.id("videos"),
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "member");

    await ctx.db.patch(args.videoId, {
      visibility: args.visibility,
    });
  },
});

export const updateWorkflowStatus = mutation({
  args: {
    videoId: v.id("videos"),
    workflowStatus: workflowStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "member");

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
      await deleteShareAccessGrantsForLink(ctx, link._id);
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
    s3MultipartUploadId: v.optional(v.string()),
    s3MultipartPartSizeBytes: v.optional(v.number()),
    s3MultipartPartCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      s3Key: args.s3Key,
      s3MultipartUploadId: args.s3MultipartUploadId,
      s3MultipartPartSizeBytes: args.s3MultipartPartSizeBytes,
      s3MultipartPartCount: args.s3MultipartPartCount,
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
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const assertVideoUploadAllowed = internalQuery({
  args: {
    videoId: v.id("videos"),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    const project = await ctx.db.get(video.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    assertVideoFileSizeAllowed(args.fileSize);

    const currentBytes =
      video.status !== "failed" &&
      typeof video.fileSize === "number" &&
      Number.isFinite(video.fileSize)
        ? Math.max(0, video.fileSize)
        : 0;
    const requestedBytes = Number.isFinite(args.fileSize)
      ? Math.max(0, args.fileSize)
      : 0;
    const incrementalBytes = Math.max(0, requestedBytes - currentBytes);

    if (incrementalBytes > 0) {
      await assertTeamCanStoreBytes(ctx, project.teamId, incrementalBytes);
    } else {
      await assertTeamHasActiveSubscription(ctx, project.teamId);
    }

    return null;
  },
});

export const reconcileUploadedObjectMetadata = internalMutation({
  args: {
    videoId: v.id("videos"),
    fileSize: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    const project = await ctx.db.get(video.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const declaredSize =
      video.status !== "failed" &&
      typeof video.fileSize === "number" &&
      Number.isFinite(video.fileSize)
        ? Math.max(0, video.fileSize)
        : 0;
    const actualSize = Number.isFinite(args.fileSize) ? Math.max(0, args.fileSize) : 0;
    const sizeDelta = actualSize - declaredSize;

    if (sizeDelta > 0) {
      await assertTeamCanStoreBytes(ctx, project.teamId, sizeDelta);
    } else {
      await assertTeamHasActiveSubscription(ctx, project.teamId);
    }

    await ctx.db.patch(args.videoId, {
      fileSize: actualSize,
      contentType: args.contentType,
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
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
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
    const video = await ctx.db.get(args.videoId);
    if (
      !video ||
      video.status !== "processing" ||
      video.muxAssetId !== args.muxAssetId
    ) {
      return false;
    }

    await ctx.db.patch(args.videoId, {
      muxAssetId: args.muxAssetId,
      muxPlaybackId: args.muxPlaybackId,
      muxAssetStatus: "ready",
      duration: args.duration,
      thumbnailUrl: args.thumbnailUrl,
      uploadError: undefined,
      status: "ready",
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
    });
    return true;
  },
});

export const markMuxAssetAsFailed = internalMutation({
  args: {
    videoId: v.id("videos"),
    muxAssetId: v.string(),
    uploadError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (
      !video ||
      video.status !== "processing" ||
      video.muxAssetId !== args.muxAssetId
    ) {
      return false;
    }

    await ctx.db.patch(args.videoId, {
      muxAssetStatus: "errored",
      uploadError: args.uploadError,
      status: "failed",
      uploadUpdatedAt: Date.now(),
    });
    return true;
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
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const clearMultipartUploadId = internalMutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const touchUploadActivity = internalMutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video || video.status !== "uploading") {
      return;
    }

    await ctx.db.patch(args.videoId, {
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const listStaleUploadCandidates = internalQuery({
  args: {
    cutoff: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const candidates = (await ctx.db
      .query("videos")
      .withIndex("by_status_and_upload_updated_at", (q) =>
        q.eq("status", "uploading"),
      )
      .take(args.limit))
      .filter((video) => video.s3Key && video.s3MultipartUploadId)
      .filter(
        (video) =>
          (video.uploadUpdatedAt ?? video._creationTime) < args.cutoff,
      )
      .sort(
        (a, b) =>
          (a.uploadUpdatedAt ?? a._creationTime) -
          (b.uploadUpdatedAt ?? b._creationTime),
      )
      .slice(0, args.limit);

    return candidates.map((video) => ({ videoId: video._id }));
  },
});

export const claimStaleUpload = internalMutation({
  args: {
    videoId: v.id("videos"),
    cutoff: v.number(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (
      !video ||
      video.status !== "uploading" ||
      (video.uploadUpdatedAt ?? video._creationTime) >= args.cutoff ||
      !video.s3Key ||
      !video.s3MultipartUploadId
    ) {
      return null;
    }

    await ctx.db.patch(args.videoId, {
      status: "failed",
      muxAssetStatus: "errored",
      uploadError: "Upload expired after a period of inactivity.",
      uploadUpdatedAt: Date.now(),
    });

    return {
      key: video.s3Key,
      uploadId: video.s3MultipartUploadId,
    };
  },
});

export const clearUploadStorageInfo = internalMutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      s3Key: undefined,
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      fileSize: undefined,
      contentType: undefined,
      uploadUpdatedAt: Date.now(),
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
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const setMuxPlaybackId = internalMutation({
  args: {
    videoId: v.id("videos"),
    muxPlaybackId: v.string(),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      muxPlaybackId: args.muxPlaybackId,
      thumbnailUrl: args.thumbnailUrl,
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

export const getMuxProcessingState = internalQuery({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (
      !video ||
      video.status !== "processing" ||
      !video.muxAssetId
    ) {
      return null;
    }

    return {
      muxAssetId: video.muxAssetId,
    };
  },
});

export const claimMuxProcessingCandidates = internalMutation({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_status_and_mux_last_polled_at", (q) =>
        q.eq("status", "processing"),
      )
      .filter((q) => q.neq(q.field("muxAssetId"), undefined))
      .take(args.limit);

    const claimedAt = Date.now();
    const candidates = [];
    for (const video of videos) {
      if (!video.muxAssetId) continue;
      await ctx.db.patch(video._id, { muxLastPolledAt: claimedAt });
      candidates.push({
        videoId: video._id,
        muxAssetId: video.muxAssetId,
      });
    }
    return candidates;
  },
});

export const claimCronLock = internalMutation({
  args: {
    name: v.string(),
    owner: v.string(),
    ttlMs: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cronLocks")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    const now = Date.now();
    if (existing && existing.expiresAt > now) {
      return false;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        owner: args.owner,
        expiresAt: now + args.ttlMs,
      });
    } else {
      await ctx.db.insert("cronLocks", {
        name: args.name,
        owner: args.owner,
        expiresAt: now + args.ttlMs,
      });
    }
    return true;
  },
});

export const releaseCronLock = internalMutation({
  args: {
    name: v.string(),
    owner: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cronLocks")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    if (existing?.owner === args.owner) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getVideoForPlayback = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const { video } = await requireVideoAccess(ctx, args.videoId, "viewer");
    return video;
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

export const listForProjectShare = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .unique();

    if (!project) return [];

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .order("desc")
      .collect();

    return videos
      .filter((v) => v.status === "ready")
      .map((video) => ({
        _id: video._id,
        title: video.title,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl,
        muxPlaybackId: video.muxPlaybackId,
        workflowStatus: normalizeWorkflowStatus(video.workflowStatus),
      }));
  },
});

export const getForProjectShare = query({
  args: { shareToken: v.string(), videoId: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .unique();

    if (!project) return null;

    const normalizedVideoId = ctx.db.normalizeId("videos", args.videoId);
    if (!normalizedVideoId) return null;

    const video = await ctx.db.get(normalizedVideoId);
    if (!video || video.projectId !== project._id || video.status !== "ready") {
      return null;
    }

    return {
      _id: video._id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      thumbnailUrl: video.thumbnailUrl,
      muxPlaybackId: video.muxPlaybackId,
      muxAssetId: video.muxAssetId,
      workflowStatus: normalizeWorkflowStatus(video.workflowStatus),
    };
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
