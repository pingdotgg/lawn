/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { expect, test, vi } from "vitest";
import stripeSchema from "../node_modules/@convex-dev/stripe/src/component/schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const stripeModules = import.meta.glob("../node_modules/@convex-dev/stripe/src/component/**/*.ts");

async function seedFolderShareFixture() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  t.registerComponent("stripe", stripeSchema, stripeModules);
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
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "member",
      userEmail: "member@example.com",
      userName: "Member",
      role: "member",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "viewer",
      userEmail: "viewer@example.com",
      userName: "Viewer",
      role: "viewer",
    });

    const containerId = await ctx.db.insert("projects", { teamId, name: "Container" });
    const rootId = await ctx.db.insert("projects", { teamId, name: "Client ads" });
    const childId = await ctx.db.insert("projects", {
      teamId,
      name: "Summer campaign",
      parentId: rootId,
    });
    const grandchildId = await ctx.db.insert("projects", {
      teamId,
      name: "Social cuts",
      parentId: childId,
    });
    const siblingId = await ctx.db.insert("projects", { teamId, name: "Internal" });
    const incomingId = await ctx.db.insert("projects", { teamId, name: "Incoming" });

    const rootVideoId = await ctx.db.insert("videos", {
      projectId: rootId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Root video",
      visibility: "private",
      publicId: "root-video-public-id",
      status: "ready",
      workflowStatus: "review",
      muxPlaybackId: "root-playback-secret",
      muxAssetId: "root-asset-secret",
      s3Key: "root-storage-secret",
    });
    const childVideoId = await ctx.db.insert("videos", {
      projectId: childId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Child video",
      visibility: "private",
      publicId: "child-video-public-id",
      status: "ready",
      workflowStatus: "review",
      muxPlaybackId: "child-playback-secret",
    });
    const outsideVideoId = await ctx.db.insert("videos", {
      projectId: siblingId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Outside video",
      visibility: "private",
      publicId: "outside-video-public-id",
      status: "ready",
      workflowStatus: "review",
      muxPlaybackId: "outside-playback-secret",
    });
    const rootCommentId = await ctx.db.insert("comments", {
      videoId: rootVideoId,
      userClerkId: "comment-author-clerk-secret",
      userName: "Visible reviewer",
      userAvatarUrl: "comment-avatar-secret",
      text: "Visible feedback",
      timestampSeconds: 12,
      resolved: false,
    });

    return {
      teamId,
      containerId,
      rootId,
      childId,
      grandchildId,
      siblingId,
      incomingId,
      rootVideoId,
      childVideoId,
      outsideVideoId,
      rootCommentId,
    };
  });

  return { t, ...seeded };
}

async function createShareAndGrant(t: ReturnType<typeof convexTest>, projectId: Id<"projects">) {
  const created = await t
    .withIdentity({ subject: "member", name: "Member" })
    .mutation(api.folderShares.create, { projectId });
  const grant = await t.mutation(api.folderShares.issueAccessGrant, { token: created.token });
  expect(grant.ok).toBe(true);
  expect(grant.grantToken).toEqual(expect.any(String));
  expect(grant.expiresAt).toEqual(expect.any(Number));
  return { shareToken: created.token, grantToken: grant.grantToken! };
}

test("members manage one stable folder link while viewers cannot obtain it", async () => {
  const { t, rootId } = await seedFolderShareFixture();
  const member = t.withIdentity({ subject: "member", name: "Member" });

  const first = await member.mutation(api.folderShares.create, { projectId: rootId });
  const second = await member.mutation(api.folderShares.create, { projectId: rootId });
  expect(first.created).toBe(true);
  expect(second).toEqual({ token: first.token, created: false });
  expect(first.token).toHaveLength(32);
  await expect(
    member.query(api.folderShares.getForFolder, { projectId: rootId }),
  ).resolves.toMatchObject({ token: first.token });

  const viewer = t.withIdentity({ subject: "viewer", name: "Viewer" });
  await expect(viewer.query(api.folderShares.getForFolder, { projectId: rootId })).rejects.toThrow(
    "Requires member role or higher",
  );
  await expect(viewer.mutation(api.folderShares.create, { projectId: rootId })).rejects.toThrow(
    "Requires member role or higher",
  );
  await expect(viewer.mutation(api.folderShares.revoke, { projectId: rootId })).rejects.toThrow(
    "Requires member role or higher",
  );
  await expect(
    t.withIdentity({ subject: "outsider" }).mutation(api.folderShares.create, {
      projectId: rootId,
    }),
  ).rejects.toThrow("Not a team member");
  await expect(t.query(api.folderShares.getForFolder, { projectId: rootId })).rejects.toThrow(
    "Not authenticated",
  );
});

