/**
 * Pure helpers for recovering when a progressive "Original" source fails to
 * play in the browser (unsupported codecs like ProRes, demuxer errors, etc.).
 */

export type OriginalPlaybackIssueType = "frozen-video" | "media-error";

export type OriginalPlaybackFallbackNotice = {
  headline: string;
  detail: string;
  /** Single-line message for compact toasts. */
  message: string;
};

export type MediaErrorLike = {
  code: number;
  message?: string;
} | null;

export type PlayFailureClassification =
  | { kind: "ignore" }
  | {
      kind: "media-failure";
      code: number;
      message: string;
    };

const IGNORABLE_PLAY_REJECTION_NAMES = new Set(["NotAllowedError", "AbortError"]);

const MEDIA_FAILURE_PLAY_REJECTION_NAMES = new Set([
  "NotSupportedError",
  "NotReadableError",
  // Some engines surface a transient invalid state when the element has no
  // decodable tracks after a failed progressive attach.
  "InvalidStateError",
]);

const MEDIA_FAILURE_MESSAGE_PATTERN =
  /decode|demux|not supported|no supported source|format|MEDIA_ERR|could not be decoded|no.*tracks/i;

export function isIgnorablePlayRejection(error: unknown): boolean {
  const name = getErrorName(error);
  return name !== null && IGNORABLE_PLAY_REJECTION_NAMES.has(name);
}

/**
 * Decide whether a rejected `HTMLMediaElement.play()` should trigger an
 * automatic Original → playable-rendition fallback.
 *
 * Autoplay policy and abort rejections are ignored. Explicit media failures
 * (and progressive sources that already have a media error) are not.
 */
export function classifyPlayFailure({
  error,
  mediaError,
  isProgressiveSource,
}: {
  error: unknown;
  mediaError?: MediaErrorLike;
  isProgressiveSource: boolean;
}): PlayFailureClassification {
  if (!isProgressiveSource) {
    return { kind: "ignore" };
  }

  if (isIgnorablePlayRejection(error)) {
    return { kind: "ignore" };
  }

  if (mediaError && mediaError.code > 0) {
    return {
      kind: "media-failure",
      code: mediaError.code,
      message: mediaError.message?.trim() || "The browser could not play this video source.",
    };
  }

  const name = getErrorName(error);
  const message = getErrorMessage(error);

  if (name && MEDIA_FAILURE_PLAY_REJECTION_NAMES.has(name)) {
    return {
      kind: "media-failure",
      code: 0,
      message: message || name,
    };
  }

  if (message && MEDIA_FAILURE_MESSAGE_PATTERN.test(message)) {
    return {
      kind: "media-failure",
      code: 0,
      message,
    };
  }

  return { kind: "ignore" };
}

/**
 * Whether a progressive Original source should be abandoned after a reported
 * player issue. HLS/Mux renditions are never abandoned by this helper.
 */
export function shouldFallbackFromOriginalSource({
  isProgressiveSource,
  issueType,
}: {
  isProgressiveSource: boolean;
  issueType: OriginalPlaybackIssueType;
}): boolean {
  if (!isProgressiveSource) return false;
  return issueType === "media-error" || issueType === "frozen-video";
}

/**
 * Preferred recovery target after Original fails. Prefer an already-ready 720p
 * Mux session; otherwise wait for Mux rather than retrying the broken original.
 */
export function selectFallbackPlaybackSource({
  muxUrl,
  muxPlaybackReady,
}: {
  muxUrl: string | null;
  muxPlaybackReady: boolean;
}): "mux720" {
  void muxUrl;
  void muxPlaybackReady;
  return "mux720";
}

/**
 * User-facing copy for the automatic Original → 720p recovery banner.
 */
export function getOriginalPlaybackFallbackNotice({
  issueType,
  hasMuxFallback,
  muxLoadFailed,
  muxRetryPending,
}: {
  issueType: OriginalPlaybackIssueType;
  hasMuxFallback: boolean;
  muxLoadFailed: boolean;
  muxRetryPending: boolean;
}): OriginalPlaybackFallbackNotice {
  if (hasMuxFallback) {
    if (issueType === "frozen-video") {
      return {
        headline: "Original playback stalled",
        detail: "Switched to 720p",
        message: "Original playback stalled — switched to 720p",
      };
    }
    return {
      headline: "Original format isn't playable in this browser",
      detail: "Switched to 720p",
      message: "Original format isn't playable in this browser — switched to 720p",
    };
  }

  if (muxLoadFailed && !muxRetryPending) {
    return {
      headline:
        issueType === "frozen-video"
          ? "Original playback stalled"
          : "Original format isn't playable in this browser",
      detail: "720p needs another try",
      message:
        issueType === "frozen-video"
          ? "Original playback stalled — 720p needs another try"
          : "Original format isn't playable in this browser — 720p needs another try",
    };
  }

  return {
    headline:
      issueType === "frozen-video"
        ? "Original playback stalled"
        : "Original format isn't playable in this browser",
    detail: "Preparing 720p…",
    message:
      issueType === "frozen-video"
        ? "Original playback stalled — preparing 720p…"
        : "Original format isn't playable in this browser — preparing 720p…",
  };
}

function getErrorName(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if (!("name" in error)) return null;
  const name = (error as { name: unknown }).name;
  return typeof name === "string" && name.length > 0 ? name : null;
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  if (!("message" in error)) return "";
  const message = (error as { message: unknown }).message;
  return typeof message === "string" ? message : "";
}
