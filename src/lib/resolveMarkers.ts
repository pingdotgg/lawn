import { buildCommentsExportFilename } from "@/lib/commentCsv";

/**
 * DaVinci Resolve imports this as timeline markers
 * (Media Pool → right-click the timeline → Timelines → Import → Timeline Markers from EDL).
 *
 * The file matches Resolve's own marker EDL: one CMX 3600 event per marker, then a
 * ` |C:ResolveColor… |M:name |D:frames` line. Resolve keeps a single marker on a timecode,
 * so notes that land on the same frame are combined into that one marker.
 *
 * New Resolve timelines start at 01:00:00:00, and record timecode is where the marker
 * is placed. Media time 0 is written as that start timecode.
 *
 * Pass the video frame rate when the player knows it. An unknown rate uses 30 fps
 * non-drop, the same rate the player uses when it steps one frame.
 */

const KNOWN_FRAME_RATES = [
  { fps: 24000 / 1001, nominal: 24, dropFrame: false },
  { fps: 24, nominal: 24, dropFrame: false },
  { fps: 25, nominal: 25, dropFrame: false },
  { fps: 30000 / 1001, nominal: 30, dropFrame: true },
  { fps: 30, nominal: 30, dropFrame: false },
  { fps: 50, nominal: 50, dropFrame: false },
  { fps: 60000 / 1001, nominal: 60, dropFrame: true },
  { fps: 60, nominal: 60, dropFrame: false },
] as const;

const FRAME_RATE_SNAP_HZ = 0.015;
const RESOLVE_TIMELINE_START_HOUR = 1;
const MARKER_NAME_LIMIT = 1000;
const OPEN_MARKER_COLOR = "ResolveColorBlue";
const RESOLVED_MARKER_COLOR = "ResolveColorGreen";

interface ExportFrameRate {
  fps: number;
  nominal: number;
  dropFrame: boolean;
}

const FALLBACK_FRAME_RATE: ExportFrameRate = {
  fps: 30,
  nominal: 30,
  dropFrame: false,
};

export interface ResolveExportComment {
  text: string;
  timestampSeconds: number;
  userName?: string;
  resolved?: boolean;
  replies?: readonly ResolveExportComment[];
}

interface TimecodeParts {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
}

function resolveExportFrameRate(input: number | null | undefined): ExportFrameRate {
  if (typeof input !== "number" || !Number.isFinite(input) || input <= 0) {
    return FALLBACK_FRAME_RATE;
  }

  let closest: (typeof KNOWN_FRAME_RATES)[number] | null = null;
  let closestDistance = FRAME_RATE_SNAP_HZ;
  for (const candidate of KNOWN_FRAME_RATES) {
    const distance = Math.abs(candidate.fps - input);
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }
  if (closest) {
    return { fps: closest.fps, nominal: closest.nominal, dropFrame: closest.dropFrame };
  }

  const nominal = Math.round(input);
  if (nominal >= 1 && nominal <= 120) {
    return { fps: input, nominal, dropFrame: false };
  }

  return FALLBACK_FRAME_RATE;
}

function dropFramesPerMinute(nominal: number) {
  return Math.round(nominal / 15);
}

function frameNumberToNonDrop(frameNumber: number, nominal: number): TimecodeParts {
  const safe = Math.max(0, frameNumber);
  const frames = safe % nominal;
  const totalSeconds = Math.floor(safe / nominal);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
    frames,
  };
}

function frameNumberToDropFrame(frameNumber: number, nominal: number): TimecodeParts {
  const drop = dropFramesPerMinute(nominal);
  const framesPerMinuteNominal = nominal * 60;
  const framesPerMinute = framesPerMinuteNominal - drop;
  const framesPerTenMinutes = framesPerMinuteNominal * 10 - drop * 9;
  const framesPerHour = framesPerTenMinutes * 6;
  const safe = Math.max(0, frameNumber);
  const hours = Math.floor(safe / framesPerHour);
  let remainder = safe % framesPerHour;
  const tenMinuteBlocks = Math.floor(remainder / framesPerTenMinutes);
  remainder %= framesPerTenMinutes;

  let minutes: number;
  let framesIntoMinute: number;
  if (remainder < framesPerMinuteNominal) {
    minutes = tenMinuteBlocks * 10;
    framesIntoMinute = remainder;
  } else {
    const afterFirstMinute = remainder - framesPerMinuteNominal;
    const minuteIndex = Math.floor(afterFirstMinute / framesPerMinute);
    minutes = tenMinuteBlocks * 10 + minuteIndex + 1;
    framesIntoMinute = (afterFirstMinute % framesPerMinute) + drop;
  }

  return {
    hours,
    minutes,
    seconds: Math.floor(framesIntoMinute / nominal),
    frames: framesIntoMinute % nominal,
  };
}

function dropFrameToFrameNumber(parts: TimecodeParts, nominal: number) {
  const drop = dropFramesPerMinute(nominal);
  const totalMinutes = parts.hours * 60 + parts.minutes;
  return (
    (parts.hours * 3600 + parts.minutes * 60 + parts.seconds) * nominal +
    parts.frames -
    drop * (totalMinutes - Math.floor(totalMinutes / 10))
  );
}

