/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { createVersionRecord } from "./videos";
import { normalizeBucketKey, createMuxPassthrough, parseMuxPassthrough } from "./mediaKeys";
import { isMissingMedia } from "./mediaCleanupActions";
import schema from "./schema";

const external = vi.hoisted(() => ({
  s3: vi.fn(),
  muxDelete: vi.fn(),
  muxCreate: vi.fn(),
  muxGet: vi.fn(),
  muxList: vi.fn(),
  uploadGet: vi.fn(),
  uploadCancel: vi.fn(),
  signature: vi.fn(),
}));
vi.mock("./s3", () => ({ BUCKET_NAME: "videos", getS3Client: () => ({ send: external.s3 }) }));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: async () => "https://storage.invalid/signed",
}));
vi.mock("./mux", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./mux")>()),
  deleteMuxAsset: external.muxDelete,
  createMuxAssetFromInputUrl: external.muxCreate,
  getMuxAsset: external.muxGet,
  verifyMuxWebhookSignature: external.signature,
  getMuxClient: () => ({
    video: {
      assets: { list: external.muxList },
      uploads: { retrieve: external.uploadGet, cancel: external.uploadCancel },
    },
  }),
}));

vi.mock("./billingHelpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./billingHelpers")>()),
  getTeamSubscriptionState: async () => ({ hasActiveSubscription: false }),
  assertTeamHasActiveSubscription: async () => undefined,
  assertTeamCanStoreBytes: async () => undefined,
}));

const modules = import.meta.glob("./**/*.ts");
const DAY = 86_400_000;
beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  external.s3.mockResolvedValue({ ContentLength: 100, ContentType: "video/mp4", Parts: [] });
  external.muxDelete.mockResolvedValue(undefined);
  external.muxList.mockResolvedValue({ data: [] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

type VideoOverrides = Partial<Omit<Doc<"videos">, "_id" | "_creationTime">>;

function insertVideo(ctx: MutationCtx, projectId: Id<"projects">, overrides: VideoOverrides = {}) {
  return ctx.db.insert("videos", {
    projectId,
    uploadedByClerkId: "owner",
    uploaderName: "Owner",
    title: "Video",
    visibility: "public",
    publicId: "public",
    status: "ready",
    workflowStatus: "review",
    s3Key: "original.mp4",
    muxAssetId: "asset-original",
    ...overrides,
  });
}

async function addVersion(
  t: ReturnType<typeof convexTest>,
  sourceVideoId: Id<"videos">,
  overrides: VideoOverrides = {},
) {
  return await t.run(async (ctx) => {
    const { videoId } = await createVersionRecord(ctx, {
      sourceVideoId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: overrides.publicId ?? "v2",
    });
    await ctx.db.patch(videoId, {
      status: "ready",
      s3Key: "v2.mp4",
      muxAssetId: "asset-v2",
      ...overrides,
    });
    return videoId;
  });
}

async function fixture(overrides: VideoOverrides = {}) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Team",
      slug: "team",
      ownerClerkId: "owner",
      plan: "basic",
      billingStatus: "active",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    const projectId = await ctx.db.insert("projects", { teamId, name: "Root" });
    const videoId = await insertVideo(ctx, projectId, overrides);
    return { teamId, projectId, videoId };
  });
  return { t, owner: t.withIdentity({ subject: "owner" }), ...ids };
}
async function jobs(t: ReturnType<typeof convexTest>) {
  return await t.run((ctx) => ctx.db.query("mediaCleanup").collect());
}
async function drain(t: ReturnType<typeof convexTest>) {
  await t.action(internal.mediaCleanupActions.drain, {});
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
}
function deletedObjectKeys() {
  return external.s3.mock.calls.flatMap(([command]) =>
    command.constructor.name === "DeleteObjectCommand" ? [command.input.Key] : [],
  );
}
async function webhook(t: ReturnType<typeof convexTest>, type: string, data: object) {
  return await t.action(internal.muxActions.processWebhook, {
    rawBody: JSON.stringify({ type, data }),
    signature: "mock",
  });
}

