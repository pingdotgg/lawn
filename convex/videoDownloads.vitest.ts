/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { hashPassword } from "./security";
import { beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { createVersionRecord } from "./videos";
import schema from "./schema";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  sign: vi.fn(),
  mux: vi.fn(),
  deleteMux: vi.fn(),
}));
vi.mock("./s3", () => ({ BUCKET_NAME: "test-videos", getS3Client: () => ({ send: mocks.send }) }));
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: mocks.sign }));
vi.mock("./mux", async (original) => ({
  ...(await original<typeof import("./mux")>()),
  createMuxAssetFromInputUrl: mocks.mux,
  deleteMuxAsset: mocks.deleteMux,
}));
vi.mock("./billingHelpers", async (original) => ({
  ...(await original<typeof import("./billingHelpers")>()),
  assertTeamHasActiveSubscription: vi.fn(),
  assertTeamCanStoreBytes: vi.fn(),
}));
const modules = import.meta.glob("./**/*.ts");
beforeEach(() => {
  vi.clearAllMocks();
  mocks.send.mockResolvedValue({ ContentLength: 100, ContentType: "video/mp4" });
  mocks.sign.mockImplementation(
    async (_client, command) => `https://storage.test/${command.input.Key}`,
  );
  mocks.mux.mockResolvedValue({ id: "mux-asset" });
  mocks.deleteMux.mockResolvedValue(undefined);
});

async function seed() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  const ids = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Test",
      slug: "test",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "admin",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "viewer",
      userEmail: "viewer@example.com",
      userName: "Viewer",
      role: "viewer",
    });
    const projectId = await ctx.db.insert("projects", { teamId, name: "Test" });
    const videoId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "First cut",
      publicId: "first",
      visibility: "public",
      status: "uploading",
      workflowStatus: "review",
      s3Key: "first.mp4",
      fileSize: 100,
      contentType: "video/mp4",
    });
    const linkId = await ctx.db.insert("shareLinks", {
      videoId,
      token: "link",
      createdByClerkId: "owner",
      createdByName: "Owner",
      allowDownload: true,
      viewCount: 0,
      passwordHash: "protected-link-requires-a-grant",
    });
    const grantId = await ctx.db.insert("shareAccessGrants", {
      shareLinkId: linkId,
      token: "grant",
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    });
    return { videoId, projectId, teamId, linkId, grantId };
  });
  const owner = t.withIdentity({ subject: "owner" });
  const downloads = () => [
    owner.action(api.videoActions.getDownloadUrl, { videoId: ids.videoId }),
    t.action(api.videoActions.getPublicDownloadUrl, { publicId: "first" }),
    t.action(api.videoActions.getSharedDownloadUrl, { grantToken: "grant" }),
  ];
  return { t, owner, ...ids, downloads };
}

test("all paths reject incomplete uploads and allow originals after validated completion, before Mux is ready", async () => {
  const { t, owner, videoId, downloads } = await seed();
  const incomplete = await Promise.allSettled(downloads());
  expect(incomplete.every((result) => result.status === "rejected")).toBe(true);
  expect(mocks.sign).not.toHaveBeenCalled();
  await owner.action(api.videoActions.markUploadComplete, { videoId });
  const video = await t.run((ctx) => ctx.db.get(videoId));
  expect(video).toMatchObject({
    status: "processing",
    muxAssetId: "mux-asset",
    uploadCompletedAt: expect.any(Number),
  });
  for (const download of await Promise.all(downloads()))
    expect(download.url).toContain("first.mp4");
  expect(await t.query(api.videos.getByPublicId, { publicId: "first" })).toMatchObject({
    processing: true,
    canDownload: true,
  });
});

test("a Mux ingest failure keeps a validated original downloadable", async () => {
  const { owner, videoId, downloads } = await seed();
  mocks.mux.mockRejectedValueOnce(new Error("Mux unavailable"));
  await expect(owner.action(api.videoActions.markUploadComplete, { videoId })).rejects.toThrow(
    "Retry processing",
  );
  for (const download of await Promise.all(downloads()))
    expect(download.url).toContain("first.mp4");
});

