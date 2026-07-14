/** Default FPS when the stream does not expose a frame rate. */
export const DEFAULT_VIDEO_FPS = 30;

/**
 * Seconds to seek for a single frame step.
 * Falls back to 30fps when fps is missing or non-positive.
 */
export function frameDeltaSeconds(fps?: number | null): number {
  const rate = typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_VIDEO_FPS;
  return 1 / rate;
}

/**
 * Clamp a stepped time into [0, duration] when duration is known.
 */
export function nextFrameTime(
  currentTime: number,
  direction: 1 | -1,
  fps?: number | null,
  duration?: number | null,
): number {
  const delta = frameDeltaSeconds(fps) * direction;
  let next = currentTime + delta;
  if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
    next = Math.min(Math.max(next, 0), duration);
  } else {
    next = Math.max(next, 0);
  }
  return next;
}

/**
 * Zero-based frame index for a timestamp at the given fps.
 */
export function frameIndexAtTime(seconds: number, fps?: number | null): number {
  const rate = typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_VIDEO_FPS;
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.round(seconds * rate);
}

/**
 * SMPTE-style timecode `HH:MM:SS:FF` (or `MM:SS:FF` when under an hour).
 */
export function formatFrameTimecode(seconds: number, fps?: number | null): string {
  const rate = typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_VIDEO_FPS;
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const totalFrames = Math.max(0, Math.round(safeSeconds * rate));
  const ff = totalFrames % Math.round(rate);
  const totalSeconds = Math.floor(totalFrames / Math.round(rate));
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);

  const framePart = ff.toString().padStart(2, "0");
  const secPart = ss.toString().padStart(2, "0");
  const minPart = mm.toString().padStart(2, "0");

  if (hh > 0) {
    return `${hh.toString().padStart(2, "0")}:${minPart}:${secPart}:${framePart}`;
  }
  return `${minPart}:${secPart}:${framePart}`;
}
