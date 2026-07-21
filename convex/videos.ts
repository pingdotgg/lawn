import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { identityKey, identityName, requireProjectAccess, requireVideoAccess } from "./auth";
import { Doc, Id } from "./_generated/dataModel";
import { generateUniqueToken } from "./security";
import { resolveActiveShareGrant } from "./shareAccess";
import { assertTeamCanStoreBytes, assertTeamHasActiveSubscription } from "./billingHelpers";
import { assertVideoFileSizeAllowed } from "./uploadLimits";

const workflowStatusValidator = v.union(
  v.literal("review"),
  v.literal("rework"),
  v.literal("done"),
);

const visibilityValidator = v.union(v.literal("public"), v.literal("private"));
const dashboardSortValidator = v.union(v.literal("last-uploaded"), v.literal("alphabetical"));

const VIDEO_DEPENDENT_DELETE_BATCH_DOCS = 8;
export const MAX_VIDEO_STACK_SIZE = 100;
const VIDEO_STACK_LIMIT_ERROR = `A video can have at most ${MAX_VIDEO_STACK_SIZE} versions.`;
const VIDEO_STACK_HEAD_ERROR = "A video version stack must have exactly one latest version.";
const VIDEO_STACK_CHAIN_ERROR =
  "A video version stack must be one connected acyclic chain within a single project.";
const VIDEO_STACK_PROJECT_ERROR = "All versions of a video must belong to the same project";

const STACK_INVARIANT_ERROR_MESSAGES = new Set([
  VIDEO_STACK_LIMIT_ERROR,
  VIDEO_STACK_HEAD_ERROR,
  VIDEO_STACK_CHAIN_ERROR,
  VIDEO_STACK_PROJECT_ERROR,
]);

// Stack traversal throws these when a stack's shape is corrupt. Callers may
// degrade gracefully on those (operate on the single row), but genuine
// DB/runtime failures must propagate rather than be silently swallowed.
function isStackInvariantError(error: unknown): boolean {
  return error instanceof Error && STACK_INVARIANT_ERROR_MESSAGES.has(error.message);
}

type WorkflowStatus = "review" | "rework" | "done";
type StackReadCtx = Pick<QueryCtx, "db">;

function normalizeWorkflowStatus(status: WorkflowStatus | undefined): WorkflowStatus {
  return status ?? "review";
}

function normalizeVersionNumber(video: Doc<"videos">) {
  return video.versionNumber ?? 1;
}

async function getOrderedStackVersions(ctx: StackReadCtx, video: Doc<"videos">) {
  if (!video.versionStackId) {
    if (video.supersededByVideoId !== undefined) {
      throw new Error(VIDEO_STACK_CHAIN_ERROR);
    }
    return {
      oldestToNewest: [video],
      latest: video,
    };
  }

  const versions = await ctx.db
    .query("videos")
    .withIndex("by_version_stack_id_and_version_number", (q) =>
      q.eq("versionStackId", video.versionStackId),
    )
    .order("desc")
    .take(MAX_VIDEO_STACK_SIZE + 1);

  if (versions.length > MAX_VIDEO_STACK_SIZE) {
    throw new Error(VIDEO_STACK_LIMIT_ERROR);
  }

  if (!versions.some((stackVersion) => stackVersion._id === video._id)) {
    throw new Error(VIDEO_STACK_CHAIN_ERROR);
  }
  if (!versions.every((stackVersion) => stackVersion.projectId === video.projectId)) {
    throw new Error(VIDEO_STACK_PROJECT_ERROR);
  }

  const heads = versions.filter((stackVersion) => stackVersion.supersededByVideoId === undefined);
  if (heads.length !== 1) {
    throw new Error(VIDEO_STACK_HEAD_ERROR);
  }

  const byId = new Map(versions.map((stackVersion) => [stackVersion._id, stackVersion]));
  const predecessorCounts = new Map(versions.map((stackVersion) => [stackVersion._id, 0]));

  for (const stackVersion of versions) {
    if (!stackVersion.supersededByVideoId) continue;
    if (!byId.has(stackVersion.supersededByVideoId)) {
      throw new Error(VIDEO_STACK_CHAIN_ERROR);
    }
    const predecessorCount = predecessorCounts.get(stackVersion.supersededByVideoId);
    if (predecessorCount === undefined || predecessorCount > 0) {
      throw new Error(VIDEO_STACK_CHAIN_ERROR);
    }
    predecessorCounts.set(stackVersion.supersededByVideoId, predecessorCount + 1);
  }

  const roots = versions.filter((stackVersion) => predecessorCounts.get(stackVersion._id) === 0);
  if (roots.length !== 1) {
    throw new Error(VIDEO_STACK_CHAIN_ERROR);
  }

  const oldestToNewest: Doc<"videos">[] = [];
  const visited = new Set<Id<"videos">>();
  let current: Doc<"videos"> | undefined = roots[0];
  while (current) {
    if (visited.has(current._id)) {
      throw new Error(VIDEO_STACK_CHAIN_ERROR);
    }
    visited.add(current._id);
    oldestToNewest.push(current);
    current = current.supersededByVideoId ? byId.get(current.supersededByVideoId) : undefined;
  }

  if (oldestToNewest.length !== versions.length || oldestToNewest.at(-1)?._id !== heads[0]._id) {
    throw new Error(VIDEO_STACK_CHAIN_ERROR);
  }

  return {
    oldestToNewest,
    latest: heads[0],
  };
}

