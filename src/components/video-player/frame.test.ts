import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_FRAME_RATE,
  formatTimecode,
  frameIndexAtTime,
  frameRateFromPresentedFrames,
  resolveFrameRate,
  steppedTime,
} from "./frame";

const closeTo = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

/** Chromium reads `currentTime` back truncated to whole microseconds. */
const readBack = (time: number) => Math.trunc(time * 1e6) / 1e6;

test("resolveFrameRate falls back to 30 fps for unknown or implausible values", () => {
  for (const candidate of [undefined, null, Number.NaN, 0, -24, Infinity, 5, 500]) {
    assert.equal(resolveFrameRate(candidate), DEFAULT_FRAME_RATE);
  }
});

test("resolveFrameRate keeps known rates and snaps near-miss measurements to them", () => {
  for (const rate of [24, 25, 30, 48, 50, 60]) {
    assert.equal(resolveFrameRate(rate), rate);
  }
  // NTSC rates snap to their exact ratios, whether written as decimals or measured.
  assert.equal(resolveFrameRate(23.976), 24000 / 1001);
  assert.equal(resolveFrameRate(23.98), 24000 / 1001);
  assert.equal(resolveFrameRate(29.97), 30000 / 1001);
  assert.equal(resolveFrameRate(59.94), 60000 / 1001);
  // A plausible but non-standard rate is kept as-is rather than forced to a neighbour.
  assert.equal(resolveFrameRate(90), 90);
});

test("frameIndexAtTime counts the frame shown at a time", () => {
  assert.equal(frameIndexAtTime(0, 30), 0);
  assert.equal(frameIndexAtTime(-5, 30), 0);
  assert.equal(frameIndexAtTime(1, 30), 30);
  assert.equal(frameIndexAtTime(10.05, 30), 301);
  assert.equal(frameIndexAtTime(1234 / 23.976, 23.976), 1234);
  // Exact NTSC ratios keep long recordings on the right frame.
  assert.equal(frameIndexAtTime(40000, 29.97), 1198801);
});

test("steppedTime targets the middle of the neighbouring frame", () => {
  closeTo(steppedTime(10, 1, 30, 20), 301.5 / 30);
  closeTo(steppedTime(10, -1, 30, 20), 299.5 / 30);
  closeTo(steppedTime(10, 1, 24, 20), 241.5 / 24);
  closeTo(steppedTime(10, 10, 30, 20), 310.5 / 30);
  closeTo(steppedTime(10, -10, 30, 20), 290.5 / 30);
  // From anywhere inside frame 301, the neighbours are frames 302 and 300.
  closeTo(steppedTime(10.04, 1, 30, 20), 302.5 / 30);
  closeTo(steppedTime(10.06, -1, 30, 20), 300.5 / 30);
});

test("steppedTime moves exactly one frame per step through truncated read-backs", () => {
  for (const fps of [23.976, 24, 25, 29.97, 30, 59.94, 60]) {
    let time = 0;
    for (let frame = 1; frame <= 200; frame++) {
      time = readBack(steppedTime(time, 1, fps));
      assert.equal(frameIndexAtTime(time, fps), frame, `${fps} fps forward to ${frame}`);
    }
    for (let frame = 199; frame >= 0; frame--) {
      time = readBack(steppedTime(time, -1, fps));
      assert.equal(frameIndexAtTime(time, fps), frame, `${fps} fps back to ${frame}`);
    }
  }
});

test("steppedTime clamps to the first and last frame", () => {
  closeTo(steppedTime(0, -1, 30, 20), 0.5 / 30);
  closeTo(steppedTime(0.01, -5, 30, 20), 0.5 / 30);
  // 20s at 30 fps ends with frame 599; stepping past it, or from the ended
  // position, stays on that frame rather than an index that never shows.
  closeTo(steppedTime(19.99, 1, 30, 20), 599.5 / 30);
  closeTo(steppedTime(20, 1, 30, 20), 599.5 / 30);
  closeTo(steppedTime(20, -1, 30, 20), 599.5 / 30);
  // A duration that ends mid-frame clamps to the duration itself.
  assert.equal(steppedTime(10, 5, 30, 10.01), 10.01);
});