test("public DTOs expose direct replies without leaking private identifiers", async () => {
  const { t, rootId, rootVideoId, rootCommentId } = await seedFolderShareFixture();
  const { shareToken, grantToken } = await createShareAndGrant(t, rootId);

  const directReplyId = await t
    .withIdentity({ subject: "member", name: "Member" })
    .mutation(api.comments.create, {
      videoId: rootVideoId,
      text: "Visible direct reply",
      timestampSeconds: 13,
      parentId: rootCommentId,
    });
  await expect(
    t.withIdentity({ subject: "member", name: "Member" }).mutation(api.comments.create, {
      videoId: rootVideoId,
      text: "Nested reply",
      timestampSeconds: 14,
      parentId: directReplyId,
    }),
  ).rejects.toThrow("Invalid parent comment");

  await expect(t.query(api.folderShares.getByToken, { token: shareToken })).resolves.toEqual({
    status: "ok",
  });

  const folder = await t.query(api.folderShares.getFolder, { grantToken });
  const video = await t.query(api.folderShares.getVideo, {
    grantToken,
    videoId: rootVideoId,
  });
  const publicPayload = JSON.stringify({ folder, video });
  for (const secret of [
    shareToken,
    grantToken,
    "root-playback-secret",
    "root-asset-secret",
    "root-storage-secret",
    "root-video-public-id",
    "comment-author-clerk-secret",
    "comment-avatar-secret",
    "owner",
  ]) {
    expect(publicPayload).not.toContain(secret);
  }
  expect(video?.comments[0]).toMatchObject({
    userName: "Visible reviewer",
    text: "Visible feedback",
  });
  expect(video?.comments[0]).not.toHaveProperty("userAvatarUrl");
  expect(video?.comments[0].replies).toEqual([
    expect.objectContaining({
      _id: directReplyId,
      userName: "Member",
      text: "Visible direct reply",
    }),
  ]);

  const ordinaryProject = await t
    .withIdentity({ subject: "member" })
    .query(api.projects.get, { projectId: rootId });
  expect(JSON.stringify(ordinaryProject)).not.toContain(shareToken);
});

test("folder and video reads stay inside the shared descendant subtree", async () => {
  const { t, rootId, childId, grandchildId, siblingId, childVideoId, outsideVideoId } =
    await seedFolderShareFixture();
  const { grantToken } = await createShareAndGrant(t, rootId);

  const nested = await t.query(api.folderShares.getFolder, {
    grantToken,
    folderId: grandchildId,
  });
  expect(nested?.breadcrumbs.map((folder) => folder._id)).toEqual([rootId, childId, grandchildId]);

  await expect(
    t.query(api.folderShares.getFolder, { grantToken, folderId: siblingId }),
  ).resolves.toBeNull();
  await expect(
    t.query(api.folderShares.getVideo, { grantToken, videoId: childVideoId }),
  ).resolves.toMatchObject({ video: { _id: childVideoId } });
  await expect(
    t.query(api.folderShares.getVideo, { grantToken, videoId: outsideVideoId }),
  ).resolves.toBeNull();
  await expect(
    t.mutation(internal.folderShares.claimVideoForPlayback, {
      grantToken,
      videoId: outsideVideoId,
    }),
  ).resolves.toBeNull();
});

