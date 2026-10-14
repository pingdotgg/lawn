/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import {
  activeTagsForFilter,
  filterThreadedComments,
  normalizeCommentTag,
  normalizeCommentTags,
  soloCommentTag,
  toggleCommentTag,
} from "./commentTags";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedTagWorld() {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Garden",
      slug: "garden",
      ownerClerkId: "owner",
      plan: "basic",
    });
    const otherTeamId = await ctx.db.insert("teams", {
      name: "Other",
      slug: "other",
      ownerClerkId: "outsider",
      plan: "basic",
    });
    for (const member of [
      { userClerkId: "owner", role: "owner" as const, email: "owner@example.com", name: "Owner" },
      { userClerkId: "admin", role: "admin" as const, email: "admin@example.com", name: "Admin" },
      {
        userClerkId: "member",
        role: "member" as const,
        email: "member@example.com",
        name: "Member",
      },
      {
        userClerkId: "viewer",
        role: "viewer" as const,
        email: "viewer@example.com",
        name: "Viewer",
      },
    ]) {
      await ctx.db.insert("teamMembers", {
        teamId,
        userClerkId: member.userClerkId,
        userEmail: member.email,
        userName: member.name,
        role: member.role,
      });
    }
    await ctx.db.insert("teamMembers", {
      teamId: otherTeamId,
      userClerkId: "outsider",
      userEmail: "outsider@example.com",
      userName: "Outsider",
      role: "owner",
    });

    const projectId = await ctx.db.insert("projects", { teamId, name: "Campaign" });
    const otherProjectId = await ctx.db.insert("projects", {
      teamId: otherTeamId,
      name: "Elsewhere",
    });
    const videoId = await ctx.db.insert("videos", {
      projectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Cut",
      visibility: "public",
      publicId: "tag-cut",
      status: "ready",
      workflowStatus: "review",
    });
    const otherVideoId = await ctx.db.insert("videos", {
      projectId: otherProjectId,
      uploadedByClerkId: "outsider",
      uploaderName: "Outsider",
      title: "Other cut",
      visibility: "private",
      publicId: "other-cut",
      status: "ready",
      workflowStatus: "review",
    });

    const comment = {
      videoId,
      userClerkId: "viewer",
      userName: "Viewer",
      resolved: false,
    };
    const colorId = await ctx.db.insert("comments", {
      ...comment,
      text: "Color note",
      timestampSeconds: 1,
      tags: ["Color"],
    });
    const vfxReplyId = await ctx.db.insert("comments", {
      ...comment,
      text: "VFX reply",
      timestampSeconds: 1,
      parentId: colorId,
      tags: ["VFX"],
    });
    const untaggedReplyId = await ctx.db.insert("comments", {
      ...comment,
      text: "Untagged reply",
      timestampSeconds: 1,
      parentId: colorId,
    });
    const audioId = await ctx.db.insert("comments", {
      ...comment,
      text: "Audio note",
      timestampSeconds: 2,
      tags: ["audio"],
    });
    const bothId = await ctx.db.insert("comments", {
      ...comment,
      text: "Both note",
      timestampSeconds: 3,
      tags: ["Color", "audio"],
    });
    const plainId = await ctx.db.insert("comments", {
      ...comment,
      text: "Plain note",
      timestampSeconds: 4,
    });
    const plainReplyId = await ctx.db.insert("comments", {
      ...comment,
      text: "Plain audio reply",
      timestampSeconds: 4,
      parentId: plainId,
      tags: ["audio"],
    });
    const otherCommentId = await ctx.db.insert("comments", {
      videoId: otherVideoId,
      userClerkId: "outsider",
      userName: "Outsider",
      text: "Other note",
      timestampSeconds: 0,
      resolved: false,
    });

    return {
      videoId,
      colorId,
      vfxReplyId,
      untaggedReplyId,
      audioId,
      bothId,
      plainId,
      plainReplyId,
      otherCommentId,
    };
  });

  return { t, ...seeded };
}

function asUser(t: Awaited<ReturnType<typeof seedTagWorld>>["t"], subject: string) {
  return t.withIdentity({ subject });
}

