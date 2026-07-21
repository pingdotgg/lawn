/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const issuerA = "https://issuer-a.example";
const issuerB = "https://issuer-b.example";

async function seedTeam(options?: { canonicalIdentity?: string }) {
  const t = convexTest(schema, modules);
  const teamId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      ownerIdentity: options?.canonicalIdentity,
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId: id,
      userClerkId: "owner",
      userIdentity: options?.canonicalIdentity,
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    return id;
  });
  return { t, teamId };
}

test("invite tokens are secure, unique base62 values", async () => {
  const { t, teamId } = await seedTeam({ canonicalIdentity: `${issuerA}|owner` });
  const owner = t.withIdentity({
    issuer: issuerA,
    subject: "owner",
    email: "owner@example.com",
    name: "Owner",
  });
  const random = vi.spyOn(Math, "random").mockReturnValue(0);

  try {
    const first = await owner.mutation(api.teams.inviteMember, {
      teamId,
      email: "one@example.com",
      role: "member",
    });
    const second = await owner.mutation(api.teams.inviteMember, {
      teamId,
      email: "two@example.com",
      role: "viewer",
    });

    expect(first).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(second).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(second).not.toBe(first);
  } finally {
    random.mockRestore();
  }
});

test("canonical membership does not trust the same subject from another issuer", async () => {
  const { t, teamId } = await seedTeam({ canonicalIdentity: `${issuerA}|owner` });

  await expect(
    t.withIdentity({ issuer: issuerA, subject: "owner" }).query(api.teams.get, { teamId }),
  ).resolves.toMatchObject({ _id: teamId, role: "owner" });
  await expect(
    t.withIdentity({ issuer: issuerB, subject: "owner" }).query(api.teams.get, { teamId }),
  ).rejects.toThrow("Not a team member");
});

test("unmigrated membership remains usable during the rollout", async () => {
  const { t, teamId } = await seedTeam();

  await expect(
    t.withIdentity({ issuer: issuerA, subject: "owner" }).query(api.teams.get, { teamId }),
  ).resolves.toMatchObject({ _id: teamId, role: "owner" });
});

test("canonical comment ownership does not trust the same subject from another issuer", async () => {
  const { t, teamId } = await seedTeam({ canonicalIdentity: `${issuerA}|owner` });
  const commentId = await t.run(async (ctx) => {
    const projectId = await ctx.db.insert("projects", { teamId, name: "Campaign" });
    const videoId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploadedByIdentity: `${issuerA}|owner`,
      uploaderName: "Owner",
      title: "First cut",
      visibility: "private",
      publicId: "first-cut",
      status: "ready",
      workflowStatus: "review",
    });
    return await ctx.db.insert("comments", {
      videoId,
      userClerkId: "owner",
      userIdentity: `${issuerA}|owner`,
      userName: "Owner",
      text: "Original",
      timestampSeconds: 1,
      resolved: false,
    });
  });

  await expect(
    t
      .withIdentity({ issuer: issuerB, subject: "owner" })
      .mutation(api.comments.update, { commentId, text: "Changed" }),
  ).rejects.toThrow("You can only edit your own comments");
});

test("video deletion schedules external asset cleanup before removing the row", async () => {
  vi.useFakeTimers();
  try {
    const { t, teamId } = await seedTeam({ canonicalIdentity: `${issuerA}|owner` });
    const videoId = await t.run(async (ctx) => {
      const projectId = await ctx.db.insert("projects", { teamId, name: "Campaign" });
      return await ctx.db.insert("videos", {
        projectId,
        uploadedByClerkId: "owner",
        uploadedByIdentity: `${issuerA}|owner`,
        uploaderName: "Owner",
        title: "First cut",
        visibility: "private",
        publicId: "delete-me",
        s3Key: "uploads/delete-me.mp4",
        muxAssetId: "mux-delete-me",
        status: "ready",
        workflowStatus: "review",
      });
    });

    await t
      .withIdentity({ issuer: issuerA, subject: "owner" })
      .mutation(api.videos.remove, { videoId });

    const state = await t.run(async (ctx) => ({
      video: await ctx.db.get(videoId),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    }));
    expect(state.video).toBeNull();
    expect(state.scheduled).toEqual([
      expect.objectContaining({
        name: "videoActions:deleteVideoAssets",
        args: [{ s3Key: "uploads/delete-me.mp4", muxAssetId: "mux-delete-me" }],
        state: { kind: "pending" },
      }),
    ]);
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
  }
});

test("team deletion drains nested projects and their dependents in scheduled batches", async () => {
  vi.useFakeTimers();
  try {
    const { t, teamId } = await seedTeam({ canonicalIdentity: `${issuerA}|owner` });
    await t.run(async (ctx) => {
      const rootId = await ctx.db.insert("projects", { teamId, name: "Root" });
      const childId = await ctx.db.insert("projects", {
        teamId,
        name: "Child",
        parentId: rootId,
      });
      const videoId = await ctx.db.insert("videos", {
        projectId: childId,
        uploadedByClerkId: "owner",
        uploadedByIdentity: `${issuerA}|owner`,
        uploaderName: "Owner",
        title: "First cut",
        visibility: "private",
        publicId: "nested-video",
        status: "ready",
        workflowStatus: "review",
      });
      await ctx.db.insert("comments", {
        videoId,
        userClerkId: "owner",
        userIdentity: `${issuerA}|owner`,
        userName: "Owner",
        text: "Review note",
        timestampSeconds: 1,
        resolved: false,
      });
      await ctx.db.insert("teamInvites", {
        teamId,
        email: "member@example.com",
        role: "member",
        invitedByClerkId: "owner",
        invitedByIdentity: `${issuerA}|owner`,
        invitedByName: "Owner",
        token: "invite-token",
        expiresAt: Date.now() + 60_000,
      });
    });

    await t.mutation(internal.teams.continueTeamDelete, { teamId });
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());

    const remaining = await t.run(async (ctx) => ({
      teams: await ctx.db.query("teams").collect(),
      members: await ctx.db.query("teamMembers").collect(),
      invites: await ctx.db.query("teamInvites").collect(),
      projects: await ctx.db.query("projects").collect(),
      videos: await ctx.db.query("videos").collect(),
      comments: await ctx.db.query("comments").collect(),
    }));
    expect(remaining).toEqual({
      teams: [],
      members: [],
      invites: [],
      projects: [],
      videos: [],
      comments: [],
    });
  } finally {
    vi.useRealTimers();
  }
});