test("a Mux response without an asset id fails the row instead of leaving it processing", async () => {
  const { owner, t, videoId, downloads } = await seed();
  mocks.mux.mockResolvedValueOnce({});
  await expect(owner.action(api.videoActions.markUploadComplete, { videoId })).rejects.toThrow(
    "Retry processing",
  );
  const video = await t.run((ctx) => ctx.db.get(videoId));
  expect(video?.status).toBe("failed");
  expect(video?.muxAssetId).toBeUndefined();
  for (const download of await Promise.all(downloads()))
    expect(download.url).toContain("first.mp4");
});

test.each([
  { ContentLength: 0, ContentType: "video/mp4" },
  { ContentLength: 50, ContentType: "video/mp4" },
  { ContentLength: 100, ContentType: "text/plain" },
])("completion rejects invalid stored objects: %j", async (head) => {
  const { owner, t, videoId, downloads } = await seed();
  mocks.send.mockResolvedValue(head);
  await expect(owner.action(api.videoActions.markUploadComplete, { videoId })).rejects.toThrow();
  expect((await t.run((ctx) => ctx.db.get(videoId)))?.uploadCompletedAt).toBeUndefined();
  expect(
    (await Promise.allSettled(downloads())).every((result) => result.status === "rejected"),
  ).toBe(true);
  expect(mocks.sign).not.toHaveBeenCalled();
});

test("abandonment and replacement revoke completion; stale validation cannot restore it", async () => {
  const { t, owner, videoId, downloads } = await seed();
  await owner.action(api.videoActions.markUploadComplete, { videoId });
  await t.mutation(internal.videos.finalizeAbandonedUpload, { videoId, uploadError: "cancelled" });
  expect(
    (await Promise.allSettled(downloads())).every((result) => result.status === "rejected"),
  ).toBe(true);
  await t.mutation(internal.videos.setUploadInfo, {
    videoId,
    s3Key: "replacement.mp4",
    fileSize: 100,
    contentType: "video/mp4",
  });
  await expect(
    t.mutation(internal.videos.reconcileUploadedObjectMetadata, {
      videoId,
      s3Key: "first.mp4",
      fileSize: 100,
      contentType: "video/mp4",
    }),
  ).rejects.toThrow("cancelled or replaced");
  expect((await t.run((ctx) => ctx.db.get(videoId)))?.uploadCompletedAt).toBeUndefined();
});

test("pending multipart and unvalidated failed uploads never get signed", async () => {
  const { t, owner, videoId } = await seed();
  for (const patch of [
    { status: "failed" as const },
    {
      status: "processing" as const,
      uploadCompletedAt: Date.now(),
      s3MultipartUploadId: "pending-parts",
    },
  ]) {
    await t.run((ctx) => ctx.db.patch(videoId, patch));
    await expect(owner.action(api.videoActions.getDownloadUrl, { videoId })).rejects.toThrow();
  }
  expect(mocks.sign).not.toHaveBeenCalled();
});

test("downloads enforce membership, public visibility, grant expiry and allowDownload", async () => {
  const { t, owner, videoId, linkId, grantId } = await seed();
  await owner.action(api.videoActions.markUploadComplete, { videoId });
  mocks.sign.mockClear();
  await expect(t.action(api.videoActions.getDownloadUrl, { videoId })).rejects.toThrow();
  await expect(
    t.withIdentity({ subject: "stranger" }).action(api.videoActions.getDownloadUrl, { videoId }),
  ).rejects.toThrow("Not a team member");
  await t.run((ctx) => ctx.db.patch(videoId, { visibility: "private" }));
  await expect(
    t.action(api.videoActions.getPublicDownloadUrl, { publicId: "first" }),
  ).rejects.toThrow();
  // A raw password-protected link is not an access grant.
  await expect(
    t.action(api.videoActions.getSharedDownloadUrl, { grantToken: "link" }),
  ).rejects.toThrow();
  await t.run((ctx) => ctx.db.patch(linkId, { allowDownload: false }));
  await expect(
    t.action(api.videoActions.getSharedDownloadUrl, { grantToken: "grant" }),
  ).rejects.toThrow("disabled");
  expect((await t.query(api.videos.getByShareGrant, { grantToken: "grant" }))?.canDownload).toBe(
    false,
  );
  await t.run((ctx) => ctx.db.patch(linkId, { allowDownload: true, expiresAt: Date.now() - 1 }));
  await expect(
    t.action(api.videoActions.getSharedDownloadUrl, { grantToken: "grant" }),
  ).rejects.toThrow();
  await t.run(async (ctx) => {
    await ctx.db.patch(linkId, { expiresAt: undefined });
    await ctx.db.patch(grantId, { expiresAt: Date.now() - 1 });
  });
  await expect(
    t.action(api.videoActions.getSharedDownloadUrl, { grantToken: "grant" }),
  ).rejects.toThrow();
  expect(mocks.sign).not.toHaveBeenCalled();
  // Existing team viewers still have download access to the private original.
  await expect(
    t.withIdentity({ subject: "viewer" }).action(api.videoActions.getDownloadUrl, { videoId }),
  ).resolves.toMatchObject({ filename: "First_cut.mp4" });
});

