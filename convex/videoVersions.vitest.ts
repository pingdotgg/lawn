/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { getTeamStorageUsedBytes } from "./billingHelpers";
import { createVersionRecord, MAX_VIDEO_STACK_SIZE } from "./videos";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("materializes v1 and appends after the actual latest version", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "user_1",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "user_1",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "admin",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const videoId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "user_1",
      uploaderName: "Owner",
      title: "First cut",
      description: "Original notes",
      visibility: "public",
      publicId: "public-v1",
      status: "ready",
      workflowStatus: "done",
    });
    return { projectId, videoId };
  });

  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.videoId,
      uploadedByClerkId: "user_1",
      uploaderName: "Owner",
      publicId: "public-v2",
      fileSize: 200,
      contentType: "video/mp4",
    }),
  );
  await t.run(async (ctx) => {
    await ctx.db.patch(v2, {
      title: "Second cut",
      description: "Latest notes",
      visibility: "private",
      workflowStatus: "done",
    });
  });

  const { videoId: v3 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.videoId,
      uploadedByClerkId: "user_1",
      uploaderName: "Owner",
      publicId: "public-v3",
      fileSize: 300,
      contentType: "video/quicktime",
    }),
  );

  const documents = await t.run(async (ctx) => ({
    v1: await ctx.db.get(seeded.videoId),
    v2: await ctx.db.get(v2),
    v3: await ctx.db.get(v3),
  }));

  expect(documents.v1).toMatchObject({
    versionStackId: seeded.videoId,
    versionNumber: 1,
    supersededByVideoId: v2,
  });
  expect(documents.v2).toMatchObject({
    versionStackId: seeded.videoId,
    versionNumber: 2,
    supersededByVideoId: v3,
  });
  expect(documents.v3).toMatchObject({
    versionStackId: seeded.videoId,
    versionNumber: 3,
    title: "Second cut",
    description: "Latest notes",
    visibility: "private",
    workflowStatus: "review",
    projectId: seeded.projectId,
  });

  const visible = await t.withIdentity({ subject: "user_1" }).query(api.videos.list, {
    projectId: seeded.projectId,
  });
  expect(visible.map((video) => [video._id, video.versionNumber])).toEqual([[v3, 3]]);
});

test("selects the stack head independently of version number ordering", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "head-v1",
      status: "ready",
      workflowStatus: "review",
    });
    return { v1 };
  });

  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "head-v2",
    }),
  );
  const { videoId: v3 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "head-v3",
    }),
  );
  await t.run((ctx) => ctx.db.patch(v2, { versionNumber: 99 }));

  const { videoId: v4 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: v2,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "head-v4",
    }),
  );

  const state = await t.run(async (ctx) => ({
    v2: await ctx.db.get(v2),
    v3: await ctx.db.get(v3),
    v4: await ctx.db.get(v4),
  }));
  expect(state.v2?.supersededByVideoId).toBe(v3);
  expect(state.v3?.supersededByVideoId).toBe(v4);
  expect(state.v4?.versionNumber).toBe(4);
});

test("rejects a stack with more than one head", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "multi-head-v1",
      status: "ready",
      workflowStatus: "review",
      versionNumber: 1,
    });
    await ctx.db.patch(v1, { versionStackId: v1 });
    const v2 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "multi-head-v2",
      status: "ready",
      workflowStatus: "review",
      versionStackId: v1,
      versionNumber: 2,
    });
    return { v1, v2 };
  });

  await expect(
    t.run((ctx) =>
      createVersionRecord(ctx, {
        sourceVideoId: seeded.v1,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        publicId: "multi-head-v3",
      }),
    ),
  ).rejects.toThrow("exactly one latest version");
});

