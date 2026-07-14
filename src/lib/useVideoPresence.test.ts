import assert from "node:assert/strict";
import { test } from "node:test";
import { estimatePlaybackTime } from "./useVideoPresence";

test("estimatePlaybackTime returns null without playback", () => {
  assert.equal(estimatePlaybackTime(undefined), null);
});

test("estimatePlaybackTime returns currentTime when paused", () => {
  assert.equal(
    estimatePlaybackTime(
      {
        currentTime: 12.5,
        paused: true,
        updatedAt: 1_000,
      },
      5_000,
    ),
    12.5,
  );
});

test("estimatePlaybackTime advances currentTime while playing based on updatedAt", () => {
  assert.equal(
    estimatePlaybackTime(
      {
        currentTime: 10,
        paused: false,
        updatedAt: 1_000,
      },
      2_500,
    ),
    11.5,
  );
});

test("estimatePlaybackTime does not go negative when now is before updatedAt", () => {
  assert.equal(
    estimatePlaybackTime(
      {
        currentTime: 4,
        paused: false,
        updatedAt: 5_000,
      },
      4_000,
    ),
    4,
  );
});