test("public download follows the displayed ready cut, browsing settings, and visibility; shares stay pinned", async () => {
  const { t, owner, videoId } = await seed();
  await owner.action(api.videoActions.markUploadComplete, { videoId });
  await t.run((ctx) => ctx.db.patch(videoId, { status: "ready", muxPlaybackId: "playback-first" }));
  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: videoId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "second",
      fileSize: 100,
      contentType: "video/mp4",
    }),
  );
  await t.mutation(internal.videos.setUploadInfo, {
    videoId: v2,
    s3Key: "second.mp4",
    fileSize: 100,
    contentType: "video/mp4",
  });
  await owner.action(api.videoActions.markUploadComplete, { videoId: v2 });
  expect((await t.query(api.videos.getByPublicId, { publicId: "second" }))?.video?._id).toBe(
    videoId,
  );
  expect(
    (await t.action(api.videoActions.getPublicDownloadUrl, { publicId: "second" })).url,
  ).toContain("first.mp4");
  expect((await owner.action(api.videoActions.getDownloadUrl, { videoId: v2 })).url).toContain(
    "second.mp4",
  );
  await t.run((ctx) => ctx.db.patch(v2, { status: "ready", muxPlaybackId: "playback-second" }));
  expect(
    (await t.action(api.videoActions.getPublicDownloadUrl, { publicId: "second" })).url,
  ).toContain("second.mp4");
  expect(
    (await t.action(api.videoActions.getPublicDownloadUrl, { publicId: "first" })).url,
  ).toContain("first.mp4");
  await owner.mutation(api.videos.setPublicVersionBrowsing, { videoId, enabled: false });
  expect(
    (await t.action(api.videoActions.getPublicDownloadUrl, { publicId: "first" })).url,
  ).toContain("second.mp4");
  expect(
    (await t.action(api.videoActions.getSharedDownloadUrl, { grantToken: "grant" })).url,
  ).toContain("first.mp4");
  await t.run((ctx) => ctx.db.patch(v2, { visibility: "private" }));
  expect(
    (await t.action(api.videoActions.getPublicDownloadUrl, { publicId: "first" })).url,
  ).toContain("first.mp4");
  await expect(
    t.action(api.videoActions.getPublicDownloadUrl, { publicId: "second" }),
  ).rejects.toThrow();
});

test("legacy ready originals work despite drifted metadata, but missing objects are never signed", async () => {
  const { t, owner, videoId } = await seed();
  await t.run((ctx) => ctx.db.patch(videoId, { status: "ready" }));
  await expect(owner.action(api.videoActions.getDownloadUrl, { videoId })).resolves.toMatchObject({
    filename: "First_cut.mp4",
  });
  // Mux already validated ready originals; stale size or bucket content type
  // must not break downloads that work today.
  mocks.send.mockResolvedValueOnce({ ContentLength: 99, ContentType: "binary/octet-stream" });
  await expect(owner.action(api.videoActions.getDownloadUrl, { videoId })).resolves.toMatchObject({
    filename: "First_cut.mp4",
  });
  mocks.sign.mockClear();
  mocks.send.mockResolvedValueOnce({ ContentLength: 0, ContentType: "video/mp4" });
  await expect(owner.action(api.videoActions.getDownloadUrl, { videoId })).rejects.toThrow(
    "invalid",
  );
  mocks.send.mockRejectedValueOnce(new Error("NotFound"));
  await expect(owner.action(api.videoActions.getDownloadUrl, { videoId })).rejects.toThrow();
  expect(mocks.sign).not.toHaveBeenCalled();
});