test("rejects deletion when the stack is not one connected chain", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "disconnected-v1",
      status: "ready",
      workflowStatus: "review",
      versionNumber: 1,
    });
    await ctx.db.patch(v1, { versionStackId: v1 });
    const v2 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "disconnected-v2",
      status: "ready",
      workflowStatus: "review",
      versionStackId: v1,
      versionNumber: 2,
    });
    const v3 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "disconnected-v3",
      status: "ready",
      workflowStatus: "review",
      versionStackId: v1,
      versionNumber: 3,
    });
    await ctx.db.patch(v1, { supersededByVideoId: v2 });
    await ctx.db.patch(v3, { supersededByVideoId: v3 });
    return { v1 };
  });

  await expect(
    t.withIdentity({ subject: "owner" }).mutation(api.videos.remove, {
      videoId: seeded.v1,
    }),
  ).rejects.toThrow("one connected acyclic chain");
});

test("rejects deletion when stack versions cross projects", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const otherProjectId = await ctx.db.insert("projects", {
      teamId,
      name: "Other",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "cross-project-v1",
      status: "ready",
      workflowStatus: "review",
    });
    return { otherProjectId, v1 };
  });
  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "cross-project-v2",
    }),
  );
  await t.run((ctx) => ctx.db.patch(v2, { projectId: seeded.otherProjectId }));

  await expect(
    t.withIdentity({ subject: "owner" }).mutation(api.videos.remove, {
      videoId: seeded.v1,
    }),
  ).rejects.toThrow("must belong to the same project");
});

test("moves the whole stack and rewires middle and latest deletions", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "user_1",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "user_1",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "admin",
    });
    const sourceProjectId = await ctx.db.insert("projects", {
      teamId,
      name: "Source",
    });
    const destinationProjectId = await ctx.db.insert("projects", {
      teamId,
      name: "Destination",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId: sourceProjectId,
      uploadedByClerkId: "user_1",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "move-v1",
      status: "ready",
      workflowStatus: "review",
    });
    return { sourceProjectId, destinationProjectId, v1 };
  });

  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "user_1",
      uploaderName: "Owner",
      publicId: "move-v2",
    }),
  );
  const { videoId: v3 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "user_1",
      uploaderName: "Owner",
      publicId: "move-v3",
    }),
  );

  const authed = t.withIdentity({ subject: "user_1" });
  await authed.mutation(api.videos.move, {
    videoId: v2,
    projectId: seeded.destinationProjectId,
  });

  const movedProjects = await t.run(async (ctx) =>
    Promise.all([seeded.v1, v2, v3].map(async (videoId) => (await ctx.db.get(videoId))?.projectId)),
  );
  expect(movedProjects).toEqual([
    seeded.destinationProjectId,
    seeded.destinationProjectId,
    seeded.destinationProjectId,
  ]);

  await authed.mutation(api.videos.remove, { videoId: v2 });
  const afterMiddleDelete = await t.run(async (ctx) => ({
    v1: await ctx.db.get(seeded.v1),
    v2: await ctx.db.get(v2),
    v3: await ctx.db.get(v3),
  }));
  expect(afterMiddleDelete.v2).toBeNull();
  expect(afterMiddleDelete.v1).toMatchObject({
    versionNumber: 1,
    supersededByVideoId: v3,
  });
  expect(afterMiddleDelete.v3).toMatchObject({
    versionNumber: 2,
  });
  expect(afterMiddleDelete.v3?.supersededByVideoId).toBeUndefined();

  const latestDelete = await authed.mutation(api.videos.remove, { videoId: v3 });
  expect(latestDelete.replacementVideoId).toBe(seeded.v1);

  const promoted = await t.run((ctx) => ctx.db.get(seeded.v1));
  expect(promoted).toMatchObject({
    versionStackId: seeded.v1,
    versionNumber: 1,
  });
  expect(promoted?.supersededByVideoId).toBeUndefined();

  const visible = await authed.query(api.videos.list, {
    projectId: seeded.destinationProjectId,
  });
  expect(visible.map((video) => [video._id, video.versionNumber])).toEqual([[seeded.v1, 1]]);
});