test("nested folder deletion snapshots every version and pending upload across dependent batches", async () => {
  const { t, owner, teamId, projectId, videoId } = await fixture();
  const nested = await t.run(async (ctx) => {
    const child = await ctx.db.insert("projects", { teamId, name: "Child", parentId: projectId });
    const leaf = await ctx.db.insert("projects", { teamId, name: "Leaf", parentId: child });
    const pending = await insertVideo(ctx, leaf, {
      publicId: "pending",
      status: "uploading",
      s3Key: "pending.mp4",
      s3MultipartUploadId: "upload-pending",
      muxAssetId: undefined,
    });
    for (let i = 0; i < 510; i++)
      await ctx.db.insert("comments", {
        videoId: pending,
        userClerkId: "owner",
        userName: "Owner",
        text: "Comment",
        timestampSeconds: 0,
        resolved: false,
      });
    return { child, leaf, pending };
  });
  await addVersion(t, videoId);
  await owner.mutation(api.projects.remove, { projectId });
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(await t.run((ctx) => ctx.db.query("videos").collect())).toEqual([]);
  expect(await t.run((ctx) => ctx.db.query("projects").collect())).toEqual([]);
  expect(await t.run((ctx) => ctx.db.query("comments").collect())).toEqual([]);
  expect((await jobs(t)).map((job) => [job.kind, job.key, job.uploadId])).toEqual(
    expect.arrayContaining([
      ["object", "original.mp4", undefined],
      ["mux", "asset-original", undefined],
      ["object", "v2.mp4", undefined],
      ["mux", "asset-v2", undefined],
      ["object", "pending.mp4", undefined],
      ["multipart", "pending.mp4", "upload-pending"],
    ]),
  );
  expect(await t.run((ctx) => ctx.db.query("deletedVideos").collect())).toHaveLength(3);
  expect(external.s3).not.toHaveBeenCalled();
  await drain(t);
  expect(
    external.s3.mock.calls.some(
      ([command]) =>
        command.constructor.name === "AbortMultipartUploadCommand" &&
        command.input.UploadId === "upload-pending",
    ),
  ).toBe(true);
  vi.setSystemTime(Date.now() + 60_000);
  await drain(t);
  expect(deletedObjectKeys()).toContain("pending.mp4");
  await t.mutation(internal.projects.continueSubtreeDelete, { teamId, rootProjectId: projectId });
  expect(await jobs(t)).toHaveLength(6);
  expect(nested.pending).toBeTruthy();
});

test("individual version removal is immediate, renumbers survivors, and stack deletion queues remaining media", async () => {
  const { t, owner, videoId } = await fixture();
  const v2 = await addVersion(t, videoId);
  expect(await owner.mutation(api.videos.remove, { videoId: v2 })).toEqual({
    replacementVideoId: videoId,
  });
  expect(await t.run((ctx) => ctx.db.get(v2))).toBeNull();
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({ versionNumber: 1 });
  expect((await jobs(t)).map((job) => job.key).sort()).toEqual(["asset-v2", "v2.mp4"]);
  await drain(t);
  expect(external.muxDelete).toHaveBeenCalledWith("asset-v2");
  expect(external.muxDelete).not.toHaveBeenCalledWith("asset-original");
  await owner.mutation(api.videos.removeStack, { videoId });
  expect(await t.run((ctx) => ctx.db.get(videoId))).toBeNull();
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(await jobs(t)).toHaveLength(4);
});