test("original-only public links honor browsing and never select an incomplete or private head", async () => {
  const { t, owner, videoId } = await seed();
  await owner.action(api.videoActions.markUploadComplete, { videoId });
  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: videoId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "second",
      fileSize: 100,
      contentType: "video/mp4",
    }),
  );
  expect(
    (await t.action(api.videoActions.getPublicDownloadUrl, { publicId: "second" })).url,
  ).toContain("first.mp4");
  await t.mutation(internal.videos.setUploadInfo, {
    videoId: v2,
    s3Key: "second.mp4",
    fileSize: 100,
    contentType: "video/mp4",
  });
  await owner.action(api.videoActions.markUploadComplete, { videoId: v2 });
  expect(
    (await t.action(api.videoActions.getPublicDownloadUrl, { publicId: "first" })).url,
  ).toContain("first.mp4");
  expect(
    (await t.action(api.videoActions.getPublicDownloadUrl, { publicId: "second" })).url,
  ).toContain("second.mp4");
  await owner.mutation(api.videos.setPublicVersionBrowsing, { videoId, enabled: false });
  expect(
    (await t.action(api.videoActions.getPublicDownloadUrl, { publicId: "first" })).url,
  ).toContain("second.mp4");
  await t.run((ctx) => ctx.db.patch(v2, { visibility: "private" }));
  expect(
    (await t.action(api.videoActions.getPublicDownloadUrl, { publicId: "first" })).url,
  ).toContain("first.mp4");
});

test("late completion cannot mark a replacement upload failed or downloadable", async () => {
  const { t, owner, videoId } = await seed();
  let resolveHead!: (value: { ContentLength: number; ContentType: string }) => void;
  let headStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    headStarted = resolve;
  });
  mocks.send.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveHead = resolve;
        headStarted();
      }),
  );
  const completion = owner.action(api.videoActions.markUploadComplete, { videoId });
  const rejected = expect(completion).rejects.toThrow();
  await started;
  await t.mutation(internal.videos.setUploadInfo, {
    videoId,
    s3Key: "replacement.mp4",
    fileSize: 100,
    contentType: "video/mp4",
  });
  resolveHead({ ContentLength: 100, ContentType: "video/mp4" });
  await rejected;
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
    status: "uploading",
    s3Key: "replacement.mp4",
  });
  await expect(owner.action(api.videoActions.getDownloadUrl, { videoId })).rejects.toThrow();
  expect(mocks.sign).not.toHaveBeenCalled();
});

test("multipart originals stay gated until validated completion and processing handoff", async () => {
  const { t, owner, videoId } = await seed();
  await t.mutation(internal.videos.setUploadInfo, {
    videoId,
    s3Key: "multipart.mp4",
    fileSize: 100,
    contentType: "video/mp4",
    s3MultipartUploadId: "upload-session",
    s3MultipartPartCount: 1,
    s3MultipartPartSizeBytes: 100,
  });
  await expect(
    owner.action(api.videoActions.completeMultipartUpload, { videoId, parts: [] }),
  ).rejects.toThrow("missing");
  expect((await t.run((ctx) => ctx.db.get(videoId)))?.uploadCompletedAt).toBeUndefined();
  await owner.action(api.videoActions.completeMultipartUpload, {
    videoId,
    parts: [{ partNumber: 1, etag: "part-etag" }],
  });
  expect((await t.run((ctx) => ctx.db.get(videoId)))?.uploadCompletedAt).toEqual(
    expect.any(Number),
  );
  await owner.action(api.videoActions.markUploadComplete, { videoId });
  expect((await owner.action(api.videoActions.getDownloadUrl, { videoId })).url).toContain(
    "multipart.mp4",
  );
});