test("playback claims expose only the authorized modern or legacy Mux input", async () => {
  const { t, rootId, rootVideoId, childVideoId } = await seedFolderShareFixture();
  const { grantToken } = await createShareAndGrant(t, rootId);

  await expect(
    t.mutation(internal.folderShares.claimVideoForPlayback, {
      grantToken,
      videoId: rootVideoId,
    }),
  ).resolves.toEqual({ kind: "assetId", muxAssetId: "root-asset-secret" });
  await expect(
    t.mutation(internal.folderShares.claimVideoForPlayback, {
      grantToken,
      videoId: childVideoId,
    }),
  ).resolves.toEqual({ kind: "playbackId", muxPlaybackId: "child-playback-secret" });
});

test("playback limits stay keyed to the durable link and video across fresh grants", async () => {
  const { t, rootId, rootVideoId } = await seedFolderShareFixture();
  const { shareToken, grantToken } = await createShareAndGrant(t, rootId);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await expect(
      t.mutation(internal.folderShares.claimVideoForPlayback, {
        grantToken,
        videoId: rootVideoId,
      }),
    ).resolves.not.toBeNull();
  }

  const freshGrant = await t.mutation(api.folderShares.issueAccessGrant, { token: shareToken });
  expect(freshGrant.ok).toBe(true);
  await expect(
    t.mutation(internal.folderShares.claimVideoForPlayback, {
      grantToken: freshGrant.grantToken!,
      videoId: rootVideoId,
    }),
  ).resolves.toMatchObject({ kind: "rateLimited", retryAfterMs: expect.any(Number) });
});

test("playback aggregate limits cannot be bypassed across videos", async () => {
  const { t, rootId, rootVideoId, childVideoId } = await seedFolderShareFixture();
  const thirdVideoId = await t.run(
    async (ctx) =>
      await ctx.db.insert("videos", {
        projectId: rootId,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        title: "Third video",
        visibility: "private",
        publicId: "third-video-public-id",
        status: "ready",
        workflowStatus: "review",
        muxPlaybackId: "third-playback-secret",
      }),
  );
  const { grantToken } = await createShareAndGrant(t, rootId);

  for (const videoId of [rootVideoId, childVideoId, thirdVideoId]) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await expect(
        t.mutation(internal.folderShares.claimVideoForPlayback, {
          grantToken,
          videoId,
        }),
      ).resolves.not.toMatchObject({ kind: "rateLimited" });
    }
  }

  await expect(
    t.mutation(internal.folderShares.claimVideoForPlayback, {
      grantToken,
      videoId: thirdVideoId,
    }),
  ).resolves.toMatchObject({ kind: "rateLimited", retryAfterMs: expect.any(Number) });
});

test("corrupt cross-team ancestry fails closed for roots and descendants", async () => {
  const { t, rootId, childId } = await seedFolderShareFixture();
  const { shareToken, grantToken } = await createShareAndGrant(t, rootId);
  const otherTeamProjectId = await t.run(async (ctx) => {
    const otherTeamId = await ctx.db.insert("teams", {
      name: "Other",
      slug: "other",
      ownerClerkId: "other-owner",
      plan: "basic",
    });
    return await ctx.db.insert("projects", { teamId: otherTeamId, name: "Other root" });
  });

  await t.run((ctx) => ctx.db.patch(childId, { parentId: otherTeamProjectId }));
  await expect(
    t.query(api.folderShares.getFolder, { grantToken, folderId: childId }),
  ).resolves.toBeNull();
  await expect(t.query(api.folderShares.getByToken, { token: shareToken })).resolves.toEqual({
    status: "ok",
  });

  await t.run(async (ctx) => {
    await ctx.db.patch(childId, { parentId: rootId });
    await ctx.db.patch(rootId, { parentId: otherTeamProjectId });
  });
  await expect(t.query(api.folderShares.getByToken, { token: shareToken })).resolves.toEqual({
    status: "missing",
  });
  await expect(
    t.mutation(api.folderShares.issueAccessGrant, { token: shareToken }),
  ).resolves.toEqual({ ok: false, grantToken: null, expiresAt: null });
  await expect(t.query(api.folderShares.getFolder, { grantToken })).resolves.toBeNull();
});

