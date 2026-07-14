import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { identityAvatarUrl, identityName, requireVideoAccess, requireUser } from "./auth";
import { resolveActiveShareGrant } from "./shareAccess";
import { resolvePublicVideo } from "./videos";

/** Max freehand strokes on a single comment drawing. */
export const MAX_DRAWING_STROKES = 40;
/** Max points per stroke. */
export const MAX_POINTS_PER_STROKE = 400;
/** Max points across all strokes. */
export const MAX_TOTAL_DRAWING_POINTS = 4000;
/** Serialized JSON length cap (~48KB). */
export const MAX_DRAWING_SERIALIZED_LENGTH = 48_000;

const drawingPointValidator = v.object({
  x: v.number(),
  y: v.number(),
});

const drawingStrokeValidator = v.object({
  points: v.array(drawingPointValidator),
});

export const drawingValidator = v.object({
  width: v.number(),
  height: v.number(),
  strokes: v.array(drawingStrokeValidator),
});

type DrawingInput = {
  width: number;
  height: number;
  strokes: Array<{ points: Array<{ x: number; y: number }> }>;
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * Validate and normalize an optional drawing payload for storage.
 * Throws on invalid / oversized drawings. Returns undefined when absent.
 */
export function normalizeDrawing(drawing: DrawingInput | undefined): DrawingInput | undefined {
  if (drawing === undefined) return undefined;

  const width = Number(drawing.width);
  const height = Number(drawing.height);
  if (!Number.isFinite(width) || width <= 0 || width > 10_000) {
    throw new Error("Drawing width is invalid");
  }
  if (!Number.isFinite(height) || height <= 0 || height > 10_000) {
    throw new Error("Drawing height is invalid");
  }
  if (!Array.isArray(drawing.strokes)) {
    throw new Error("Drawing strokes must be an array");
  }
  if (drawing.strokes.length > MAX_DRAWING_STROKES) {
    throw new Error(`Drawing can have at most ${MAX_DRAWING_STROKES} strokes`);
  }

  let totalPoints = 0;
  const strokes: DrawingInput["strokes"] = [];

  for (const stroke of drawing.strokes) {
    if (!stroke || !Array.isArray(stroke.points)) {
      throw new Error("Stroke points must be an array");
    }
    if (stroke.points.length > MAX_POINTS_PER_STROKE) {
      throw new Error(`Each stroke can have at most ${MAX_POINTS_PER_STROKE} points`);
    }

    const points: Array<{ x: number; y: number }> = [];
    for (const point of stroke.points) {
      const x = Number(point?.x);
      const y = Number(point?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error("Point coordinates must be finite numbers");
      }
      points.push({ x: clamp01(round4(x)), y: clamp01(round4(y)) });
    }

    if (points.length < 2) continue;
    totalPoints += points.length;
    if (totalPoints > MAX_TOTAL_DRAWING_POINTS) {
      throw new Error(`Drawing can have at most ${MAX_TOTAL_DRAWING_POINTS} points`);
    }
    strokes.push({ points });
  }

  if (strokes.length === 0) {
    throw new Error("Drawing has no strokes");
  }

  const normalized: DrawingInput = {
    width: Math.round(width),
    height: Math.round(height),
    strokes,
  };

  // Guard overall document size once serialized.
  if (JSON.stringify(normalized).length > MAX_DRAWING_SERIALIZED_LENGTH) {
    throw new Error("Drawing is too large");
  }

  return normalized;
}

function requireCommentBody(text: string, drawing: DrawingInput | undefined) {
  const trimmed = text.trim();
  if (!trimmed && !drawing) {
    throw new Error("Comment must include text or a drawing");
  }
  return trimmed;
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
  drawing?: DrawingInput;
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
    drawing: comment.drawing,
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
    drawing: v.optional(drawingValidator),
  },
  handler: async (ctx, args) => {
    const { user } = await requireVideoAccess(ctx, args.videoId, "viewer");

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.videoId !== args.videoId) {
        throw new Error("Invalid parent comment");
      }
    }

    const drawing = normalizeDrawing(args.drawing);
    const text = requireCommentBody(args.text, drawing);

    return await ctx.db.insert("comments", {
      videoId: args.videoId,
      userClerkId: user.subject,
      userName: identityName(user),
      userAvatarUrl: identityAvatarUrl(user),
      text,
      timestampSeconds: args.timestampSeconds,
      parentId: args.parentId,
      resolved: false,
      ...(drawing ? { drawing } : {}),
    });
  },
});

export const createForPublic = mutation({
  args: {
    publicId: v.string(),
    text: v.string(),
    timestampSeconds: v.number(),
    parentId: v.optional(v.id("comments")),
    drawing: v.optional(drawingValidator),
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

    const drawing = normalizeDrawing(args.drawing);
    const text = requireCommentBody(args.text, drawing);

    return await ctx.db.insert("comments", {
      videoId: video._id,
      userClerkId: user.subject,
      userName: identityName(user),
      userAvatarUrl: identityAvatarUrl(user),
      text,
      timestampSeconds: args.timestampSeconds,
      parentId: args.parentId,
      resolved: false,
      ...(drawing ? { drawing } : {}),
    });
  },
});

export const createForShareGrant = mutation({
  args: {
    grantToken: v.string(),
    text: v.string(),
    timestampSeconds: v.number(),
    parentId: v.optional(v.id("comments")),
    drawing: v.optional(drawingValidator),
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

    const drawing = normalizeDrawing(args.drawing);
    const text = requireCommentBody(args.text, drawing);

    return await ctx.db.insert("comments", {
      videoId: video._id,
      userClerkId: user.subject,
      userName: identityName(user),
      userAvatarUrl: identityAvatarUrl(user),
      text,
      timestampSeconds: args.timestampSeconds,
      parentId: args.parentId,
      resolved: false,
      ...(drawing ? { drawing } : {}),
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
