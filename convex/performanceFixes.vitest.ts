/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("video pages remain accessible and expose capped comment counts", async () => {
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
    const videoIds: Id<"videos">[] = [];
    for (let index = 0; index < 45; index += 1) {
      videoIds.push(
        await ctx.db.insert("videos", {
          projectId,
          uploadedByClerkId: "owner",
          uploaderName: "Owner",
          title: `Video ${index}`,
          visibility: "public",
          publicId: `video-${index}`,
          status: "ready",
          workflowStatus: "review",
        }),
      );
    }
    const newestVideoId = videoIds.at(-1)!;
    for (let index = 0; index < 201; index += 1) {
      await ctx.db.insert("comments", {
        videoId: newestVideoId,
        userClerkId: "owner",
        userName: "Owner",
        text: `Comment ${index}`,
        timestampSeconds: index,
        resolved: false,
      });
    }
    return { projectId, videoIds, newestVideoId };
  });

  const authed = t.withIdentity({ subject: "owner" });
  const first = await authed.query(api.videos.list, {
    projectId: seeded.projectId,
    paginationOpts: { cursor: null, numItems: 40 },
  });
  const second = await authed.query(api.videos.list, {
    projectId: seeded.projectId,
    paginationOpts: { cursor: first.continueCursor, numItems: 40 },
  });

  expect(first.page).toHaveLength(40);
  expect(first.isDone).toBe(false);
  expect(second.page).toHaveLength(5);
  expect(second.isDone).toBe(true);
  expect(new Set([...first.page, ...second.page].map((video) => video._id))).toEqual(
    new Set(seeded.videoIds),
  );
  expect(first.page.find((video) => video._id === seeded.newestVideoId)).toMatchObject({
    commentCount: 200,
    commentCountIsCapped: true,
  });
});

test("folder count responses identify capped values", async () => {
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
    for (let index = 0; index < 101; index += 1) {
      await ctx.db.insert("projects", {
        teamId,
        name: `Folder ${index}`,
        parentId: projectId,
      });
      await ctx.db.insert("videos", {
        projectId,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        title: `Video ${index}`,
        visibility: "public",
        publicId: `count-video-${index}`,
        status: "ready",
        workflowStatus: "review",
      });
    }
    return { teamId, projectId };
  });

  const projects = await t
    .withIdentity({ subject: "owner" })
    .query(api.projects.list, { teamId: seeded.teamId });
  expect(projects.find((project) => project._id === seeded.projectId)).toMatchObject({
    videoCount: 100,
    videoCountIsCapped: true,
    subfolderCount: 100,
    subfolderCountIsCapped: true,
  });
});

test("stale upload selection includes legacy rows without activity timestamps", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    const projectId = await ctx.db.insert("projects", { teamId, name: "Campaign" });
    const legacyVideoId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Legacy upload",
      visibility: "public",
      publicId: "legacy-upload",
      status: "uploading",
      workflowStatus: "review",
    });
    const datedVideoId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Dated upload",
      visibility: "public",
      publicId: "dated-upload",
      status: "uploading",
      workflowStatus: "review",
      uploadUpdatedAt: 1,
    });
    return { legacyVideoId, datedVideoId };
  });

  const candidates = await t.query(internal.videos.listStaleUploadCandidates, {
    cutoff: Date.now() + 1_000,
    limit: 2,
  });
  expect(new Set(candidates.map((candidate) => candidate.videoId))).toEqual(
    new Set([seeded.legacyVideoId, seeded.datedVideoId]),
  );
});

test("asset-less Mux rows rotate so valid candidates cannot remain blocked", async () => {
  const t = convexTest(schema, modules);
  const validVideoId = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    const projectId = await ctx.db.insert("projects", { teamId, name: "Campaign" });
    for (let index = 0; index < 30; index += 1) {
      await ctx.db.insert("videos", {
        projectId,
        uploadedByClerkId: "owner",
        uploaderName: "Owner",
        title: `Interrupted ${index}`,
        visibility: "public",
        publicId: `interrupted-${index}`,
        status: "processing",
        workflowStatus: "review",
        muxLastPolledAt: 0,
      });
    }
    return await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Valid asset",
      visibility: "public",
      publicId: "valid-asset",
      status: "processing",
      workflowStatus: "review",
      muxAssetId: "mux-valid",
      muxLastPolledAt: 1,
    });
  });

  const first = await t.mutation(internal.videos.claimMuxProcessingCandidates, { limit: 10 });
  const second = await t.mutation(internal.videos.claimMuxProcessingCandidates, { limit: 10 });

  expect(first).toEqual([]);
  expect(second).toContainEqual({ videoId: validVideoId, muxAssetId: "mux-valid" });
});