test("moves update share scope immediately and moving the shared root preserves its link", async () => {
  const { t, rootId, childId, containerId, siblingId, incomingId } = await seedFolderShareFixture();
  const { grantToken } = await createShareAndGrant(t, rootId);
  const member = t.withIdentity({ subject: "member" });

  await member.mutation(api.projects.move, { projectId: rootId, newParentId: containerId });
  await expect(
    t.query(api.folderShares.getFolder, { grantToken, folderId: childId }),
  ).resolves.toMatchObject({ current: { _id: childId } });

  await member.mutation(api.projects.move, { projectId: childId, newParentId: siblingId });
  await expect(
    t.query(api.folderShares.getFolder, { grantToken, folderId: childId }),
  ).resolves.toBeNull();

  await expect(
    t.query(api.folderShares.getFolder, { grantToken, folderId: incomingId }),
  ).resolves.toBeNull();
  await member.mutation(api.projects.move, { projectId: incomingId, newParentId: rootId });
  await expect(
    t.query(api.folderShares.getFolder, { grantToken, folderId: incomingId }),
  ).resolves.toMatchObject({ current: { _id: incomingId } });
});

test("video pages include ready current heads only and enforce the server page bound", async () => {
  const { t, rootId } = await seedFolderShareFixture();
  const seeded = await t.run(async (ctx) => {
    const retiredId = await ctx.db.insert("videos", {
      projectId: rootId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Retired cut",
      visibility: "private",
      publicId: "retired-cut",
      status: "ready",
      workflowStatus: "review",
    });
    const headId = await ctx.db.insert("videos", {
      projectId: rootId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Current cut",
      visibility: "private",
      publicId: "current-cut",
      status: "ready",
      workflowStatus: "review",
    });
    await ctx.db.patch(retiredId, { supersededByVideoId: headId });

    const extraIds = [];
    for (let index = 0; index < 45; index += 1) {
      extraIds.push(
        await ctx.db.insert("videos", {
          projectId: rootId,
          uploadedByClerkId: "owner",
          uploaderName: "Owner",
          title: `Asset ${index}`,
          visibility: "private",
          publicId: `asset-${index}`,
          status: "ready",
          workflowStatus: "review",
        }),
      );
    }
    await ctx.db.insert("videos", {
      projectId: rootId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Still processing",
      visibility: "private",
      publicId: "still-processing",
      status: "processing",
      workflowStatus: "review",
    });
    return { retiredId, headId, extraIds };
  });
  const { grantToken } = await createShareAndGrant(t, rootId);

  const first = await t.query(api.folderShares.listVideos, {
    grantToken,
    paginationOpts: { cursor: null, numItems: 500 },
  });
  expect(first.page).toHaveLength(40);
  expect(first.isDone).toBe(false);
  const second = await t.query(api.folderShares.listVideos, {
    grantToken,
    paginationOpts: { cursor: first.continueCursor, numItems: 500 },
  });
  const allIds = [...first.page, ...second.page].map((video) => video._id);
  expect(allIds).toContain(seeded.headId);
  expect(allIds).not.toContain(seeded.retiredId);
  expect(allIds).toEqual(expect.arrayContaining(seeded.extraIds));
  expect([...first.page, ...second.page].every((video) => !("muxPlaybackId" in video))).toBe(true);
});

