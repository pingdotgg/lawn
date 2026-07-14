import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { identityAvatarUrl, identityName, requireVideoAccess, requireUser } from "./auth";
import { resolveActiveShareGrant } from "./shareAccess";
import { resolvePublicVideo } from "./videos";

/** Max tags on a single comment. */
export const MAX_COMMENT_TAGS = 8;
/** Max characters per tag after trim. */
export const MAX_TAG_LENGTH = 32;

/**
 * Normalize free-form comment tags for storage.
 * Trims, collapses internal whitespace, enforces length/count, and dedupes
 * case-insensitively while preserving the first-seen casing.
 */
export function normalizeCommentTags(tags: string[] | undefined): string[] {
  if (!tags || tags.length === 0) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) {
      throw new Error(`Tag must be ${MAX_TAG_LENGTH} characters or fewer`);
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length > MAX_COMMENT_TAGS) {
      throw new Error(`Comments can have at most ${MAX_COMMENT_TAGS} tags`);
    }
  }

  return result;
}

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
  tags?: string[];
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
    tags: comment.tags,
  };
}

async function getPublicVideoByPublicId(ctx: QueryCtx | MutationCtx, publicId: string) {
  // Resolve to the same version the public watch page serves so comments are
  // read from and written to the cut the viewer is actually watching.
  return await resolvePublicVideo(ctx, publicId);
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
    // Only applied when the caller has member+ access; viewers cannot tag.
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { user, membership } = await requireVideoAccess(ctx, args.videoId, "viewer");

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.videoId !== args.videoId) {
        throw new Error("Invalid parent comment");
      }
    }

    const canTag =
      membership.role === "owner" ||
      membership.role === "admin" ||
      membership.role === "member";
    const tags =
      canTag && args.tags && args.tags.length > 0 ? normalizeCommentTags(args.tags) : undefined;

    return await ctx.db.insert("comments", {
      videoId: args.videoId,
      userClerkId: user.subject,
      userName: identityName(user),
      userAvatarUrl: identityAvatarUrl(user),
      text: args.text,
      timestampSeconds: args.timestampSeconds,
      parentId: args.parentId,
      resolved: false,
      ...(tags && tags.length > 0 ? { tags } : {}),
    });
  },
});

export const createForPublic = mutation({
  args: {
    publicId: v.string(),
    text: v.string(),
    timestampSeconds: v.number(),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const video = await getPublicVideoByPublicId(ctx, args.publicId);

    if (!video) {
      throw new Error("Video not found");
    }

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.videoId !== video._id) {
        throw new Error("Invalid parent comment");
      }
    }

    return await ctx.db.insert("comments", {
      videoId: video._id,
      userClerkId: user.subject,
      userName: identityName(user),
      userAvatarUrl: identityAvatarUrl(user),
      text: args.text,
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
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const resolved = await resolveActiveShareGrant(ctx, args.grantToken);

    if (!resolved) {
      throw new Error("Invalid share grant");
    }

    const video = await ctx.db.get(resolved.shareLink.videoId);
    if (!video || video.status !== "ready") {
      throw new Error("Video not found");
    }

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.videoId !== video._id) {
        throw new Error("Invalid parent comment");
      }
    }

    return await ctx.db.insert("comments", {
      videoId: video._id,
      userClerkId: user.subject,
      userName: identityName(user),
      userAvatarUrl: identityAvatarUrl(user),
      text: args.text,
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

    if (comment.userClerkId !== user.subject) {
      throw new Error("You can only edit your own comments");
    }

    await ctx.db.patch(args.commentId, { text: args.text });
  },
});

export const remove = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    if (comment.userClerkId !== user.subject) {
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

/**
 * Replace the tag list on a comment. Project owners and team members only
 * (viewer role cannot manage tags).
 */
export const setTags = mutation({
  args: {
    commentId: v.id("comments"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    await requireVideoAccess(ctx, comment.videoId, "member");

    const tags = normalizeCommentTags(args.tags);
    await ctx.db.patch(args.commentId, { tags });
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
