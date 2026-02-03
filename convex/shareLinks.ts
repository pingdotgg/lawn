import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireVideoAccess } from "./auth";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 21; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const create = mutation({
  args: {
    videoId: v.id("videos"),
    expiresInDays: v.optional(v.number()),
    allowDownload: v.boolean(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireVideoAccess(ctx, args.videoId, "member");

    const token = generateToken();
    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    await ctx.db.insert("shareLinks", {
      videoId: args.videoId,
      token,
      createdBy: user._id,
      expiresAt,
      allowDownload: args.allowDownload,
      password: args.password,
      viewCount: 0,
    });

    return { token };
  },
});

export const list = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId);

    const links = await ctx.db
      .query("shareLinks")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();

    const linksWithCreator = await Promise.all(
      links.map(async (link) => {
        const creator = await ctx.db.get(link.createdBy);
        return {
          ...link,
          creatorName: creator?.name ?? "Unknown",
          isExpired: link.expiresAt ? link.expiresAt < Date.now() : false,
        };
      })
    );

    return linksWithCreator;
  },
});

export const remove = mutation({
  args: { linkId: v.id("shareLinks") },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Share link not found");

    await requireVideoAccess(ctx, link.videoId, "member");

    await ctx.db.delete(args.linkId);
  },
});

export const update = mutation({
  args: {
    linkId: v.id("shareLinks"),
    expiresInDays: v.optional(v.union(v.number(), v.null())),
    allowDownload: v.optional(v.boolean()),
    password: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Share link not found");

    await requireVideoAccess(ctx, link.videoId, "member");

    const updates: Partial<{
      expiresAt: number | undefined;
      allowDownload: boolean;
      password: string | undefined;
    }> = {};

    if (args.expiresInDays !== undefined) {
      updates.expiresAt = args.expiresInDays
        ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
        : undefined;
    }

    if (args.allowDownload !== undefined) {
      updates.allowDownload = args.allowDownload;
    }

    if (args.password !== undefined) {
      updates.password = args.password ?? undefined;
    }

    await ctx.db.patch(args.linkId, updates);
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!link) return null;

    // Check expiration
    if (link.expiresAt && link.expiresAt < Date.now()) {
      return { expired: true };
    }

    const video = await ctx.db.get(link.videoId);
    if (!video) return null;

    return {
      expired: false,
      hasPassword: !!link.password,
      video: {
        _id: video._id,
        title: video.title,
        status: video.status,
      },
      allowDownload: link.allowDownload,
    };
  },
});