async function getStackVersions(ctx: StackReadCtx, video: Doc<"videos">) {
  const { oldestToNewest, latest } = await getOrderedStackVersions(ctx, video);
  return {
    versions: [...oldestToNewest].reverse(),
    latest,
  };
}

async function getPredecessor(ctx: MutationCtx, videoId: Id<"videos">) {
  return await ctx.db
    .query("videos")
    .withIndex("by_superseded_by_video_id", (q) => q.eq("supersededByVideoId", videoId))
    .unique();
}

async function rewireStackBeforeDelete(ctx: MutationCtx, video: Doc<"videos">) {
  if (!video.versionStackId) return;

  const predecessor = await getPredecessor(ctx, video._id);
  if (predecessor) {
    await ctx.db.patch(predecessor._id, {
      supersededByVideoId: video.supersededByVideoId,
    });
  }
}

async function failOrRollbackUpload(ctx: MutationCtx, video: Doc<"videos">, uploadError: string) {
  if (
    video.versionStackId &&
    video.versionNumber !== undefined &&
    video.status !== "ready" &&
    !video.muxAssetId
  ) {
    await deleteVersionAndRenumberStack(ctx, video);
    const result = await deleteVideoDependentsBatch(
      ctx,
      video._id,
      VIDEO_DEPENDENT_DELETE_BATCH_DOCS,
    );
    if (!result.done) {
      await ctx.scheduler.runAfter(0, internal.videos.continueVideoDelete, {
        videoId: video._id,
      });
    }
    return true;
  }

  await ctx.db.patch(video._id, {
    muxAssetStatus: "errored",
    uploadError,
    status: "failed",
    s3Key: undefined,
    s3MultipartUploadId: undefined,
    s3MultipartPartSizeBytes: undefined,
    s3MultipartPartCount: undefined,
    fileSize: undefined,
    contentType: undefined,
    uploadUpdatedAt: Date.now(),
  });
  return false;
}

async function generatePublicId(ctx: MutationCtx) {
  return await generateUniqueToken(
    32,
    async (candidate) =>
      (await ctx.db
        .query("videos")
        .withIndex("by_public_id", (q) => q.eq("publicId", candidate))
        .unique()) !== null,
    5,
  );
}

async function scheduleVideoAssetCleanup(ctx: MutationCtx, video: Doc<"videos">) {
  if (!video.s3Key && !video.muxAssetId) return;

  await ctx.scheduler.runAfter(0, internal.videoActions.deleteVideoAssets, {
    s3Key: video.s3Key,
    muxAssetId: video.muxAssetId,
  });
}

export async function deleteShareAccessGrantsForLink(
  ctx: MutationCtx,
  linkId: Id<"shareLinks">,
): Promise<number> {
  const grants = await ctx.db
    .query("shareAccessGrants")
    .withIndex("by_share_link", (q) => q.eq("shareLinkId", linkId))
    .collect();

  for (const grant of grants) {
    await ctx.db.delete(grant._id);
  }

  return grants.length;
}

/**
 * Deletes a video and everything that depends on it (comments, share links and
 * their access grants). Returns the number of documents deleted so callers that
 * delete many videos in one transaction (e.g. the folder subtree cascade) can
 * budget against Convex's per-transaction limits.
 */
export async function deleteVideoAndDependents(
  ctx: MutationCtx,
  videoId: Id<"videos">,
): Promise<number> {
  const video = await ctx.db.get(videoId);
  if (!video) return 0;

  let deleted = 0;

  const comments = await ctx.db
    .query("comments")
    .withIndex("by_video", (q) => q.eq("videoId", videoId))
    .collect();
  for (const comment of comments) {
    await ctx.db.delete(comment._id);
    deleted++;
  }

  const shareLinks = await ctx.db
    .query("shareLinks")
    .withIndex("by_video", (q) => q.eq("videoId", videoId))
    .collect();
  for (const link of shareLinks) {
    deleted += await deleteShareAccessGrantsForLink(ctx, link._id);
    await ctx.db.delete(link._id);
    deleted++;
  }

  await scheduleVideoAssetCleanup(ctx, video);
  await rewireStackBeforeDelete(ctx, video);
  await ctx.db.delete(videoId);
  deleted++;

  return deleted;
}

/**
 * Deletes up to `maxDocuments` records belonging to a video. The video itself
 * is removed only after its comments, share links, and access grants are gone.
 */
export async function deleteVideoAndDependentsBatch(
  ctx: MutationCtx,
  videoId: Id<"videos">,
  maxDocuments: number,
): Promise<{ deleted: number; done: boolean }> {
  const video = await ctx.db.get(videoId);
  if (!video) return { deleted: 0, done: true };

  let remaining = maxDocuments;
  let deleted = 0;

  const comments = await ctx.db
    .query("comments")
    .withIndex("by_video", (q) => q.eq("videoId", videoId))
    .take(remaining);
  for (const comment of comments) {
    await ctx.db.delete(comment._id);
  }
  deleted += comments.length;
  remaining -= comments.length;
  if (remaining === 0) return { deleted, done: false };

  while (remaining > 0) {
    const link = await ctx.db
      .query("shareLinks")
      .withIndex("by_video", (q) => q.eq("videoId", videoId))
      .first();
    if (!link) break;

    const grantLimit = remaining;
    const grants = await ctx.db
      .query("shareAccessGrants")
      .withIndex("by_share_link", (q) => q.eq("shareLinkId", link._id))
      .take(grantLimit);
    for (const grant of grants) {
      await ctx.db.delete(grant._id);
    }
    deleted += grants.length;
    remaining -= grants.length;
    if (remaining === 0) return { deleted, done: false };

    await ctx.db.delete(link._id);
    deleted++;
    remaining--;
  }

  if (remaining === 0) return { deleted, done: false };

  await scheduleVideoAssetCleanup(ctx, video);
  await rewireStackBeforeDelete(ctx, video);
  await ctx.db.delete(videoId);
  return { deleted: deleted + 1, done: true };
}

