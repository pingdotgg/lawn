/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createVersionRecord, MAX_BULK_VIDEO_ACTION } from "./videos";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

type Role = "owner" | "admin" | "member" | "viewer";

async function seed(role: Role = "admin") {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const insertTeam = async (slug: string) => {
      const teamId = await ctx.db.insert("teams", {
        name: slug,
        slug,
        ownerClerkId: "owner",
        plan: "basic",
      });
      await ctx.db.insert("teamMembers", {
        teamId,
        userClerkId: "user_1",
        userEmail: "user@example.com",
        userName: "User",
        role,
      });
      return teamId;
    };
    const teamId = await insertTeam("garden");
    const otherTeamId = await insertTeam("orchard");
    const sourceProjectId = await ctx.db.insert("projects", { teamId, name: "Source" });
    const destinationProjectId = await ctx.db.insert("projects", {
      teamId,
      name: "Destination",
    });
    const otherTeamProjectId = await ctx.db.insert("projects", {
      teamId: otherTeamId,
      name: "Elsewhere",
    });
    const insertVideo = (publicId: string) =>
      ctx.db.insert("videos", {
        projectId: sourceProjectId,
        uploadedByClerkId: "user_1",
        uploaderName: "User",
        title: publicId,
        visibility: "public",
        publicId,
        status: "ready",
        workflowStatus: "review",
      });
    const a1 = await insertVideo("a1");
    const b1 = await insertVideo("b1");
    return { sourceProjectId, destinationProjectId, otherTeamProjectId, a1, b1 };
  });

  const { videoId: a2 } = await t.run((ctx) =>
    createVersionRecord(ctx, {
      sourceVideoId: seeded.a1,
      uploadedByClerkId: "user_1",
      uploaderName: "User",
      publicId: "a2",
    }),
  );

  return {
    t,
    authed: t.withIdentity({ subject: "user_1" }),
    ...seeded,
    a2,
    allIds: [seeded.a1, a2, seeded.b1],
  };
}

function getProjectIds(t: ReturnType<typeof convexTest>, videoIds: Id<"videos">[]) {
  return t.run((ctx) =>
    Promise.all(videoIds.map(async (videoId) => (await ctx.db.get(videoId))?.projectId)),
  );
}

test("moveMany moves every version of each selected stack", async () => {
  const { t, authed, a1, a2, b1, allIds, destinationProjectId } = await seed();

  // Two versions of the same stack plus a duplicate id must not double-process.
  await authed.mutation(api.videos.moveMany, {
    videoIds: [a1, a2, b1, b1],
    projectId: destinationProjectId,
  });

  expect(await getProjectIds(t, allIds)).toEqual(allIds.map(() => destinationProjectId));
});

test("moveMany rejects a cross-team destination and rolls back", async () => {
  const { t, authed, a1, a2, b1, sourceProjectId, destinationProjectId, otherTeamProjectId } =
    await seed();
  // The first stack moves cleanly, then b1 (on another team) fails.
  await t.run((ctx) => ctx.db.patch(b1, { projectId: otherTeamProjectId }));

  await expect(
    authed.mutation(api.videos.moveMany, {
      videoIds: [a1, b1],
      projectId: destinationProjectId,
    }),
  ).rejects.toThrow("Can't move a video to a different team");

  expect(await getProjectIds(t, [a1, a2, b1])).toEqual([
    sourceProjectId,
    sourceProjectId,
    otherTeamProjectId,
  ]);
});

test("removeStacks requires admin", async () => {
  const { t, authed, a1, b1, allIds } = await seed("member");

  await expect(authed.mutation(api.videos.removeStacks, { videoIds: [a1, b1] })).rejects.toThrow(
    "Requires admin role or higher",
  );

  const remaining = await t.run((ctx) => Promise.all(allIds.map((id) => ctx.db.get(id))));
  expect(remaining.every((video) => video !== null)).toBe(true);
});

test("removeStacks deletes every version of each selected stack", async () => {
  vi.useFakeTimers();
  try {
    const { t, authed, a2, b1, allIds } = await seed();

    await authed.mutation(api.videos.removeStacks, { videoIds: [a2, b1, a2] });

    const removed = await t.run((ctx) => Promise.all(allIds.map((id) => ctx.db.get(id))));
    expect(removed).toEqual([null, null, null]);
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  } finally {
    vi.useRealTimers();
  }
});

test("updateWorkflowStatusMany updates each selected video", async () => {
  const { t, authed, a2, b1 } = await seed("member");

  await authed.mutation(api.videos.updateWorkflowStatusMany, {
    videoIds: [a2, b1],
    workflowStatus: "done",
  });

  const statuses = await t.run((ctx) =>
    Promise.all([a2, b1].map(async (id) => (await ctx.db.get(id))?.workflowStatus)),
  );
  expect(statuses).toEqual(["done", "done"]);
});

test("bulk actions reject selections over the cap", async () => {
  const { authed, a1, destinationProjectId } = await seed();
  const videoIds = Array.from({ length: MAX_BULK_VIDEO_ACTION + 1 }, () => a1);

  await expect(
    authed.mutation(api.videos.moveMany, { videoIds, projectId: destinationProjectId }),
  ).rejects.toThrow(`at most ${MAX_BULK_VIDEO_ACTION} videos`);
  await expect(authed.mutation(api.videos.removeStacks, { videoIds })).rejects.toThrow(
    `at most ${MAX_BULK_VIDEO_ACTION} videos`,
  );
  await expect(
    authed.mutation(api.videos.updateWorkflowStatusMany, { videoIds, workflowStatus: "done" }),
  ).rejects.toThrow(`at most ${MAX_BULK_VIDEO_ACTION} videos`);
});