test("refuses to move a stack whose versions do not share the source project", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    const sourceProjectId = await ctx.db.insert("projects", {
      teamId,
      name: "Source",
    });
    const mismatchedProjectId = await ctx.db.insert("projects", {
      teamId,
      name: "Mismatched",
    });
    const destinationProjectId = await ctx.db.insert("projects", {
      teamId,
      name: "Destination",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId: sourceProjectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "mismatch-v1",
      status: "ready",
      workflowStatus: "review",
    });
    return { sourceProjectId, mismatchedProjectId, destinationProjectId, v1 };
  });
  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "mismatch-v2",
    }),
  );
  await t.run((ctx) => ctx.db.patch(seeded.v1, { projectId: seeded.mismatchedProjectId }));

  await expect(
    t.withIdentity({ subject: "owner" }).mutation(api.videos.move, {
      videoId: v2,
      projectId: seeded.destinationProjectId,
    }),
  ).rejects.toThrow("must belong to the same project");
});

test("deleting v1 preserves stable identities and supports creating the next version", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "user_1",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "user_1",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "admin",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "user_1",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "first-v1",
      status: "ready",
      workflowStatus: "review",
    });
    return { projectId, v1 };
  });

  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "user_1",
      uploaderName: "Owner",
      publicId: "first-v2",
    }),
  );
  const { videoId: v3 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: v2,
      uploadedByClerkId: "user_1",
      uploaderName: "Owner",
      publicId: "first-v3",
    }),
  );
  const survivorShareLinkId = await t.run((ctx) =>
    ctx.db.insert("shareLinks", {
      videoId: v2,
      token: "survivor-share-link",
      createdByClerkId: "user_1",
      createdByName: "Owner",
      allowDownload: true,
      viewCount: 0,
    }),
  );

  const authed = t.withIdentity({ subject: "user_1" });
  const result = await authed.mutation(api.videos.remove, { videoId: seeded.v1 });
  expect(result.replacementVideoId).toBe(v2);

  const versions = await authed.query(api.videos.listVersions, { videoId: v2 });
  expect(versions.map((version) => [version._id, version.versionNumber])).toEqual([
    [v3, 2],
    [v2, 1],
  ]);

  const preserved = await t.run(async (ctx) => ({
    v2: await ctx.db.get(v2),
    v3: await ctx.db.get(v3),
    survivorShareLink: await ctx.db.get(survivorShareLinkId),
  }));
  expect(preserved.v2).toMatchObject({
    publicId: "first-v2",
    versionStackId: seeded.v1,
    versionNumber: 1,
    supersededByVideoId: v3,
  });
  expect(preserved.v3).toMatchObject({
    publicId: "first-v3",
    versionStackId: seeded.v1,
    versionNumber: 2,
  });
  expect(preserved.survivorShareLink).toMatchObject({
    videoId: v2,
    token: "survivor-share-link",
  });

  const {
    videoId: v4,
    versionStackId,
    versionNumber,
  } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: v2,
      uploadedByClerkId: "user_1",
      uploaderName: "Owner",
      publicId: "first-v4",
    }),
  );
  expect({ versionStackId, versionNumber }).toEqual({
    versionStackId: seeded.v1,
    versionNumber: 3,
  });
  const appended = await t.run((ctx) => ctx.db.get(v4));
  expect(appended).toMatchObject({
    publicId: "first-v4",
    versionStackId: seeded.v1,
    versionNumber: 3,
  });

  const visible = await authed.query(api.videos.list, { projectId: seeded.projectId });
  expect(visible.map((video) => video._id)).toEqual([v4]);
});

