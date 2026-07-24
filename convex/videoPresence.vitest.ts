/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import presenceTest from "@convex-dev/presence/test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("project presence is authorized and strictly bounded to requested videos", async () => {
  const t = convexTest(schema, modules);
  presenceTest.register(t);
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
    const otherProjectId = await ctx.db.insert("projects", { teamId, name: "Other" });
    const videoIds = [];
    for (let index = 0; index < 41; index += 1) {
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
    const otherVideoId = await ctx.db.insert("videos", {
      projectId: otherProjectId,
      uploadedByClerkId: "owner",
      uploaderName: "Owner",
      title: "Other video",
      visibility: "public",
      publicId: "other-video",
      status: "ready",
      workflowStatus: "review",
    });
    return { projectId, videoIds, otherVideoId };
  });

  const authed = t.withIdentity({ subject: "owner" });
  await expect(
    authed.query(api.videoPresence.listProjectOnlineCounts, {
      projectId: seeded.projectId,
      videoIds: seeded.videoIds,
    }),
  ).rejects.toThrow("Presence counts are limited to 40 videos");
  // Videos outside the project (deleted, moved, or foreign) are silently
  // omitted so the live subscription never crashes viewers mid-race.
  await expect(
    authed.query(api.videoPresence.listProjectOnlineCounts, {
      projectId: seeded.projectId,
      videoIds: [seeded.otherVideoId, seeded.videoIds[0]],
    }),
  ).resolves.toEqual({ counts: { [seeded.videoIds[0]]: 0 } });
  await expect(
    authed.query(api.videoPresence.listProjectOnlineCounts, {
      projectId: seeded.projectId,
      videoIds: [],
    }),
  ).resolves.toEqual({ counts: {} });
  // Clients deployed before the videoIds argument existed omit it entirely.
  await expect(
    authed.query(api.videoPresence.listProjectOnlineCounts, {
      projectId: seeded.projectId,
    }),
  ).resolves.toEqual({ counts: {} });
  await expect(
    authed.query(api.videoPresence.listProjectOnlineCounts, {
      projectId: seeded.projectId,
      videoIds: [seeded.videoIds[0]],
    }),
  ).resolves.toEqual({ counts: { [seeded.videoIds[0]]: 0 } });
  await authed.mutation(api.videoPresence.heartbeat, {
    videoId: seeded.videoIds[0],
    sessionId: "presence-session",
    clientId: "presence-client",
  });
  await expect(
    authed.query(api.videoPresence.listProjectOnlineCounts, {
      projectId: seeded.projectId,
      videoIds: [seeded.videoIds[0]],
    }),
  ).resolves.toEqual({ counts: { [seeded.videoIds[0]]: 1 } });
  await expect(
    t.withIdentity({ subject: "not-a-member" }).query(api.videoPresence.listProjectOnlineCounts, {
      projectId: seeded.projectId,
      videoIds: [],
    }),
  ).rejects.toThrow("Not a team member");
});
