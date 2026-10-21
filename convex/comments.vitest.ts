/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedReviewVideo() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: "member",
      userEmail: "member@example.com",
      userName: "Member",
      role: "member",
    });
    const projectId = await ctx.db.insert("projects", {
      teamId,
      name: "Campaign",
    });
    const videoId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "member",
      uploaderName: "Member",
      title: "Cut",
      visibility: "public",
      publicId: "cut",
      status: "ready",
      workflowStatus: "review",
    });
    const otherVideoId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "member",
      uploaderName: "Member",
      title: "Other",
      visibility: "private",
      publicId: "other",
      status: "ready",
      workflowStatus: "review",
    });
    const shareLinkId = await ctx.db.insert("shareLinks", {
      videoId,
      token: "share-token",
      createdByClerkId: "member",
      createdByName: "Member",
      allowDownload: false,
      viewCount: 0,
    });
    await ctx.db.insert("shareAccessGrants", {
      shareLinkId,
      token: "grant-token",
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    });
    return { videoId, otherVideoId };
  });

  return {
    t,
    member: t.withIdentity({ subject: "member", name: "Member" }),
    guest: t.withIdentity({ subject: "guest", name: "Guest" }),
    ...ids,
  };
}

test("replies nest one level under the parent on review, watch, and share", async () => {
  const { t, member, guest, videoId } = await seedReviewVideo();

  const rootId = await member.mutation(api.comments.create, {
    videoId,
    text: "Hold the logo longer",
    timestampSeconds: 12,
  });
  const replyId = await guest.mutation(api.comments.createForPublic, {
    publicId: "cut",
    text: "Agreed",
    timestampSeconds: 12,
    parentId: rootId,
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("comments", {
      videoId,
      userClerkId: "guest",
      userName: "Guest",
      text: "Legacy nested reply",
      timestampSeconds: 40,
      parentId: replyId,
      resolved: false,
    });
  });

  const threads = await member.query(api.comments.getThreaded, { videoId });
  expect(threads.map((thread) => thread.text)).toEqual(["Hold the logo longer"]);
  expect(threads[0]?.replies.map((reply) => reply.text)).toEqual(["Agreed", "Legacy nested reply"]);
  expect(
    threads[0]?.replies.every((reply) => reply.parentId === rootId || reply.parentId === replyId),
  ).toBe(true);

  const watch = await t.query(api.comments.getThreadedForPublic, { publicId: "cut" });
  expect(watch).toHaveLength(1);
  expect(watch[0]).not.toHaveProperty("userClerkId");
  expect(watch[0]?.replies.map((reply) => reply.text)).toEqual(["Agreed", "Legacy nested reply"]);
  expect(watch[0]?.replies[0]).not.toHaveProperty("userClerkId");

  const share = await t.query(api.comments.getThreadedForShareGrant, { grantToken: "grant-token" });
  expect(share[0]?.replies.map((reply) => reply.userName)).toEqual(["Guest", "Guest"]);
  expect(share[0]).not.toHaveProperty("userClerkId");
});

test("a reply to a reply is stored on the thread root", async () => {
  const { member, guest, videoId, otherVideoId } = await seedReviewVideo();

  const rootId = await member.mutation(api.comments.create, {
    videoId,
    text: "Root",
    timestampSeconds: 1,
  });
  const replyId = await member.mutation(api.comments.create, {
    videoId,
    text: "Reply",
    timestampSeconds: 1,
    parentId: rootId,
  });
  const otherRootId = await member.mutation(api.comments.create, {
    videoId: otherVideoId,
    text: "Other video",
    timestampSeconds: 1,
  });

  await member.mutation(api.comments.create, {
    videoId,
    text: "From review",
    timestampSeconds: 1,
    parentId: replyId,
  });
  await guest.mutation(api.comments.createForPublic, {
    publicId: "cut",
    text: "From watch",
    timestampSeconds: 1,
    parentId: replyId,
  });
  await guest.mutation(api.comments.createForShareGrant, {
    grantToken: "grant-token",
    text: "From share",
    timestampSeconds: 1,
    parentId: replyId,
  });

  const threads = await member.query(api.comments.getThreaded, { videoId });
  expect(threads).toHaveLength(1);
  expect(threads[0]?.replies.map((reply) => [reply.text, reply.parentId])).toEqual([
    ["Reply", rootId],
    ["From review", rootId],
    ["From watch", rootId],
    ["From share", rootId],
  ]);

  await expect(
    member.mutation(api.comments.create, {
      videoId,
      text: "Wrong video",
      timestampSeconds: 1,
      parentId: otherRootId,
    }),
  ).rejects.toThrow("Invalid parent comment");
});

test("a comment whose parent is gone can still take replies", async () => {
  const { t, member, videoId } = await seedReviewVideo();

  const orphanId = await t.run(async (ctx) => {
    const goneId = await ctx.db.insert("comments", {
      videoId,
      userClerkId: "member",
      userName: "Member",
      text: "Gone",
      timestampSeconds: 2,
      resolved: false,
    });
    const orphanId = await ctx.db.insert("comments", {
      videoId,
      userClerkId: "member",
      userName: "Member",
      text: "Orphan",
      timestampSeconds: 2,
      parentId: goneId,
      resolved: false,
    });
    await ctx.db.delete(goneId);
    return orphanId;
  });

  const replyId = await member.mutation(api.comments.create, {
    videoId,
    text: "Reply to orphan",
    timestampSeconds: 2,
    parentId: orphanId,
  });
  await member.mutation(api.comments.create, {
    videoId,
    text: "Reply to that reply",
    timestampSeconds: 2,
    parentId: replyId,
  });

  const threads = await member.query(api.comments.getThreaded, { videoId });
  expect(threads.map((thread) => thread._id)).toEqual([orphanId]);
  expect(threads[0]?.replies.map((reply) => [reply.text, reply.parentId])).toEqual([
    ["Reply to orphan", orphanId],
    ["Reply to that reply", orphanId],
  ]);
});

test("deleting a comment deletes replies nested under it", async () => {
  const { t, member, videoId } = await seedReviewVideo();

  const rootId = await member.mutation(api.comments.create, {
    videoId,
    text: "Root",
    timestampSeconds: 3,
  });
  const replyId = await member.mutation(api.comments.create, {
    videoId,
    text: "Reply",
    timestampSeconds: 3,
    parentId: rootId,
  });
  const keptId = await member.mutation(api.comments.create, {
    videoId,
    text: "Keep me",
    timestampSeconds: 8,
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("comments", {
      videoId,
      userClerkId: "member",
      userName: "Member",
      text: "Hidden grandchild",
      timestampSeconds: 3,
      parentId: replyId,
      resolved: false,
    });
  });

  await member.mutation(api.comments.remove, { commentId: rootId });

  const remaining = await t.run(async (ctx) =>
    ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", videoId))
      .collect(),
  );
  expect(remaining.map((comment) => comment._id)).toEqual([keptId]);
});

test("comments written without parentId stay top-level", async () => {
  const { t, member, videoId } = await seedReviewVideo();

  const legacyId = await t.run(async (ctx) =>
    ctx.db.insert("comments", {
      videoId,
      userClerkId: "member",
      userName: "Member",
      text: "Legacy note",
      timestampSeconds: 4,
      resolved: false,
    }),
  );

  const threads = await member.query(api.comments.getThreaded, { videoId });
  expect(threads).toMatchObject([{ _id: legacyId, text: "Legacy note", replies: [] }]);
  expect(threads[0]?.parentId).toBeUndefined();
});
