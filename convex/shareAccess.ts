import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation } from "./functions";
import { internal } from "./_generated/api";
import { generateUniqueToken } from "./security";

type ReadCtx = QueryCtx | MutationCtx;

export const SHARE_ACCESS_GRANT_TTL_MS = 24 * 60 * 60 * 1000;
const EXPIRED_GRANT_SWEEP_BATCH_SIZE = 200;

export async function findShareLinkByToken(ctx: ReadCtx, token: string) {
  return await ctx.db
    .query("shareLinks")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
}

export async function cleanupExpiredShareAccessGrantsForLink(
  ctx: MutationCtx,
  shareLinkId: Id<"shareLinks">,
) {
  const grants = await ctx.db
    .query("shareAccessGrants")
    .withIndex("by_share_link", (q) => q.eq("shareLinkId", shareLinkId))
    .take(EXPIRED_GRANT_SWEEP_BATCH_SIZE);

  const now = Date.now();
  for (const grant of grants) {
    if (grant.expiresAt <= now) {
      await ctx.db.delete(grant._id);
    }
  }
}

export async function issueShareAccessGrant(
  ctx: MutationCtx,
  shareLinkId: Id<"shareLinks">,
  ttlMs = SHARE_ACCESS_GRANT_TTL_MS,
) {
  // Expired grants are reaped by a periodic cron (sweepExpiredShareAccessGrants)
  // and when a share link is deleted (deleteShareAccessGrantsForLink), so we
  // don't scan + delete on every single access grant issuance.

  const token = await generateUniqueToken(
    40,
    async (candidate) =>
      (await ctx.db
        .query("shareAccessGrants")
        .withIndex("by_token", (q) => q.eq("token", candidate))
        .unique()) !== null,
    5,
  );

  const now = Date.now();
  await ctx.db.insert("shareAccessGrants", {
    shareLinkId,
    token,
    createdAt: now,
    expiresAt: now + ttlMs,
  });

  return token;
}

export async function resolveActiveShareGrant(
  ctx: ReadCtx,
  grantToken: string,
): Promise<{
  grant: Doc<"shareAccessGrants">;
  shareLink: Doc<"shareLinks">;
} | null> {
  const grant = await ctx.db
    .query("shareAccessGrants")
    .withIndex("by_token", (q) => q.eq("token", grantToken))
    .unique();

  if (!grant || grant.expiresAt <= Date.now()) {
    return null;
  }

  const shareLink = await ctx.db.get(grant.shareLinkId);
  if (!shareLink) {
    return null;
  }

  if (shareLink.expiresAt && shareLink.expiresAt <= Date.now()) {
    return null;
  }

  return { grant, shareLink };
}

/**
 * Deletes a bounded batch of expired share access grants across all links.
 * Reschedules itself when more remain so each invocation stays within Convex's
 * per-transaction limits. Driven by an hourly cron so the hot access-grant
 * path never pays the cleanup cost.
 */
export const sweepExpiredShareAccessGrants = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("shareAccessGrants")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(EXPIRED_GRANT_SWEEP_BATCH_SIZE);

    for (const grant of expired) {
      await ctx.db.delete(grant._id);
    }

    if (expired.length === EXPIRED_GRANT_SWEEP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.shareAccess.sweepExpiredShareAccessGrants, {});
    }

    return { deleted: expired.length };
  },
});