test("a late Mux creation response cannot attach its asset to a replacement upload", async () => {
  const { t, owner, videoId } = await seed();
  let resolveAsset!: (asset: { id: string }) => void;
  let ingestStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    ingestStarted = resolve;
  });
  mocks.mux.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveAsset = resolve;
        ingestStarted();
      }),
  );
  const completion = owner.action(api.videoActions.markUploadComplete, { videoId });
  const rejected = expect(completion).rejects.toThrow();
  await started;
  await t.mutation(internal.videos.setUploadInfo, {
    videoId,
    s3Key: "replacement.mp4",
    fileSize: 100,
    contentType: "video/mp4",
  });
  resolveAsset({ id: "old-asset" });
  await rejected;
  const replacement = await t.run((ctx) => ctx.db.get(videoId));
  expect(replacement).toMatchObject({ status: "uploading", s3Key: "replacement.mp4" });
  expect(replacement?.muxAssetId).toBeUndefined();
  expect(mocks.deleteMux).toHaveBeenCalledExactlyOnceWith("old-asset");
  await expect(owner.action(api.videoActions.getDownloadUrl, { videoId })).rejects.toThrow();
});

test("Mux created webhooks cannot bypass S3 attempt binding; legacy direct uploads still associate", async () => {
  const { t, owner, videoId } = await seed();
  await owner.action(api.videoActions.markUploadComplete, { videoId });
  await expect(
    t.mutation(internal.videos.setMuxAssetReference, {
      videoId,
      muxAssetId: "stale-webhook-asset",
    }),
  ).resolves.toBe(false);
  expect((await t.run((ctx) => ctx.db.get(videoId)))?.muxAssetId).toBe("mux-asset");
  await t.mutation(internal.videos.setUploadInfo, {
    videoId,
    s3Key: "replacement.mp4",
    fileSize: 100,
    contentType: "video/mp4",
  });
  await expect(
    t.mutation(internal.videos.setMuxAssetReference, {
      videoId,
      muxAssetId: "stale-webhook-asset",
    }),
  ).resolves.toBe(false);
  await t.mutation(internal.videos.finalizeAbandonedUpload, { videoId, uploadError: "cancelled" });
  await expect(
    t.mutation(internal.videos.setMuxAssetReference, {
      videoId,
      muxAssetId: "stale-webhook-asset",
    }),
  ).resolves.toBe(false);
  await t.run((ctx) =>
    ctx.db.patch(videoId, { status: "uploading", s3Key: undefined, muxUploadId: "direct-upload" }),
  );
  await expect(
    t.mutation(internal.videos.setMuxAssetReference, {
      videoId,
      muxAssetId: "direct-asset",
    }),
  ).resolves.toBe(true);
  expect((await t.run((ctx) => ctx.db.get(videoId)))?.muxAssetId).toBe("direct-asset");
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("overlapping completion requests claim one ingest and accept a late successful HEAD", async () => {
  const { t, owner, videoId } = await seed();
  const head = deferred<{ ContentLength: number; ContentType: string }>();
  const headStarted = deferred<void>();
  mocks.send.mockImplementationOnce(() => {
    headStarted.resolve();
    return head.promise;
  });
  const late = owner.action(api.videoActions.markUploadComplete, { videoId });
  await headStarted.promise;
  const asset = deferred<{ id: string }>();
  const ingestStarted = deferred<void>();
  mocks.mux.mockImplementationOnce(() => {
    ingestStarted.resolve();
    return asset.promise;
  });
  const winner = owner.action(api.videoActions.markUploadComplete, { videoId });
  await ingestStarted.promise;
  head.resolve({ ContentLength: 100, ContentType: "video/mp4" });
  await expect(late).resolves.toEqual({ success: true });
  expect(mocks.mux).toHaveBeenCalledTimes(1);
  asset.resolve({ id: "winner" });
  await winner;
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
    status: "processing",
    muxAssetId: "winner",
  });
  await expect(owner.action(api.videoActions.markUploadComplete, { videoId })).resolves.toEqual({
    success: true,
  });
  expect(mocks.mux).toHaveBeenCalledTimes(1);
});