async function deleteVideoDependentsBatch(
  ctx: MutationCtx,
  videoId: Id<"videos">,
  maxDocuments: number,
) {
  let remaining = maxDocuments;
  let deleted = 0;

  const comments = await ctx.db
    .query("comments")
    .withIndex("by_video", (q) => q.eq("videoId", videoId))
    .take(remaining);
  for (const comment of comments) {
    await ctx.db.delete(comment._id);
  }
  deleted += comments.length;
  remaining -= comments.length;
  if (remaining === 0) return { deleted, done: false };

  while (remaining > 0) {
    const link = await ctx.db
      .query("shareLinks")
      .withIndex("by_video", (q) => q.eq("videoId", videoId))
      .first();
    if (!link) {
      return { deleted, done: true };
    }

    const grants = await ctx.db
      .query("shareAccessGrants")
      .withIndex("by_share_link", (q) => q.eq("shareLinkId", link._id))
      .take(remaining);
    for (const grant of grants) {
      await ctx.db.delete(grant._id);
    }
    deleted += grants.length;
    remaining -= grants.length;
    if (remaining === 0) return { deleted, done: false };

    await ctx.db.delete(link._id);
    deleted++;
    remaining--;
  }

  return { deleted, done: false };
}

async function deleteVersionAndRenumberStack(ctx: MutationCtx, video: Doc<"videos">) {
  const { oldestToNewest } = await getOrderedStackVersions(ctx, video);
  const targetIndex = oldestToNewest.findIndex((stackVersion) => stackVersion._id === video._id);
  if (targetIndex === -1) {
    throw new Error(VIDEO_STACK_CHAIN_ERROR);
  }

  const replacementVideoId =
    oldestToNewest[targetIndex + 1]?._id ?? oldestToNewest[targetIndex - 1]?._id ?? null;
  const survivors = oldestToNewest.filter((stackVersion) => stackVersion._id !== video._id);

  if (video.versionStackId) {
    await Promise.all(
      survivors.map((survivor, index) =>
        ctx.db.patch(survivor._id, {
          versionStackId: video.versionStackId,
          versionNumber: index + 1,
          supersededByVideoId: survivors[index + 1]?._id,
        }),
      ),
    );
  }

  await ctx.db.delete(video._id);
  return replacementVideoId;
}

async function insertVersionRecord(
  ctx: MutationCtx,
  args: {
    latest: Doc<"videos">;
    stackSize: number;
    uploadedByClerkId: string;
    uploadedByIdentity?: string;
    uploaderName: string;
    publicId: string;
    fileSize?: number;
    contentType?: string;
  },
) {
  if (args.stackSize >= MAX_VIDEO_STACK_SIZE) {
    throw new Error(VIDEO_STACK_LIMIT_ERROR);
  }

  const latest = args.latest;
  const versionStackId = latest.versionStackId ?? latest._id;
  const versionNumber = normalizeVersionNumber(latest) + 1;

  const videoId = await ctx.db.insert("videos", {
    projectId: latest.projectId,
    uploadedByClerkId: args.uploadedByClerkId,
    uploadedByIdentity: args.uploadedByIdentity,
    uploaderName: args.uploaderName,
    title: latest.title,
    description: latest.description,
    visibility: latest.visibility,
    publicId: args.publicId,
    fileSize: args.fileSize,
    contentType: args.contentType,
    status: "uploading",
    muxAssetStatus: "preparing",
    workflowStatus: "review",
    uploadUpdatedAt: Date.now(),
    versionStackId,
    versionNumber,
  });

  await ctx.db.patch(latest._id, {
    versionStackId,
    versionNumber: normalizeVersionNumber(latest),
    supersededByVideoId: videoId,
  });

  return {
    videoId,
    versionStackId,
    versionNumber,
  };
}