test("shared assets and legacy URL aliases survive deletion until their last reference is removed", async () => {
  const { t, owner, videoId, projectId } = await fixture();
  const survivor = await t.run((ctx) =>
    insertVideo(ctx, projectId, {
      publicId: "survivor",
      s3Key: "https://bucket.invalid/videos/original.mp4",
    }),
  );
  await owner.mutation(api.videos.remove, { videoId });
  await drain(t);
  expect(external.s3).not.toHaveBeenCalled();
  expect(external.muxDelete).not.toHaveBeenCalled();
  expect((await jobs(t)).every((job) => job.lastError?.includes("surviving"))).toBe(true);
  await owner.mutation(api.videos.remove, { videoId: survivor });
  vi.setSystemTime(Date.now() + DAY);
  await drain(t);
  expect(deletedObjectKeys()).toEqual(["original.mp4"]);
  expect(external.muxDelete).toHaveBeenCalledExactlyOnceWith("asset-original");
});

test("partial failures retry independently; duplicate execution and missing resources are idempotent", async () => {
  const { t, owner, videoId } = await fixture();
  external.muxDelete.mockRejectedValueOnce(new Error("Mux temporarily unavailable"));
  await owner.mutation(api.videos.remove, { videoId });
  await drain(t);
  let queue = await jobs(t);
  expect(queue.find((job) => job.kind === "mux")).toMatchObject({
    attempts: 1,
    lastError: "Mux temporarily unavailable",
    leased: false,
  });
  expect(deletedObjectKeys()).toEqual(["original.mp4"]);
  await drain(t);
  expect(external.muxDelete).toHaveBeenCalledTimes(1);
  vi.setSystemTime(Date.now() + 30_000);
  external.muxDelete.mockRejectedValueOnce({ status: 404 });
  await drain(t);
  queue = await jobs(t);
  const muxJob = queue.find((job) => job.kind === "mux")!;
  expect(muxJob.nextAttemptAt).toBeUndefined();
  expect(muxJob.lastError).toBeUndefined();
  await t.mutation(internal.mediaCleanup.finish, {
    jobId: muxJob._id,
    attempt: muxJob.attempts,
    error: "duplicate stale failure",
  });
  await t.mutation(internal.mediaCleanup.enqueue, { kind: "mux", key: muxJob.key });
  await drain(t);
  expect(external.muxDelete).toHaveBeenCalledTimes(2);
  expect(deletedObjectKeys()).toEqual(["original.mp4"]);
  expect(isMissingMedia({ name: "NoSuchUpload" })).toBe(true);
  expect(isMissingMedia({ $metadata: { httpStatusCode: 404 } })).toBe(true);
  expect(isMissingMedia({ name: "NoSuchBucket", $metadata: { httpStatusCode: 404 } })).toBe(false);
  expect(isMissingMedia({ status: 403 })).toBe(false);
});

test("a crashed cleanup action is reclaimed after its lease and stale acknowledgments cannot finish a new attempt", async () => {
  const { t, owner, videoId } = await fixture();
  await owner.mutation(api.videos.remove, { videoId });
  const first = await t.mutation(internal.mediaCleanup.claimBatch, {});
  expect(first).toHaveLength(2);
  expect(await t.mutation(internal.mediaCleanup.claimBatch, {})).toEqual([]);
  vi.setSystemTime(Date.now() + 15 * 60_000);
  const retried = await t.mutation(internal.mediaCleanup.claimBatch, {});
  expect(retried.every((job) => job.attempts === 2)).toBe(true);
  await t.mutation(internal.mediaCleanup.finish, { jobId: first[0]._id, attempt: 1 });
  expect(await t.run((ctx) => ctx.db.get(first[0]._id))).toMatchObject({
    leased: true,
    attempts: 2,
  });
});