test.each(["network", "empty", "type"])(
  "a losing HEAD %s failure cannot fail or delete the winner's original",
  async (failure) => {
    const { t, owner, videoId } = await seed();
    const head = deferred<{ ContentLength: number; ContentType: string }>();
    const started = deferred<void>();
    mocks.send.mockImplementationOnce(() => {
      started.resolve();
      return head.promise;
    });
    const late = owner.action(api.videoActions.markUploadComplete, { videoId });
    const rejected = expect(late).rejects.toThrow();
    await started.promise;
    await owner.action(api.videoActions.markUploadComplete, { videoId });
    if (failure === "network") head.reject(new Error("HEAD unavailable"));
    else
      head.resolve({
        ContentLength: failure === "empty" ? 0 : 100,
        ContentType: failure === "type" ? "text/plain" : "video/mp4",
      });
    await rejected;
    expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
      status: "processing",
      muxAssetId: "mux-asset",
      s3Key: "first.mp4",
    });
    expect(
      mocks.send.mock.calls.every(([command]) => command.constructor.name === "HeadObjectCommand"),
    ).toBe(true);
    expect(mocks.deleteMux).not.toHaveBeenCalled();
  },
);

test("an old ingest claim cannot attach to or fail a retry of the same object", async () => {
  const { t, owner, videoId } = await seed();
  const old = await t.mutation(internal.videos.reconcileUploadedObjectMetadata, {
    videoId,
    s3Key: "first.mp4",
    fileSize: 100,
    contentType: "video/mp4",
    startProcessing: true,
  });
  if (old === false) throw new Error("Expected first claim");
  await t.mutation(internal.videos.markAsFailed, { videoId, uploadError: "retry" });
  await owner.action(api.videoActions.markUploadComplete, { videoId });
  expect(
    await t.mutation(internal.videos.setMuxAssetReference, {
      videoId,
      muxAssetId: "stale",
      expectedS3Key: "first.mp4",
      expectedUploadCompletedAt: old,
    }),
  ).toBe(false);
  expect(
    await t.mutation(internal.videos.failUploadCompletion, {
      videoId,
      s3Key: "first.mp4",
      uploadCompletedAt: old,
      discardOriginal: false,
      uploadError: "stale",
    }),
  ).toBe(false);
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
    status: "processing",
    muxAssetId: "mux-asset",
  });
});

test("upload attempts produce distinct object keys even in the same millisecond", async () => {
  const { owner, videoId } = await seed();
  const clock = vi.spyOn(Date, "now").mockReturnValue(1788800000000);
  try {
    const input = { videoId, filename: "same.mp4", fileSize: 100, contentType: "video/mp4" };
    const first = await owner.action(api.videoActions.initiateVideoUpload, input);
    const second = await owner.action(api.videoActions.initiateVideoUpload, input);
    expect(first.key).not.toBe(second.key);
    expect(first.key.endsWith(".mp4")).toBe(true);
    expect(second.key.endsWith(".mp4")).toBe(true);
  } finally {
    clock.mockRestore();
  }
});

test("interrupted ingest claims expire safely and remain retryable without another upload", async () => {
  const { t, owner, videoId } = await seed();
  const claim = await t.mutation(internal.videos.reconcileUploadedObjectMetadata, {
    videoId,
    s3Key: "first.mp4",
    fileSize: 100,
    contentType: "video/mp4",
    startProcessing: true,
  });
  if (claim === false) throw new Error("Expected first claim");
  await t.mutation(internal.videos.claimMuxProcessingCandidates, { limit: 10 });
  expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
    status: "processing",
    uploadCompletedAt: claim,
  });
  const clock = vi.spyOn(Date, "now").mockReturnValue(claim + 16 * 60_000);
  try {
    await t.mutation(internal.videos.claimMuxProcessingCandidates, { limit: 10 });
    expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
      status: "failed",
      s3Key: "first.mp4",
      uploadCompletedAt: claim,
    });
    expect((await owner.action(api.videoActions.getDownloadUrl, { videoId })).url).toContain(
      "first.mp4",
    );
    expect(
      await t.mutation(internal.videos.setMuxAssetReference, {
        videoId,
        muxAssetId: "interrupted",
        expectedS3Key: "first.mp4",
        expectedUploadCompletedAt: claim,
      }),
    ).toBe(false);
    await owner.action(api.videoActions.markUploadComplete, { videoId });
    expect(await t.run((ctx) => ctx.db.get(videoId))).toMatchObject({
      status: "processing",
      muxAssetId: "mux-asset",
    });
    expect(
      await t.mutation(internal.videos.setMuxAssetReference, {
        videoId,
        muxAssetId: "interrupted",
        expectedS3Key: "first.mp4",
        expectedUploadCompletedAt: claim,
      }),
    ).toBe(false);
    expect(mocks.mux).toHaveBeenCalledTimes(1);
  } finally {
    clock.mockRestore();
  }
});

