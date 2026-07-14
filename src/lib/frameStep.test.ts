import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_VIDEO_FPS,
  frameDeltaSeconds,
  frameIndexAtTime,
  formatFrameTimecode,
  nextFrameTime,
} from "./frameStep";

test("frameDeltaSeconds uses 1/fps and defaults to 30", () => {
  assert.equal(frameDeltaSeconds(30), 1 / 30);
  assert.equal(frameDeltaSeconds(24), 1 / 24);
  assert.equal(frameDeltaSeconds(undefined), 1 / DEFAULT_VIDEO_FPS);
  assert.equal(frameDeltaSeconds(0), 1 / DEFAULT_VIDEO_FPS);
  assert.equal(frameDeltaSeconds(-5), 1 / DEFAULT_VIDEO_FPS);
  assert.equal(frameDeltaSeconds(Number.NaN), 1 / DEFAULT_VIDEO_FPS);
});

test("nextFrameTime steps forward and backward within duration", () => {
  assert.ok(Math.abs(nextFrameTime(1, 1, 30) - (1 + 1 / 30)) < 1e-9);
  assert.ok(Math.abs(nextFrameTime(1, -1, 30) - (1 - 1 / 30)) < 1e-9);
  assert.equal(nextFrameTime(0, -1, 30, 10), 0);
  assert.equal(nextFrameTime(10, 1, 30, 10), 10);
});

test("frameIndexAtTime rounds to nearest frame", () => {
  assert.equal(frameIndexAtTime(0, 30), 0);
  assert.equal(frameIndexAtTime(1, 30), 30);
  assert.equal(frameIndexAtTime(1 / 30, 30), 1);
  assert.equal(frameIndexAtTime(-1, 30), 0);
});

test("formatFrameTimecode renders MM:SS:FF (and HH when needed)", () => {
  assert.equal(formatFrameTimecode(0, 30), "00:00:00");
  assert.equal(formatFrameTimecode(1, 30), "00:01:00");
  assert.equal(formatFrameTimecode(1 + 15 / 30, 30), "00:01:15");
  assert.equal(formatFrameTimecode(3661, 30), "01:01:01:00");
});
