/** Frame-accurate stepping math. Times are seconds; frame indexes start at 0. */

export const DEFAULT_FRAME_RATE = 30;

/** NTSC rates are exact ratios; 29.97 would drift a frame behind on long recordings. */
const COMMON_FRAME_RATES = [
  24000 / 1001,
  24,
  25,
  30000 / 1001,
  30,
  48,
  50,
  60000 / 1001,
  60,
  120,
] as const;
const MIN_PLAUSIBLE_FRAME_RATE = 10;
const MAX_PLAUSIBLE_FRAME_RATE = 240;
/** Absorbs float error from `time * fps` round-trips on exact frame boundaries. */
const FRAME_EPSILON = 1e-6;
/** Neighbouring frame intervals within 1% of each other count as evenly spaced. */
const EVEN_INTERVAL_TOLERANCE = 0.01;

export function resolveFrameRate(candidate?: number | null): number {
  if (
    typeof candidate !== "number" ||
    !Number.isFinite(candidate) ||
    candidate < MIN_PLAUSIBLE_FRAME_RATE ||
    candidate > MAX_PLAUSIBLE_FRAME_RATE
  ) {
    return DEFAULT_FRAME_RATE;
  }
  let nearest: number | undefined;
  for (const rate of COMMON_FRAME_RATES) {
    if (nearest === undefined || Math.abs(candidate - rate) < Math.abs(candidate - nearest)) {
      nearest = rate;
    }
  }
  // Snap only near-misses (e.g. rates measured from presented frames); keep
  // plausible non-standard rates untouched.
  if (nearest !== undefined && Math.abs(candidate - nearest) <= nearest * 0.005) {
    return nearest;
  }
  return candidate;
}

export function frameIndexAtTime(timeSeconds: number, frameRate: number): number {
  const fps = resolveFrameRate(frameRate);
  if (!Number.isFinite(timeSeconds) || timeSeconds <= 0) return 0;
  return Math.max(0, Math.floor(timeSeconds * fps + FRAME_EPSILON));
}

/**
 * Seek target for the frame `deltaFrames` away from the one shown at
 * `currentTime`, clamped to the first and last frame. Targets sit mid-frame:
 * Chromium shows the previous frame for a seek to an exact boundary and reads
 * `currentTime` back truncated, so a boundary target would show and count the
 * wrong frame.
 */
export function steppedTime(
  currentTime: number,
  deltaFrames: number,
  frameRate: number,
  duration?: number,
): number {
  const fps = resolveFrameRate(frameRate);
  const knownDuration =
    typeof duration === "number" && Number.isFinite(duration) && duration >= 0 ? duration : null;
  const lastFrame =
    knownDuration === null
      ? Infinity
      : Math.max(0, Math.ceil(knownDuration * fps - FRAME_EPSILON) - 1);
  const frame = Math.min(
    lastFrame,
    Math.max(0, frameIndexAtTime(currentTime, fps) + Math.round(deltaFrames)),
  );
  const time = (frame + 0.5) / fps;
  return knownDuration === null ? time : Math.min(time, knownDuration);
}

/**
 * Non-drop-frame `HH:MM:SS:FF` timecode for the frame shown at `timeSeconds`.
 * Fractional rates count whole frames at the nominal rate (29.97 labels as 30).
 */
export function formatTimecode(timeSeconds: number, frameRate: number): string {
  const nominalRate = Math.round(resolveFrameRate(frameRate));
  const frameIndex = frameIndexAtTime(timeSeconds, frameRate);
  const totalSeconds = Math.floor(frameIndex / nominalRate);
  const pad = (value: number) => value.toString().padStart(2, "0");
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(totalSeconds % 60)}:${pad(frameIndex % nominalRate)}`;
}

type PresentedFrame = { mediaTime: number; presentedFrames: number };

/**
 * Frame rate implied by three back-to-back `requestVideoFrameCallback` frames
 * whose intervals match, or null. Dropped frames only widen the intervals, so
 * callers should keep the highest rate seen.
 */
export function frameRateFromPresentedFrames(
  first: PresentedFrame,
  second: PresentedFrame,
  third: PresentedFrame,
): number | null {
  if (
    second.presentedFrames - first.presentedFrames !== 1 ||
    third.presentedFrames - second.presentedFrames !== 1
  ) {
    return null;
  }
  const earlier = second.mediaTime - first.mediaTime;
  const later = third.mediaTime - second.mediaTime;
  if (earlier <= 0 || later <= 0 || Math.abs(earlier - later) > earlier * EVEN_INTERVAL_TOLERANCE) {
    return null;
  }
  const estimated = 2 / (earlier + later);
  if (estimated < MIN_PLAUSIBLE_FRAME_RATE || estimated > MAX_PLAUSIBLE_FRAME_RATE) return null;
  return resolveFrameRate(estimated);
}
