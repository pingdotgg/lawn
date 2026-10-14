/** Snap review playback to media frames. Use 30 fps when the file does not advertise a rate. */
export const FALLBACK_FRAME_RATE = 30;

const MIN_FRAME_RATE = 1;
const MAX_FRAME_RATE = 240;
const RANGE_BYTES = 1024 * 1024;
const FRAME_RATE_PATTERN = /FRAME-RATE=(\d+(?:\.\d+)?)/g;

export function knownFrameRate(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < MIN_FRAME_RATE || value > MAX_FRAME_RATE) return null;
  return value;
}

export function frameIndexAt(timeSeconds: number, frameRate: number): number {
  const rate = knownFrameRate(frameRate) ?? FALLBACK_FRAME_RATE;
  if (!Number.isFinite(timeSeconds) || timeSeconds <= 0) return 0;
  return Math.round(timeSeconds * rate);
}

export function formatFrameTimecode(timeSeconds: number, frameRate: number): string {
  const rate = knownFrameRate(frameRate) ?? FALLBACK_FRAME_RATE;
  const nominal = Math.max(1, Math.round(rate));
  const frame = frameIndexAt(timeSeconds, rate);
  const frames = frame % nominal;
  const totalSeconds = Math.floor(frame / nominal);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

/** Move an integer number of frames and clamp to the media duration. */
export function stepFrameTime({
  currentTime,
  frames,
  frameRate,
  duration,
}: {
  currentTime: number;
  frames: number;
  frameRate: number;
  duration?: number;
}) {
  const rate = knownFrameRate(frameRate) ?? FALLBACK_FRAME_RATE;
  const delta = Number.isFinite(frames) ? Math.trunc(frames) : 0;
  let frame = Math.max(0, frameIndexAt(currentTime, rate) + delta);
  let time = frame / rate;
  if (typeof duration === "number" && Number.isFinite(duration)) {
    const end = Math.max(0, duration);
    if (time > end) {
      time = end;
      frame = frameIndexAt(end, rate);
    }
  }
  return { time, frame, frameRate: rate };
}

/**
 * Keep a stepped frame's exact timestamp while the browser seek settles.
 * Playback that leaves the frame drops the hold so later comments follow the playhead.
 */
export function settledPlaybackTime({
  intendedTime,
  reportedTime,
  frameRate,
  seeking,
}: {
  intendedTime: number | null;
  reportedTime: number;
  frameRate: number;
  seeking: boolean;
}) {
  const reported = Number.isFinite(reportedTime) ? reportedTime : 0;
  if (intendedTime === null || !Number.isFinite(intendedTime)) {
    return { time: reported, intendedTime: null };
  }
  if (seeking) return { time: intendedTime, intendedTime };
  const rate = knownFrameRate(frameRate) ?? FALLBACK_FRAME_RATE;
  if (Math.abs(reported - intendedTime) <= 0.5 / rate + 1e-4) {
    return { time: intendedTime, intendedTime };
  }
  return { time: reported, intendedTime: null };
}

export function frameRateFromLevels(
  levels: ReadonlyArray<{ frameRate?: number } | null | undefined>,
  currentIndex = -1,
): number | null {
  const ordered: Array<number | undefined> = [];
  if (currentIndex >= 0 && currentIndex < levels.length) {
    ordered.push(levels[currentIndex]?.frameRate);
  }
  levels.forEach((level, index) => {
    if (index !== currentIndex) ordered.push(level?.frameRate);
  });
  for (const candidate of ordered) {
    const known = knownFrameRate(candidate);
    if (known !== null) return known;
  }
  return null;
}

export function frameRateFromPlaylist(playlist: string): number | null {
  for (const match of playlist.matchAll(FRAME_RATE_PATTERN)) {
    const rate = knownFrameRate(Number(match[1]));
    if (rate !== null) return rate;
  }
  return null;
}

function readU32(data: Uint8Array, offset: number) {
  return (
    data[offset] * 0x1000000 +
    data[offset + 1] * 0x10000 +
    data[offset + 2] * 0x100 +
    data[offset + 3]
  );
}

function readU64(data: Uint8Array, offset: number) {
  return readU32(data, offset) * 0x100000000 + readU32(data, offset + 4);
}

function ascii4(data: Uint8Array, offset: number) {
  return String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
}

function readBoxHeader(data: Uint8Array, offset: number) {
  if (offset < 0 || offset + 8 > data.length) return null;
  let size = readU32(data, offset);
  const type = ascii4(data, offset + 4);
  let header = 8;
  if (size === 1) {
    if (offset + 16 > data.length) return null;
    const large = readU64(data, offset + 8);
    if (!Number.isSafeInteger(large)) return null;
    size = large;
    header = 16;
  }
  if (size !== 0 && size < header) return null;
  return { type, header, size };
}

/** Byte offset of a moov that starts after this window, when a preceding box advertises its end. */
export function locateFollowingMoov(data: Uint8Array): number | null {
  let offset = 0;
  while (offset + 8 <= data.length) {
    const box = readBoxHeader(data, offset);
    if (!box || box.size === 0) return null;
    if (box.type === "moov") return null;
    if (!Number.isSafeInteger(offset + box.size)) return null;
    if (offset + box.size > data.length) {
      const next = offset + box.size;
      return next > data.length ? next : null;
    }
    offset += box.size;
  }
  return null;
}

function readTimescale(data: Uint8Array, start: number, end: number) {
  if (start >= end) return null;
  const timescaleOffset = data[start] === 1 ? 20 : 12;
  if (start + timescaleOffset + 4 > end) return null;
  const timescale = readU32(data, start + timescaleOffset);
  return timescale > 0 ? timescale : null;
}

function dominantSampleDelta(data: Uint8Array, start: number, end: number) {
  if (start + 8 > end) return null;
  const count = readU32(data, start + 4);
  let bestDelta: number | null = null;
  let bestCount = -1;
  for (let index = 0; index < count; index += 1) {
    const entry = start + 8 + index * 8;
    if (entry + 8 > end) break;
    const samples = readU32(data, entry);
    const delta = readU32(data, entry + 4);
    if (delta > 0 && samples > bestCount) {
      bestCount = samples;
      bestDelta = delta;
    }
  }
  return bestDelta;
}

function handlerType(data: Uint8Array, start: number, end: number) {
  if (start + 12 > end) return null;
  return ascii4(data, start + 8);
}

function readTrackTiming(
  data: Uint8Array,
  start: number,
  end: number,
): { timescale: number; sampleDelta: number } | null {
  let isVideo = false;
  let timescale: number | null = null;
  let sampleDelta: number | null = null;

  const visit = (from: number, to: number, depth: number) => {
    if (depth > 8) return;
    let offset = from;
    while (offset + 8 <= to) {
      const box = readBoxHeader(data, offset);
      if (!box || box.size === 0) return;
      const payloadStart = offset + box.header;
      const declaredEnd = offset + box.size;
      const payloadEnd = Math.min(to, declaredEnd);
      if (payloadStart > to) return;
      if (box.type === "hdlr" && declaredEnd <= to) {
        if (handlerType(data, payloadStart, payloadEnd) === "vide") isVideo = true;
      } else if (box.type === "mdhd" && declaredEnd <= to) {
        const nextTimescale = readTimescale(data, payloadStart, payloadEnd);
        if (nextTimescale !== null) timescale = nextTimescale;
      } else if (box.type === "stts" && declaredEnd <= to) {
        const nextDelta = dominantSampleDelta(data, payloadStart, payloadEnd);
        if (nextDelta !== null) sampleDelta = nextDelta;
      } else if (box.type === "mdia" || box.type === "minf" || box.type === "stbl") {
        visit(payloadStart, payloadEnd, depth + 1);
      }
      if (declaredEnd > to) return;
      offset = declaredEnd;
    }
  };

  visit(start, end, 0);
  if (!isVideo || timescale === null || sampleDelta === null) return null;
  return { timescale, sampleDelta };
}

function readVideoTiming(data: Uint8Array, start: number, end: number) {
  let offset = start;
  while (offset + 8 <= end) {
    const box = readBoxHeader(data, offset);
    if (!box || box.size === 0) break;
    const payloadStart = offset + box.header;
    const payloadEnd = Math.min(end, offset + box.size);
    if (payloadStart > end) break;
    if (box.type === "trak") {
      const timing = readTrackTiming(data, payloadStart, payloadEnd);
      if (timing) return timing;
    } else if (box.type === "moov") {
      const timing = readVideoTiming(data, payloadStart, payloadEnd);
      if (timing) return timing;
    }
    if (offset + box.size > end) break;
    offset += box.size;
  }
  return null;
}

export function frameRateFromIsoBmff(data: Uint8Array): number | null {
  const timing = readVideoTiming(data, 0, data.length);
  if (!timing) return null;
  return knownFrameRate(timing.timescale / timing.sampleDelta);
}

export type FrameRateProbe =
  | { action: "use"; frameRate: number }
  | { action: "fetch"; start: number }
  | { action: "unknown" };

export function probeIsoBmff(data: Uint8Array): FrameRateProbe {
  const frameRate = frameRateFromIsoBmff(data);
  if (frameRate !== null) return { action: "use", frameRate };
  const start = locateFollowingMoov(data);
  if (start !== null) return { action: "fetch", start };
  return { action: "unknown" };
}

async function readLimitedBody(response: Response, limit: number) {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (received < limit) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const remaining = limit - received;
    const slice = value.byteLength > remaining ? value.subarray(0, remaining) : value;
    chunks.push(slice);
    received += slice.byteLength;
    if (value.byteLength > remaining) break;
  }
  await reader.cancel().catch(() => undefined);
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchByteRange(
  url: string,
  start: number,
  endInclusive: number,
  signal: AbortSignal,
) {
  try {
    const response = await fetch(url, {
      signal,
      credentials: "same-origin",
      headers: { Range: `bytes=${start}-${endInclusive}` },
    });
    if (!response.ok) return null;
    return await readLimitedBody(response, endInclusive - start + 1);
  } catch {
    return null;
  }
}

async function fetchText(url: string, signal: AbortSignal) {
  try {
    const response = await fetch(url, { signal, credentials: "same-origin" });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function loadPlaylistFrameRate(
  url: string,
  signal: AbortSignal,
  readText: (url: string, signal: AbortSignal) => Promise<string | null> = fetchText,
) {
  const playlist = await readText(url, signal);
  if (!playlist) return null;
  return frameRateFromPlaylist(playlist);
}

export async function loadProgressiveFrameRate(
  url: string,
  signal: AbortSignal,
  readRange: (
    url: string,
    start: number,
    endInclusive: number,
    signal: AbortSignal,
  ) => Promise<Uint8Array | null> = fetchByteRange,
) {
  const head = await readRange(url, 0, RANGE_BYTES - 1, signal);
  if (!head) return null;
  const probed = probeIsoBmff(head);
  if (probed.action === "use") return probed.frameRate;
  if (probed.action === "fetch") {
    const moov = await readRange(url, probed.start, probed.start + RANGE_BYTES - 1, signal);
    if (!moov) return null;
    return frameRateFromIsoBmff(moov);
  }
  return null;
}