test("deletes dependents in resumable batches after removing the version row", async () => {
  vi.useFakeTimers();
  try {
    const t = convexTest(schema, modules);
    const seeded = await t.run(async (ctx) => {
      const teamId = await ctx.db.insert("teams", {
        name: "Garden",
        slug: "garden",
        ownerClerkId: "owner",
        plan: "basic",
      });
      await ctx.db.insert("teamMembers", {
        teamId,
        userClerkId: "owner",
        userEmail: "owner@example.com",
        userName: "Owner",
        role: "owner",
      });
      const projectId = await ctx.db.insert("projects", {
        teamId,
        name: "Campaign",
      });
      const v1 = await ctx.db.insert("videos", {
        projectId,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        title: "Cut",
        visibility: "public",
        publicId: "batch-v1",
        status: "ready",
        workflowStatus: "review",
      });
      return { projectId, v1 };
    });
    const { videoId: v2 } = await t.run((ctx) =>
      createVersionRecord(ctx, {
        sourceVideoId: seeded.v1,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        publicId: "batch-v2",
      }),
    );
    const { videoId: v3 } = await t.run((ctx) =>
      createVersionRecord(ctx, {
        sourceVideoId: v2,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        publicId: "batch-v3",
      }),
    );
    const dependents = await t.run(async (ctx) => {
      for (let index = 0; index < 26; index += 1) {
        await ctx.db.insert("comments", {
          videoId: v2,
          userClerkId: "owner",
          userName: "Owner",
          text: `Comment ${index}`,
          timestampSeconds: index,
          resolved: false,
        });
      }
      const shareLinkId = await ctx.db.insert("shareLinks", {
        videoId: v2,
        token: "batch-link",
        createdByClerkId: "owner",
        createdByName: "Owner",
        allowDownload: true,
        viewCount: 0,
      });
      const grantId = await ctx.db.insert("shareAccessGrants", {
        shareLinkId,
        token: "batch-grant",
        expiresAt: Date.now() + 60_000,
        createdAt: Date.now(),
      });
      return { shareLinkId, grantId };
    });

    const result = await t
      .withIdentity({ subject: "owner" })
      .mutation(api.videos.remove, { videoId: v2 });
    expect(result.replacementVideoId).toBe(v3);

    const immediate = await t.run(async (ctx) => ({
      target: await ctx.db.get(v2),
      v1: await ctx.db.get(seeded.v1),
      v3: await ctx.db.get(v3),
      remainingComments: await ctx.db
        .query("comments")
        .withIndex("by_video", (q) => q.eq("videoId", v2))
        .collect(),
    }));
    expect(immediate.target).toBeNull();
    expect(immediate.v1).toMatchObject({
      versionNumber: 1,
      supersededByVideoId: v3,
    });
    expect(immediate.v3).toMatchObject({
      versionNumber: 2,
    });
    expect(immediate.remainingComments).toHaveLength(18);

    vi.runOnlyPendingTimers();
    await t.finishInProgressScheduledFunctions();
    const afterFirstContinuation = await t.run((ctx) =>
      ctx.db
        .query("comments")
        .withIndex("by_video", (q) => q.eq("videoId", v2))
        .collect(),
    );
    expect(afterFirstContinuation).toHaveLength(10);

    vi.runOnlyPendingTimers();
    await t.finishInProgressScheduledFunctions();
    const afterSecondContinuation = await t.run((ctx) =>
      ctx.db
        .query("comments")
        .withIndex("by_video", (q) => q.eq("videoId", v2))
        .collect(),
    );
    expect(afterSecondContinuation).toHaveLength(2);

    await t.finishAllScheduledFunctions(() => vi.runAllTimers());

    const completed = await t.run(async (ctx) => ({
      comments: await ctx.db
        .query("comments")
        .withIndex("by_video", (q) => q.eq("videoId", v2))
        .collect(),
      shareLink: await ctx.db.get(dependents.shareLinkId),
      grant: await ctx.db.get(dependents.grantId),
    }));
    expect(completed).toEqual({
      comments: [],
      shareLink: null,
      grant: null,
    });
  } finally {
    vi.useRealTimers();
  }
});

