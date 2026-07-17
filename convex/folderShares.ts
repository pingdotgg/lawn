import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { identityName, requireProjectAccess } from "./auth";
import {
  FOLDER_SHARE_ANCESTRY_WALK_LIMIT,
  FOLDER_SHARE_GRANT_TOKEN_LENGTH,
  findFolderShareLinkByToken,
  isFolderShareProjectActive,
  issueFolderShareAccessGrant,
  resolveActiveFolderShareGrant,
} from "./folderShareAccess";
import { generateUniqueToken } from "./security";

type ReadCtx = QueryCtx | MutationCtx;

const FOLDER_SHARE_TOKEN_LENGTH = 32;
const MAX_FOLDER_PAGE_SIZE = 40;
const MAX_VIDEO_PAGE_SIZE = 40;
const MAX_PUBLIC_COMMENTS = 200;

const folderShareRateLimiter = new RateLimiter(components.rateLimiter, {
  grantAttemptGlobal: {
    kind: "fixed window",
    rate: 1200,
    period: MINUTE,
    shards: 16,
  },
  grantGlobal: {
    kind: "fixed window",
    rate: 600,
    period: MINUTE,
    shards: 8,
  },
  grantByToken: {
    kind: "fixed window",
    rate: 60,
    period: MINUTE,
  },
  playbackGlobal: {
    kind: "fixed window",
    rate: 600,
    period: MINUTE,
    shards: 8,
  },
  playbackByLink: {
    kind: "fixed window",
    rate: 120,
    period: MINUTE,
  },
  playbackByLinkAndVideo: {
    kind: "fixed window",
    rate: 60,
    period: MINUTE,
  },
});

async function generateFolderShareToken(ctx: MutationCtx) {
  return await generateUniqueToken(
    FOLDER_SHARE_TOKEN_LENGTH,
    async (candidate) =>
      (await ctx.db
        .query("folderShareLinks")
        .withIndex("by_token", (q) => q.eq("token", candidate))
        .unique()) !== null,
    5,
  );
}

async function findPathWithinSharedRoot(
  ctx: ReadCtx,
  rootProject: Doc<"projects">,
  candidate: Doc<"projects">,
) {
  if (candidate.teamId !== rootProject.teamId) {
    return null;
  }

  const reversePath: Doc<"projects">[] = [];
  const visited = new Set<Id<"projects">>();
  let current: Doc<"projects"> | null = candidate;

  for (let steps = 0; current && steps < FOLDER_SHARE_ANCESTRY_WALK_LIMIT; steps += 1) {
    if (
      visited.has(current._id) ||
      current.teamId !== rootProject.teamId ||
      current.deletionStartedAt !== undefined
    ) {
      return null;
    }
    visited.add(current._id);
    reversePath.push(current);

    if (current._id === rootProject._id) {
      return reversePath.reverse();
    }

    current = current.parentId ? await ctx.db.get(current.parentId) : null;
  }

  return null;
}

async function resolveSharedFolder(ctx: ReadCtx, grantToken: string, folderId?: string) {
  if (grantToken.length !== FOLDER_SHARE_GRANT_TOKEN_LENGTH) {
    return null;
  }

  const resolved = await resolveActiveFolderShareGrant(ctx, grantToken);
  if (!resolved) {
    return null;
  }

  let folder = resolved.rootProject;
  if (folderId !== undefined) {
    const normalizedFolderId = ctx.db.normalizeId("projects", folderId);
    if (!normalizedFolderId) {
      return null;
    }
    const requestedFolder = await ctx.db.get(normalizedFolderId);
    if (!requestedFolder) {
      return null;
    }
    folder = requestedFolder;
  }

  const path = await findPathWithinSharedRoot(ctx, resolved.rootProject, folder);
  if (!path) {
    return null;
  }

  return { ...resolved, folder, path };
}

async function resolveSharedVideo(ctx: ReadCtx, grantToken: string, videoId: string) {
  if (grantToken.length !== FOLDER_SHARE_GRANT_TOKEN_LENGTH) {
    return null;
  }

  const normalizedVideoId = ctx.db.normalizeId("videos", videoId);
  if (!normalizedVideoId) {
    return null;
  }

  const resolved = await resolveActiveFolderShareGrant(ctx, grantToken);
  if (!resolved) {
    return null;
  }

  const video = await ctx.db.get(normalizedVideoId);
  if (!video || video.status !== "ready" || video.supersededByVideoId !== undefined) {
    return null;
  }

  const folder = await ctx.db.get(video.projectId);
  if (!folder) {
    return null;
  }

  const path = await findPathWithinSharedRoot(ctx, resolved.rootProject, folder);
  if (!path) {
    return null;
  }

  return { ...resolved, folder, path, video };
}

function toPublicComment(comment: Doc<"comments">) {
  return {
    _id: comment._id,
    _creationTime: comment._creationTime,
    text: comment.text,
    timestampSeconds: comment.timestampSeconds,
    parentId: comment.parentId,
    resolved: comment.resolved,
    userName: comment.userName,
  };
}

