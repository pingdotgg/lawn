import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  identityAvatarUrl,
  identityName,
  requireVideoAccess,
  requireUser,
  getUser,
} from "./auth";

export const list = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    // First try authenticated access
    const user = await getUser(ctx);

    if (user) {
      // Authenticated user - verify access
      await requireVideoAccess(ctx, args.videoId);
    } else {
      // For share links, comments can be viewed without auth
      // The share link validation happens in the component
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();

    // Sort by timestamp
    return comments.sort(
      (a, b) => a.timestampSeconds - b.timestampSeconds
    );
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

    // Validate parent comment if provided
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

    // Only comment owner can edit
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

    // Check if user owns the comment or has admin access to the video
    if (comment.userClerkId !== user.subject) {
      await requireVideoAccess(ctx, comment.videoId, "admin");
    }

    // Delete all replies to this comment
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
    const user = await getUser(ctx);

    if (user) {
      await requireVideoAccess(ctx, args.videoId);
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();

    // Build threaded structure
    const topLevel = comments
      .filter((c) => !c.parentId)
      .sort((a, b) => a.timestampSeconds - b.timestampSeconds);

    const threaded = topLevel.map((comment) => ({
      ...comment,
      replies: comments
        .filter((c) => c.parentId === comment._id)
        .sort((a, b) => a._creationTime - b._creationTime),
    }));

    return threaded;
  },
});