test("finishes deletion jobs queued before version rows were removed eagerly", async () => {
  vi.useFakeTimers();
  try {
    const t = convexTest(schema, modules);
    const videoId = await t.run(async (ctx) => {
      const teamId = await ctx.db.insert("teams", {
        name: "Garden",
        slug: "garden",
        ownerClerkId: "owner",
        plan: "basic",
      });
      const projectId = await ctx.db.insert("projects", {
        teamId,
        name: "Campaign",
      });
      const legacyVideoId = await ctx.db.insert("videos", {
        projectId,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        title: "Legacy queued deletion",
        visibility: "public",
        publicId: "legacy-queued-delete",
        status: "ready",
        workflowStatus: "review",
      });
      for (let index = 0; index < 10; index += 1) {
        await ctx.db.insert("comments", {
          videoId: legacyVideoId,
          userClerkId: "owner",
          userName: "Owner",
          text: `Legacy comment ${index}`,
          timestampSeconds: index,
          resolved: false,
        });
      }
      return legacyVideoId;
    });

    await t.mutation(internal.videos.continueVideoDelete, { videoId });

    const immediate = await t.run(async (ctx) => ({
      video: await ctx.db.get(videoId),
      comments: await ctx.db
        .query("comments")
        .withIndex("by_video", (q) => q.eq("videoId", videoId))
        .collect(),
    }));
    expect(immediate.video).not.toBeNull();
    expect(immediate.comments).toHaveLength(2);

    await t.finishAllScheduledFunctions(() => vi.runAllTimers());

    const completed = await t.run(async (ctx) => ({
      video: await ctx.db.get(videoId),
      comments: await ctx.db
        .query("comments")
        .withIndex("by_video", (q) => q.eq("videoId", videoId))
        .collect(),
    }));
    expect(completed).toEqual({
      video: null,
      comments: [],
    });
  } finally {
    vi.useRealTimers();
  }
});

test("deletes an unstacked legacy video with no replacement", async () => {
  const t = convexTest(schema, modules);
  const videoId = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    return await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Legacy cut",
      visibility: "public",
      publicId: "legacy-only",
      status: "ready",
      workflowStatus: "review",
    });
  });

  const result = await t
    .withIdentity({ subject: "owner" })
    .mutation(api.videos.remove, { videoId });
  expect(result.replacementVideoId).toBeNull();
  await expect(t.run((ctx) => ctx.db.get(videoId))).resolves.toBeNull();
});

test("storage counts every stored version while project lists only the head", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "storage-v1",
      fileSize: 100,
      status: "ready",
      workflowStatus: "review",
    });
    return { teamId, projectId, v1 };
  });
  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "storage-v2",
      fileSize: 200,
    }),
  );

  await expect(t.run((ctx) => getTeamStorageUsedBytes(ctx, seeded.teamId))).resolves.toBe(300);
  const listed = await t
    .withIdentity({ subject: "owner" })
    .query(api.videos.list, { projectId: seeded.projectId });
  expect(listed.map((video) => video._id)).toEqual([v2]);
});

test("public version paths enforce authentication and member authorization", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const videoId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "auth-v1",
      status: "ready",
      workflowStatus: "review",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "viewer",
      userEmail: "viewer@example.com",
      userName: "Viewer",
      role: "viewer",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "member",
      userEmail: "member@example.com",
      userName: "Member",
      role: "member",
    });
    return { videoId };
  });

  await expect(t.query(api.videos.listVersions, { videoId: seeded.videoId })).rejects.toThrow(
    "Not authenticated",
  );
  await expect(
    t.withIdentity({ subject: "viewer" }).mutation(api.videos.createVersion, {
      sourceVideoId: seeded.videoId,
      fileSize: 1,
      contentType: "video/mp4",
    }),
  ).rejects.toThrow("Requires member role or higher");
  await expect(
    t.withIdentity({ subject: "member" }).mutation(api.videos.remove, {
      videoId: seeded.videoId,
    }),
  ).rejects.toThrow("Requires admin role or higher");

  const versions = await t
    .withIdentity({ subject: "member" })
    .query(api.videos.listVersions, { videoId: seeded.videoId });
  expect(versions).toHaveLength(1);
});

test("abandoned version uploads atomically restore the previous head", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "rollback-v1",
      status: "ready",
      workflowStatus: "done",
    });
    return { projectId, v1 };
  });
  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "rollback-v2",
    }),
  );

  const result = await t.mutation(internal.videos.finalizeAbandonedUpload, {
    videoId: v2,
    uploadError: "Upload cancelled.",
  });
  expect(result.removedVersion).toBe(true);

  const state = await t.run(async (ctx) => ({
    v1: await ctx.db.get(seeded.v1),
    v2: await ctx.db.get(v2),
  }));
  expect(state.v2).toBeNull();
  expect(state.v1?.supersededByVideoId).toBeUndefined();

  const visible = await t
    .withIdentity({ subject: "owner" })
    .query(api.videos.list, { projectId: seeded.projectId });
  expect(visible.map((video) => video._id)).toEqual([seeded.v1]);
});

