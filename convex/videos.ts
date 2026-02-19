import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query, MutationCtx } from "./_generated/server";
import { identityName, requireProjectAccess, requireVideoAccess } from "./auth";
import { Id } from "./_generated/dataModel";
import { generateUniqueToken } from "./security";
import { resolveActiveShareGrant } from "./shareAccess";
import { buildPublicUrl } from "./s3";

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

export type VideoPlaybackOption = {
  id: "720p" | "original";
  label: "720p" | "Original";
  type: "hls" | "mp4";
  url: string;
};

export type VideoPlayback = {
  options: VideoPlaybackOption[];
  defaultOptionId: "720p" | "original";
  posterUrl?: string;
};

function toPublicAssetUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  try {
    return buildPublicUrl(value);
  } catch {
    // Local tests may not configure public bucket URL env vars.
    return value;
  }
}

export function getVideoPlayback(video: {
  status: string;
  s3Key?: string | null;
  playback720ManifestKey?: string | null;
  thumbnailUrl?: string | null;
}): VideoPlayback | null {
  if (video.status !== "ready") return null;

  const options: VideoPlaybackOption[] = [];
  const playback720Url = toPublicAssetUrl(video.playback720ManifestKey ?? undefined);
  const originalUrl = toPublicAssetUrl(video.s3Key ?? undefined);

  if (playback720Url) {
    options.push({
      id: "720p",
      label: "720p",
      type: "hls",
      url: playback720Url,
    });
  }

  if (originalUrl) {
    options.push({
      id: "original",
      label: "Original",
      type: "mp4",
      url: originalUrl,
    });
  }

  if (options.length === 0) {
    return null;
  }

  return {
    options,
    defaultOptionId: playback720Url ? "720p" : "original",
    posterUrl: toPublicAssetUrl(video.thumbnailUrl ?? undefined),
  };
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
    const { user } = await requireProjectAccess(ctx, args.projectId, "member");
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
      transcodeStatus: "queued",
      workflowStatus: "review",
      visibility: "public",
      publicId,
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
          playback: getVideoPlayback(video),
        };
      }),
    );
  },
});

export const get = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const { video, membership } = await requireVideoAccess(ctx, args.videoId);
    const playback = getVideoPlayback(video);
    return {
      ...video,
      uploaderName: video.uploaderName ?? "Unknown",
      workflowStatus: normalizeWorkflowStatus(video.workflowStatus),
      role: membership.role,
      playback,
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

    const playback = getVideoPlayback(video);

    return {
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnailUrl: toPublicAssetUrl(video.thumbnailUrl),
        contentType: video.contentType,
        s3Key: video.s3Key,
        playback,
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

    const playback = getVideoPlayback(video);

    return {
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnailUrl: toPublicAssetUrl(video.thumbnailUrl),
        contentType: video.contentType,
        s3Key: video.s3Key,
        playback,
      },
      grantExpiresAt: resolved.grant.expiresAt,
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      s3Key: args.s3Key,
      transcodeProvider: "chunkify",
      transcodeJobId: undefined,
      transcodeStatus: "queued",
      transcodeError: undefined,
      playback720ManifestKey: undefined,
      playback720Codec: undefined,
      playback720SegmentFormat: undefined,
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
      transcodeProvider: "chunkify",
      transcodeStatus: "processing",
      transcodeError: undefined,
      uploadError: undefined,
    });
  },
});

export const setTranscodeJobInfo = internalMutation({
  args: {
    videoId: v.id("videos"),
    transcodeJobId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      transcodeProvider: "chunkify",
      transcodeJobId: args.transcodeJobId,
      transcodeStatus: "processing",
      transcodeError: undefined,
      status: "processing",
    });
  },
});

export const markAsReady = internalMutation({
  args: {
    videoId: v.id("videos"),
    playback720ManifestKey: v.string(),
    duration: v.optional(v.number()),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      playback720ManifestKey: args.playback720ManifestKey,
      playback720Codec: "h264",
      playback720SegmentFormat: "fmp4",
      duration: args.duration,
      thumbnailUrl: args.thumbnailUrl,
      transcodeStatus: "ready",
      transcodeError: undefined,
      uploadError: undefined,
      status: "ready",
    });
  },
});

export const markAsFailed = internalMutation({
  args: {
    videoId: v.id("videos"),
    transcodeError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      transcodeStatus: "failed",
      transcodeError: args.transcodeError,
      uploadError: args.transcodeError,
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

export const getVideoByTranscodeJobId = internalQuery({
  args: {
    transcodeJobId: v.string(),
  },
  returns: v.union(
    v.object({
      videoId: v.id("videos"),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<{ videoId: Id<"videos"> } | null> => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_transcode_job_id", (q) => q.eq("transcodeJobId", args.transcodeJobId))
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

export const getVideoInternal = internalQuery({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.videoId);
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

export const backfillVisibilityAndPublicIds = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    cursor: v.string(),
    done: v.boolean(),
    scanned: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("videos").paginate({
      cursor: args.cursor ?? null,
      numItems: Math.max(1, Math.min(args.batchSize ?? 50, 200)),
    });

    let updated = 0;
    for (const video of page.page) {
      const updates: Partial<{ visibility: "public" | "private"; publicId: string }> = {};

      if (!video.visibility) {
        updates.visibility = "private";
      }

      if (!video.publicId) {
        updates.publicId = await generatePublicId(ctx);
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(video._id, updates);
        updated += 1;
      }
    }

    return {
      cursor: page.continueCursor,
      done: page.isDone,
      scanned: page.page.length,
      updated,
    };
  },
});
