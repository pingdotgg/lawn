/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

async function seedPublicVideo(opts?: { allowGuestComments?: boolean }) {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
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
      visibility: "public",
      publicId: "watch-guest-1",
      status: "ready",
      muxPlaybackId: "playback-guest-1",
      workflowStatus: "review",
      allowGuestComments: opts?.allowGuestComments,
    });
    return { teamId, projectId, videoId };
  });

  return { t, ...seeded };
}

test("public watch payload exposes allowGuestComments", async () => {
  const { t, videoId } = await seedPublicVideo({ allowGuestComments: true });

  const result = await t.query(api.videos.getByPublicId, { publicId: "watch-guest-1" });
  expect(result?.allowGuestComments).toBe(true);

  await t.withIdentity({ subject: "user_1" }).mutation(api.videos.setAllowGuestComments, {
    videoId: videoId as Id<"videos">,
    enabled: false,
  });

  const disabled = await t.query(api.videos.getByPublicId, { publicId: "watch-guest-1" });
  expect(disabled?.allowGuestComments).toBe(false);
});

test("rejects guest comments when allowGuestComments is off", async () => {
  const { t } = await seedPublicVideo();

  await expect(
    t.mutation(api.comments.createForPublic, {
      publicId: "watch-guest-1",
      text: "Looks good",
      timestampSeconds: 12,
      guestName: "Alex",
    }),
  ).rejects.toThrow(/Guest comments are not allowed/);
});

test("allows guest comments when allowGuestComments is on", async () => {
  const { t, videoId } = await seedPublicVideo({ allowGuestComments: true });

  const commentId = await t.mutation(api.comments.createForPublic, {
    publicId: "watch-guest-1",
    text: "Looks good at the open",
    timestampSeconds: 3.5,
    guestName: "  Client Name  ",
  });

  const stored = await t.run((ctx) => ctx.db.get(commentId));
  expect(stored).toMatchObject({
    videoId,
    text: "Looks good at the open",
    timestampSeconds: 3.5,
    userName: "Client Name",
    resolved: false,
  });
  expect(stored?.userClerkId).toBeUndefined();

  const threaded = await t.query(api.comments.getThreadedForPublic, {
    publicId: "watch-guest-1",
  });
  expect(threaded).toHaveLength(1);
  expect(threaded[0]?.userName).toBe("Client Name");
});

test("signed-in users can still comment without guest name", async () => {
  const { t } = await seedPublicVideo();

  const commentId = await t
    .withIdentity({ subject: "user_reviewer", name: "Reviewer" })
    .mutation(api.comments.createForPublic, {
      publicId: "watch-guest-1",
      text: "Signed-in note",
      timestampSeconds: 1,
    });

  const stored = await t.run((ctx) => ctx.db.get(commentId));
  expect(stored).toMatchObject({
    userClerkId: "user_reviewer",
    userName: "Reviewer",
    text: "Signed-in note",
  });
});

test("setAllowGuestComments applies across a version stack", async () => {
  const { t, videoId } = await seedPublicVideo();

  const v2 = await t.run(async (ctx) => {
    await ctx.db.patch(videoId as Id<"videos">, {
      versionStackId: videoId as Id<"videos">,
      versionNumber: 1,
    });
    return await ctx.db.insert("videos", {
      projectId: (await ctx.db.get(videoId as Id<"videos">))!.projectId,
      uploadedByClerkId: "user_1",
      uploaderName: "Owner",
      title: "First cut",
      visibility: "public",
      publicId: "watch-guest-2",
      status: "ready",
      muxPlaybackId: "playback-guest-2",
      workflowStatus: "review",
      versionStackId: videoId as Id<"videos">,
      versionNumber: 2,
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.patch(videoId as Id<"videos">, { supersededByVideoId: v2 });
  });

  await t.withIdentity({ subject: "user_1" }).mutation(api.videos.setAllowGuestComments, {
    videoId: v2 as Id<"videos">,
    enabled: true,
  });

  const flags = await t.run(async (ctx) => ({
    v1: (await ctx.db.get(videoId as Id<"videos">))?.allowGuestComments,
    v2: (await ctx.db.get(v2))?.allowGuestComments,
  }));

  expect(flags).toEqual({ v1: true, v2: true });
});