export async function createVersionRecord(
  ctx: MutationCtx,
  args: {
    sourceVideoId: Id<"videos">;
    uploadedByClerkId: string;
    uploadedByIdentity?: string;
    uploaderName: string;
    publicId: string;
    fileSize?: number;
    contentType?: string;
  },
) {
  const sourceVideo = await ctx.db.get(args.sourceVideoId);
  if (!sourceVideo) {
    throw new Error("Video not found");
  }

  const { versions, latest } = await getStackVersions(ctx, sourceVideo);
  return await insertVersionRecord(ctx, {
    latest,
    stackSize: versions.length,
    uploadedByClerkId: args.uploadedByClerkId,
    uploadedByIdentity: args.uploadedByIdentity,
    uploaderName: args.uploaderName,
    publicId: args.publicId,
    fileSize: args.fileSize,
    contentType: args.contentType,
  });
}

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, project } = await requireProjectAccess(ctx, args.projectId, "member");
    assertVideoFileSizeAllowed(args.fileSize ?? 0);
    await assertTeamCanStoreBytes(ctx, project.teamId, args.fileSize ?? 0);
    const publicId = await generatePublicId(ctx);

    const videoId = await ctx.db.insert("videos", {
      projectId: args.projectId,
      uploadedByClerkId: user.subject,
      uploadedByIdentity: identityKey(user),
      uploaderName: identityName(user),
      title: args.title,
      description: args.description,
      fileSize: args.fileSize,
      contentType: args.contentType,
      status: "uploading",
      muxAssetStatus: "preparing",
      workflowStatus: "review",
      visibility: "public",
      publicId,
      uploadUpdatedAt: Date.now(),
    });

    return videoId;
  },
});

export const createVersion = mutation({
  args: {
    sourceVideoId: v.id("videos"),
    fileSize: v.optional(v.number()),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      user,
      video: sourceVideo,
      project,
    } = await requireVideoAccess(ctx, args.sourceVideoId, "member");
    const { versions, latest } = await getStackVersions(ctx, sourceVideo);

    // requireVideoAccess already verified team membership on the source video's
    // project; the new version inherits the same project, so no second access
    // check is needed.
    assertVideoFileSizeAllowed(args.fileSize ?? 0);
    await assertTeamCanStoreBytes(ctx, project.teamId, args.fileSize ?? 0);

    return await insertVersionRecord(ctx, {
      latest,
      stackSize: versions.length,
      uploadedByClerkId: user.subject,
      uploadedByIdentity: identityKey(user),
      uploaderName: identityName(user),
      publicId: await generatePublicId(ctx),
      fileSize: args.fileSize,
      contentType: args.contentType,
    });
  },
});

export const list = query({
  args: {
    projectId: v.id("projects"),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(dashboardSortValidator),
  },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId);

    const result =
      args.sort === "alphabetical"
        ? await ctx.db
            .query("videos")
            .withIndex("by_project_id_and_superseded_by_video_id_and_title", (q) =>
              q.eq("projectId", args.projectId).eq("supersededByVideoId", undefined),
            )
            .order("asc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("videos")
            .withIndex("by_project_and_superseded_by_video_id", (q) =>
              q.eq("projectId", args.projectId).eq("supersededByVideoId", undefined),
            )
            .order("desc")
            .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (video) => {
        // Cap the per-video comment count scan at 201 so a video with thousands
        // of comments doesn't materialize them all just to read .length.
        const commentPage = await ctx.db
          .query("comments")
          .withIndex("by_video", (q) => q.eq("videoId", video._id))
          .take(201);

        return {
          ...video,
          uploaderName: video.uploaderName ?? "Unknown",
          workflowStatus: normalizeWorkflowStatus(video.workflowStatus),
          versionNumber: normalizeVersionNumber(video),
          commentCount: commentPage.length === 201 ? 200 : commentPage.length,
          commentCountIsCapped: commentPage.length === 201,
        };
      }),
    );

    return { ...result, page };
  },
});

export const get = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const { video, membership } = await requireVideoAccess(ctx, args.videoId);
    return {
      ...video,
      uploaderName: video.uploaderName ?? "Unknown",
      workflowStatus: normalizeWorkflowStatus(video.workflowStatus),
      versionNumber: normalizeVersionNumber(video),
      isLatestVersion: video.supersededByVideoId === undefined,
      role: membership.role,
    };
  },
});

export const listVersions = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const { video } = await requireVideoAccess(ctx, args.videoId);

    const { versions } = await getStackVersions(ctx, video);

    return versions.map((version) => ({
      _id: version._id,
      projectId: version.projectId,
      title: version.title,
      status: version.status,
      thumbnailUrl: version.thumbnailUrl,
      versionNumber: normalizeVersionNumber(version),
      isLatestVersion: version.supersededByVideoId === undefined,
      createdAt: version._creationTime,
    }));
  },
});

type PublicWatchResolution =
  | { state: "ready"; video: Doc<"videos">; allowVersionBrowsing: boolean }
  | { state: "processing"; title: string }
  | { state: "unavailable" };

// Version browsing is on unless explicitly disabled, so existing public videos
// keep working without a backfill.
function publicVersionBrowsingEnabled(video: Doc<"videos">) {
  return video.allowPublicVersionBrowsing !== false;
}

function isPublicReadyVersion(video: Doc<"videos">) {
  return video.visibility === "public" && video.status === "ready";
}

async function readStackVersions(ctx: StackReadCtx, video: Doc<"videos">) {
  try {
    const { oldestToNewest } = await getOrderedStackVersions(ctx, video);
    return oldestToNewest;
  } catch (error) {
    // Fall back to the row alone if the stack is malformed, so a public viewer
    // never hits an invariant error on a hot path. Real failures still propagate.
    if (!isStackInvariantError(error)) throw error;
    return [video];
  }
}

// Mutation-side counterpart of readStackVersions. Lets an owner still update the
// row they're acting on when the stack is malformed, instead of being locked out
// of changing visibility/browsing by an invariant error.
async function readStackVersionsForUpdate(ctx: StackReadCtx, video: Doc<"videos">) {
  try {
    const { versions } = await getStackVersions(ctx, video);
    return versions;
  } catch (error) {
    if (!isStackInvariantError(error)) throw error;
    return [video];
  }
}