test("rolling back a provisional middle version renumbers and remains appendable", async () => {
  vi.useFakeTimers();
  try {
    const t = convexTest(schema, modules);
    const seeded = await t.run(async (ctx) => {
      const teamId = await ctx.db.insert("teams", {
        name: "Garden",
        slug: "garden",
        ownerClerkId: "owner",
        plan: "basic",
      });
      await ctx.db.insert("teamMembers", {
        teamId,
        userClerkId: "owner",
        userEmail: "owner@example.com",
        userName: "Owner",
        role: "owner",
      });
      const projectId = await ctx.db.insert("projects", {
        teamId,
        name: "Campaign",
      });
      const v1 = await ctx.db.insert("videos", {
        projectId,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        title: "Cut",
        visibility: "public",
        publicId: "middle-rollback-v1",
        status: "ready",
        workflowStatus: "review",
      });
      return { v1 };
    });
    const { videoId: v2 } = await t.run((ctx) =>
      createVersionRecord(ctx, {
        sourceVideoId: seeded.v1,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        publicId: "middle-rollback-v2",
      }),
    );
    const { videoId: v3 } = await t.run((ctx) =>
      createVersionRecord(ctx, {
        sourceVideoId: v2,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        publicId: "middle-rollback-v3",
      }),
    );
    await t.run(async (ctx) => {
      for (let index = 0; index < 10; index += 1) {
        await ctx.db.insert("comments", {
          videoId: v2,
          userClerkId: "owner",
          userName: "Owner",
          text: `Rollback comment ${index}`,
          timestampSeconds: index,
          resolved: false,
        });
      }
    });

    const result = await t.mutation(internal.videos.finalizeAbandonedUpload, {
      videoId: v2,
      uploadError: "Upload cancelled.",
    });
    expect(result.removedVersion).toBe(true);

    const immediate = await t.run(async (ctx) => ({
      v1: await ctx.db.get(seeded.v1),
      v2: await ctx.db.get(v2),
      v3: await ctx.db.get(v3),
      remainingComments: await ctx.db
        .query("comments")
        .withIndex("by_video", (q) => q.eq("videoId", v2))
        .collect(),
    }));
    expect(immediate.v2).toBeNull();
    expect(immediate.v1).toMatchObject({
      versionNumber: 1,
      supersededByVideoId: v3,
    });
    expect(immediate.v3).toMatchObject({
      versionNumber: 2,
    });
    expect(immediate.remainingComments).toHaveLength(2);

    const appended = await t.run((ctx) =>
      createVersionRecord(ctx, {
        sourceVideoId: seeded.v1,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        publicId: "middle-rollback-v4",
      }),
    );
    expect(appended).toMatchObject({
      versionStackId: seeded.v1,
      versionNumber: 3,
    });

    const versions = await t
      .withIdentity({ subject: "owner" })
      .query(api.videos.listVersions, { videoId: appended.videoId });
    expect(versions.map((version) => [version._id, version.versionNumber])).toEqual([
      [appended.videoId, 3],
      [v3, 2],
      [seeded.v1, 1],
    ]);

    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const remainingComments = await t.run((ctx) =>
      ctx.db
        .query("comments")
        .withIndex("by_video", (q) => q.eq("videoId", v2))
        .collect(),
    );
    expect(remainingComments).toEqual([]);
  } finally {
    vi.useRealTimers();
  }
});

test("hard failure after promotion rolls back a version before a Mux asset exists", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "promoted-v1",
      status: "ready",
      workflowStatus: "review",
    });
    return { v1 };
  });
  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "promoted-v2",
    }),
  );
  await t.mutation(internal.videos.markAsProcessing, { videoId: v2 });

  const result = await t.mutation(internal.videos.finalizeAbandonedUpload, {
    videoId: v2,
    uploadError: "Uploaded object failed validation.",
  });
  expect(result.removedVersion).toBe(true);

  const state = await t.run(async (ctx) => ({
    v1: await ctx.db.get(seeded.v1),
    v2: await ctx.db.get(v2),
  }));
  expect(state.v2).toBeNull();
  expect(state.v1?.supersededByVideoId).toBeUndefined();
});