test("folder reads paginate every immediate child and reject malformed ids", async () => {
  const { t, rootId } = await seedFolderShareFixture();
  await t.run(async (ctx) => {
    const root = await ctx.db.get(rootId);
    for (let index = 0; index < 40; index += 1) {
      await ctx.db.insert("projects", {
        teamId: root!.teamId,
        parentId: rootId,
        name: `000 deleting ${index}`,
        deletionStartedAt: 1,
      });
    }
    for (let index = 0; index < 101; index += 1) {
      await ctx.db.insert("projects", {
        teamId: root!.teamId,
        parentId: rootId,
        name: `Folder ${index}`,
      });
    }
  });
  const { grantToken } = await createShareAndGrant(t, rootId);

  const first = await t.query(api.folderShares.listFolders, {
    grantToken,
    paginationOpts: { cursor: null, numItems: 500 },
  });
  expect(first.page).toHaveLength(40);
  expect(first.isDone).toBe(false);
  const second = await t.query(api.folderShares.listFolders, {
    grantToken,
    paginationOpts: { cursor: first.continueCursor, numItems: 500 },
  });
  expect(second.page).toHaveLength(40);
  expect(second.isDone).toBe(false);
  const third = await t.query(api.folderShares.listFolders, {
    grantToken,
    paginationOpts: { cursor: second.continueCursor, numItems: 500 },
  });
  expect(third.page).toHaveLength(22);
  expect(third.isDone).toBe(true);
  expect([...first.page, ...second.page, ...third.page]).toHaveLength(102);

  const folder = await t.query(api.folderShares.getFolder, { grantToken });
  expect(folder).not.toHaveProperty("children");
  await expect(
    t.query(api.folderShares.getFolder, { grantToken, folderId: "not-a-convex-id" }),
  ).resolves.toBeNull();
  await expect(
    t.query(api.folderShares.listFolders, {
      grantToken,
      folderId: "not-a-convex-id",
      paginationOpts: { cursor: null, numItems: 40 },
    }),
  ).resolves.toMatchObject({ page: [], isDone: true });
  await expect(
    t.query(api.folderShares.getVideo, { grantToken, videoId: "not-a-convex-id" }),
  ).resolves.toBeNull();
  await expect(
    t.mutation(internal.folderShares.claimVideoForPlayback, {
      grantToken,
      videoId: "not-a-convex-id",
    }),
  ).resolves.toBeNull();
  await expect(t.mutation(api.folderShares.issueAccessGrant, { token: "bad" })).resolves.toEqual({
    ok: false,
    grantToken: null,
    expiresAt: null,
  });
});

test("paginated reads revalidate the share grant between pages", async () => {
  const { t, rootId } = await seedFolderShareFixture();
  await t.run(async (ctx) => {
    const root = await ctx.db.get(rootId);
    for (let index = 0; index < 45; index += 1) {
      await ctx.db.insert("projects", {
        teamId: root!.teamId,
        parentId: rootId,
        name: `Page boundary ${index}`,
      });
    }
  });
  const { grantToken } = await createShareAndGrant(t, rootId);
  const first = await t.query(api.folderShares.listFolders, {
    grantToken,
    paginationOpts: { cursor: null, numItems: 40 },
  });
  expect(first.page).toHaveLength(40);
  expect(first.isDone).toBe(false);

  await t
    .withIdentity({ subject: "member" })
    .mutation(api.folderShares.revoke, { projectId: rootId });
  await expect(
    t.query(api.folderShares.listFolders, {
      grantToken,
      paginationOpts: { cursor: first.continueCursor, numItems: 40 },
    }),
  ).resolves.toEqual({ page: [], isDone: true, continueCursor: "" });
});