function latestPublicReadyVersion(stackVersions: Doc<"videos">[]) {
  for (let index = stackVersions.length - 1; index >= 0; index--) {
    if (isPublicReadyVersion(stackVersions[index])) {
      return stackVersions[index];
    }
  }
  return undefined;
}

/**
 * Resolves what a public `/watch/<publicId>` link should show.
 *
 * Each version in a stack is its own `videos` row with its own `publicId`, so the
 * shared link can point at a version that is not the one that should currently
 * play publicly — e.g. a freshly uploaded version that is still processing, or an
 * older superseded cut. Marking the linked version private still disables the URL.
 *
 * When version browsing is enabled (the default), the link resolves to its own
 * version when that version is ready, so viewers can switch between versions by
 * URL. When browsing is disabled, every link collapses to the latest ready
 * version and the switcher is hidden. Either way, if the chosen version isn't
 * ready we fall back to the latest ready version, and if nothing is ready yet but
 * a public version is still uploading/transcoding we report `processing` so the
 * viewer sees "ready soon" instead of "video unavailable".
 */
async function resolvePublicWatch(
  ctx: StackReadCtx,
  publicId: string,
): Promise<PublicWatchResolution> {
  const matched = await ctx.db
    .query("videos")
    .withIndex("by_public_id", (q) => q.eq("publicId", publicId))
    .unique();

  if (!matched || matched.visibility !== "public") {
    return { state: "unavailable" };
  }

  const allowVersionBrowsing = publicVersionBrowsingEnabled(matched);
  const stackVersions = await readStackVersions(ctx, matched);

  const served =
    allowVersionBrowsing && isPublicReadyVersion(matched)
      ? matched
      : latestPublicReadyVersion(stackVersions);

  if (served) {
    return { state: "ready", video: served, allowVersionBrowsing };
  }

  // Nothing is playable yet — if a public version is still in flight, tell the
  // viewer it's on the way rather than treating it as missing.
  const hasInflightVersion = stackVersions.some(
    (candidate) =>
      candidate.visibility === "public" &&
      (candidate.status === "uploading" || candidate.status === "processing"),
  );
  if (hasInflightVersion) {
    return { state: "processing", title: matched.title };
  }

  return { state: "unavailable" };
}

/**
 * Resolves the ready video to serve for a public `/watch/<publicId>` link, or
 * null if nothing is currently playable. Used by the comment and download paths,
 * which only ever operate on a ready cut.
 */
export async function resolvePublicVideo(
  ctx: StackReadCtx,
  publicId: string,
): Promise<Doc<"videos"> | null> {
  const resolution = await resolvePublicWatch(ctx, publicId);
  return resolution.state === "ready" ? resolution.video : null;
}

export const getByPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const resolution = await resolvePublicWatch(ctx, args.publicId);

    if (resolution.state === "unavailable") {
      return null;
    }

    if (resolution.state === "processing") {
      return { processing: true as const, title: resolution.title, video: null };
    }

    const video = resolution.video;
    return {
      processing: false as const,
      title: video.title,
      allowVersionBrowsing: resolution.allowVersionBrowsing,
      video: {
        _id: video._id,
        publicId: video.publicId,
        versionNumber: normalizeVersionNumber(video),
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl,
        muxAssetId: video.muxAssetId,
        muxPlaybackId: video.muxPlaybackId,
        contentType: video.contentType,
        s3Key: video.s3Key,
      },
    };
  },
});

/**
 * Lists the versions a public viewer can switch between for a `/watch/<publicId>`
 * link: every public, ready version in the stack, oldest first. Returns an empty
 * list when the video is private or the owner disabled version browsing.
 */
export const listPublicVersions = query({
  args: { publicId: v.string() },
  returns: v.array(
    v.object({
      publicId: v.string(),
      versionNumber: v.number(),
      isLatest: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const matched = await ctx.db
      .query("videos")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();

    if (!matched || matched.visibility !== "public" || !publicVersionBrowsingEnabled(matched)) {
      return [];
    }

    const stackVersions = await readStackVersions(ctx, matched);
    return stackVersions.filter(isPublicReadyVersion).map((version) => ({
      publicId: version.publicId,
      versionNumber: normalizeVersionNumber(version),
      isLatest: version.supersededByVideoId === undefined,
    }));
  },
});

export const getByPublicIdForDownload = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const video = await resolvePublicVideo(ctx, args.publicId);
    if (!video) {
      return null;
    }

    return {
      video: {
        _id: video._id,
        title: video.title,
        contentType: video.contentType,
        s3Key: video.s3Key,
        status: video.status,
      },
    };
  },
});

export const getPublicIdByVideoId = query({
  args: { videoId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const normalizedVideoId = ctx.db.normalizeId("videos", args.videoId);
    if (!normalizedVideoId) {
      return null;
    }

    const video = await ctx.db.get(normalizedVideoId);
    if (!video || video.visibility !== "public" || !video.publicId) {
      return null;
    }

    return video.publicId;
  },
});

