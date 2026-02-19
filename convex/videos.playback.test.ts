import test from "node:test";
import assert from "node:assert/strict";

import { getVideoPlayback } from "./videos";

test("getVideoPlayback returns two fixed options for ready videos", () => {
  const playback = getVideoPlayback({
    status: "ready",
    playback720ManifestKey: "videos/vid_123/playback/720p-h264/master.m3u8",
    s3Key: "videos/vid_123/original/source.mp4",
  });

  assert.ok(playback);
  assert.equal(playback.defaultOptionId, "720p");
  assert.equal(playback.options.length, 2);

  const hlsOption = playback.options[0];
  const originalOption = playback.options[1];

  assert.equal(hlsOption.id, "720p");
  assert.equal(hlsOption.label, "720p");
  assert.equal(hlsOption.type, "hls");
  assert.ok(hlsOption.url.endsWith("videos/vid_123/playback/720p-h264/master.m3u8"));

  assert.equal(originalOption.id, "original");
  assert.equal(originalOption.label, "Original");
  assert.equal(originalOption.type, "mp4");
  assert.ok(originalOption.url.endsWith("videos/vid_123/original/source.mp4"));
});

test("getVideoPlayback falls back to original when 720p is unavailable", () => {
  const playback = getVideoPlayback({
    status: "ready",
    s3Key: "videos/vid_123/original/source.mp4",
  });

  assert.ok(playback);
  assert.equal(playback.defaultOptionId, "original");
  assert.equal(playback.options.length, 1);
  assert.equal(playback.options[0].id, "original");
  assert.equal(playback.options[0].type, "mp4");
  assert.ok(playback.options[0].url.endsWith("videos/vid_123/original/source.mp4"));
});

test("getVideoPlayback returns null when a video is not ready", () => {
  const playback = getVideoPlayback({
    status: "processing",
    playback720ManifestKey: "videos/vid_123/playback/720p-h264/master.m3u8",
    s3Key: "videos/vid_123/original/source.mp4",
  });

  assert.equal(playback, null);
});