test("claims and legacy reference indexing are bounded", async () => {
  const { t, owner, videoId } = await fixture();
  await t.run(async (ctx) => {
    const video = (await ctx.db.get(videoId))!;
    for (let i = 0; i < 105; i++)
      await insertVideo(ctx, video.projectId, { publicId: `legacy-${i}` });
  });
  await owner.mutation(api.videos.remove, { videoId });
  for (let i = 0; i < 25; i++)
    await t.mutation(internal.mediaCleanup.enqueue, { kind: "mux", key: `unshared-${i}` });
  expect(await t.mutation(internal.mediaCleanup.claimBatch, {})).toEqual([]);
  expect(external.muxDelete).not.toHaveBeenCalled();
  const batch = await t.mutation(internal.mediaCleanup.claimBatch, {});
  expect(batch.length).toBeLessThanOrEqual(10);
  expect(batch.every((job) => job.key !== "asset-original" && job.key !== "original.mp4")).toBe(
    true,
  );
});

test("late multipart initiation retains the returned upload ID after video deletion", async () => {
  const { t, owner, videoId } = await fixture({
    status: "uploading",
    s3Key: undefined,
    muxAssetId: undefined,
  });
  external.s3.mockImplementation(async (command) => {
    if (command.constructor.name === "CreateMultipartUploadCommand") {
      await owner.mutation(api.videos.remove, { videoId });
      return { UploadId: "late-session" };
    }
    return { Parts: [] };
  });
  await expect(
    owner.action(api.videoActions.initiateVideoUpload, {
      videoId,
      filename: "large.mp4",
      fileSize: 300 * 1024 ** 2,
      contentType: "video/mp4",
    }),
  ).rejects.toThrow("deleted");
  expect(await t.run((ctx) => ctx.db.get(videoId))).toBeNull();
  expect((await jobs(t)).find((job) => job.kind === "multipart")).toMatchObject({
    uploadId: "late-session",
  });
  await drain(t);
  expect(
    external.s3.mock.calls.some(
      ([command]) => command.constructor.name === "AbortMultipartUploadCommand",
    ),
  ).toBe(true);
});

test("multipart completion racing deletion is reclaimed and late object writes are rechecked", async () => {
  const { t, owner, videoId } = await fixture({
    status: "uploading",
    muxAssetId: undefined,
    s3MultipartUploadId: "session",
    s3MultipartPartCount: 1,
  });
  external.s3.mockImplementation(async (command) => {
    if (command.constructor.name === "CompleteMultipartUploadCommand") {
      await owner.mutation(api.videos.remove, { videoId });
      return {};
    }
    if (command.constructor.name === "HeadObjectCommand")
      return { ContentLength: 100, ContentType: "video/mp4" };
    return { Parts: [] };
  });
  await expect(
    owner.action(api.videoActions.completeMultipartUpload, {
      videoId,
      parts: [{ partNumber: 1, etag: "etag" }],
    }),
  ).rejects.toThrow("Video not found");
  expect(await t.run((ctx) => ctx.db.get(videoId))).toBeNull();
  await drain(t);
  vi.setSystemTime(Date.now() + 60_000);
  await drain(t);
  expect(deletedObjectKeys()).toEqual(["original.mp4"]);
  // Simulate an already-authorized PUT finishing after the first delete.
  vi.setSystemTime(Date.now() + DAY);
  await drain(t);
  expect(deletedObjectKeys()).toEqual(["original.mp4", "original.mp4"]);
});

test("late Mux creation and out-of-order callbacks cannot resurrect a deleted video", async () => {
  const { t, owner, videoId } = await fixture({ status: "uploading", muxAssetId: undefined });
  external.muxCreate.mockImplementation(async () => {
    await owner.mutation(api.videos.remove, { videoId });
    return { id: "late-asset" };
  });
  await owner.action(api.videoActions.markUploadComplete, { videoId });
  for (const type of ["video.asset.ready", "video.asset.created", "video.asset.errored"]) {
    expect(
      await webhook(t, type, {
        id: "late-asset",
        passthrough: JSON.stringify({ videoId, s3Key: "original.mp4" }),
      }),
    ).toEqual({ status: 200, message: "OK" });
  }
  expect(await t.run((ctx) => ctx.db.get(videoId))).toBeNull();
  expect((await jobs(t)).filter((job) => job.key === "late-asset")).toHaveLength(1);
  expect(external.muxGet).not.toHaveBeenCalled();
  await drain(t);
  expect(external.muxDelete).toHaveBeenCalledExactlyOnceWith("late-asset");
});