test("failure after Mux promotion stays retryable as the latest version", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "retryable-v1",
      status: "ready",
      workflowStatus: "review",
    });
    return { projectId, v1 };
  });
  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "retryable-v2",
    }),
  );
  await t.run((ctx) =>
    ctx.db.patch(v2, {
      s3Key: "videos/retryable-v2/cut.mp4",
      status: "processing",
      muxAssetId: "mux-asset-v2",
    }),
  );

  const updated = await t.mutation(internal.videos.markMuxAssetAsFailed, {
    videoId: v2,
    muxAssetId: "mux-asset-v2",
    uploadError: "Mux could not encode this asset.",
  });
  expect(updated).toBe(true);

  const state = await t.run(async (ctx) => ({
    v1: await ctx.db.get(seeded.v1),
    v2: await ctx.db.get(v2),
  }));
  expect(state.v1?.supersededByVideoId).toBe(v2);
  expect(state.v2).toMatchObject({
    status: "failed",
    s3Key: "videos/retryable-v2/cut.mp4",
  });

  const listed = await t
    .withIdentity({ subject: "owner" })
    .query(api.videos.list, { projectId: seeded.projectId });
  expect(listed.map((video) => video._id)).toEqual([v2]);
});

test("abandoned upload with a Mux asset exercises the kept-as-failed branch", async () => {
  const t = convexTest(schema, modules);
  const videoId = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "kept-v1",
      status: "ready",
      workflowStatus: "review",
      versionNumber: 1,
    });
    await ctx.db.patch(v1, { versionStackId: v1 });
    const v2 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "kept-v2",
      status: "processing",
      workflowStatus: "review",
      versionStackId: v1,
      versionNumber: 2,
      muxAssetId: "mux-asset",
      s3Key: "videos/kept-v2/cut.mp4",
    });
    await ctx.db.patch(v1, { supersededByVideoId: v2 });
    return v2;
  });

  const result = await t.mutation(internal.videos.finalizeAbandonedUpload, {
    videoId,
    uploadError: "Permanent processing failure.",
  });
  expect(result.removedVersion).toBe(false);

  const failed = await t.run((ctx) => ctx.db.get(videoId));
  expect(failed).toMatchObject({
    status: "failed",
    muxAssetStatus: "errored",
    uploadError: "Permanent processing failure.",
  });
  expect(failed?.s3Key).toBeUndefined();
});

test("stale provisional versions roll back even before storage is initiated", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "stale-v1",
      status: "ready",
      workflowStatus: "review",
    });
    return { v1 };
  });
  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "stale-v2",
    }),
  );

  const claimed = await t.mutation(internal.videos.claimStaleUpload, {
    videoId: v2,
    cutoff: Date.now() + 1000,
  });
  expect(claimed).toMatchObject({
    storage: { kind: "none" },
    removedVersion: true,
  });

  const state = await t.run(async (ctx) => ({
    v1: await ctx.db.get(seeded.v1),
    v2: await ctx.db.get(v2),
  }));
  expect(state.v2).toBeNull();
  expect(state.v1?.supersededByVideoId).toBeUndefined();
});

test("concurrent version creation serializes into one ordered chain", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "concurrent-v1",
      status: "ready",
      workflowStatus: "review",
    });
    return { v1 };
  });

  await Promise.all([
    t.run((ctx) =>
      createVersionRecord(ctx, {
        sourceVideoId: seeded.v1,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        publicId: "concurrent-a",
      }),
    ),
    t.run((ctx) =>
      createVersionRecord(ctx, {
        sourceVideoId: seeded.v1,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        publicId: "concurrent-b",
      }),
    ),
  ]);

  const versions = await t
    .withIdentity({ subject: "owner" })
    .query(api.videos.listVersions, { videoId: seeded.v1 });
  expect(versions.map((version) => version.versionNumber)).toEqual([3, 2, 1]);

  const chain = await t.run(async (ctx) => {
    const rows = await ctx.db
      .query("videos")
      .withIndex("by_version_stack_id_and_version_number", (q) => q.eq("versionStackId", seeded.v1))
      .order("asc")
      .take(4);
    return rows.map((row) => [row.versionNumber, row.supersededByVideoId ?? null]);
  });
  expect(chain[0]?.[1]).toBeTruthy();
  expect(chain[1]?.[1]).toBeTruthy();
  expect(chain[2]?.[1]).toBeNull();
});

