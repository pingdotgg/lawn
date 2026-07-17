import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMuxPlaybackHlsUrl,
  buildMuxPlaybackPosterUrl,
  loadHlsRuntime,
  selectMuxPlaybackSource,
  type MuxPlaybackRecovery,
} from "./muxPlayback";

const recovery: MuxPlaybackRecovery = {
  scopeKey: "video-a",
  playbackId: "playback-a",
  url: "https://stream.mux.com/repaired.m3u8?token=example",
  posterUrl: "https://image.mux.com/repaired/thumbnail.jpg?time=0",
  revision: 2,
};

test("builds the exact adaptive Mux manifest URL used by the server", () => {
  assert.equal(
    buildMuxPlaybackHlsUrl("playback-a"),
    "https://stream.mux.com/playback-a.m3u8?max_resolution=720p",
  );
  const url = new URL(buildMuxPlaybackHlsUrl("playback-a"));
  assert.equal(url.searchParams.get("max_resolution"), "720p");
  assert.equal(url.searchParams.has("min_resolution"), false);
});

test("builds the public Mux poster URL", () => {
  assert.equal(
    buildMuxPlaybackPosterUrl("playback-a"),
    "https://image.mux.com/playback-a/thumbnail.jpg?time=0",
  );
});

test("selects a deterministic source without waiting for a recovery action", () => {
  assert.deepEqual(
    selectMuxPlaybackSource({
      scopeKey: "video-a",
      playbackId: "playback-a",
      recovery: null,
    }),
    {
      url: "https://stream.mux.com/playback-a.m3u8?max_resolution=720p",
      posterUrl: "https://image.mux.com/playback-a/thumbnail.jpg?time=0",
      revision: 0,
    },
  );
});

test("uses a matching server recovery source", () => {
  assert.deepEqual(
    selectMuxPlaybackSource({
      scopeKey: "video-a",
      playbackId: "playback-a",
      recovery,
    }),
    {
      url: recovery.url,
      posterUrl: recovery.posterUrl,
      revision: 2,
    },
  );
});

test("ignores a recovery response from a stale route scope", () => {
  assert.equal(
    selectMuxPlaybackSource({
      scopeKey: "video-b",
      playbackId: "playback-a",
      recovery,
    })?.revision,
    0,
  );
});

test("ignores a recovery response for a replaced playback ID", () => {
  const source = selectMuxPlaybackSource({
    scopeKey: "video-a",
    playbackId: "playback-b",
    recovery,
  });

  assert.equal(source?.revision, 0);
  assert.equal(source?.url, "https://stream.mux.com/playback-b.m3u8?max_resolution=720p");
});

test("does not expose a source before an authorized query returns a playback ID", () => {
  assert.equal(
    selectMuxPlaybackSource({
      scopeKey: "video-a",
      playbackId: null,
      recovery,
    }),
    null,
  );
});

test("does not import the HLS browser runtime during SSR", () => {
  assert.equal(loadHlsRuntime(), null);
});