test("Mux inventory recovers a lost create response/webhook using only known deleted owners", async () => {
  const { t, owner, videoId } = await fixture({ status: "processing", muxAssetId: undefined });
  await owner.mutation(api.videos.remove, { videoId });
  external.muxList.mockResolvedValue({
    data: [
      { id: "lost-asset", passthrough: JSON.stringify({ videoId, s3Key: "original.mp4" }) },
      { id: "unowned-asset", passthrough: "another-app" },
    ],
  });
  await t.action(internal.mediaCleanupActions.recoverMux, {});
  await t.action(internal.mediaCleanupActions.recoverMux, {});
  expect(external.muxList).toHaveBeenCalledWith({ page: 1, limit: 100 });
  expect((await jobs(t)).filter((job) => job.kind === "mux").map((job) => job.key)).toEqual([
    "lost-asset",
  ]);
});

test("stale upload results cannot overwrite a replacement upload or adopt retired resources", async () => {
  const { t, videoId } = await fixture({ status: "uploading", muxAssetId: undefined });
  const uploadArgs = { videoId, fileSize: 100, contentType: "video/mp4" };
  expect(
    await t.mutation(internal.videos.setUploadInfo, {
      ...uploadArgs,
      previousS3Key: "original.mp4",
      s3Key: "replacement.mp4",
    }),
  ).toBe(true);
  expect(
    await t.mutation(internal.videos.setUploadInfo, {
      ...uploadArgs,
      previousS3Key: "original.mp4",
      s3Key: "stale.mp4",
      s3MultipartUploadId: "stale-session",
    }),
  ).toBe(false);
  await t.mutation(internal.videos.finalizeAbandonedUpload, {
    videoId,
    s3Key: "original.mp4",
    uploadError: "late cancellation",
  });
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
    s3Key: "replacement.mp4",
    status: "uploading",
  });
  expect(
    await t.mutation(internal.videos.markAsProcessing, { videoId, s3Key: "replacement.mp4" }),
  ).toBe(true);
  expect(
    await t.mutation(internal.videos.markAsProcessing, { videoId, s3Key: "replacement.mp4" }),
  ).toBe(false);
  expect(
    await t.mutation(internal.videos.setMuxAssetReference, {
      videoId,
      s3Key: "original.mp4",
      muxAssetId: "stale-asset",
    }),
  ).toBe(false);
  expect(
    await t.mutation(internal.videos.setMuxAssetReference, {
      videoId,
      s3Key: "replacement.mp4",
      muxAssetId: "new-asset",
    }),
  ).toBe(true);
  await t.mutation(internal.videos.markAsReady, {
    videoId,
    muxAssetId: "new-asset",
    muxPlaybackId: "playback",
  });
  await webhook(t, "video.asset.created", { id: "new-asset", passthrough: videoId });
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
    status: "ready",
    muxAssetId: "new-asset",
  });
  await drain(t);
  expect(external.muxDelete).toHaveBeenCalledWith("stale-asset");
  expect(external.muxDelete).not.toHaveBeenCalledWith("new-asset");
});

test("failed version rollback queues its storage before removing the version", async () => {
  const { t, videoId } = await fixture();
  const failed = await addVersion(t, videoId, {
    publicId: "failed",
    status: "uploading",
    s3Key: "failed.mp4",
    muxAssetId: undefined,
    s3MultipartUploadId: "failed-session",
  });
  await t.mutation(internal.videos.finalizeAbandonedUpload, {
    videoId: failed,
    s3Key: "failed.mp4",
    uploadError: "cancelled",
  });
  expect(await t.run((ctx) => ctx.db.get(failed))).toBeNull();
  expect((await jobs(t)).map((job) => job.kind).sort()).toEqual(["multipart", "object"]);
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
    versionNumber: 1,
    status: "ready",
  });
});