export const getByShareGrant = query({
  args: { grantToken: v.string() },
  handler: async (ctx, args) => {
    const resolved = await resolveActiveShareGrant(ctx, args.grantToken);
    if (!resolved) {
      return null;
    }

    const video = await ctx.db.get(resolved.shareLink.videoId);
    if (!video || video.status !== "ready") {
      return null;
    }

    return {
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl,
        muxAssetId: video.muxAssetId,
        muxPlaybackId: video.muxPlaybackId,
        contentType: video.contentType,
        s3Key: video.s3Key,
      },
      grantExpiresAt: resolved.grant.expiresAt,
    };
  },
});

export const getByShareGrantForDownload = query({
  args: { grantToken: v.string() },
  handler: async (ctx, args) => {
    const resolved = await resolveActiveShareGrant(ctx, args.grantToken);
    if (!resolved) {
      return null;
    }

    const video = await ctx.db.get(resolved.shareLink.videoId);
    if (!video) {
      return null;
    }

    return {
      allowDownload: resolved.shareLink.allowDownload,
      grantExpiresAt: resolved.grant.expiresAt,
      video: {
        _id: video._id,
        title: video.title,
        contentType: video.contentType,
        s3Key: video.s3Key,
        status: video.status,
      },
    };
  },
});

export const update = mutation({
  args: {
    videoId: v.id("videos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "member");

    const updates: Partial<{ title: string; description: string }> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.videoId, updates);
  },
});

export const move = mutation({
  args: {
    videoId: v.id("videos"),
    projectId: v.id("projects"), // destination folder
  },
  handler: async (ctx, args) => {
    // Validate access to the SOURCE: `requireVideoAccess` loads the video and its
    // current (source) project, and requires `member` on the source folder's team.
    const { project: sourceProject, video } = await requireVideoAccess(ctx, args.videoId, "member");
    const { versions } = await getStackVersions(ctx, video);

    if (!versions.every((version) => version.projectId === sourceProject._id)) {
      throw new Error("All versions of a video must belong to the same project");
    }

    if (sourceProject._id === args.projectId) {
      return; // no-op: dropped back into the same folder
    }

    // Validate the DESTINATION: caller must be a member of the destination
    // folder's team, and that team must match the source video's team.
    const { project: dest } = await requireProjectAccess(ctx, args.projectId, "member");
    if (dest.teamId !== sourceProject.teamId) {
      throw new Error("Can't move a video to a different team");
    }

    await Promise.all(
      versions.map((version) => ctx.db.patch(version._id, { projectId: args.projectId })),
    );
  },
});

export const setVisibility = mutation({
  args: {
    videoId: v.id("videos"),
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    const { video } = await requireVideoAccess(ctx, args.videoId, "member");

    // Visibility is a property of the whole video, not a single cut. Apply it to
    // every version in the stack so the public/private state can't drift between
    // versions (each version carries its own `visibility` row).
    const versions = await readStackVersionsForUpdate(ctx, video);
    await Promise.all(
      versions.map((version) =>
        version.visibility !== args.visibility
          ? ctx.db.patch(version._id, { visibility: args.visibility })
          : Promise.resolve(),
      ),
    );
  },
});

export const setPublicVersionBrowsing = mutation({
  args: {
    videoId: v.id("videos"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { video } = await requireVideoAccess(ctx, args.videoId, "member");

    // Like visibility, version browsing is a property of the whole video. Keep it
    // consistent across every version in the stack.
    const versions = await readStackVersionsForUpdate(ctx, video);
    await Promise.all(
      versions.map((version) =>
        publicVersionBrowsingEnabled(version) !== args.enabled
          ? ctx.db.patch(version._id, { allowPublicVersionBrowsing: args.enabled })
          : Promise.resolve(),
      ),
    );
  },
});

export const updateWorkflowStatus = mutation({
  args: {
    videoId: v.id("videos"),
    workflowStatus: workflowStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "member");

    await ctx.db.patch(args.videoId, {
      workflowStatus: args.workflowStatus,
    });
  },
});

export const remove = mutation({
  args: { videoId: v.id("videos") },
  returns: v.object({
    replacementVideoId: v.union(v.id("videos"), v.null()),
  }),
  handler: async (ctx, args) => {
    const { video } = await requireVideoAccess(ctx, args.videoId, "admin");
    await scheduleVideoAssetCleanup(ctx, video);
    const replacementVideoId = await deleteVersionAndRenumberStack(ctx, video);
    const result = await deleteVideoDependentsBatch(
      ctx,
      args.videoId,
      VIDEO_DEPENDENT_DELETE_BATCH_DOCS,
    );
    if (!result.done) {
      await ctx.scheduler.runAfter(0, internal.videos.continueVideoDelete, {
        videoId: args.videoId,
      });
    }
    return { replacementVideoId };
  },
});

export const continueVideoDelete = internalMutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const existingVideo = await ctx.db.get(args.videoId);
    if (existingVideo) {
      const legacyResult = await deleteVideoAndDependentsBatch(
        ctx,
        args.videoId,
        VIDEO_DEPENDENT_DELETE_BATCH_DOCS,
      );
      if (!legacyResult.done) {
        await ctx.scheduler.runAfter(0, internal.videos.continueVideoDelete, args);
      }
      return;
    }

    const result = await deleteVideoDependentsBatch(
      ctx,
      args.videoId,
      VIDEO_DEPENDENT_DELETE_BATCH_DOCS,
    );
    if (!result.done) {
      await ctx.scheduler.runAfter(0, internal.videos.continueVideoDelete, args);
    }
  },
});