test("concurrent version creation and deletion preserve a contiguous chain", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "concurrent-delete-v1",
      status: "ready",
      workflowStatus: "review",
    });
    return { v1 };
  });
  const { videoId: v2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.v1,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "concurrent-delete-v2",
    }),
  );
  await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: v2,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      publicId: "concurrent-delete-v3",
    }),
  );

  const [created] = await Promise.all([
    t.run((ctx) =>
      createVersionRecord(ctx, {
        sourceVideoId: seeded.v1,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        publicId: "concurrent-delete-v4",
      }),
    ),
    t.withIdentity({ subject: "owner" }).mutation(api.videos.remove, {
      videoId: v2,
    }),
  ]);

  const versions = await t
    .withIdentity({ subject: "owner" })
    .query(api.videos.listVersions, { videoId: created.videoId });
  expect(versions.map((version) => version.versionNumber)).toEqual([3, 2, 1]);
  expect(versions.map((version) => version._id)).toContain(created.videoId);
  await expect(t.run((ctx) => ctx.db.get(v2))).resolves.toBeNull();
});

test("version stack operations enforce the explicit stack limit", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const v1 = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "limit-v1",
      status: "ready",
      workflowStatus: "review",
      versionNumber: 1,
    });
    await ctx.db.patch(v1, { versionStackId: v1 });

    let previousId = v1;
    for (let versionNumber = 2; versionNumber <= MAX_VIDEO_STACK_SIZE; versionNumber += 1) {
      const videoId = await ctx.db.insert("videos", {
        projectId,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        title: "Cut",
        visibility: "public",
        publicId: `limit-v${versionNumber}`,
        status: "ready",
        workflowStatus: "review",
        versionStackId: v1,
        versionNumber,
      });
      await ctx.db.patch(previousId, { supersededByVideoId: videoId });
      previousId = videoId;
    }

    return { projectId, v1, latestId: previousId };
  });

  const versions = await t
    .withIdentity({ subject: "owner" })
    .query(api.videos.listVersions, { videoId: seeded.v1 });
  expect(versions).toHaveLength(MAX_VIDEO_STACK_SIZE);

  await expect(
    t.run((ctx) =>
      createVersionRecord(ctx, {
        sourceVideoId: seeded.v1,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        publicId: "limit-overflow",
      }),
    ),
  ).rejects.toThrow(`at most ${MAX_VIDEO_STACK_SIZE} versions`);

  const overflowId = await t.run(async (ctx) => {
    const videoId = await ctx.db.insert("videos", {
      projectId: seeded.projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "limit-corrupt",
      status: "ready",
      workflowStatus: "review",
      versionStackId: seeded.v1,
      versionNumber: MAX_VIDEO_STACK_SIZE + 1,
    });
    await ctx.db.patch(seeded.latestId, { supersededByVideoId: videoId });
    return videoId;
  });

  const authed = t.withIdentity({ subject: "owner" });
  await expect(authed.query(api.videos.listVersions, { videoId: overflowId })).rejects.toThrow(
    `at most ${MAX_VIDEO_STACK_SIZE} versions`,
  );
  await expect(
    authed.mutation(api.videos.move, {
      videoId: overflowId,
      projectId: seeded.projectId,
    }),
  ).rejects.toThrow(`at most ${MAX_VIDEO_STACK_SIZE} versions`);
  await expect(authed.mutation(api.videos.remove, { videoId: overflowId })).rejects.toThrow(
    `at most ${MAX_VIDEO_STACK_SIZE} versions`,
  );
});