test("orphan multipart recovery advances one page and protects surviving upload IDs", async () => {
  const { t } = await fixture({
    status: "uploading",
    muxAssetId: undefined,
    s3MultipartUploadId: "active-session",
  });
  external.s3.mockResolvedValueOnce({
    Uploads: [
      {
        Key: "original.mp4",
        UploadId: "active-session",
        Initiated: new Date(Date.now() - 8 * DAY),
      },
      { Key: "lost.mp4", UploadId: "lost-session", Initiated: new Date(Date.now() - 8 * DAY) },
    ],
    IsTruncated: true,
    NextKeyMarker: "next",
    NextUploadIdMarker: "next-upload",
  });
  await t.action(internal.videoActions.sweepOrphanedMultipartUploads, {});
  expect(external.s3).toHaveBeenCalledTimes(1);
  expect(await t.query(internal.mediaCleanup.multipartRecoveryCursor, {})).toEqual({
    keyMarker: "next",
    uploadIdMarker: "next-upload",
  });
  await drain(t);
  const aborted = external.s3.mock.calls.flatMap(([command]) =>
    command.constructor.name === "AbortMultipartUploadCommand" ? [command.input.UploadId] : [],
  );
  expect(aborted).toEqual(["lost-session"]);
});

test("permissions still reject unauthorized deletion without recording cleanup work", async () => {
  const { t, projectId, videoId } = await fixture();
  await expect(
    t.withIdentity({ subject: "stranger" }).mutation(api.videos.remove, { videoId }),
  ).rejects.toThrow();
  await expect(
    t.withIdentity({ subject: "stranger" }).mutation(api.projects.remove, { projectId }),
  ).rejects.toThrow();
  expect(await jobs(t)).toEqual([]);
  expect(await t.run((ctx) => ctx.db.get(videoId))).not.toBeNull();
});

test("multipart abort failures keep object cleanup pending until all parts are gone", async () => {
  const { t, owner, videoId } = await fixture({
    status: "uploading",
    muxAssetId: undefined,
    s3MultipartUploadId: "session",
  });
  await owner.mutation(api.videos.remove, { videoId });
  let aborts = 0;
  external.s3.mockImplementation(async (command) => {
    if (command.constructor.name === "AbortMultipartUploadCommand") {
      aborts++;
      if (aborts === 1) throw new Error("storage unavailable");
    }
    if (command.constructor.name === "ListPartsCommand" && aborts === 2)
      return { Parts: [{ PartNumber: 1, ETag: "late-part" }] };
    return { Parts: [] };
  });
  await drain(t);
  expect(deletedObjectKeys()).toEqual([]);
  vi.setSystemTime(Date.now() + 30_000);
  await drain(t);
  expect((await jobs(t)).find((job) => job.kind === "multipart")?.lastError).toContain(
    "parts still present",
  );
  vi.setSystemTime(Date.now() + 60_000);
  await drain(t);
  expect(deletedObjectKeys()).toEqual([]);
  vi.setSystemTime(Date.now() + 60_000);
  await drain(t);
  expect(deletedObjectKeys()).toEqual(["original.mp4"]);
});

test("new references cannot be attached while external cleanup owns a retired resource", async () => {
  const { t, owner, videoId, projectId } = await fixture();
  await owner.mutation(api.videos.remove, { videoId });
  await t.mutation(internal.mediaCleanup.claimBatch, {});
  const replacement = await t.run((ctx) =>
    insertVideo(ctx, projectId, {
      title: "Replacement",
      publicId: "replacement",
      status: "uploading",
      s3Key: undefined,
      muxAssetId: undefined,
    }),
  );
  expect(
    await t.mutation(internal.videos.setUploadInfo, {
      videoId: replacement,
      s3Key: "original.mp4",
      fileSize: 100,
      contentType: "video/mp4",
    }),
  ).toBe(false);
  await t.mutation(internal.videos.markAsProcessing, { videoId: replacement });
  expect(
    await t.mutation(internal.videos.setMuxAssetReference, {
      videoId: replacement,
      muxAssetId: "asset-original",
    }),
  ).toBe(false);
  expect(await t.run((ctx) => ctx.db.get(replacement))).not.toHaveProperty("muxAssetId");
});