test("members and above can tag comments, including comments they did not write", async () => {
  const world = await seedTagWorld();
  const member = asUser(world.t, "member");

  await expect(
    member.mutation(api.comments.addTag, { commentId: world.plainId, tag: "  In/Out  " }),
  ).resolves.toEqual(["In/Out"]);
  await expect(
    member.mutation(api.comments.addTag, { commentId: world.plainId, tag: "in/out" }),
  ).resolves.toEqual(["In/Out"]);
  await expect(
    asUser(world.t, "admin").mutation(api.comments.addTag, {
      commentId: world.plainId,
      tag: "色補正",
    }),
  ).resolves.toEqual(["In/Out", "色補正"]);
  await expect(
    asUser(world.t, "owner").mutation(api.comments.removeTag, {
      commentId: world.plainId,
      tag: "IN/OUT",
    }),
  ).resolves.toEqual(["色補正"]);

  const stored = await world.t.run(async (ctx) => ctx.db.get(world.plainId));
  expect(stored).toMatchObject({
    text: "Plain note",
    userClerkId: "viewer",
    resolved: false,
    tags: ["色補正"],
  });
});

test("viewers, outsiders, and signed-out users cannot add or remove tags", async () => {
  const world = await seedTagWorld();

  await expect(
    world.t.mutation(api.comments.addTag, { commentId: world.colorId, tag: "VFX" }),
  ).rejects.toThrow("Not authenticated");
  await expect(
    asUser(world.t, "viewer").mutation(api.comments.addTag, {
      commentId: world.colorId,
      tag: "VFX",
    }),
  ).rejects.toThrow("Requires member role or higher");
  await expect(
    asUser(world.t, "viewer").mutation(api.comments.removeTag, {
      commentId: world.colorId,
      tag: "Color",
    }),
  ).rejects.toThrow("Requires member role or higher");
  await expect(
    asUser(world.t, "outsider").mutation(api.comments.addTag, {
      commentId: world.colorId,
      tag: "VFX",
    }),
  ).rejects.toThrow("Not a team member");
  await expect(
    asUser(world.t, "member").mutation(api.comments.addTag, {
      commentId: world.otherCommentId,
      tag: "VFX",
    }),
  ).rejects.toThrow("Not a team member");
  await expect(
    asUser(world.t, "outsider").query(api.comments.list, { videoId: world.videoId }),
  ).rejects.toThrow("Not a team member");

  const color = await world.t.run(async (ctx) => ctx.db.get(world.colorId));
  expect(color?.tags).toEqual(["Color"]);
});

