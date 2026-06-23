/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { normalizeDashboardSortText } from "./dashboardSort";
import { propagateProjectUploadRecency } from "./projectRecency";

const modules = import.meta.glob("./**/*.ts");

async function seedDashboardVideos() {
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
    const projectId = await ctx.db.insert("projects", { teamId, name: "Campaign" });
    const alphaId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "alpha",
      sortTitle: normalizeDashboardSortText("alpha"),
      visibility: "public",
      publicId: "alpha",
      status: "ready",
      workflowStatus: "review",
    });
    const retiredId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Aardvark retired version",
      sortTitle: normalizeDashboardSortText("Aardvark retired version"),
      visibility: "public",
      publicId: "retired",
      status: "ready",
      workflowStatus: "review",
    });
    const gammaId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "gamma",
      sortTitle: normalizeDashboardSortText("gamma"),
      visibility: "public",
      publicId: "gamma",
      status: "ready",
      workflowStatus: "review",
    });
    await ctx.db.patch(retiredId, { supersededByVideoId: gammaId });
    const betaId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Beta",
      sortTitle: normalizeDashboardSortText("Beta"),
      visibility: "public",
      publicId: "beta",
      status: "ready",
      workflowStatus: "review",
    });
    const beta = await ctx.db.get(betaId);
    await ctx.db.patch(projectId, {
      latestDescendantUploadAt: beta!._creationTime - 1,
    });
    return {
      teamId,
      projectId,
      alphaId,
      retiredId,
      gammaId,
      betaId,
      newestHeadUploadedAt: beta!._creationTime,
    };
  });
  return { t, seeded };
}

test("video dashboard sorting defaults to newest heads only", async () => {
  const { t, seeded } = await seedDashboardVideos();
  const result = await t.withIdentity({ subject: "owner" }).query(api.videos.list, {
    projectId: seeded.projectId,
    paginationOpts: { cursor: null, numItems: 10 },
  });

  expect(result.page.map((video) => video._id)).toEqual([
    seeded.betaId,
    seeded.gammaId,
    seeded.alphaId,
  ]);
  expect(result.page.map((video) => video._id)).not.toContain(seeded.retiredId);
});

test("alphabetical video sorting stays correct across pages and excludes superseded versions", async () => {
  const { t, seeded } = await seedDashboardVideos();
  const authed = t.withIdentity({ subject: "owner" });
  const first = await authed.query(api.videos.list, {
    projectId: seeded.projectId,
    sort: "alphabetical",
    paginationOpts: { cursor: null, numItems: 2 },
  });
  const second = await authed.query(api.videos.list, {
    projectId: seeded.projectId,
    sort: "alphabetical",
    paginationOpts: { cursor: first.continueCursor, numItems: 2 },
  });

  expect(first.isDone).toBe(false);
  expect([...first.page, ...second.page].map((video) => video.title)).toEqual([
    "alpha",
    "Beta",
    "gamma",
  ]);
  expect([...first.page, ...second.page].map((video) => video._id)).not.toContain(seeded.retiredId);
});

test("alphabetical sorting stays gated until every legacy title key is backfilled", async () => {
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
    const projectId = await ctx.db.insert("projects", { teamId, name: "Campaign" });
    const legacyId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "alpha",
      visibility: "public",
      publicId: "legacy-alpha",
      status: "ready",
      workflowStatus: "review",
    });
    await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Zulu",
      sortTitle: normalizeDashboardSortText("Zulu"),
      visibility: "public",
      publicId: "keyed-zulu",
      status: "ready",
      workflowStatus: "review",
    });
    return { projectId, legacyId };
  });
  const authed = t.withIdentity({ subject: "owner" });
  expect(await authed.query(api.dashboardSort.isAlphabeticalReady)).toBe(false);
  expect(await t.query(internal.dashboardSort.verifyAlphabeticalReady)).toBe(false);

  const gated = await authed.query(api.videos.list, {
    projectId: seeded.projectId,
    sort: "alphabetical",
    paginationOpts: { cursor: null, numItems: 10 },
  });
  expect(gated.page.map((video) => video.title)).toEqual(["Zulu", "alpha"]);

  await t.run(async (ctx) => {
    await ctx.db.patch(seeded.legacyId, {
      sortTitle: normalizeDashboardSortText("alpha"),
    });
  });
  expect(await authed.query(api.dashboardSort.isAlphabeticalReady)).toBe(true);
  expect(await t.query(internal.dashboardSort.verifyAlphabeticalReady)).toBe(true);
  const alphabetical = await authed.query(api.videos.list, {
    projectId: seeded.projectId,
    sort: "alphabetical",
    paginationOpts: { cursor: null, numItems: 10 },
  });
  expect(alphabetical.page.map((video) => video.title)).toEqual(["alpha", "Zulu"]);
});

