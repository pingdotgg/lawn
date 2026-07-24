import assert from "node:assert/strict";
import test from "node:test";

import { buildMuxPlaybackUrl } from "../../convex/mux";
import { buildMuxPlaybackHlsUrl } from "./muxPlayback";

test("client prewarming and server playback use the exact same Mux manifest cache key", () => {
  assert.equal(buildMuxPlaybackHlsUrl("playback-id"), buildMuxPlaybackUrl("playback-id"));
});
