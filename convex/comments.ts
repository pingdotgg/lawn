import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { getUser, identityAvatarUrl, identityName, requireVideoAccess, requireUser } from "./auth";
import { resolveActiveShareGrant } from "./shareAccess";
import { guestCommentsEnabled, resolvePublicVideo } from "./videos";

const MAX_COMMENT_TEXT_LENGTH = 5000;
const MAX_GUEST_NAME_LENGTH = 40;

const guestCommentRateLimiter = new RateLimiter(components.rateLimiter, {
  guestCommentGlobal: {
    kind: "fixed window",
    rate: 300,
    period: MINUTE,
    shards: 8,
  },
  guestCommentByVideo: {
    kind: "fixed window",
    rate: 30,
    period: MINUTE,
  },
});

function toThreadedComments<
  T extends { _id: string; parentId?: string; timestampSeconds: number; _creationTime: number },
>(comments: T[]) {
  const topLevel = comments
    .filter((c) => !c.parentId)
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds);

  return topLevel.map((comment) => ({
    ...comment,
    replies: comments
      .filter((c) => c.parentId === comment._id)
      .sort((a, b) => a._creationTime - b._creationTime),
  }));
}

function toPublicCommentPayload(comment: {
  _id: string;
  _creationTime: number;
  text: string;
  timestampSeconds: number;
  parentId?: string;
  resolved: boolean;
  userName: string;
  userAvatarUrl?: string;
}) {
  return {
    _id: comment._id,
    _creationTime: comment._creationTime,
    text: comment.text,
    timestampSeconds: comment.timestampSeconds,
    parentId: comment.parentId,
    resolved: comment.resolved,
    userName: comment.userName,
    userAvatarUrl: comment.userAvatarUrl,
  };
}

async function getPublicVideoByPublicId(ctx: QueryCtx | MutationCtx, publicId: string) {
  // Resolve to the same version the public watch page serves so comments are
  // read from and written to the cut the viewer is actually watching.
  return await resolvePublicVideo(ctx, publicId);
}

function normalizeCommentText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Comment cannot be empty");
  }
  if (trimmed.length > MAX_COMMENT_TEXT_LENGTH) {
    throw new Error("Comment is too long");
  }
  return trimmed;
}

function normalizeGuestName(guestName: string | undefined) {
  const trimmed = guestName?.trim() ?? "";
  if (!trimmed) {
    throw new Error("Guest name is required");
  }
  if (trimmed.length > MAX_GUEST_NAME_LENGTH) {
    throw new Error("Guest name is too long");
  }
  return trimmed;
}

async function assertGuestCommentRateLimit(ctx: MutationCtx, videoId: string) {
  const globalLimit = await guestCommentRateLimiter.limit(ctx, "guestCommentGlobal");
  if (!globalLimit.ok) {
    throw new Error("Too many comments. Please try again shortly.");
  }

  const videoLimit = await guestCommentRateLimiter.limit(ctx, "guestCommentByVideo", {
    key: videoId,
  });
  if (!videoLimit.ok) {
    throw new Error("Too many comments on this video. Please try again shortly.");
  }
}

export const list = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId);

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video_and_timestamp", (q) => q.eq("videoId", args.videoId))
      .collect();

    return comments;
  },
});

export const create = mutation({
  args: {
    videoId: v.id("videos"),
    text: v.string(),
    timestampSeconds: v.number(),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireVideoAccess(ctx, args.videoId, "viewer");
    const text = normalizeCommentText(args.text);

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.videoId !== args.videoId) {
        throw new Error("Invalid parent comment");
      }
    }

    return await ctx.db.insert("comments", {
      videoId: args.videoId,
      userClerkId: user.subject,
      userName: identityName(user),
      userAvatarUrl: identityAvatarUrl(user),
      text,
      timestampSeconds: args.timestampSeconds,
      parentId: args.parentId,
      resolved: false,
    });
  },
});

