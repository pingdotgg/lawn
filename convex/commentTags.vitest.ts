/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { MAX_COMMENT_TAGS, MAX_TAG_LENGTH, normalizeCommentTags } from "./comments";

const modules = import.meta.glob("./**/*.ts");

test("normalizeCommentTags trims, dedupes, and enforces limits", () => {
  expect(normalizeCommentTags(undefined)).toEqual([]);
  expect(normalizeCommentTags(["  In-Out  ", "in-out", "Audio"])).toEqual(["In-Out", "Audio"]);
  expect(() => normalizeCommentTags(["x".repeat(MAX_TAG_LENGTH + 1)])).toThrow(/characters/);
  expect(() =>
    normalizeCommentTags(Array.from({ length: MAX_COMMENT_TAGS + 1 }, (_, i) => `t${i}`)),
  ).toThrow(/at most/);
});

async function seedTeam() {
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
    const projectId = await ctx.db.insert("projects", { teamId, name: "Campaign" });
    const videoId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut 1",
      visibility: "private",
      publicId: "vid-tags",
      status: "ready",
      workflowStatus: "review",
    });
    return { videoId };
  });
  return { t, ...seeded };
}

test("members can set tags; viewers cannot", async () => {
  const { t, videoId } = await seedTeam();

  const commentId = await t.withIdentity({ subject: "owner" }).mutation(api.comments.create, {
    videoId,
    text: "Trim the intro",
    timestampSeconds: 12,
  });

  await t.withIdentity({ subject: "member" }).mutation(api.comments.setTags, {
    commentId,
    tags: ["In-Out", "  in-out ", "Audio"],
  });

  const threaded = await t.withIdentity({ subject: "owner" }).query(api.comments.getThreaded, {
    videoId,
  });
  expect(threaded).toHaveLength(1);
  expect(threaded[0]?.tags).toEqual(["In-Out", "Audio"]);

  await expect(
    t.withIdentity({ subject: "viewer" }).mutation(api.comments.setTags, {
      commentId,
      tags: ["Nope"],
    }),
  ).rejects.toThrow();
});

test("create accepts tags only for member+ roles", async () => {
  const { t, videoId } = await seedTeam();

  const memberCommentId = await t.withIdentity({ subject: "member" }).mutation(api.comments.create, {
    videoId,
    text: "Color grade sky",
    timestampSeconds: 30,
    tags: ["Color"],
  });

  const memberDoc = await t.run((ctx) => ctx.db.get(memberCommentId));
  expect(memberDoc?.tags).toEqual(["Color"]);

  // Viewers can comment but tags are ignored.
  const viewerCommentId = await t.withIdentity({ subject: "viewer" }).mutation(api.comments.create, {
    videoId,
    text: "Looks good",
    timestampSeconds: 40,
    tags: ["ShouldIgnore"],
  });
  const viewerDoc = await t.run((ctx) => ctx.db.get(viewerCommentId));
  expect(viewerDoc?.tags).toBeUndefined();
});

test("public threaded payload includes tags", async () => {
  const { t, videoId } = await seedTeam();

  await t.run(async (ctx) => {
    await ctx.db.patch(videoId, { visibility: "public" });
  });

  await t.withIdentity({ subject: "owner" }).mutation(api.comments.create, {
    videoId,
    text: "Public note",
    timestampSeconds: 5,
    tags: ["Note"],
  });

  const publicThreaded = await t.query(api.comments.getThreadedForPublic, {
    publicId: "vid-tags",
  });
  expect(publicThreaded[0]?.tags).toEqual(["Note"]);
});