test("tag text is rejected when it is empty, too long, or not a label", async () => {
  const world = await seedTagWorld();
  const member = asUser(world.t, "member");
  const tooLong = "a".repeat(25);

  await expect(
    member.mutation(api.comments.addTag, { commentId: world.plainId, tag: "   " }),
  ).rejects.toThrow("Enter a tag");
  await expect(
    member.mutation(api.comments.addTag, { commentId: world.plainId, tag: tooLong }),
  ).rejects.toThrow("24 characters or fewer");
  await expect(
    member.mutation(api.comments.addTag, { commentId: world.plainId, tag: "<script>" }),
  ).rejects.toThrow("simple separators");
  expect(normalizeCommentTag("a".repeat(24))).toBe("a".repeat(24));
  expect(() =>
    normalizeCommentTags(["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]),
  ).toThrow("at most 8");

  const tags = ["one", "two", "three", "four", "five", "six", "seven", "eight"];
  for (const tag of tags) {
    await member.mutation(api.comments.addTag, { commentId: world.plainId, tag });
  }
  await expect(
    member.mutation(api.comments.addTag, { commentId: world.plainId, tag: "nine" }),
  ).rejects.toThrow("at most 8");

  const plain = await world.t.run(async (ctx) => ctx.db.get(world.plainId));
  expect(plain?.tags).toEqual(tags);

  const goneId = await world.t.run(async (ctx) => {
    const id = await ctx.db.insert("comments", {
      videoId: world.videoId,
      userClerkId: "member",
      userName: "Member",
      text: "Gone",
      timestampSeconds: 9,
      resolved: false,
    });
    await ctx.db.delete(id);
    return id;
  });
  await expect(
    member.mutation(api.comments.addTag, { commentId: goneId, tag: "VFX" }),
  ).rejects.toThrow("Comment not found");
});

test("comment reads keep untagged legacy rows and filter by any active tag", async () => {
  const world = await seedTagWorld();
  const member = asUser(world.t, "member");

  const all = await member.query(api.comments.getThreaded, { videoId: world.videoId });
  expect(all.map((thread) => thread.text)).toEqual([
    "Color note",
    "Audio note",
    "Both note",
    "Plain note",
  ]);
  expect(all[0]?.replies.map((reply) => reply.text)).toEqual(["VFX reply", "Untagged reply"]);
  expect(all[3]?.tags).toBeUndefined();

  const colorThreads = await member.query(api.comments.getThreaded, {
    videoId: world.videoId,
    activeTags: ["COLOR"],
  });
  expect(
    colorThreads.map((thread) => ({
      text: thread.text,
      replies: thread.replies.map((reply) => reply.text),
    })),
  ).toEqual([
    { text: "Color note", replies: [] },
    { text: "Both note", replies: [] },
  ]);

  const audioThreads = await member.query(api.comments.getThreaded, {
    videoId: world.videoId,
    activeTags: ["audio"],
  });
  expect(
    audioThreads.map((thread) => ({
      text: thread.text,
      replies: thread.replies.map((reply) => reply.text),
    })),
  ).toEqual([
    { text: "Audio note", replies: [] },
    { text: "Both note", replies: [] },
    { text: "Plain note", replies: ["Plain audio reply"] },
  ]);

  const vfxThreads = await member.query(api.comments.getThreaded, {
    videoId: world.videoId,
    activeTags: ["vfx"],
  });
  expect(
    vfxThreads.map((thread) => ({
      text: thread.text,
      replies: thread.replies.map((reply) => reply.text),
    })),
  ).toEqual([{ text: "Color note", replies: ["VFX reply"] }]);

  const listed = await member.query(api.comments.list, {
    videoId: world.videoId,
    activeTags: ["vfx"],
  });
  expect(listed.map((comment) => comment.text)).toEqual(["Color note", "VFX reply"]);

  const none = await member.query(api.comments.list, {
    videoId: world.videoId,
    activeTags: [],
  });
  expect(none).toEqual([]);

  const viewerList = await asUser(world.t, "viewer").query(api.comments.list, {
    videoId: world.videoId,
  });
  expect(viewerList.map((comment) => comment.text)).toContain("Plain note");
  expect(viewerList.find((comment) => comment.text === "Color note")?.tags).toEqual(["Color"]);
});

test("public comment reads include tags without the author id", async () => {
  const world = await seedTagWorld();
  const threads = await world.t.query(api.comments.getThreadedForPublic, { publicId: "tag-cut" });
  const color = threads.find((thread) => thread.text === "Color note");

  expect(color).toMatchObject({ tags: ["Color"], userName: "Viewer" });
  expect(color).not.toHaveProperty("userClerkId");
  expect(color?.replies.find((reply) => reply.text === "VFX reply")).toMatchObject({
    tags: ["VFX"],
  });
  expect(color?.replies.find((reply) => reply.text === "Untagged reply")?.tags).toEqual([]);
});

test("badge clicks solo one tag and otherwise toggle a single tag", () => {
  const threads = [
    { _id: "color", tags: ["Color"], replies: [{ _id: "vfx", parentId: "color", tags: ["VFX"] }] },
    { _id: "audio", tags: ["audio"], replies: [] },
    { _id: "plain", replies: [] },
  ];
  const originalReplyCount = threads[0]?.replies.length;
  const tagKeys = ["color", "audio", "vfx"];

  const solo = soloCommentTag("Color");
  expect(
    filterThreadedComments(threads, activeTagsForFilter(solo)).map((thread) => thread._id),
  ).toEqual(["color"]);
  expect(threads[0]?.replies).toHaveLength(originalReplyCount ?? 0);

  const withoutAudio = toggleCommentTag({ kind: "all" }, "audio", tagKeys);
  expect(withoutAudio).toEqual({ kind: "only", keys: ["color", "vfx"] });
  expect(toggleCommentTag(withoutAudio, "audio", tagKeys)).toEqual({ kind: "all" });

  const onlyVfx = soloCommentTag("VFX");
  expect(filterThreadedComments(threads, activeTagsForFilter(onlyVfx))).toEqual([
    { _id: "color", tags: ["Color"], replies: [{ _id: "vfx", parentId: "color", tags: ["VFX"] }] },
  ]);
  expect(
    filterThreadedComments(threads, activeTagsForFilter(soloCommentTag("audio"))).map(
      (thread) => thread._id,
    ),
  ).toEqual(["audio"]);
  expect(filterThreadedComments(threads, "all").map((thread) => thread._id)).toEqual([
    "color",
    "audio",
    "plain",
  ]);
});