export const setUploadInfo = internalMutation({
  args: {
    videoId: v.id("videos"),
    s3Key: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
    s3MultipartUploadId: v.optional(v.string()),
    s3MultipartPartSizeBytes: v.optional(v.number()),
    s3MultipartPartCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      s3Key: args.s3Key,
      s3MultipartUploadId: args.s3MultipartUploadId,
      s3MultipartPartSizeBytes: args.s3MultipartPartSizeBytes,
      s3MultipartPartCount: args.s3MultipartPartCount,
      muxUploadId: undefined,
      muxAssetId: undefined,
      muxPlaybackId: undefined,
      muxAssetStatus: "preparing",
      thumbnailUrl: undefined,
      duration: undefined,
      uploadError: undefined,
      fileSize: args.fileSize,
      contentType: args.contentType,
      status: "uploading",
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const assertVideoUploadAllowed = internalQuery({
  args: {
    videoId: v.id("videos"),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    const project = await ctx.db.get(video.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    assertVideoFileSizeAllowed(args.fileSize);

    const currentBytes =
      video.status !== "failed" &&
      typeof video.fileSize === "number" &&
      Number.isFinite(video.fileSize)
        ? Math.max(0, video.fileSize)
        : 0;
    const requestedBytes = Number.isFinite(args.fileSize) ? Math.max(0, args.fileSize) : 0;
    const incrementalBytes = Math.max(0, requestedBytes - currentBytes);

    if (incrementalBytes > 0) {
      await assertTeamCanStoreBytes(ctx, project.teamId, incrementalBytes);
    } else {
      await assertTeamHasActiveSubscription(ctx, project.teamId);
    }

    return null;
  },
});

export const reconcileUploadedObjectMetadata = internalMutation({
  args: {
    videoId: v.id("videos"),
    fileSize: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    const project = await ctx.db.get(video.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const declaredSize =
      video.status !== "failed" &&
      typeof video.fileSize === "number" &&
      Number.isFinite(video.fileSize)
        ? Math.max(0, video.fileSize)
        : 0;
    const actualSize = Number.isFinite(args.fileSize) ? Math.max(0, args.fileSize) : 0;
    const sizeDelta = actualSize - declaredSize;

    if (sizeDelta > 0) {
      await assertTeamCanStoreBytes(ctx, project.teamId, sizeDelta);
    } else {
      await assertTeamHasActiveSubscription(ctx, project.teamId);
    }

    await ctx.db.patch(args.videoId, {
      fileSize: actualSize,
      contentType: args.contentType,
    });
  },
});

export const markAsProcessing = internalMutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      status: "processing",
      muxAssetStatus: "preparing",
      uploadError: undefined,
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
      muxLastPolledAt: Date.now(),
    });
  },
});

export const markAsReady = internalMutation({
  args: {
    videoId: v.id("videos"),
    muxAssetId: v.string(),
    muxPlaybackId: v.string(),
    duration: v.optional(v.number()),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video || video.status !== "processing" || video.muxAssetId !== args.muxAssetId) {
      return false;
    }

    await ctx.db.patch(args.videoId, {
      muxAssetId: args.muxAssetId,
      muxPlaybackId: args.muxPlaybackId,
      muxAssetStatus: "ready",
      duration: args.duration,
      thumbnailUrl: args.thumbnailUrl,
      uploadError: undefined,
      status: "ready",
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
    });
    return true;
  },
});

export const markMuxAssetAsFailed = internalMutation({
  args: {
    videoId: v.id("videos"),
    muxAssetId: v.string(),
    uploadError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video || video.status !== "processing" || video.muxAssetId !== args.muxAssetId) {
      return false;
    }

    await ctx.db.patch(args.videoId, {
      muxAssetStatus: "errored",
      uploadError: args.uploadError,
      status: "failed",
      uploadUpdatedAt: Date.now(),
    });
    return true;
  },
});

