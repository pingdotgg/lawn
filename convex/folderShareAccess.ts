import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { generateUniqueToken } from "./security";

type ReadCtx = QueryCtx | MutationCtx;

export const FOLDER_SHARE_ACCESS_GRANT_TTL_MS = 60 * 60 * 1000;
export const FOLDER_SHARE_ANCESTRY_WALK_LIMIT = 12;
export const FOLDER_SHARE_GRANT_TOKEN_LENGTH = 40;
const EXPIRED_GRANT_SWEEP_BATCH_SIZE = 200;
const LINK_GRANT_DELETE_BATCH_SIZE = 200;

export async function isFolderShareProjectActive(ctx: ReadCtx, project: Doc<"projects">) {
  const expectedTeamId = project.teamId;
  const visited = new Set<Id<"projects">>();
  let current: Doc<"projects"> | null = project;

  for (let steps = 0; current && steps < FOLDER_SHARE_ANCESTRY_WALK_LIMIT; steps += 1) {
    if (
      visited.has(current._id) ||
      current.teamId !== expectedTeamId ||
      current.deletionStartedAt !== undefined
    ) {
      return false;
    }
    visited.add(current._id);

    if (!current.parentId) {
      return true;
    }

    current = await ctx.db.get(current.parentId);
  }

  // Missing ancestors and chains beyond the valid project depth are corrupt;
  // fail closed instead of exposing a share through an ambiguous hierarchy.
  return false;
}

export async function findFolderShareLinkByToken(ctx: ReadCtx, token: string) {
  return await ctx.db
    .query("folderShareLinks")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
}

export async function issueFolderShareAccessGrant(
  ctx: MutationCtx,
  folderShareLinkId: Id<"folderShareLinks">,
  ttlMs = FOLDER_SHARE_ACCESS_GRANT_TTL_MS,
) {
  const token = await generateUniqueToken(
    FOLDER_SHARE_GRANT_TOKEN_LENGTH,
    async (candidate) =>
      (await ctx.db
        .query("folderShareAccessGrants")
        .withIndex("by_token", (q) => q.eq("token", candidate))
        .unique()) !== null,
    5,
  );

  const now = Date.now();
  const expiresAt = now + ttlMs;
  await ctx.db.insert("folderShareAccessGrants", {
    folderShareLinkId,
    token,
    createdAt: now,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function resolveActiveFolderShareGrant(
  ctx: ReadCtx,
  grantToken: string,
): Promise<{
  grant: Doc<"folderShareAccessGrants">;
  shareLink: Doc<"folderShareLinks">;
  rootProject: Doc<"projects">;
} | null> {
  const grant = await ctx.db
    .query("folderShareAccessGrants")
    .withIndex("by_token", (q) => q.eq("token", grantToken))
    .unique();

  if (!grant || grant.expiresAt <= Date.now()) {
    return null;
  }

  // Re-read the durable link on every public request. Deleting the link during
  // revoke therefore invalidates already-issued grants immediately.
  const shareLink = await ctx.db.get(grant.folderShareLinkId);
  if (!shareLink) {
    return null;
  }

  const rootProject = await ctx.db.get(shareLink.projectId);
  if (!rootProject || !(await isFolderShareProjectActive(ctx, rootProject))) {
    return null;
  }

  return { grant, shareLink, rootProject };
}

export const sweepExpiredFolderShareAccessGrants = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("folderShareAccessGrants")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", Date.now()))
      .take(EXPIRED_GRANT_SWEEP_BATCH_SIZE);

    for (const grant of expired) {
      await ctx.db.delete(grant._id);
    }

    if (expired.length === EXPIRED_GRANT_SWEEP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.folderShareAccess.sweepExpiredFolderShareAccessGrants,
        {},
      );
    }

    return { deleted: expired.length };
  },
});

export const deleteFolderShareAccessGrantsBatch = internalMutation({
  args: { folderShareLinkId: v.id("folderShareLinks") },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    const grants = await ctx.db
      .query("folderShareAccessGrants")
      .withIndex("by_folder_share_link_id", (q) =>
        q.eq("folderShareLinkId", args.folderShareLinkId),
      )
      .take(LINK_GRANT_DELETE_BATCH_SIZE);

    for (const grant of grants) {
      await ctx.db.delete(grant._id);
    }

    if (grants.length === LINK_GRANT_DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.folderShareAccess.deleteFolderShareAccessGrantsBatch,
        args,
      );
    }

    return { deleted: grants.length };
  },
});