test.each([
  { failed: false, protected: false },
  { failed: false, protected: true },
  { failed: true, protected: false },
  { failed: true, protected: true },
])(
  "share recipients can acquire a real grant and download a validated original: %j",
  async (scenario) => {
    const { t, owner, videoId, linkId } = await seed();
    await t.run((ctx) => ctx.db.patch(linkId, { passwordHash: undefined }));
    expect(await t.query(api.shareLinks.getByToken, { token: "link" })).toEqual({
      status: "missing",
    });
    expect(await t.mutation(api.shareLinks.issueAccessGrant, { token: "link" })).toEqual({
      ok: false,
      grantToken: null,
    });
    await owner.action(api.videoActions.markUploadComplete, { videoId });
    if (scenario.failed)
      await t.mutation(internal.videos.markAsFailed, { videoId, uploadError: "Mux failed" });
    if (scenario.protected) {
      const passwordHash = await hashPassword("correct password");
      await t.run((ctx) => ctx.db.patch(linkId, { passwordHash }));
      expect(
        await t.mutation(api.shareLinks.issueAccessGrant, {
          token: "link",
          password: "wrong password",
        }),
      ).toEqual({ ok: false, grantToken: null });
    }
    expect(await t.query(api.shareLinks.getByToken, { token: "link" })).toEqual({
      status: scenario.protected ? "requiresPassword" : "ok",
    });
    const grant = await t.mutation(api.shareLinks.issueAccessGrant, {
      token: "link",
      ...(scenario.protected ? { password: "correct password" } : {}),
    });
    expect(grant.ok).toBe(true);
    if (!grant.grantToken) throw new Error("Expected recipient grant");
    expect(
      await t.query(api.videos.getByShareGrant, { grantToken: grant.grantToken }),
    ).toMatchObject({
      processing: true,
      processingFailed: scenario.failed,
      canDownload: true,
      video: { _id: videoId },
    });
    expect(
      (await t.action(api.videoActions.getSharedDownloadUrl, { grantToken: grant.grantToken })).url,
    ).toContain("first.mp4");
    await t.run((ctx) => ctx.db.patch(linkId, { expiresAt: Date.now() - 1 }));
    expect(await t.query(api.shareLinks.getByToken, { token: "link" })).toEqual({
      status: "expired",
    });
    expect(
      await t.mutation(api.shareLinks.issueAccessGrant, {
        token: "link",
        password: "correct password",
      }),
    ).toEqual({ ok: false, grantToken: null });
    await expect(
      t.action(api.videoActions.getSharedDownloadUrl, { grantToken: grant.grantToken }),
    ).rejects.toThrow();
  },
);

test("real share admission preserves disabled downloads on a processing video", async () => {
  const { t, owner, videoId, linkId } = await seed();
  await owner.action(api.videoActions.markUploadComplete, { videoId });
  await t.run((ctx) => ctx.db.patch(linkId, { passwordHash: undefined, allowDownload: false }));
  const grant = await t.mutation(api.shareLinks.issueAccessGrant, { token: "link" });
  if (!grant.grantToken) throw new Error("Expected recipient grant");
  expect(await t.query(api.videos.getByShareGrant, { grantToken: grant.grantToken })).toMatchObject(
    { canDownload: false },
  );
  await expect(
    t.action(api.videoActions.getSharedDownloadUrl, { grantToken: grant.grantToken }),
  ).rejects.toThrow("disabled");
});