export const markAsFailed = internalMutation({
  args: {
    videoId: v.id("videos"),
    uploadError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      muxAssetStatus: "errored",
      uploadError: args.uploadError,
      status: "failed",
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const finalizeAbandonedUpload = internalMutation({
  args: {
    videoId: v.id("videos"),
    uploadError: v.string(),
  },
  returns: v.object({
    removedVersion: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) {
      return { removedVersion: true };
    }

    return {
      removedVersion: await failOrRollbackUpload(ctx, video, args.uploadError),
    };
  },
});

export const clearMultipartUploadId = internalMutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const touchUploadActivity = internalMutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video || video.status !== "uploading") {
      return;
    }

    await ctx.db.patch(args.videoId, {
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const listStaleUploadCandidates = internalQuery({
  args: {
    cutoff: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // New writes always populate uploadUpdatedAt, but retain an explicit
    // compatibility path for uploads created before that field existed.
    const legacyCandidates = await ctx.db
      .query("videos")
      .withIndex("by_status_and_upload_updated_at", (q) =>
        q
          .eq("status", "uploading")
          .eq("uploadUpdatedAt", undefined)
          .lt("_creationTime", args.cutoff),
      )
      .take(args.limit);

    const remaining = args.limit - legacyCandidates.length;
    const datedCandidates =
      remaining > 0
        ? await ctx.db
            .query("videos")
            .withIndex("by_status_and_upload_updated_at", (q) =>
              q
                .eq("status", "uploading")
                .gte("uploadUpdatedAt", 0)
                .lt("uploadUpdatedAt", args.cutoff),
            )
            .take(remaining)
        : [];

    const candidates = [...legacyCandidates, ...datedCandidates];

    return candidates.map((video) => ({ videoId: video._id }));
  },
});

export const claimStaleUpload = internalMutation({
  args: {
    videoId: v.id("videos"),
    cutoff: v.number(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (
      !video ||
      video.status !== "uploading" ||
      (video.uploadUpdatedAt ?? video._creationTime) >= args.cutoff
    ) {
      return null;
    }

    const storage =
      video.s3Key && video.s3MultipartUploadId
        ? {
            kind: "multipart" as const,
            key: video.s3Key,
            uploadId: video.s3MultipartUploadId,
          }
        : video.s3Key
          ? {
              kind: "object" as const,
              key: video.s3Key,
            }
          : {
              kind: "none" as const,
            };
    const removedVersion = await failOrRollbackUpload(
      ctx,
      video,
      "Upload expired after a period of inactivity.",
    );

    return {
      storage,
      removedVersion,
    };
  },
});

export const clearUploadStorageInfo = internalMutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      s3Key: undefined,
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      fileSize: undefined,
      contentType: undefined,
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const setMuxAssetReference = internalMutation({
  args: {
    videoId: v.id("videos"),
    muxAssetId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      muxAssetId: args.muxAssetId,
      muxAssetStatus: "preparing",
      status: "processing",
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
      muxLastPolledAt: Date.now(),
    });
  },
});

export const setMuxPlaybackId = internalMutation({
  args: {
    videoId: v.id("videos"),
    muxPlaybackId: v.string(),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      muxPlaybackId: args.muxPlaybackId,
      thumbnailUrl: args.thumbnailUrl,
    });
  },
});

export const getVideoByMuxUploadId = internalQuery({
  args: {
    muxUploadId: v.string(),
  },
  returns: v.union(
    v.object({
      videoId: v.id("videos"),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<{ videoId: Id<"videos"> } | null> => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_mux_upload_id", (q) => q.eq("muxUploadId", args.muxUploadId))
      .unique();

    if (!video) return null;
    return { videoId: video._id };
  },
});

export const getVideoByMuxAssetId = internalQuery({
  args: {
    muxAssetId: v.string(),
  },
  returns: v.union(
    v.object({
      videoId: v.id("videos"),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<{ videoId: Id<"videos"> } | null> => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_mux_asset_id", (q) => q.eq("muxAssetId", args.muxAssetId))
      .unique();

    if (!video) return null;
    return { videoId: video._id };
  },
});

export const getMuxProcessingState = internalQuery({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video || video.status !== "processing" || !video.muxAssetId) {
      return null;
    }

    return {
      muxAssetId: video.muxAssetId,
    };
  },
});

export const claimMuxProcessingCandidates = internalMutation({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Order by muxLastPolledAt so the oldest-polled processing videos are
    // checked first, giving fair round-robin distribution across the queue.
    // Take extra headroom because some processing videos may not have a
    // muxAssetId yet (the brief window between markAsProcessing and
    // setMuxAssetReference); those are skipped by the guard below.
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_status_and_mux_last_polled_at", (q) => q.eq("status", "processing"))
      .take(args.limit * 3);

    const claimedAt = Date.now();
    const candidates: { videoId: Id<"videos">; muxAssetId: string }[] = [];
    for (const video of videos) {
      if (!video.muxAssetId) {
        // Rotate interrupted processing rows to the back of the queue. Without
        // this write, enough asset-less rows can permanently hide valid work
        // beyond the bounded scan window.
        await ctx.db.patch(video._id, { muxLastPolledAt: claimedAt });
        continue;
      }
      await ctx.db.patch(video._id, { muxLastPolledAt: claimedAt });
      candidates.push({
        videoId: video._id,
        muxAssetId: video.muxAssetId,
      });
      if (candidates.length === args.limit) break;
    }
    return candidates;
  },
});

export const claimCronLock = internalMutation({
  args: {
    name: v.string(),
    owner: v.string(),
    ttlMs: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cronLocks")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    const now = Date.now();
    if (existing && existing.expiresAt > now) {
      return false;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        owner: args.owner,
        expiresAt: now + args.ttlMs,
      });
    } else {
      await ctx.db.insert("cronLocks", {
        name: args.name,
        owner: args.owner,
        expiresAt: now + args.ttlMs,
      });
    }
    return true;
  },
});

export const releaseCronLock = internalMutation({
  args: {
    name: v.string(),
    owner: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cronLocks")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    if (existing?.owner === args.owner) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getVideoForPlayback = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const { video } = await requireVideoAccess(ctx, args.videoId, "viewer");
    return video;
  },
});

export const incrementViewCount = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (shareLink) {
      await ctx.db.patch(shareLink._id, {
        viewCount: shareLink.viewCount + 1,
      });
    }
  },
});

export const updateDuration = mutation({
  args: {
    videoId: v.id("videos"),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    await requireVideoAccess(ctx, args.videoId, "member");
    await ctx.db.patch(args.videoId, { duration: args.duration });
  },
});
