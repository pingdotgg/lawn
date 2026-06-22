import assert from "node:assert/strict";
import test from "node:test";

import {
  createVideoPlaybackHealthState,
  markVideoPlaybackIssueReported,
  observeVideoPlayback,
  resetVideoPlaybackHealthWindow,
} from "./videoPlaybackHealth";

const playingSample = {
  mediaTime: 0,
  presentedFrames: 1,
  playing: true,
  seeking: false,
  buffering: false,
  visible: true,
};

test("allows a five-second opening hold before confirming a startup freeze", () => {
  let state = createVideoPlaybackHealthState();
  state = observeVideoPlayback(state, { ...playingSample, nowMs: 0 }).state;
  state = observeVideoPlayback(state, { ...playingSample, nowMs: 500, mediaTime: 0.5 }).state;
  const result = observeVideoPlayback(state, {
    ...playingSample,
    nowMs: 5_500,
    mediaTime: 5.5,
  });

  assert.equal(result.issueDetected, false);
  assert.equal(result.state.issueReported, false);
});

test("confirms a startup freeze after eight seconds of media-clock-only progress", () => {
  let state = createVideoPlaybackHealthState();
  state = observeVideoPlayback(state, { ...playingSample, nowMs: 0 }).state;
  state = observeVideoPlayback(state, { ...playingSample, nowMs: 500, mediaTime: 0.5 }).state;
  const result = observeVideoPlayback(state, {
    ...playingSample,
    nowMs: 8_500,
    mediaTime: 8.5,
  });

  assert.equal(result.issueDetected, true);
  assert.equal(result.state.issueReported, true);
});

test("healthy frame progress completes startup monitoring before a held frame", () => {
  let state = createVideoPlaybackHealthState();
  state = observeVideoPlayback(state, { ...playingSample, nowMs: 0 }).state;
  const healthy = observeVideoPlayback(state, {
    ...playingSample,
    nowMs: 500,
    mediaTime: 0.5,
    presentedFrames: 2,
  });
  const later = observeVideoPlayback(
    healthy.state,
    { ...playingSample, nowMs: 30_000, mediaTime: 30, presentedFrames: 2 },
    2_500,
  );

  assert.equal(healthy.state.monitoringComplete, true);
  assert.equal(later.issueDetected, false);
});

test("does not confirm a freeze without future buffered data", () => {
  let state = createVideoPlaybackHealthState();
  state = observeVideoPlayback(state, { ...playingSample, nowMs: 0 }).state;
  const result = observeVideoPlayback(state, {
    ...playingSample,
    nowMs: 10_000,
    mediaTime: 10,
    playing: true,
    buffering: true,
  });

  assert.equal(result.issueDetected, false);
  assert.equal(result.state.frozenSinceMs, null);
});

test("seeking and pausing reset the freeze window", () => {
  let state = createVideoPlaybackHealthState();
  state = observeVideoPlayback(state, { ...playingSample, nowMs: 0 }).state;
  state = observeVideoPlayback(state, { ...playingSample, nowMs: 500, mediaTime: 0.5 }).state;
  state = observeVideoPlayback(state, {
    ...playingSample,
    nowMs: 2_000,
    mediaTime: 10,
    seeking: true,
  }).state;
  const paused = observeVideoPlayback(state, {
    ...playingSample,
    nowMs: 5_000,
    mediaTime: 10,
    playing: false,
  });

  assert.equal(paused.issueDetected, false);
  assert.equal(paused.state.frozenSinceMs, null);
});

test("hidden playback resets and gates the startup freeze window", () => {
  let state = createVideoPlaybackHealthState();
  state = observeVideoPlayback(state, { ...playingSample, nowMs: 0 }).state;
  state = observeVideoPlayback(state, { ...playingSample, nowMs: 500, mediaTime: 0.5 }).state;
  const hidden = observeVideoPlayback(state, {
    ...playingSample,
    nowMs: 10_000,
    mediaTime: 10,
    visible: false,
  });
  const visibleAgain = observeVideoPlayback(
    hidden.state,
    { ...playingSample, nowMs: 10_500, mediaTime: 10.5 },
    2_500,
  );

  assert.equal(hidden.issueDetected, false);
  assert.equal(hidden.state.frozenSinceMs, null);
  assert.equal(visibleAgain.issueDetected, false);
});

test("reports at most once until a new source state is created", () => {
  const reported = markVideoPlaybackIssueReported(createVideoPlaybackHealthState());
  const reset = resetVideoPlaybackHealthWindow(reported, 1, 1);
  const result = observeVideoPlayback(
    { ...reset, frozenSinceMs: 0 },
    { ...playingSample, nowMs: 10_000, mediaTime: 2 },
    100,
  );

  assert.equal(result.issueDetected, false);
  assert.equal(result.state.issueReported, true);
  assert.equal(createVideoPlaybackHealthState().issueReported, false);
});