test("steppedTime steps without a usable duration or frame rate", () => {
  for (const duration of [undefined, Number.NaN, Infinity]) {
    closeTo(steppedTime(10, 1, 30, duration), 301.5 / 30);
  }
  closeTo(steppedTime(10, 1, 0, 20), 301.5 / 30);
});

test("formatTimecode derives every field from the frame index", () => {
  assert.equal(formatTimecode(0, 30), "00:00:00:00");
  assert.equal(formatTimecode(83.5, 30), "00:01:23:15");
  assert.equal(formatTimecode(3661.5, 30), "01:01:01:15");
  assert.equal(formatTimecode(1.9999, 30), "00:00:01:29");
  assert.equal(formatTimecode(-3, 30), "00:00:00:00");
  assert.equal(formatTimecode(steppedTime(0, 49, 25), 25), "00:00:01:24");
  // Fractional rates label frames non-drop-frame: no label is skipped or repeated.
  const at2997 = (frame: number) => formatTimecode(steppedTime(0, frame, 29.97), 29.97);
  assert.equal(at2997(1018), "00:00:33:28");
  assert.equal(at2997(1019), "00:00:33:29");
  assert.equal(at2997(1020), "00:00:34:00");
});

const presented = (presentedFrames: number, mediaTime: number) => ({
  presentedFrames,
  mediaTime,
});

test("frameRateFromPresentedFrames reads the rate from evenly spaced frames", () => {
  assert.equal(
    frameRateFromPresentedFrames(presented(1, 0.5), presented(2, 0.541666), presented(3, 0.583333)),
    24,
  );
  // 30000/1001 timestamps rounded to microseconds.
  assert.equal(
    frameRateFromPresentedFrames(presented(7, 1), presented(8, 1.033366), presented(9, 1.066733)),
    30000 / 1001,
  );
  assert.equal(
    frameRateFromPresentedFrames(presented(1, 2), presented(2, 2.02), presented(3, 2.04)),
    50,
  );
});

test("frameRateFromPresentedFrames ignores uneven, skipped, or implausible frames", () => {
  // A dropped frame between otherwise even frames.
  assert.equal(
    frameRateFromPresentedFrames(presented(1, 1), presented(2, 1 + 1 / 30), presented(3, 1.1)),
    null,
  );
  // Missed callbacks.
  assert.equal(
    frameRateFromPresentedFrames(presented(1, 1), presented(3, 1 + 1 / 30), presented(4, 1.0667)),
    null,
  );
  // A seek backwards or a repeated frame.
  assert.equal(
    frameRateFromPresentedFrames(presented(1, 5), presented(2, 1), presented(3, 1 + 1 / 30)),
    null,
  );
  assert.equal(
    frameRateFromPresentedFrames(presented(1, 1), presented(2, 1), presented(3, 1)),
    null,
  );
  // Seconds apart (fast shuttling) or sub-millisecond apart.
  assert.equal(
    frameRateFromPresentedFrames(presented(1, 1), presented(2, 2), presented(3, 3)),
    null,
  );
  assert.equal(
    frameRateFromPresentedFrames(presented(1, 1), presented(2, 1.001), presented(3, 1.002)),
    null,
  );
});

test("frameRateFromPresentedFrames under-reads a steady run of dropped frames", () => {
  // Every other 30 fps frame dropped reads as 15, which is why the player keeps
  // the highest rate it measures.
  const rate = frameRateFromPresentedFrames(
    presented(1, 1),
    presented(2, 1 + 2 / 30),
    presented(3, 1 + 4 / 30),
  );
  closeTo(rate ?? 0, 15);
});