function toThreadedComments(comments: ReturnType<typeof toPublicComment>[]) {
  const repliesByParent = new Map<Id<"comments">, ReturnType<typeof toPublicComment>[]>();
  for (const comment of comments) {
    if (!comment.parentId) continue;
    const replies = repliesByParent.get(comment.parentId) ?? [];
    replies.push(comment);
    repliesByParent.set(comment.parentId, replies);
  }

  return comments
    .filter((comment) => !comment.parentId)
    .map((comment) => ({
      ...comment,
      replies: (repliesByParent.get(comment._id) ?? []).sort(
        (left, right) => left._creationTime - right._creationTime,
      ),
    }));
}

/**
 * Deletes the durable link before its folder disappears. Existing grants are
 * immediately harmless because every public read re-loads the link. Grant rows
 * are only physical cleanup, so delete them asynchronously to keep revocation
 * and subtree deletion latency independent of viewer count.
 */
export async function deleteFolderShareLink(ctx: MutationCtx, projectId: Id<"projects">) {
  const link = await ctx.db
    .query("folderShareLinks")
    .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
    .unique();
  if (!link) return false;

  await ctx.db.delete(link._id);
  await ctx.scheduler.runAfter(0, internal.folderShareAccess.deleteFolderShareAccessGrantsBatch, {
    folderShareLinkId: link._id,
  });
  return true;
}

export const getForFolder = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { project } = await requireProjectAccess(ctx, args.projectId, "member");
    if (!(await isFolderShareProjectActive(ctx, project))) return null;
    const link = await ctx.db
      .query("folderShareLinks")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .unique();

    if (!link) return null;
    return {
      token: link.token,
      createdAt: link._creationTime,
      createdByName: link.createdByName,
    };
  },
});

export const create = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { user, project } = await requireProjectAccess(ctx, args.projectId, "member");
    if (!(await isFolderShareProjectActive(ctx, project))) {
      throw new Error("Folder is being deleted");
    }
    const existing = await ctx.db
      .query("folderShareLinks")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .unique();
    if (existing) {
      return { token: existing.token, created: false };
    }

    const token = await generateFolderShareToken(ctx);
    await ctx.db.insert("folderShareLinks", {
      projectId: args.projectId,
      token,
      createdByClerkId: user.subject,
      createdByName: identityName(user),
    });
    return { token, created: true };
  },
});

export const revoke = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId, "member");
    return { revoked: await deleteFolderShareLink(ctx, args.projectId) };
  },
});

export const getByToken = query({
  args: { token: v.string() },
  returns: v.object({ status: v.union(v.literal("ok"), v.literal("missing")) }),
  handler: async (ctx, args) => {
    if (args.token.length !== FOLDER_SHARE_TOKEN_LENGTH) {
      return { status: "missing" as const };
    }

    const link = await findFolderShareLinkByToken(ctx, args.token);
    const rootProject = link ? await ctx.db.get(link.projectId) : null;
    if (!link || !rootProject || !(await isFolderShareProjectActive(ctx, rootProject))) {
      return { status: "missing" as const };
    }
    return { status: "ok" as const };
  },
});