test("team deletion uses the same durable snapshots", async () => {
  const { t, owner, teamId, videoId } = await fixture();
  await owner.mutation(api.teams.deleteTeam, { teamId });
  expect(await t.run((ctx) => ctx.db.get(videoId))).toBeNull();
  expect((await jobs(t)).map((job) => job.key).sort()).toEqual(["asset-original", "original.mp4"]);
});

test("a ready webhook before created binds once and a later created event preserves ready state", async () => {
  const { t, videoId } = await fixture({ status: "processing", muxAssetId: undefined });
  const data = {
    id: "asset",
    passthrough: JSON.stringify({ videoId, s3Key: "original.mp4" }),
    duration: 10,
    playback_ids: [{ id: "playback", policy: "public" }],
  };
  await webhook(t, "video.asset.ready", data);
  await webhook(t, "video.asset.created", data);
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
    status: "ready",
    muxAssetId: "asset",
    muxPlaybackId: "playback",
  });
  expect(await jobs(t)).toEqual([]);
});

test("Mux inventory recovers interrupted processing and retires results for cancelled uploads", async () => {
  const { t, videoId } = await fixture({ status: "processing", muxAssetId: undefined });
  await t.mutation(internal.mediaCleanup.recoverMuxAssets, {
    assets: [{ id: "recovered", passthrough: JSON.stringify({ videoId, s3Key: "original.mp4" }) }],
    page: 1,
    nextPage: 1,
  });
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
    muxAssetId: "recovered",
    status: "processing",
  });
  await t.mutation(internal.videos.finalizeAbandonedUpload, {
    videoId,
    s3Key: "original.mp4",
    uploadError: "cancelled",
  });
  await t.mutation(internal.mediaCleanup.recoverMuxAssets, {
    assets: [
      { id: "cancelled-result", passthrough: JSON.stringify({ videoId, s3Key: "original.mp4" }) },
    ],
    page: 1,
    nextPage: 1,
  });
  expect((await jobs(t)).map((job) => job.key)).toContain("cancelled-result");
});

test("legacy Mux uploads are cancelled durably and assets created during cancellation are reclaimed", async () => {
  const { t, owner, videoId } = await fixture({
    status: "uploading",
    muxAssetId: undefined,
    muxUploadId: "direct-upload",
  });
  await owner.mutation(api.videos.remove, { videoId });
  external.uploadGet
    .mockResolvedValueOnce({ status: "waiting" })
    .mockResolvedValue({ status: "asset_created", asset_id: "direct-asset" });
  external.uploadCancel.mockRejectedValueOnce({ status: 409 });
  await drain(t);
  expect((await jobs(t)).find((job) => job.kind === "muxUpload")?.lastError).toBeTruthy();
  vi.setSystemTime(Date.now() + 30_000);
  await drain(t);
  expect(external.muxDelete).toHaveBeenCalledWith("direct-asset");
  expect(
    await webhook(t, "video.asset.created", { id: "direct-asset", upload_id: "direct-upload" }),
  ).toEqual({ status: 200, message: "OK" });
  expect(await t.run((ctx) => ctx.db.get(videoId))).toBeNull();
});

