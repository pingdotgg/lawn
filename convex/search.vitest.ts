/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import migrationsTest from "@convex-dev/migrations/test";
import { expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { triggers } from "./functions";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function videoFields(projectId: Id<"projects">, title: string) {
  return {
    projectId,
    uploadedByClerkId: "owner",
    uploaderName: "Owner",
    title,
    visibility: "public" as const,
    publicId: title,
    status: "ready" as const,
    workflowStatus: "review" as const,
  };
}

// Seeds through the trigger-wrapped db, like real mutations do.
async function seed() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (rawCtx) => {
    const ctx = triggers.wrapDB(rawCtx);
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
    const otherTeamId = await ctx.db.insert("teams", {
      name: "Other",
      slug: "other",
      ownerClerkId: "stranger",
      plan: "basic",
    });

    const campaignId = await ctx.db.insert("projects", { teamId, name: "Campaign" });
    const editsId = await ctx.db.insert("projects", {
      teamId,
      name: "Edits",
      parentId: campaignId,
    });
    const finalCutId = await ctx.db.insert("videos", videoFields(editsId, "FinalCut_v2.mp4"));
    const cafeId = await ctx.db.insert("videos", videoFields(campaignId, "Café interview"));
    const otherProjectId = await ctx.db.insert("projects", {
      teamId: otherTeamId,
      name: "Final secret",
    });
    await ctx.db.insert("videos", videoFields(otherProjectId, "Final secret cut"));

    return { teamId, campaignId, editsId, finalCutId, cafeId };
  });
  const owner = t.withIdentity({ subject: "owner", email: "owner@example.com", name: "Owner" });
  return { t, owner, ...ids };
}

test("search matches word prefixes, camelCase parts and folded accents", async () => {
  const { owner, finalCutId, cafeId, editsId } = await seed();

  const finCu = await owner.query(api.search.search, { teamSlug: "garden", query: "fin cu" });
  expect(finCu.map((r) => r.title)).toEqual(["FinalCut_v2.mp4"]);
  expect(finCu[0]).toMatchObject({
    kind: "video",
    videoId: finalCutId,
    projectId: editsId,
    path: "Campaign / Edits",
  });

  const cut = await owner.query(api.search.search, { teamSlug: "garden", query: "cut" });
  expect(cut.map((r) => r.title)).toEqual(["FinalCut_v2.mp4"]);

  const cafe = await owner.query(api.search.search, { teamSlug: "garden", query: "cafe" });
  expect(cafe).toMatchObject([{ videoId: cafeId, path: "Campaign" }]);

  const folder = await owner.query(api.search.search, { teamSlug: "garden", query: "edit" });
  expect(folder).toMatchObject([{ kind: "folder", title: "Edits", path: "Campaign" }]);
});

test("search is scoped to teams the caller belongs to", async () => {
  const { t, owner } = await seed();

  const results = await owner.query(api.search.search, { teamSlug: "garden", query: "final" });
  expect(results.map((r) => r.title)).toEqual(["FinalCut_v2.mp4"]);

  expect(await owner.query(api.search.search, { teamSlug: "other", query: "final" })).toEqual([]);
  expect(await t.query(api.search.search, { teamSlug: "garden", query: "final" })).toEqual([]);
});

test("renames and moves update entries, deletes remove them", async () => {
  vi.useFakeTimers();
  try {
    await renamesMovesAndDeletes();
  } finally {
    vi.useRealTimers();
  }
});

async function renamesMovesAndDeletes() {
  const { t, owner, campaignId, editsId, finalCutId } = await seed();
  const search = (query: string) => owner.query(api.search.search, { teamSlug: "garden", query });

  await owner.mutation(api.videos.update, { videoId: finalCutId, title: "Director cut" });
  expect(await search("final")).toEqual([]);
  expect((await search("director")).map((r) => r.title)).toEqual(["Director cut"]);

  await owner.mutation(api.videos.move, { videoId: finalCutId, projectId: campaignId });
  expect(await search("director")).toMatchObject([{ projectId: campaignId, path: "Campaign" }]);

  await owner.mutation(api.projects.update, { projectId: editsId, name: "Selects" });
  expect(await search("edits")).toEqual([]);
  expect(await search("selects")).toMatchObject([{ kind: "folder", title: "Selects" }]);

  await owner.mutation(api.videos.removeStack, { videoId: finalCutId });
  expect(await search("director")).toEqual([]);

  // Folder deletes run in scheduled batches.
  await owner.mutation(api.projects.remove, { projectId: campaignId });
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(await search("cafe")).toEqual([]);
  expect(await search("selects")).toEqual([]);
  expect(await search("campaign")).toEqual([]);
}

test("only the latest version of a stack is searchable", async () => {
  const { t, owner, editsId, finalCutId } = await seed();

  const latestId = await t.run(async (rawCtx) => {
    const ctx = triggers.wrapDB(rawCtx);
    const latestId = await ctx.db.insert("videos", {
      ...videoFields(editsId, "FinalCut_v2.mp4"),
      publicId: "final-v2",
      versionStackId: finalCutId,
      versionNumber: 2,
    });
    await ctx.db.patch(finalCutId, {
      versionStackId: finalCutId,
      versionNumber: 1,
      supersededByVideoId: latestId,
    });
    return latestId;
  });

  const results = await owner.query(api.search.search, { teamSlug: "garden", query: "final" });
  expect(results).toMatchObject([{ videoId: latestId }]);
});

test("recent lists the team's newest videos first", async () => {
  const { owner, finalCutId, cafeId } = await seed();
  const recent = await owner.query(api.search.recent, { teamSlug: "garden" });
  expect(recent.map((r) => r.kind === "video" && r.videoId)).toEqual([cafeId, finalCutId]);
});

test("migrations index rows written before the triggers existed", async () => {
  vi.useFakeTimers();
  try {
    await backfillIndexesExistingRows();
  } finally {
    vi.useRealTimers();
  }
});

async function backfillIndexesExistingRows() {
  const t = convexTest(schema, modules);
  migrationsTest.register(t);
  await t.run(async (ctx) => {
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
    const projectId = await ctx.db.insert("projects", { teamId, name: "Archive" });
    await ctx.db.insert("videos", videoFields(projectId, "Old trailer"));
  });
  const owner = t.withIdentity({ subject: "owner" });
  expect(await owner.query(api.search.search, { teamSlug: "garden", query: "trailer" })).toEqual(
    [],
  );

  await t.mutation(internal.migrations.runAll, {});
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());

  expect(
    (await owner.query(api.search.search, { teamSlug: "garden", query: "trailer" })).map(
      (r) => r.title,
    ),
  ).toEqual(["Old trailer"]);
  expect(
    (await owner.query(api.search.search, { teamSlug: "garden", query: "archive" })).map(
      (r) => r.title,
    ),
  ).toEqual(["Archive"]);
}