test("starting an async ancestor deletion immediately invalidates descendant shares", async () => {
  vi.useFakeTimers();
  try {
    const { t, rootId, incomingId } = await seedFolderShareFixture();
    const seeded = await t.run(async (ctx) => {
      const root = await ctx.db.get(rootId);
      const sharedDescendantId = await ctx.db.insert("projects", {
        teamId: root!.teamId,
        parentId: rootId,
        name: "Shared second branch",
      });
      const blockedDescendantId = await ctx.db.insert("projects", {
        teamId: root!.teamId,
        parentId: rootId,
        name: "Unshared third branch",
      });
      const sharedVideoId = await ctx.db.insert("videos", {
        projectId: sharedDescendantId,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        title: "Shared branch video",
        visibility: "private",
        publicId: "shared-branch-video",
        status: "ready",
        workflowStatus: "review",
        muxPlaybackId: "shared-branch-playback",
      });
      return { sharedDescendantId, blockedDescendantId, sharedVideoId };
    });
    const { shareToken, grantToken } = await createShareAndGrant(t, seeded.sharedDescendantId);

    await t.withIdentity({ subject: "owner" }).mutation(api.projects.remove, {
      projectId: rootId,
    });

    const immediate = await t.run(async (ctx) => ({
      deletingRoot: await ctx.db.get(rootId),
      sharedDescendant: await ctx.db.get(seeded.sharedDescendantId),
      durableLink: await ctx.db
        .query("folderShareLinks")
        .withIndex("by_token", (q) => q.eq("token", shareToken))
        .unique(),
      grant: await ctx.db
        .query("folderShareAccessGrants")
        .withIndex("by_token", (q) => q.eq("token", grantToken))
        .unique(),
    }));
    expect(immediate.deletingRoot?.deletionStartedAt).toEqual(expect.any(Number));
    expect(immediate.sharedDescendant?.parentId).toBe(rootId);
    expect(immediate.durableLink).not.toBeNull();
    expect(immediate.grant).not.toBeNull();

    const member = t.withIdentity({ subject: "member" });
    await expect(
      member.mutation(api.projects.move, { projectId: seeded.sharedDescendantId }),
    ).rejects.toThrow("Folder is being deleted");
    await expect(member.mutation(api.projects.move, { projectId: rootId })).rejects.toThrow(
      "Folder is being deleted",
    );
    await expect(
      member.mutation(api.projects.move, {
        projectId: incomingId,
        newParentId: seeded.blockedDescendantId,
      }),
    ).rejects.toThrow("Folder is being deleted");
    await expect(
      member.mutation(api.projects.move, { projectId: incomingId, newParentId: rootId }),
    ).rejects.toThrow("Folder is being deleted");

    await expect(t.run((ctx) => ctx.db.get(seeded.sharedDescendantId))).resolves.toMatchObject({
      parentId: rootId,
    });

    await expect(t.query(api.folderShares.getByToken, { token: shareToken })).resolves.toEqual({
      status: "missing",
    });
    await expect(
      t.mutation(api.folderShares.issueAccessGrant, { token: shareToken }),
    ).resolves.toEqual({ ok: false, grantToken: null, expiresAt: null });
    await expect(t.query(api.folderShares.getFolder, { grantToken })).resolves.toBeNull();
    await expect(
      t.mutation(internal.folderShares.claimVideoForPlayback, {
        grantToken,
        videoId: seeded.sharedVideoId,
      }),
    ).resolves.toBeNull();
    await expect(
      t.withIdentity({ subject: "member" }).mutation(api.folderShares.create, {
        projectId: seeded.blockedDescendantId,
      }),
    ).rejects.toThrow("Folder is being deleted");

    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const completed = await t.run(async (ctx) => ({
      root: await ctx.db.get(rootId),
      sharedDescendant: await ctx.db.get(seeded.sharedDescendantId),
      link: await ctx.db
        .query("folderShareLinks")
        .withIndex("by_token", (q) => q.eq("token", shareToken))
        .take(1),
      grant: await ctx.db
        .query("folderShareAccessGrants")
        .withIndex("by_token", (q) => q.eq("token", grantToken))
        .take(1),
    }));
    expect(completed).toEqual({ root: null, sharedDescendant: null, link: [], grant: [] });
  } finally {
    vi.useRealTimers();
  }
});