test("an existing direct Mux upload still transitions from uploading to ready", async () => {
  const { t, videoId } = await fixture({
    status: "uploading",
    muxAssetId: undefined,
    muxUploadId: "direct-upload",
  });
  external.muxGet.mockResolvedValue({
    passthrough: videoId,
    duration: 10,
    playback_ids: [{ id: "playback", policy: "public" }],
  });
  await webhook(t, "video.asset.ready", {
    id: "direct-asset",
    upload_id: "direct-upload",
    duration: 10,
    playback_ids: [{ id: "playback", policy: "public" }],
  });
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
    status: "ready",
    muxAssetId: "direct-asset",
  });
  expect(await jobs(t)).toEqual([]);
});

test("legacy object URLs use the configured bucket prefix and preserve encoded object names", () => {
  vi.stubEnv("RAILWAY_PUBLIC_URL", "https://bucket.invalid/storage");
  vi.stubEnv("RAILWAY_BUCKET_NAME", "videos");
  vi.stubEnv("RAILWAY_PUBLIC_URL_INCLUDE_BUCKET", "true");
  expect(normalizeBucketKey("https://bucket.invalid/storage/videos/videos/clip%20one.mp4")).toBe(
    "videos/clip one.mp4",
  );
  vi.stubEnv("RAILWAY_PUBLIC_URL_INCLUDE_BUCKET", "false");
  expect(normalizeBucketKey("https://bucket.invalid/storage/videos/clip%20one.mp4")).toBe(
    "videos/clip one.mp4",
  );
  expect(normalizeBucketKey("videos/clip%20one.mp4")).toBe("videos/clip%20one.mp4");
});

test("fresh cleanup and recurring rechecks each retain capacity in a full batch", async () => {
  const { t } = await fixture();
  await t.run(async (ctx) => {
    for (let i = 0; i < 12; i++)
      await ctx.db.insert("mediaCleanup", {
        kind: "object",
        key: `recheck-${i}`,
        recheck: true,
        nextAttemptAt: Date.now() - DAY,
        attempts: 1,
      });
  });
  for (let i = 0; i < 6; i++)
    await t.mutation(internal.mediaCleanup.enqueue, { kind: "mux", key: `fresh-${i}` });
  const batch = await t.mutation(internal.mediaCleanup.claimBatch, {});
  expect(batch).toHaveLength(10);
  expect(batch.filter((job) => job.recheck)).toHaveLength(5);
  expect(batch.filter((job) => !job.recheck)).toHaveLength(5);
});

test.each(["http://[invalid", "https://bucket.invalid/videos/invalid%ZZ.mp4"])(
  "malformed key %s still permits durable deletion",
  async (s3Key) => {
    const { t, owner, videoId } = await fixture({ s3Key });
    expect(normalizeBucketKey(s3Key)).toBe(s3Key);
    await owner.mutation(api.videos.remove, { videoId });
    expect(await t.run((ctx) => ctx.db.get(videoId))).toBeNull();
    expect((await jobs(t)).some((job) => job.kind === "object" && job.key === s3Key)).toBe(true);
  },
);

test.each([
  "videos/short.mp4",
  `videos/${"long".repeat(200)}.mp4`,
  `https://bucket.invalid/videos/${"encoded%20".repeat(200)}.mp4`,
])("compact Mux metadata preserves upload matching for %s", async (s3Key) => {
  const { t, videoId } = await fixture({ status: "processing", s3Key, muxAssetId: undefined });
  const passthrough = await createMuxPassthrough(videoId, s3Key);
  expect(passthrough.length).toBeLessThanOrEqual(255);
  expect(parseMuxPassthrough(passthrough)).toMatchObject({
    videoId,
    s3KeyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
  });
  await webhook(t, "video.asset.created", {
    id: "stale",
    passthrough: await createMuxPassthrough(videoId, `${s3Key}-old`),
  });
  expect((await jobs(t)).map((job) => job.key)).toContain("stale");
  await webhook(t, "video.asset.ready", {
    id: "matching",
    passthrough,
    duration: 10,
    playback_ids: [{ id: "playback", policy: "public" }],
  });
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
    status: "ready",
    muxAssetId: "matching",
  });
  expect(external.muxGet).not.toHaveBeenCalled();
});
