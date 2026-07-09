import assert from "node:assert/strict";
import test from "node:test";
import { buildMuxPlaybackUrl, buildMuxThumbnailUrl } from "../../convex/mux";

test("public Mux playback URLs keep the fixed 720p modifiers", () => {
  const url = new URL(buildMuxPlaybackUrl("public-playback"));

  assert.equal(url.searchParams.get("min_resolution"), "720p");
  assert.equal(url.searchParams.get("max_resolution"), "720p");
  assert.equal(url.searchParams.has("token"), false);
});

test("signed Mux playback URLs expose only the signed token", () => {
  const url = new URL(buildMuxPlaybackUrl("signed-playback", "signed-token"));

  assert.deepEqual([...url.searchParams.keys()], ["token"]);
  assert.equal(url.searchParams.get("token"), "signed-token");
});

test("Mux thumbnail options move inside signed tokens", () => {
  const publicUrl = new URL(buildMuxThumbnailUrl("public-playback"));
  const signedUrl = new URL(buildMuxThumbnailUrl("signed-playback", "signed-token"));

  assert.equal(publicUrl.searchParams.get("time"), "0");
  assert.deepEqual([...signedUrl.searchParams.keys()], ["token"]);
  assert.equal(signedUrl.searchParams.get("token"), "signed-token");
});