export const issueAccessGrant = mutation({
  args: { token: v.string() },
  returns: v.object({
    ok: v.boolean(),
    grantToken: v.union(v.string(), v.null()),
    expiresAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    if (args.token.length !== FOLDER_SHARE_TOKEN_LENGTH) {
      return { ok: false, grantToken: null, expiresAt: null };
    }

    const attemptLimit = await folderShareRateLimiter.limit(ctx, "grantAttemptGlobal");
    if (!attemptLimit.ok) {
      return { ok: false, grantToken: null, expiresAt: null };
    }

    const link = await findFolderShareLinkByToken(ctx, args.token);
    const rootProject = link ? await ctx.db.get(link.projectId) : null;
    if (!link || !rootProject || !(await isFolderShareProjectActive(ctx, rootProject))) {
      return { ok: false, grantToken: null, expiresAt: null };
    }

    const tokenLimit = await folderShareRateLimiter.limit(ctx, "grantByToken", {
      key: args.token,
    });
    if (!tokenLimit.ok) {
      return { ok: false, grantToken: null, expiresAt: null };
    }
    const globalLimit = await folderShareRateLimiter.limit(ctx, "grantGlobal");
    if (!globalLimit.ok) {
      return { ok: false, grantToken: null, expiresAt: null };
    }

    const grant = await issueFolderShareAccessGrant(ctx, link._id);
    return {
      ok: true,
      grantToken: grant.token,
      expiresAt: grant.expiresAt,
    };
  },
});

export const getFolder = query({
  args: {
    grantToken: v.string(),
    folderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveSharedFolder(ctx, args.grantToken, args.folderId);
    if (!resolved) return null;

    return {
      root: {
        _id: resolved.rootProject._id,
        name: resolved.rootProject.name,
      },
      current: {
        _id: resolved.folder._id,
        name: resolved.folder.name,
        description: resolved.folder.description,
      },
      breadcrumbs: resolved.path.map((folder) => ({
        _id: folder._id,
        name: folder.name,
      })),
      grantExpiresAt: resolved.grant.expiresAt,
    };
  },
});

export const listFolders = query({
  args: {
    grantToken: v.string(),
    folderId: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const resolved = await resolveSharedFolder(ctx, args.grantToken, args.folderId);
    if (!resolved) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const requestedPageSize = Number.isFinite(args.paginationOpts.numItems)
      ? Math.trunc(args.paginationOpts.numItems)
      : MAX_FOLDER_PAGE_SIZE;
    const result = await ctx.db
      .query("projects")
      .withIndex("by_team_id_and_parent_id_and_deletion_started_at_and_name", (q) =>
        q
          .eq("teamId", resolved.folder.teamId)
          .eq("parentId", resolved.folder._id)
          .eq("deletionStartedAt", undefined),
      )
      .order("asc")
      .paginate({
        cursor: args.paginationOpts.cursor,
        numItems: Math.min(Math.max(requestedPageSize, 1), MAX_FOLDER_PAGE_SIZE),
      });

    return {
      ...result,
      page: result.page.map((folder) => ({
        _id: folder._id,
        name: folder.name,
        description: folder.description,
      })),
    };
  },
});

export const listVideos = query({
  args: {
    grantToken: v.string(),
    folderId: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const resolved = await resolveSharedFolder(ctx, args.grantToken, args.folderId);
    if (!resolved) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const requestedPageSize = Number.isFinite(args.paginationOpts.numItems)
      ? Math.trunc(args.paginationOpts.numItems)
      : MAX_VIDEO_PAGE_SIZE;
    const result = await ctx.db
      .query("videos")
      .withIndex("by_project_id_and_superseded_by_video_id_and_status", (q) =>
        q
          .eq("projectId", resolved.folder._id)
          .eq("supersededByVideoId", undefined)
          .eq("status", "ready"),
      )
      .order("desc")
      .paginate({
        cursor: args.paginationOpts.cursor,
        numItems: Math.min(Math.max(requestedPageSize, 1), MAX_VIDEO_PAGE_SIZE),
      });

    return {
      ...result,
      page: result.page.map((video) => ({
        _id: video._id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        createdAt: video._creationTime,
        versionNumber: video.versionNumber ?? 1,
      })),
    };
  },
});

export const getVideo = query({
  args: {
    grantToken: v.string(),
    videoId: v.string(),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveSharedVideo(ctx, args.grantToken, args.videoId);
    if (!resolved) return null;

    const commentRows = await ctx.db
      .query("comments")
      .withIndex("by_video_and_timestamp", (q) => q.eq("videoId", resolved.video._id))
      .order("asc")
      .take(MAX_PUBLIC_COMMENTS + 1);
    const comments = commentRows.slice(0, MAX_PUBLIC_COMMENTS).map(toPublicComment);

    return {
      video: {
        _id: resolved.video._id,
        title: resolved.video.title,
        description: resolved.video.description,
        duration: resolved.video.duration,
        versionNumber: resolved.video.versionNumber ?? 1,
      },
      folder: {
        _id: resolved.folder._id,
        name: resolved.folder.name,
      },
      breadcrumbs: resolved.path.map((folder) => ({
        _id: folder._id,
        name: folder.name,
      })),
      comments: toThreadedComments(comments),
      commentsTruncated: commentRows.length > MAX_PUBLIC_COMMENTS,
      grantExpiresAt: resolved.grant.expiresAt,
    };
  },
});

export const claimVideoForPlayback = internalMutation({
  args: {
    grantToken: v.string(),
    videoId: v.string(),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveSharedVideo(ctx, args.grantToken, args.videoId);
    if (!resolved || (!resolved.video.muxAssetId && !resolved.video.muxPlaybackId)) return null;

    const linkVideoLimit = await folderShareRateLimiter.limit(ctx, "playbackByLinkAndVideo", {
      key: `${resolved.shareLink._id}:${resolved.video._id}`,
    });
    if (!linkVideoLimit.ok) {
      return {
        kind: "rateLimited" as const,
        retryAfterMs: linkVideoLimit.retryAfter ?? MINUTE,
      };
    }
    const linkLimit = await folderShareRateLimiter.limit(ctx, "playbackByLink", {
      key: resolved.shareLink._id,
    });
    if (!linkLimit.ok) {
      return {
        kind: "rateLimited" as const,
        retryAfterMs: linkLimit.retryAfter ?? MINUTE,
      };
    }
    const globalLimit = await folderShareRateLimiter.limit(ctx, "playbackGlobal");
    if (!globalLimit.ok) {
      return {
        kind: "rateLimited" as const,
        retryAfterMs: globalLimit.retryAfter ?? MINUTE,
      };
    }

    return resolved.video.muxAssetId
      ? { kind: "assetId" as const, muxAssetId: resolved.video.muxAssetId }
      : { kind: "playbackId" as const, muxPlaybackId: resolved.video.muxPlaybackId! };
  },
});
