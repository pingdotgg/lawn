import test from "node:test";
import assert from "node:assert/strict";
import { getFunctionName } from "convex/server";
import { Id } from "@convex/_generated/dataModel";
import { getDashboardIndexEssentialSpecs } from "./-index.data";
import { getProjectEssentialSpecs } from "./-project.data";
import { getSettingsEssentialSpecs } from "./-settings.data";
import { getTeamEssentialSpecs } from "./-team.data";
import { getVideoEssentialSpecs, threadComments } from "./-video.data";
import { getProjectThumbnailUrl, selectProjectPresenceVideoIds } from "./-project";

function names(specs: Array<{ query: unknown }>) {
  return specs.map((spec) => getFunctionName(spec.query as never)).sort();
}

test("dashboard route data contracts expose expected essential queries", () => {
  const teamSlug = "garden";
  const projectId = "proj_123" as Id<"projects">;
  const videoId = "vid_123" as Id<"videos">;

  assert.deepEqual(names(getDashboardIndexEssentialSpecs()), ["teams:listWithProjects"]);

  assert.deepEqual(names(getTeamEssentialSpecs({ teamSlug })), ["workspace:resolveContext"]);

  assert.deepEqual(names(getSettingsEssentialSpecs({ teamSlug })), ["workspace:resolveContext"]);

  const projectSpecs = getProjectEssentialSpecs({ teamSlug, projectId });
  assert.deepEqual(names(projectSpecs), [
    "projects:breadcrumb",
    "projects:get",
    "projects:listChildren",
    "workspace:resolveContext",
  ]);

  assert.deepEqual(names(getVideoEssentialSpecs({ teamSlug, projectId, videoId })), [
    "comments:list",
    "videos:get",
    "videos:listVersions",
    "workspace:resolveContext",
  ]);
});

test("video comments are threaded with stable timeline and reply ordering", () => {
  const comments = [
    { _id: "reply-later", parentId: "parent-later", timestampSeconds: 3, _creationTime: 8 },
    { _id: "parent-later", timestampSeconds: 9, _creationTime: 2 },
    { _id: "reply-earlier", parentId: "parent-later", timestampSeconds: 2, _creationTime: 4 },
    { _id: "parent-earlier", timestampSeconds: 1, _creationTime: 6 },
  ];

  assert.deepEqual(threadComments(comments), [
    { ...comments[3], replies: [] },
    { ...comments[1], replies: [comments[2], comments[0]] },
  ]);
  assert.deepEqual(
    comments.map((comment) => comment._id),
    ["reply-later", "parent-later", "reply-earlier", "parent-earlier"],
  );
});

test("project thumbnails preserve signed Mux URLs and resize public Mux images", () => {
  const signedThumbnailUrl =
    "https://image.mux.com/playback-id/thumbnail.jpg?time=0&token=signed-token";
  assert.equal(getProjectThumbnailUrl(signedThumbnailUrl), signedThumbnailUrl);

  const thumbnailUrl = getProjectThumbnailUrl(
    "https://image.mux.com/playback-id/thumbnail.jpg?time=0&fit_mode=preserve",
  );
  assert.ok(thumbnailUrl);
  const parsed = new URL(thumbnailUrl);

  assert.equal(parsed.searchParams.get("width"), "640");
  assert.equal(parsed.searchParams.get("time"), "0");
  assert.equal(parsed.searchParams.get("fit_mode"), "preserve");
  assert.equal(
    getProjectThumbnailUrl("https://cdn.example.com/poster.jpg"),
    "https://cdn.example.com/poster.jpg",
  );
});

test("project presence selection stays bounded and follows the viewport", () => {
  const candidates = Array.from({ length: 60 }, (_, index) => ({
    videoId: `video-${String(index).padStart(2, "0")}` as Id<"videos">,
    top: 600 + index * 100,
    bottom: 680 + index * 100,
  }));
  const visibleLoadedVideoId = candidates[55].videoId;
  candidates[55] = {
    videoId: visibleLoadedVideoId,
    top: 120,
    bottom: 220,
  };

  const selected = selectProjectPresenceVideoIds(candidates, { top: 0, bottom: 500 });

  assert.equal(selected.length, 40);
  assert.ok(selected.includes(visibleLoadedVideoId));
  assert.ok(!selected.includes(candidates[59].videoId));
  assert.deepEqual(
    selected,
    [...selected].sort((left, right) => String(left).localeCompare(String(right))),
  );
});
