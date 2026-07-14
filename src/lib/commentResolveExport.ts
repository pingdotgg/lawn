/**
 * DaVinci Resolve timeline markers export.
 *
 * Produces a markers CSV matching the common Resolve export/import shape:
 *   No.,Name,Start,End,Duration,Color,Notes
 * with non-drop timecodes as HH:MM:SS:FF.
 *
 * Import (Resolve 18+): open the timeline → right-click the timeline ruler
 * (or Index → Markers) → Import Markers… / File → Import → Timeline… and
 * select this CSV. Timeline frame rate should match the export fps.
 */

/** Editorial default; override when the cut is 23.976 / 25 / 29.97 / 30. */
export const DEFAULT_RESOLVE_FPS = 24;

/** One-frame marker duration in frames (Resolve point markers). */
const MARKER_DURATION_FRAMES = 1;

interface ResolveComment {
  text: string;
  timestampSeconds: number;
  userName?: string;
  resolved?: boolean;
}

interface ResolveCommentThread extends ResolveComment {
  replies: ResolveComment[];
}

export interface BuildResolveMarkersOptions {
  /** Timeline frame rate. Defaults to {@link DEFAULT_RESOLVE_FPS}. */
  fps?: number;
}

function escapeCsvCell(value: string) {
  const spreadsheetSafeValue = /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${spreadsheetSafeValue.replaceAll('"', '""')}"`;
}

/**
 * Convert media seconds to non-drop timecode HH:MM:SS:FF.
 * Uses rounded nominal fps for the frame field (24 for 23.976, 30 for 29.97).
 */
export function secondsToTimecode(
  totalSeconds: number,
  fps: number = DEFAULT_RESOLVE_FPS,
): string {
  const rate = Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_RESOLVE_FPS;
  const seconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const nominalFps = Math.max(1, Math.round(rate));
  const totalFrames = Math.round(seconds * rate);

  const ff = ((totalFrames % nominalFps) + nominalFps) % nominalFps;
  const totalWholeSeconds = Math.floor(totalFrames / nominalFps);
  const ss = totalWholeSeconds % 60;
  const totalMinutes = Math.floor(totalWholeSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);

  return [hh, mm, ss, ff].map((n) => String(n).padStart(2, "0")).join(":");
}

function framesToTimecode(totalFrames: number, nominalFps: number): string {
  const frames = Math.max(0, Math.floor(totalFrames));
  const fps = Math.max(1, nominalFps);
  const ff = frames % fps;
  const totalWholeSeconds = Math.floor(frames / fps);
  const ss = totalWholeSeconds % 60;
  const totalMinutes = Math.floor(totalWholeSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);
  return [hh, mm, ss, ff].map((n) => String(n).padStart(2, "0")).join(":");
}

function markerColor(resolved: boolean | undefined): string {
  return resolved ? "Green" : "Blue";
}

function markerName(comment: ResolveComment, isReply: boolean): string {
  const author = comment.userName?.trim() || "Comment";
  const status = comment.resolved ? "✓ " : "";
  const prefix = isReply ? "↳ " : "";
  // Keep name short so it fits the Resolve marker lane.
  const snippet = comment.text.replace(/\s+/g, " ").trim().slice(0, 48);
  const label = snippet ? `${author}: ${snippet}` : author;
  return `${prefix}${status}${label}`.slice(0, 80);
}

function markerNotes(comment: ResolveComment, isReply: boolean): string {
  const author = comment.userName?.trim() || "Unknown";
  const status = comment.resolved ? "Resolved" : "Open";
  const kind = isReply ? "Reply" : "Comment";
  return [`[${kind}] ${author} · ${status}`, comment.text.trim()].filter(Boolean).join("\n");
}

type FlatMarker = ResolveComment & { isReply: boolean };

function flattenComments(comments: ResolveCommentThread[]): FlatMarker[] {
  return comments.flatMap((comment) => [
    { ...comment, isReply: false },
    ...comment.replies.map((reply) => ({ ...reply, isReply: true })),
  ]);
}

/**
 * Build a DaVinci Resolve markers CSV from threaded comments.
 * Top-level comments keep timeline order; replies follow their parent.
 */
export function buildResolveMarkersCsv(
  comments: ResolveCommentThread[],
  options: BuildResolveMarkersOptions = {},
): string {
  const fps = options.fps ?? DEFAULT_RESOLVE_FPS;
  const nominalFps = Math.max(1, Math.round(fps > 0 ? fps : DEFAULT_RESOLVE_FPS));
  const durationTc = framesToTimecode(MARKER_DURATION_FRAMES, nominalFps);
  const rows = flattenComments(comments);

  const header = "No.,Name,Start,End,Duration,Color,Notes";
  const body = rows.map((comment, index) => {
    const start = secondsToTimecode(comment.timestampSeconds, fps);
    // Point marker: End = Start + 1 frame for importers that require a range.
    const startFrames = Math.round(
      Math.max(0, Number.isFinite(comment.timestampSeconds) ? comment.timestampSeconds : 0) * fps,
    );
    const end = framesToTimecode(startFrames + MARKER_DURATION_FRAMES, nominalFps);

    return [
      String(index + 1),
      escapeCsvCell(markerName(comment, comment.isReply)),
      escapeCsvCell(start),
      escapeCsvCell(end),
      escapeCsvCell(durationTc),
      escapeCsvCell(markerColor(comment.resolved)),
      escapeCsvCell(markerNotes(comment, comment.isReply)),
    ].join(",");
  });

  return [header, ...body].join("\r\n");
}

export function buildResolveMarkersFilename(videoTitle: string) {
  const slug = videoTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return `${slug || "video"}-resolve-markers.csv`;
}
