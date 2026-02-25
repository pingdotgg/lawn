import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, query, MutationCtx } from "./_generated/server";
import { identityName, requireVideoAccess } from "./auth";
import { generateUniqueToken, hashPassword, verifyPassword } from "./security";
import { findShareLinkByToken, issueShareAccessGrant } from "./shareAccess";

const shareLinkStatusValidator = v.union(
  v.literal("missing"),
  v.literal("expired"),
  v.literal("requiresPassword"),
  v.literal("ok"),
);

const MAX_SHARE_PASSWORD_LENGTH = 256;
const PASSWORD_MAX_FAILED_ATTEMPTS = 5;
const PASSWORD_LOCKOUT_MS = 10 * MINUTE;

const shareLinkRateLimiter = new RateLimiter(components.rateLimiter, {
  grantGlobal: {
    kind: "fixed window",
    rate: 600,
    period: MINUTE,
    shards: 8,
  },
  grantByToken: {
    kind: "fixed window",
    rate: 120,
    period: MINUTE,
  },
  passwordFailuresByToken: {
    kind: "fixed window",
    rate: 10,
    period: MINUTE,
  },
});

function hasPasswordProtection(
  link: Pick<Doc<"shareLinks">, "password" | "passwordHash">,
) {
  return Boolean(link.passwordHash || link.password);
}

function normalizeProvidedPassword(password: string | null | undefined) {
  if (password === undefined || password === null || password.length === 0) {
    return undefined;
  }

  if (password.length > MAX_SHARE_PASSWORD_LENGTH) {
    throw new Error("Password is too long");
  }

  return password;
}

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
    const normalizedPassword = normalizeProvidedPassword(args.password);
    const passwordHash = normalizedPassword
      ? await hashPassword(normalizedPassword)
      : undefined;

    await ctx.db.insert("shareLinks", {
      videoId: args.videoId,
      token,
      createdByClerkId: user.subject,
      createdByName: identityName(user),
      expiresAt,
      allowDownload: args.allowDownload ?? false,
      password: undefined,
      passwordHash,
      failedAccessAttempts: 0,
      lockedUntil: undefined,
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
      _id: link._id,
      _creationTime: link._creationTime,
      videoId: link.videoId,
      token: link.token,
      createdByClerkId: link.createdByClerkId,
      createdByName: link.createdByName,
      expiresAt: link.expiresAt,
      allowDownload: link.allowDownload,
      viewCount: link.viewCount,
      hasPassword: hasPasswordProtection(link),
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

    const updates: Partial<Doc<"shareLinks">> = {};

    if (args.expiresInDays !== undefined) {
      updates.expiresAt = args.expiresInDays
        ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
        : undefined;
    }

    if (args.allowDownload !== undefined) {
      updates.allowDownload = args.allowDownload;
    }

    if (args.password !== undefined) {
      const normalizedPassword = normalizeProvidedPassword(args.password ?? undefined);
      if (normalizedPassword) {
        updates.passwordHash = await hashPassword(normalizedPassword);
        updates.password = undefined;
      } else {
        updates.passwordHash = undefined;
        updates.password = undefined;
      }
      updates.failedAccessAttempts = 0;
      updates.lockedUntil = undefined;
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

    if (hasPasswordProtection(link)) {
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
    const globalAccessLimit = await shareLinkRateLimiter.limit(ctx, "grantGlobal");
    if (!globalAccessLimit.ok) {
      return { ok: false, grantToken: null };
    }

    const accessLimit = await shareLinkRateLimiter.limit(ctx, "grantByToken", {
      key: args.token,
    });
    if (!accessLimit.ok) {
      return { ok: false, grantToken: null };
    }

    const link = await findShareLinkByToken(ctx, args.token);

    if (!link) {
      return { ok: false, grantToken: null };
    }

    const now = Date.now();

    if (link.expiresAt && link.expiresAt <= now) {
      return { ok: false, grantToken: null };
    }

    const video = await ctx.db.get(link.videoId);
    if (!video || video.status !== "ready") {
      return { ok: false, grantToken: null };
    }

    if (hasPasswordProtection(link)) {
      if (link.lockedUntil && link.lockedUntil > now) {
        return { ok: false, grantToken: null };
      }

      const password = args.password ?? "";
      let passwordMatches = false;
      if (link.passwordHash) {
        passwordMatches = await verifyPassword(password, link.passwordHash);
      } else if (link.password) {
        passwordMatches = password === link.password;
      }

      if (!passwordMatches) {
        await shareLinkRateLimiter.limit(ctx, "passwordFailuresByToken", {
          key: args.token,
        });

        const failedAccessAttempts = (link.failedAccessAttempts ?? 0) + 1;
        const updates: Partial<Doc<"shareLinks">> = {
          failedAccessAttempts,
        };
        if (failedAccessAttempts >= PASSWORD_MAX_FAILED_ATTEMPTS) {
          updates.failedAccessAttempts = 0;
          updates.lockedUntil = now + PASSWORD_LOCKOUT_MS;
        }

        await ctx.db.patch(link._id, updates);
        return { ok: false, grantToken: null };
      }

      const successUpdates: Partial<Doc<"shareLinks">> = {};
      if ((link.failedAccessAttempts ?? 0) > 0) {
        successUpdates.failedAccessAttempts = 0;
      }
      if (link.lockedUntil !== undefined) {
        successUpdates.lockedUntil = undefined;
      }
      if (link.password && !link.passwordHash) {
        successUpdates.passwordHash = await hashPassword(link.password);
        successUpdates.password = undefined;
      }

      if (Object.keys(successUpdates).length > 0) {
        await ctx.db.patch(link._id, successUpdates);
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
