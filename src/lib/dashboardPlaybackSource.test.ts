import assert from "node:assert/strict";
import test from "node:test";

import {
  selectDashboardOriginalPlaybackUrl,
  selectDashboardPlaybackUrl,
  shouldRequestDashboardOriginalPlayback,
} from "./dashboardPlaybackSource";

test("waits for the 720p session when Mux playback is ready", () => {
  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "mux720",
      muxPlaybackReady: true,
      muxUrl: null,
      originalUrl: "https://storage.example/original.mov",
    }),
    null,
  );
});

test("uses 720p by default once its session is available", () => {
  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "mux720",
      muxPlaybackReady: true,
      muxUrl: "https://stream.example/video.m3u8",
      originalUrl: "https://storage.example/original.mov",
    }),
    "https://stream.example/video.m3u8",
  );
});

test("falls back to the original while Mux is still processing", () => {
  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "mux720",
      muxPlaybackReady: false,
      muxUrl: null,
      originalUrl: "https://storage.example/original.mov",
    }),
    "https://storage.example/original.mov",
  );
});

test("honors an explicit Original selection", () => {
  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "original",
      muxPlaybackReady: true,
      muxUrl: "https://stream.example/video.m3u8",
      originalUrl: "https://storage.example/original.mov",
    }),
    "https://storage.example/original.mov",
  );
});

test("keeps Mux attached while a selected Original URL is loading", () => {
  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "original",
      muxPlaybackReady: true,
      muxUrl: "https://stream.example/video.m3u8",
      originalUrl: null,
    }),
    "https://stream.example/video.m3u8",
  );
});

test("uses a cached Original URL only for the matching request attempt", () => {
  const playback = {
    videoId: "video-a",
    attempt: 1,
    url: "https://storage.example/original.mov",
  };

  assert.equal(
    selectDashboardOriginalPlaybackUrl({
      videoId: "video-a",
      attempt: 1,
      playback,
    }),
    playback.url,
  );
  assert.equal(
    selectDashboardOriginalPlaybackUrl({
      videoId: "video-a",
      attempt: 2,
      playback,
    }),
    null,
  );
});

test("keeps Mux attached when retrying an expired Original URL", () => {
  const originalUrl = selectDashboardOriginalPlaybackUrl({
    videoId: "video-a",
    attempt: 2,
    playback: {
      videoId: "video-a",
      attempt: 1,
      url: "https://storage.example/expired.mov",
    },
  });

  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "original",
      muxPlaybackReady: true,
      muxUrl: "https://stream.example/video.m3u8",
      originalUrl,
    }),
    "https://stream.example/video.m3u8",
  );
});

test("requests the original automatically only while Mux is processing", () => {
  assert.equal(
    shouldRequestDashboardOriginalPlayback({
      preferredSource: "mux720",
      videoStatus: "processing",
      hasOriginalFile: true,
    }),
    true,
  );
  assert.equal(
    shouldRequestDashboardOriginalPlayback({
      preferredSource: "mux720",
      videoStatus: "ready",
      hasOriginalFile: true,
    }),
    false,
  );
});

test("requests the original on demand when it is selected", () => {
  assert.equal(
    shouldRequestDashboardOriginalPlayback({
      preferredSource: "original",
      videoStatus: "ready",
      hasOriginalFile: true,
    }),
    true,
  );
});

test("never requests an unavailable original file", () => {
  assert.equal(
    shouldRequestDashboardOriginalPlayback({
      preferredSource: "original",
      videoStatus: "ready",
      hasOriginalFile: false,
    }),
    false,
  );
  assert.equal(
    shouldRequestDashboardOriginalPlayback({
      preferredSource: "original",
      videoStatus: "failed",
      hasOriginalFile: true,
    }),
    false,
  );
});