test("revocation invalidates existing grants and folder deletion removes the link", async () => {
  vi.useFakeTimers();
  try {
    const { t, rootId, rootVideoId } = await seedFolderShareFixture();
    const { shareToken, grantToken } = await createShareAndGrant(t, rootId);
    const member = t.withIdentity({ subject: "member" });

    const expiredGrantToken = "x".repeat(40);
    await t.run(async (ctx) => {
      const link = await ctx.db
        .query("folderShareLinks")
        .withIndex("by_project_id", (q) => q.eq("projectId", rootId))
        .unique();
      await ctx.db.insert("folderShareAccessGrants", {
        folderShareLinkId: link!._id,
        token: expiredGrantToken,
        createdAt: 0,
        expiresAt: 1,
      });
    });
    await expect(
      t.query(api.folderShares.getFolder, { grantToken: expiredGrantToken }),
    ).resolves.toBeNull();

    await member.mutation(api.folderShares.revoke, { projectId: rootId });
    await expect(t.query(api.folderShares.getFolder, { grantToken })).resolves.toBeNull();
    await expect(
      t.mutation(internal.folderShares.claimVideoForPlayback, {
        grantToken,
        videoId: rootVideoId,
      }),
    ).resolves.toBeNull();
    await expect(t.query(api.folderShares.getByToken, { token: shareToken })).resolves.toEqual({
      status: "missing",
    });
    await expect(
      t.run((ctx) =>
        ctx.db
          .query("folderShareAccessGrants")
          .withIndex("by_token", (q) => q.eq("token", grantToken))
          .unique(),
      ),
    ).resolves.not.toBeNull();

    const fresh = await createShareAndGrant(t, rootId);
    await t.withIdentity({ subject: "owner" }).mutation(api.projects.remove, {
      projectId: rootId,
    });
    await expect(
      t.query(api.folderShares.getByToken, { token: fresh.shareToken }),
    ).resolves.toEqual({ status: "missing" });
    const immediate = await t.run(async (ctx) => ({
      project: await ctx.db.get(rootId),
      links: await ctx.db
        .query("folderShareLinks")
        .withIndex("by_project_id", (q) => q.eq("projectId", rootId))
        .take(1),
      grants: await ctx.db
        .query("folderShareAccessGrants")
        .withIndex("by_token", (q) => q.eq("token", fresh.grantToken))
        .take(1),
    }));
    expect(immediate.project?.deletionStartedAt).toEqual(expect.any(Number));
    expect(immediate.links).toEqual([]);
    expect(immediate.grants).toHaveLength(1);

    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const remaining = await t.run(async (ctx) => ({
      links: await ctx.db
        .query("folderShareLinks")
        .withIndex("by_project_id", (q) => q.eq("projectId", rootId))
        .take(1),
      oldGrants: await ctx.db
        .query("folderShareAccessGrants")
        .withIndex("by_token", (q) => q.eq("token", grantToken))
        .take(1),
      freshGrants: await ctx.db
        .query("folderShareAccessGrants")
        .withIndex("by_token", (q) => q.eq("token", fresh.grantToken))
        .take(1),
    }));
    expect(remaining).toEqual({ links: [], oldGrants: [], freshGrants: [] });
  } finally {
    vi.useRealTimers();
  }
});

test("team deletion removes durable links and access grants", async () => {
  vi.useFakeTimers();
  try {
    const { t, teamId, rootId } = await seedFolderShareFixture();
    const { shareToken, grantToken } = await createShareAndGrant(t, rootId);

    await t.withIdentity({ subject: "owner" }).mutation(api.teams.deleteTeam, { teamId });

    await expect(t.query(api.folderShares.getByToken, { token: shareToken })).resolves.toEqual({
      status: "missing",
    });
    const immediate = await t.run(async (ctx) => ({
      links: await ctx.db
        .query("folderShareLinks")
        .withIndex("by_token", (q) => q.eq("token", shareToken))
        .take(1),
      grants: await ctx.db
        .query("folderShareAccessGrants")
        .withIndex("by_token", (q) => q.eq("token", grantToken))
        .take(1),
    }));
    expect(immediate.links).toEqual([]);
    expect(immediate.grants).toHaveLength(1);

    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    await expect(
      t.run((ctx) =>
        ctx.db
          .query("folderShareAccessGrants")
          .withIndex("by_token", (q) => q.eq("token", grantToken))
          .take(1),
      ),
    ).resolves.toEqual([]);
  } finally {
    vi.useRealTimers();
  }
});
