import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { requireVideoAccess, identityName } from "./auth";
import { generateUniqueToken } from "./security";
import { Id } from "./_generated/dataModel";
import {
  findShareLinkByToken,
  issueShareAccessGrant,
} from "./shareAccess";

const shareLinkStatusValidator = v.union(
  v.literal("missing"),
  v.literal("expired"),
  v.literal("requiresPassword"),
  v.literal("ok"),
);

async function generateShareToken(ctx: MutationCtx) {
  return await generateUniqueToken(
    32,
    async (candidate) =>
      (await ctx.db
        .query("shareLinks")
        .withIndex("by_token", (q) => q.eq("token", candidate))
        .unique()) !== null,
    5,
  );
}

async function deleteShareAccessGrantsForLink(
  ctx: MutationCtx,
  shareLinkId: Id<"shareLinks">,
) {
  const grants = await ctx.db
    .query("shareAccessGrants")
    .withIndex("by_share_link", (q) => q.eq("shareLinkId", shareLinkId))
    .collect();

  for (const grant of grants) {
    await ctx.db.delete(grant._id);
  }
}

export const create = mutation({
  args: {
    videoId: v.id("videos"),
    expiresInDays: v.optional(v.number()),
    allowDownload: v.optional(v.boolean()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireVideoAccess(ctx, args.videoId, "member");

    const token = await generateShareToken(ctx);
    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    await ctx.db.insert("shareLinks", {
      videoId: args.videoId,
      token,
      createdByClerkId: user.subject,
      createdByName: identityName(user),
      expiresAt,
      allowDownload: args.allowDownload ?? false,
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

    const linksWithCreator = links.map((link) => ({
      ...link,
      creatorName: link.createdByName,
      isExpired: link.expiresAt ? link.expiresAt < Date.now() : false,
    }));

    return linksWithCreator;
  },
});

export const remove = mutation({
  args: { linkId: v.id("shareLinks") },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Share link not found");

    await requireVideoAccess(ctx, link.videoId, "member");

    await deleteShareAccessGrantsForLink(ctx, args.linkId);
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
  returns: v.object({
    status: shareLinkStatusValidator,
  }),
  handler: async (ctx, args) => {
    const link = await findShareLinkByToken(ctx, args.token);

    if (!link) {
      return { status: "missing" as const };
    }

    if (link.expiresAt && link.expiresAt < Date.now()) {
      return { status: "expired" as const };
    }

    const video = await ctx.db.get(link.videoId);
    if (!video || video.status !== "ready") {
      return { status: "missing" as const };
    }

    if (link.password) {
      return { status: "requiresPassword" as const };
    }

    return { status: "ok" as const };
  },
});

export const issueAccessGrant = mutation({
  args: {
    token: v.string(),
    password: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    grantToken: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const link = await findShareLinkByToken(ctx, args.token);

    if (!link) {
      return { ok: false, grantToken: null };
    }

    if (link.expiresAt && link.expiresAt <= Date.now()) {
      return { ok: false, grantToken: null };
    }

    const video = await ctx.db.get(link.videoId);
    if (!video || video.status !== "ready") {
      return { ok: false, grantToken: null };
    }

    if (link.password) {
      if (!args.password || args.password !== link.password) {
        return { ok: false, grantToken: null };
      }
    }

    const grantToken = await issueShareAccessGrant(ctx, link._id);

    await ctx.db.patch(link._id, {
      viewCount: link.viewCount + 1,
    });

    return {
      ok: true,
      grantToken,
    };
  },
});
