import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyPlayFailure,
  getOriginalPlaybackFallbackNotice,
  isIgnorablePlayRejection,
  selectFallbackPlaybackSource,
  shouldFallbackFromOriginalSource,
} from "./originalPlaybackFallback";

test("ignores autoplay and abort play rejections", () => {
  assert.equal(
    isIgnorablePlayRejection(Object.assign(new Error("blocked"), { name: "NotAllowedError" })),
    true,
  );
  assert.equal(
    isIgnorablePlayRejection(Object.assign(new Error("aborted"), { name: "AbortError" })),
    true,
  );
  assert.equal(
    classifyPlayFailure({
      error: Object.assign(new Error("blocked"), { name: "NotAllowedError" }),
      isProgressiveSource: true,
    }).kind,
    "ignore",
  );
});

test("classifies NotSupportedError play rejections on progressive sources", () => {
  const result = classifyPlayFailure({
    error: Object.assign(new Error("The element has no supported sources."), {
      name: "NotSupportedError",
    }),
    isProgressiveSource: true,
  });

  assert.equal(result.kind, "media-failure");
  if (result.kind === "media-failure") {
    assert.equal(result.code, 0);
    assert.match(result.message, /no supported sources/i);
  }
});

test("classifies progressive play failures when the element already has a media error", () => {
  const result = classifyPlayFailure({
    error: new Error("play failed"),
    mediaError: { code: 4, message: "MEDIA_ERR_SRC_NOT_SUPPORTED" },
    isProgressiveSource: true,
  });

  assert.deepEqual(result, {
    kind: "media-failure",
    code: 4,
    message: "MEDIA_ERR_SRC_NOT_SUPPORTED",
  });
});

test("classifies demux/decode style rejection messages", () => {
  const result = classifyPlayFailure({
    error: new Error("Media resource could not be decoded"),
    isProgressiveSource: true,
  });

  assert.equal(result.kind, "media-failure");
});

test("does not fall back for HLS play rejections", () => {
  const result = classifyPlayFailure({
    error: Object.assign(new Error("The element has no supported sources."), {
      name: "NotSupportedError",
    }),
    mediaError: { code: 4, message: "MEDIA_ERR_SRC_NOT_SUPPORTED" },
    isProgressiveSource: false,
  });

  assert.equal(result.kind, "ignore");
});

test("only progressive original issues request a source fallback", () => {
  assert.equal(
    shouldFallbackFromOriginalSource({
      isProgressiveSource: true,
      issueType: "media-error",
    }),
    true,
  );
  assert.equal(
    shouldFallbackFromOriginalSource({
      isProgressiveSource: true,
      issueType: "frozen-video",
    }),
    true,
  );
  assert.equal(
    shouldFallbackFromOriginalSource({
      isProgressiveSource: false,
      issueType: "media-error",
    }),
    false,
  );
});

test("always recovers onto the mux720 path", () => {
  assert.equal(
    selectFallbackPlaybackSource({
      muxUrl: "https://stream.example/a.m3u8",
      muxPlaybackReady: true,
    }),
    "mux720",
  );
  assert.equal(selectFallbackPlaybackSource({ muxUrl: null, muxPlaybackReady: false }), "mux720");
});

test("builds the requested browser-unsupported notice when 720p is ready", () => {
  assert.deepEqual(
    getOriginalPlaybackFallbackNotice({
      issueType: "media-error",
      hasMuxFallback: true,
      muxLoadFailed: false,
      muxRetryPending: false,
    }),
    {
      headline: "Original format isn't playable in this browser",
      detail: "Switched to 720p",
      message: "Original format isn't playable in this browser — switched to 720p",
    },
  );
});

test("builds pending and retry notices when mux is not ready yet", () => {
  assert.equal(
    getOriginalPlaybackFallbackNotice({
      issueType: "media-error",
      hasMuxFallback: false,
      muxLoadFailed: false,
      muxRetryPending: false,
    }).detail,
    "Preparing 720p…",
  );
  assert.equal(
    getOriginalPlaybackFallbackNotice({
      issueType: "frozen-video",
      hasMuxFallback: false,
      muxLoadFailed: true,
      muxRetryPending: false,
    }).detail,
    "720p needs another try",
  );
});