function timelineStartFrame(rate: ExportFrameRate) {
  if (!rate.dropFrame) return rate.nominal * 3600 * RESOLVE_TIMELINE_START_HOUR;
  return dropFrameToFrameNumber(
    { hours: RESOLVE_TIMELINE_START_HOUR, minutes: 0, seconds: 0, frames: 0 },
    rate.nominal,
  );
}

function secondsToMediaFrame(seconds: number, fps: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.max(0, Math.round(seconds * fps));
}

function padTimecodeUnit(value: number) {
  return String(value).padStart(2, "0");
}

function formatTimecodeFromFrame(frameNumber: number, rate: ExportFrameRate) {
  const parts = rate.dropFrame
    ? frameNumberToDropFrame(frameNumber, rate.nominal)
    : frameNumberToNonDrop(frameNumber, rate.nominal);
  const frameSeparator = rate.dropFrame ? ";" : ":";
  return `${padTimecodeUnit(parts.hours)}:${padTimecodeUnit(parts.minutes)}:${padTimecodeUnit(parts.seconds)}${frameSeparator}${padTimecodeUnit(parts.frames)}`;
}

export function formatResolveTimecode(seconds: number, frameRate?: number | null) {
  const rate = resolveExportFrameRate(frameRate);
  return formatTimecodeFromFrame(
    timelineStartFrame(rate) + secondsToMediaFrame(seconds, rate.fps),
    rate,
  );
}

function formatEventLine(eventNumber: number, timecodeIn: string, timecodeOut: string) {
  const event = String(eventNumber).padStart(3, "0");
  const reel = "001".padEnd(8, " ");
  return `${event}  ${reel} V     C        ${timecodeIn} ${timecodeOut} ${timecodeIn} ${timecodeOut}  `;
}

function sanitizeEdlText(value: string) {
  let cleaned = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 10 || code === 13) {
      cleaned += " ";
    } else if (code === 124) {
      cleaned += "/";
    } else if (code < 32 || code === 127) {
      cleaned += " ";
    } else {
      cleaned += char;
    }
  }
  return cleaned.replace(/[ \t]{2,}/g, " ").trim();
}

function capMarkerName(value: string) {
  if (value.length <= MARKER_NAME_LIMIT) return value;
  return `${value.slice(0, MARKER_NAME_LIMIT - 3)}...`;
}

function markerLabel(comment: ResolveExportComment, reply: boolean) {
  const name = sanitizeEdlText(comment.userName ?? "");
  const text = sanitizeEdlText(comment.text);
  const who = name ? (reply ? `${name} (reply)` : name) : reply ? "Reply" : "";
  const body = who && text ? `${who}: ${text}` : who || text || "Comment";
  return comment.resolved === true ? `${body} (resolved)` : body;
}

interface MarkerEvent {
  frame: number;
  labels: string[];
  resolved: boolean;
}

function collectMarkerEvents(comments: readonly ResolveExportComment[], rate: ExportFrameRate) {
  const events: MarkerEvent[] = [];
  const byFrame = new Map<number, MarkerEvent>();

  const add = (comment: ResolveExportComment, reply: boolean) => {
    const frame = secondsToMediaFrame(comment.timestampSeconds, rate.fps);
    const label = markerLabel(comment, reply);
    const resolved = comment.resolved === true;
    const existing = byFrame.get(frame);
    if (existing) {
      existing.labels.push(label);
      existing.resolved = existing.resolved && resolved;
      return;
    }
    const created = { frame, labels: [label], resolved };
    byFrame.set(frame, created);
    events.push(created);
  };

  for (const comment of comments) {
    add(comment, false);
    for (const reply of comment.replies ?? []) {
      add(reply, true);
    }
  }

  events.sort((a, b) => a.frame - b.frame);
  return events;
}

export function buildResolveMarkerEdl(
  comments: readonly ResolveExportComment[],
  options?: { frameRate?: number | null; title?: string },
) {
  const rate = resolveExportFrameRate(options?.frameRate);
  const title = sanitizeEdlText(options?.title ?? "") || "Lawn comments";
  const frameCodeMode = rate.dropFrame ? "DROP FRAME" : "NON-DROP FRAME";
  const startFrame = timelineStartFrame(rate);
  const lines = [`TITLE: ${title}`, `FCM: ${frameCodeMode}`, ""];

  for (const [index, event] of collectMarkerEvents(comments, rate).entries()) {
    const timecodeIn = formatTimecodeFromFrame(startFrame + event.frame, rate);
    const timecodeOut = formatTimecodeFromFrame(startFrame + event.frame + 1, rate);
    lines.push(formatEventLine(index + 1, timecodeIn, timecodeOut));
    lines.push(
      ` |C:${event.resolved ? RESOLVED_MARKER_COLOR : OPEN_MARKER_COLOR} |M:${capMarkerName(event.labels.join(" / "))} |D:1`,
    );
    lines.push("");
  }

  return lines.join("\n");
}

export function buildResolveMarkerFilename(videoTitle: string) {
  return buildCommentsExportFilename(videoTitle, "edl");
}
