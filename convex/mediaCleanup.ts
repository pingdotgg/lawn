import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { normalizeBucketKey, parseMuxPassthrough } from "./mediaKeys";

const DAY = 24 * 60 * 60 * 1000;
const LEASE_MS = 15 * 60 * 1000; // Longer than Convex's maximum action runtime.
const resourceArgs = {
  kind: v.union(
    v.literal("object"),
    v.literal("multipart"),
    v.literal("mux"),
    v.literal("muxUpload"),
  ),
  key: v.string(),
  uploadId: v.optional(v.string()),
};
const clearedMultipartFields = {
  s3MultipartUploadId: undefined,
  s3MultipartPartSizeBytes: undefined,
  s3MultipartPartCount: undefined,
};

// Queue the session before returning the fields to clear in the caller's patch.
export async function releaseMultipart(ctx: MutationCtx, video: Doc<"videos">) {
  if (video.s3Key && video.s3MultipartUploadId)
    await enqueueCleanup(ctx, {
      kind: "multipart",
      key: normalizeBucketKey(video.s3Key),
      uploadId: video.s3MultipartUploadId,
    });
  return clearedMultipartFields;
}

type Resource = Pick<Doc<"mediaCleanup">, "kind" | "key" | "uploadId">;

export async function findCleanup(ctx: Pick<MutationCtx, "db">, resource: Resource) {
  return await ctx.db
    .query("mediaCleanup")
    .withIndex("by_kind_and_key_and_upload_id", (q) =>
      q.eq("kind", resource.kind).eq("key", resource.key).eq("uploadId", resource.uploadId),
    )
    .unique();
}

export async function enqueueCleanup(ctx: MutationCtx, resource: Resource) {
  // Do not reset an active lease or backoff when a webhook is redelivered.
  if (await findCleanup(ctx, resource)) return;
  await ctx.db.insert("mediaCleanup", { ...resource, nextAttemptAt: Date.now(), attempts: 0 });
}

export async function enqueueUploadStorage(ctx: MutationCtx, video: Doc<"videos">) {
  if (video.s3Key)
    await enqueueCleanup(ctx, { kind: "object", key: normalizeBucketKey(video.s3Key) });
  await releaseMultipart(ctx, video);
}

export async function clearUploadStorage(ctx: MutationCtx, video: Doc<"videos">) {
  await enqueueUploadStorage(ctx, video);
  return {
    ...clearedMultipartFields,
    s3Key: undefined,
    s3ObjectKey: undefined,
    fileSize: undefined,
    contentType: undefined,
    uploadUpdatedAt: Date.now(),
  };
}

export async function enqueueVideoMedia(ctx: MutationCtx, video: Doc<"videos">) {
  await enqueueUploadStorage(ctx, video);
  if (video.muxAssetId) await enqueueCleanup(ctx, { kind: "mux", key: video.muxAssetId });
  if (video.muxUploadId) await enqueueCleanup(ctx, { kind: "muxUpload", key: video.muxUploadId });
}

export async function recordVideoDeletion(ctx: MutationCtx, video: Doc<"videos">) {
  if (
    !(await ctx.db
      .query("deletedVideos")
      .withIndex("by_video_id", (q) => q.eq("videoId", video._id))
      .unique())
  ) {
    await ctx.db.insert("deletedVideos", { videoId: video._id, muxUploadId: video.muxUploadId });
  }
  await enqueueVideoMedia(ctx, video);
}

export const enqueue = internalMutation({
  args: resourceArgs,
  handler: enqueueCleanup,
});

// A small idempotent backfill drains the missing-field index. New storage writes
// always maintain the canonical key. No external cleanup runs until it is empty,
// so a surviving legacy URL alias cannot be mistaken for an unreferenced object.
export const claimBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const legacy = await ctx.db
      .query("videos")
      .withIndex("by_media_references_indexed", (q) => q.eq("mediaReferencesIndexed", undefined))
      .take(100);
    for (const video of legacy) {
      await ctx.db.patch(video._id, {
        mediaReferencesIndexed: true,
        s3ObjectKey: video.s3Key ? normalizeBucketKey(video.s3Key) : undefined,
      });
    }
    if (legacy.length === 100) {
      await ctx.scheduler.runAfter(0, internal.mediaCleanupActions.drain, {});
      return [];
    }

    const due = await ctx.db
      .query("mediaCleanup")
      .withIndex("by_next_attempt_at", (q) =>
        q.gte("nextAttemptAt", 0).lte("nextAttemptAt", Date.now()),
      )
      .take(10);
    const claimed: Doc<"mediaCleanup">[] = [];
    for (const job of due) {
      const reference =
        job.kind === "object"
          ? await ctx.db
              .query("videos")
              .withIndex("by_s3_object_key", (q) => q.eq("s3ObjectKey", job.key))
              .first()
          : job.kind === "multipart"
            ? await ctx.db
                .query("videos")
                .withIndex("by_s3_multipart_upload_id", (q) =>
                  q.eq("s3MultipartUploadId", job.uploadId),
                )
                .first()
            : job.kind === "mux"
              ? await ctx.db
                  .query("videos")
                  .withIndex("by_mux_asset_id", (q) => q.eq("muxAssetId", job.key))
                  .first()
              : await ctx.db
                  .query("videos")
                  .withIndex("by_mux_upload_id", (q) => q.eq("muxUploadId", job.key))
                  .first();
      if (reference) {
        await ctx.db.patch(job._id, {
          nextAttemptAt: Date.now() + DAY,
          lastError: "Still referenced by a surviving video",
        });
        continue;
      }
      // Abort known multipart writers before deleting their completed object.
      if (job.kind === "object") {
        const pendingUpload = await ctx.db
          .query("mediaCleanup")
          .withIndex("by_kind_and_key_and_next_attempt_at", (q) =>
            q.eq("kind", "multipart").eq("key", job.key).gte("nextAttemptAt", 0),
          )
          .first();
        if (pendingUpload) {
          await ctx.db.patch(job._id, { nextAttemptAt: Date.now() + 60_000 });
          continue;
        }
      }
      const update = {
        leased: true,
        attempts: job.attempts + 1,
        nextAttemptAt: Date.now() + LEASE_MS,
      };
      await ctx.db.patch(job._id, update);
      claimed.push({ ...job, ...update });
    }
    return claimed;
  },
});