test("partial project recency backfills cannot hide a newer direct upload", async () => {
  const { t, seeded } = await seedDashboardVideos();
  const projects = await t
    .withIdentity({ subject: "owner" })
    .query(api.projects.list, { teamId: seeded.teamId });

  expect(projects).toHaveLength(1);
  expect(projects[0].lastUploadedAt).toBe(seeded.newestHeadUploadedAt);
});

test("descendant upload recency is maintained through folder moves and video deletion", async () => {
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
    const firstRootId = await ctx.db.insert("projects", { teamId, name: "First" });
    const secondRootId = await ctx.db.insert("projects", { teamId, name: "Second" });
    const childId = await ctx.db.insert("projects", {
      teamId,
      name: "Child",
      parentId: firstRootId,
    });
    const videoId = await ctx.db.insert("videos", {
      projectId: childId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Nested upload",
      sortTitle: normalizeDashboardSortText("Nested upload"),
      visibility: "public",
      publicId: "nested-upload",
      status: "ready",
      workflowStatus: "review",
    });
    const video = await ctx.db.get(videoId);
    await propagateProjectUploadRecency(ctx, childId, video!._creationTime);
    return {
      teamId,
      firstRootId,
      secondRootId,
      childId,
      videoId,
      uploadedAt: video!._creationTime,
    };
  });
  const authed = t.withIdentity({ subject: "owner" });

  let roots = await authed.query(api.projects.list, { teamId: seeded.teamId });
  expect(roots.find((project) => project._id === seeded.firstRootId)?.lastUploadedAt).toBe(
    seeded.uploadedAt,
  );

  await authed.mutation(api.projects.move, {
    projectId: seeded.childId,
    newParentId: seeded.secondRootId,
  });
  roots = await authed.query(api.projects.list, { teamId: seeded.teamId });
  expect(
    roots.find((project) => project._id === seeded.firstRootId)?.lastUploadedAt,
  ).toBeUndefined();
  expect(roots.find((project) => project._id === seeded.secondRootId)?.lastUploadedAt).toBe(
    seeded.uploadedAt,
  );

  await authed.mutation(api.videos.remove, { videoId: seeded.videoId });
  roots = await authed.query(api.projects.list, { teamId: seeded.teamId });
  expect(
    roots.find((project) => project._id === seeded.secondRootId)?.lastUploadedAt,
  ).toBeUndefined();
});

test("multi-batch folder deletion clears recency from a parent changed between batches", async () => {
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
    const firstParentId = await ctx.db.insert("projects", { teamId, name: "First" });
    const secondParentId = await ctx.db.insert("projects", { teamId, name: "Second" });
    const rootProjectId = await ctx.db.insert("projects", {
      teamId,
      name: "Deleting",
      parentId: firstParentId,
    });
    const videoId = await ctx.db.insert("videos", {
      projectId: rootProjectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Large discussion",
      sortTitle: normalizeDashboardSortText("Large discussion"),
      visibility: "public",
      publicId: "large-discussion",
      status: "ready",
      workflowStatus: "review",
    });
    for (let index = 0; index < 501; index += 1) {
      await ctx.db.insert("comments", {
        videoId,
        userClerkId: "owner",
        userName: "Owner",
        text: `Comment ${index}`,
        timestampSeconds: index,
        resolved: false,
      });
    }
    const video = await ctx.db.get(videoId);
    await propagateProjectUploadRecency(ctx, rootProjectId, video!._creationTime);
    return { teamId, firstParentId, secondParentId, rootProjectId };
  });
  const authed = t.withIdentity({ subject: "owner" });

  await authed.mutation(api.projects.remove, { projectId: seeded.rootProjectId });
  await authed.mutation(api.projects.move, {
    projectId: seeded.rootProjectId,
    newParentId: seeded.secondParentId,
  });
  await t.mutation(internal.projects.continueSubtreeDelete, {
    teamId: seeded.teamId,
    rootProjectId: seeded.rootProjectId,
    previousParentId: seeded.firstParentId,
  });

  const roots = await authed.query(api.projects.list, { teamId: seeded.teamId });
  expect(
    roots.find((project) => project._id === seeded.firstParentId)?.lastUploadedAt,
  ).toBeUndefined();
  expect(
    roots.find((project) => project._id === seeded.secondParentId)?.lastUploadedAt,
  ).toBeUndefined();
});
