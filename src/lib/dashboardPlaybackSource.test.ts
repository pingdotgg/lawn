import assert from "node:assert/strict";
import test from "node:test";

import {
  selectDashboardPlaybackPreferenceAfterOriginalLoad,
  selectDashboardPlaybackUrl,
  type DashboardPlaybackSource,
} from "./dashboardPlaybackSource";

const originalUrl = "https://storage.example/original.mov";
const muxUrl = "https://stream.example/video.m3u8";

test("waits for the 720p session on a fresh ready page", () => {
  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "mux720",
      muxPlaybackReady: true,
      muxUrl: null,
      originalUrl,
    }),
    null,
  );
});

test("keeps a processing session on Original when Mux becomes ready", () => {
  let preference: DashboardPlaybackSource | null = null;
  const playbackSequence = [
    selectDashboardPlaybackUrl({
      preferredSource: preference ?? "mux720",
      muxPlaybackReady: false,
      muxUrl: null,
      originalUrl,
    }),
  ];

  preference = selectDashboardPlaybackPreferenceAfterOriginalLoad({
    currentPreference: preference,
    startedWhileProcessing: true,
    originalUrl,
  });
  playbackSequence.push(
    selectDashboardPlaybackUrl({
      preferredSource: preference ?? "mux720",
      muxPlaybackReady: true,
      muxUrl: null,
      originalUrl,
    }),
    selectDashboardPlaybackUrl({
      preferredSource: preference ?? "mux720",
      muxPlaybackReady: true,
      muxUrl,
      originalUrl,
    }),
  );

  assert.deepEqual(playbackSequence, [originalUrl, originalUrl, originalUrl]);
});

test("does not replace an existing playback preference", () => {
  assert.equal(
    selectDashboardPlaybackPreferenceAfterOriginalLoad({
      currentPreference: "mux720",
      startedWhileProcessing: true,
      originalUrl,
    }),
    "mux720",
  );
});

test("does not lock a fresh ready page to Original", () => {
  assert.equal(
    selectDashboardPlaybackPreferenceAfterOriginalLoad({
      currentPreference: null,
      startedWhileProcessing: false,
      originalUrl,
    }),
    null,
  );
});

test("switches to 720p when the session preference is replaced", () => {
  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "mux720",
      muxPlaybackReady: true,
      muxUrl,
      originalUrl,
    }),
    muxUrl,
  );
});

test("falls back from unavailable Original to Mux", () => {
  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "original",
      muxPlaybackReady: true,
      muxUrl,
      originalUrl: null,
    }),
    muxUrl,
  );
  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "original",
      muxPlaybackReady: true,
      muxUrl: null,
      originalUrl: null,
    }),
    null,
  );
});

test("falls back to the original while Mux is still processing", () => {
  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "mux720",
      muxPlaybackReady: false,
      muxUrl: null,
      originalUrl,
    }),
    originalUrl,
  );
});

test("returns null when neither playback source is available", () => {
  assert.equal(
    selectDashboardPlaybackUrl({
      preferredSource: "mux720",
      muxPlaybackReady: false,
      muxUrl: null,
      originalUrl: null,
    }),
    null,
  );
});
