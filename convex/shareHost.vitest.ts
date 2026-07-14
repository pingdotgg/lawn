/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { api } from "./_generated/api";
import schema from "./schema";
import { parseTeamShareSubdomain } from "./shareHost";

const modules = import.meta.glob("./**/*.ts");

async function seedTeams() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  const seeded = await t.run(async (ctx) => {
    const acmeId = await ctx.db.insert("teams", {
      name: "Acme",
      slug: "acme",
      ownerClerkId: "user_acme",
      plan: "basic",
    });
    const otherId = await ctx.db.insert("teams", {
      name: "Other Corp",
      slug: "othercorp",
      ownerClerkId: "user_other",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId: acmeId,
      userClerkId: "user_acme",
      userEmail: "acme@example.com",
      userName: "Acme Owner",
      role: "owner",
    });
    const acmeProject = await ctx.db.insert("projects", {
      teamId: acmeId,
      name: "Acme Project",
    });
    await ctx.db.insert("projects", {
      teamId: otherId,
      name: "Other Project",
    });
    const acmeVideo = await ctx.db.insert("videos", {
      projectId: acmeProject,
      uploadedByClerkId: "user_acme",
      uploaderName: "Acme Owner",
      title: "Acme Cut",
      visibility: "public",
      publicId: "acme-public",
      status: "ready",
      muxPlaybackId: "playback-acme",
      workflowStatus: "review",
    });
    await ctx.db.insert("shareLinks", {
      videoId: acmeVideo,
      token: "acme-share-token",
      createdByClerkId: "user_acme",
      createdByName: "Acme Owner",
      allowDownload: false,
      viewCount: 0,
    });
    return { acmeId, otherId, acmeVideo };
  });
  return { t, ...seeded };
}

test("parseTeamShareSubdomain only accepts single-level team hosts", () => {
  expect(parseTeamShareSubdomain("acme.lawn.video")).toBe("acme");
  expect(parseTeamShareSubdomain("lawn.video")).toBeNull();
  expect(parseTeamShareSubdomain("www.lawn.video")).toBeNull();
  expect(parseTeamShareSubdomain("localhost")).toBeNull();
});

test("public watch rejects mismatched team subdomains", async () => {
  const { t } = await seedTeams();

  const onAcme = await t.query(api.videos.getByPublicId, {
    publicId: "acme-public",
    shareHost: "acme.lawn.video",
  });
  expect(onAcme?.video?.publicId).toBe("acme-public");

  const onWrong = await t.query(api.videos.getByPublicId, {
    publicId: "acme-public",
    shareHost: "othercorp.lawn.video",
  });
  expect(onWrong).toBeNull();

  // Apex keeps working for legacy links.
  const onApex = await t.query(api.videos.getByPublicId, {
    publicId: "acme-public",
    shareHost: "lawn.video",
  });
  expect(onApex?.video?.publicId).toBe("acme-public");
});

test("restricted share rejects mismatched team subdomains", async () => {
  const { t } = await seedTeams();

  const ok = await t.query(api.shareLinks.getByToken, {
    token: "acme-share-token",
    shareHost: "acme.lawn.video",
  });
  expect(ok.status).toBe("ok");

  const wrong = await t.query(api.shareLinks.getByToken, {
    token: "acme-share-token",
    shareHost: "othercorp.lawn.video",
  });
  expect(wrong.status).toBe("missing");

  const apex = await t.query(api.shareLinks.getByToken, {
    token: "acme-share-token",
    shareHost: "lawn.video",
  });
  expect(apex.status).toBe("ok");
});

test("issueAccessGrant fails on wrong team host", async () => {
  const { t } = await seedTeams();

  const wrong = await t.mutation(api.shareLinks.issueAccessGrant, {
    token: "acme-share-token",
    shareHost: "othercorp.lawn.video",
  });
  expect(wrong).toEqual({ ok: false, grantToken: null });

  const ok = await t.mutation(api.shareLinks.issueAccessGrant, {
    token: "acme-share-token",
    shareHost: "acme.lawn.video",
  });
  expect(ok.ok).toBe(true);
  expect(ok.grantToken).toBeTruthy();
});