export const finish = internalMutation({
  args: { jobId: v.id("mediaCleanup"), attempt: v.number(), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || !job.leased || job.attempts !== args.attempt) return;
    await ctx.db.patch(job._id, {
      leased: false,
      lastError: args.error,
      nextAttemptAt: args.error
        ? Date.now() + Math.min(DAY, 30_000 * 2 ** Math.min(job.attempts - 1, 12))
        : // Presigned PUTs and already-started multipart completions can finish
          // after deletion (even after URL expiry). Keep checking retired keys.
          job.kind === "object"
          ? Date.now() + DAY
          : undefined,
    });
  },
});

export const recoverMuxAssets = internalMutation({
  args: {
    assets: v.array(
      v.object({
        id: v.string(),
        passthrough: v.optional(v.string()),
        uploadId: v.optional(v.string()),
      }),
    ),
    page: v.number(),
    nextPage: v.number(),
  },
  handler: async (ctx, args) => {
    for (const asset of args.assets) {
      const passthrough = parseMuxPassthrough(asset.passthrough);
      const videoId = passthrough.videoId
        ? ctx.db.normalizeId("videos", passthrough.videoId)
        : null;
      const deleted = videoId
        ? await ctx.db
            .query("deletedVideos")
            .withIndex("by_video_id", (q) => q.eq("videoId", videoId))
            .unique()
        : asset.uploadId
          ? await ctx.db
              .query("deletedVideos")
              .withIndex("by_mux_upload_id", (q) => q.eq("muxUploadId", asset.uploadId))
              .first()
          : null;
      if (deleted) await enqueueCleanup(ctx, { kind: "mux", key: asset.id });
      else if (videoId)
        await acceptMuxAsset(ctx, {
          videoId,
          muxAssetId: asset.id,
          s3Key: passthrough.s3Key,
          muxUploadId: asset.uploadId,
        });
    }
    const cursor = await ctx.db
      .query("mediaRecoveryCursors")
      .withIndex("by_name", (q) => q.eq("name", "mux"))
      .unique();
    if (cursor) {
      if (cursor.page === args.page) await ctx.db.patch(cursor._id, { page: args.nextPage });
    } else await ctx.db.insert("mediaRecoveryCursors", { name: "mux", page: args.nextPage });
  },
});

export const muxRecoveryPage = internalQuery({
  args: {},
  handler: async (ctx) =>
    (
      await ctx.db
        .query("mediaRecoveryCursors")
        .withIndex("by_name", (q) => q.eq("name", "mux"))
        .unique()
    )?.page ?? 1,
});

export const multipartRecoveryCursor = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cursor = await ctx.db
      .query("mediaRecoveryCursors")
      .withIndex("by_name", (q) => q.eq("name", "multipart"))
      .unique();
    return { keyMarker: cursor?.keyMarker, uploadIdMarker: cursor?.uploadIdMarker };
  },
});

export const recordMultipartRecovery = internalMutation({
  args: {
    uploads: v.array(v.object({ key: v.string(), uploadId: v.string() })),
    keyMarker: v.optional(v.string()),
    uploadIdMarker: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    for (const upload of args.uploads) await enqueueCleanup(ctx, { kind: "multipart", ...upload });
    const cursor = await ctx.db
      .query("mediaRecoveryCursors")
      .withIndex("by_name", (q) => q.eq("name", "multipart"))
      .unique();
    const update = { keyMarker: args.keyMarker, uploadIdMarker: args.uploadIdMarker };
    if (cursor) await ctx.db.patch(cursor._id, update);
    else await ctx.db.insert("mediaRecoveryCursors", { name: "multipart", page: 1, ...update });
  },
});

export async function acceptMuxAsset(
  ctx: MutationCtx,
  args: { videoId: Id<"videos">; muxAssetId: string; s3Key?: string; muxUploadId?: string },
) {
  const video = await ctx.db.get(args.videoId);
  if (
    !video &&
    !(await ctx.db
      .query("deletedVideos")
      .withIndex("by_video_id", (q) => q.eq("videoId", args.videoId))
      .unique())
  )
    return false;
  if (video?.muxAssetId === args.muxAssetId) return true;
  if (
    !video ||
    (video.status !== "processing" &&
      !(
        video.status === "uploading" &&
        args.muxUploadId &&
        video.muxUploadId === args.muxUploadId
      )) ||
    video.muxAssetId ||
    (args.s3Key !== undefined && video.s3Key !== args.s3Key) ||
    (await findCleanup(ctx, { kind: "mux", key: args.muxAssetId }))
  ) {
    await enqueueCleanup(ctx, { kind: "mux", key: args.muxAssetId });
    return false;
  }
  await ctx.db.patch(args.videoId, {
    muxAssetId: args.muxAssetId,
    muxAssetStatus: "preparing",
    status: "processing",
    ...(await releaseMultipart(ctx, video)),
    uploadUpdatedAt: Date.now(),
    muxLastPolledAt: Date.now(),
  });
  return true;
}