export const createForPublic = mutation({
  args: {
    publicId: v.string(),
    text: v.string(),
    timestampSeconds: v.number(),
    parentId: v.optional(v.id("comments")),
    guestName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const video = await getPublicVideoByPublicId(ctx, args.publicId);
    if (!video) {
      throw new Error("Video not found");
    }

    const text = normalizeCommentText(args.text);
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.videoId !== video._id) {
        throw new Error("Invalid parent comment");
      }
    }

    const user = await getUser(ctx);
    if (user) {
      return await ctx.db.insert("comments", {
        videoId: video._id,
        userClerkId: user.subject,
        userName: identityName(user),
        userAvatarUrl: identityAvatarUrl(user),
        text,
        timestampSeconds: args.timestampSeconds,
        parentId: args.parentId,
        resolved: false,
      });
    }

    if (!guestCommentsEnabled(video)) {
      throw new Error("Guest comments are not allowed on this video");
    }

    const guestName = normalizeGuestName(args.guestName);
    await assertGuestCommentRateLimit(ctx, video._id);

    return await ctx.db.insert("comments", {
      videoId: video._id,
      userName: guestName,
      text,
      timestampSeconds: args.timestampSeconds,
      parentId: args.parentId,
      resolved: false,
    });
  },
});

export const createForShareGrant = mutation({
  args: {
    grantToken: v.string(),
    text: v.string(),
    timestampSeconds: v.number(),
    parentId: v.optional(v.id("comments")),
    guestName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveActiveShareGrant(ctx, args.grantToken);
    if (!resolved) {
      throw new Error("Invalid share grant");
    }

    const video = await ctx.db.get(resolved.shareLink.videoId);
    if (!video || video.status !== "ready") {
      throw new Error("Video not found");
    }

    const text = normalizeCommentText(args.text);
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.videoId !== video._id) {
        throw new Error("Invalid parent comment");
      }
    }

    const user = await getUser(ctx);
    if (user) {
      return await ctx.db.insert("comments", {
        videoId: video._id,
        userClerkId: user.subject,
        userName: identityName(user),
        userAvatarUrl: identityAvatarUrl(user),
        text,
        timestampSeconds: args.timestampSeconds,
        parentId: args.parentId,
        resolved: false,
      });
    }

    if (!guestCommentsEnabled(video)) {
      throw new Error("Guest comments are not allowed on this video");
    }

    const guestName = normalizeGuestName(args.guestName);
    await assertGuestCommentRateLimit(ctx, video._id);

    return await ctx.db.insert("comments", {
      videoId: video._id,
      userName: guestName,
      text,
      timestampSeconds: args.timestampSeconds,
      parentId: args.parentId,
      resolved: false,
    });
  },
});

export const update = mutation({
  args: {
    commentId: v.id("comments"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    if (!comment.userClerkId || comment.userClerkId !== user.subject) {
      throw new Error("You can only edit your own comments");
    }

    await ctx.db.patch(args.commentId, { text: normalizeCommentText(args.text) });
  },
});

export const remove = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    if (!comment.userClerkId || comment.userClerkId !== user.subject) {
      await requireVideoAccess(ctx, comment.videoId, "admin");
    }

    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent", (q) => q.eq("parentId", args.commentId))
      .collect();

    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    await ctx.db.delete(args.commentId);
  },
});

export const toggleResolved = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    await requireVideoAccess(ctx, comment.videoId, "member");

    await ctx.db.patch(args.commentId, { resolved: !comment.resolved });
  },
});

export const getThreaded = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId);

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();

    return toThreadedComments(comments);
  },
});

export const getThreadedForPublic = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const video = await getPublicVideoByPublicId(ctx, args.publicId);
    if (!video) {
      return [];
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", video._id))
      .collect();

    return toThreadedComments(comments.map(toPublicCommentPayload));
  },
});

export const getThreadedForShareGrant = query({
  args: { grantToken: v.string() },
  handler: async (ctx, args) => {
    const resolved = await resolveActiveShareGrant(ctx, args.grantToken);
    if (!resolved) {
      return [];
    }

    const video = await ctx.db.get(resolved.shareLink.videoId);
    if (!video || video.status !== "ready") {
      return [];
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", video._id))
      .collect();

    return toThreadedComments(comments.map(toPublicCommentPayload));
  },
});
