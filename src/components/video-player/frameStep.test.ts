import assert from "node:assert/strict";
import test from "node:test";
import {
  FALLBACK_FRAME_RATE,
  formatFrameTimecode,
  frameIndexAt,
  frameRateFromIsoBmff,
  frameRateFromLevels,
  frameRateFromPlaylist,
  knownFrameRate,
  loadPlaylistFrameRate,
  loadProgressiveFrameRate,
  locateFollowingMoov,
  probeIsoBmff,
  settledPlaybackTime,
  stepFrameTime,
} from "./frameStep";

const NTSC_FILM = 24000 / 1001;

function u32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function box(type: string, payload: Uint8Array) {
  return concat([u32(8 + payload.length), new TextEncoder().encode(type), payload]);
}

function mdhd(timescale: number) {
  return concat([u32(0), u32(0), u32(0), u32(timescale), u32(timescale), new Uint8Array(4)]);
}

function hdlr(kind: string) {
  return concat([u32(0), u32(0), new TextEncoder().encode(kind), new Uint8Array(13)]);
}

function stts(entries: Array<[number, number]>) {
  return concat([
    u32(0),
    u32(entries.length),
    ...entries.flatMap(([count, delta]) => [u32(count), u32(delta)]),
  ]);
}

function track(kind: string, timescale: number, entries: Array<[number, number]>) {
  const table = box("stbl", box("stts", stts(entries)));
  const media = box(
    "mdia",
    concat([box("mdhd", mdhd(timescale)), box("hdlr", hdlr(kind)), box("minf", table)]),
  );
  return box("trak", media);
}

test("known frame rates reject missing and impossible values", () => {
  assert.equal(knownFrameRate(24), 24);
  assert.equal(knownFrameRate(23.976), 23.976);
  assert.equal(knownFrameRate(240), 240);
  for (const value of [undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.5, 241]) {
    assert.equal(knownFrameRate(value), null);
  }
});

test("stepping uses the media frame rate and returns to the same timestamp", () => {
  const forward = stepFrameTime({ currentTime: 10, frames: 1, frameRate: 24, duration: 20 });
  assert.equal(forward.frame, 241);
  assert.ok(Math.abs(forward.time - (10 + 1 / 24)) < 1e-12);
  const back = stepFrameTime({
    currentTime: forward.time,
    frames: -1,
    frameRate: 24,
    duration: 20,
  });
  assert.equal(back.time, 10);
  assert.equal(back.frame, 240);

  let time = 0;
  for (let frame = 0; frame < 240; frame += 1) {
    const stepped = stepFrameTime({
      currentTime: time,
      frames: 1,
      frameRate: NTSC_FILM,
      duration: 30,
    });
    assert.equal(stepped.frame, frame + 1);
    time = stepped.time;
  }
  assert.ok(Math.abs(time - 240 / NTSC_FILM) < 1e-9);
  const origin = stepFrameTime({
    currentTime: time,
    frames: -240,
    frameRate: NTSC_FILM,
    duration: 30,
  });
  assert.equal(origin.frame, 0);
  assert.equal(origin.time, 0);
});

test("frame steps clamp to the media and fall back to 30 fps", () => {
  assert.equal(stepFrameTime({ currentTime: 0, frames: -1, frameRate: 30, duration: 20 }).time, 0);
  assert.equal(stepFrameTime({ currentTime: 20, frames: 1, frameRate: 30, duration: 20 }).time, 20);
  const fallback = stepFrameTime({
    currentTime: 83,
    frames: 15,
    frameRate: Number.NaN,
    duration: 120,
  });
  assert.equal(fallback.frameRate, FALLBACK_FRAME_RATE);
  assert.equal(fallback.time, 83.5);
  assert.equal(fallback.frame, 2505);
  assert.equal(formatFrameTimecode(fallback.time, fallback.frameRate), "00:01:23:15");
  assert.equal(frameIndexAt(fallback.time, fallback.frameRate), 2505);
});

test("a settled step keeps its exact timestamp for a comment", () => {
  const stepped = stepFrameTime({ currentTime: 10, frames: 1, frameRate: 24, duration: 40 });
  const duringSeek = settledPlaybackTime({
    intendedTime: stepped.time,
    reportedTime: 10,
    frameRate: 24,
    seeking: true,
  });
  assert.equal(duringSeek.time, stepped.time);
  assert.equal(duringSeek.intendedTime, stepped.time);

  const afterSeek = settledPlaybackTime({
    intendedTime: stepped.time,
    reportedTime: stepped.time + 0.0004,
    frameRate: 24,
    seeking: false,
  });
  assert.equal(afterSeek.time, stepped.time);

  const playing = settledPlaybackTime({
    intendedTime: stepped.time,
    reportedTime: stepped.time + 0.05,
    frameRate: 24,
    seeking: false,
  });
  assert.equal(playing.time, stepped.time + 0.05);
  assert.equal(playing.intendedTime, null);
  assert.equal(
    settledPlaybackTime({
      intendedTime: null,
      reportedTime: 4,
      frameRate: 30,
      seeking: false,
    }).time,
    4,
  );
});

test("playlist and rendition frame rates prefer a real advertised rate", () => {
  assert.equal(
    frameRateFromPlaylist(
      "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,FRAME-RATE=23.976,RESOLUTION=1280x720\n",
    ),
    23.976,
  );
  assert.equal(
    frameRateFromPlaylist("#EXT-X-STREAM-INF:FRAME-RATE=9999\n#EXT-X-STREAM-INF:FRAME-RATE=29.97"),
    29.97,
  );
  assert.equal(frameRateFromPlaylist("#EXTM3U\n#EXTINF:4,\n"), null);
  assert.equal(
    frameRateFromLevels([{ frameRate: 0 }, { frameRate: 24 }, { frameRate: 60 }], 0),
    24,
  );
  assert.equal(frameRateFromLevels([{ frameRate: 30 }, { frameRate: 60 }], 1), 60);
  assert.equal(frameRateFromLevels([{ frameRate: 0 }], -1), null);
});

test("iso bmff frame rate comes from the video track, including a moov after mdat", () => {
  const movie = box(
    "moov",
    concat([
      track("soun", 44100, [[100, 1024]]),
      track("vide", 90000, [
        [2, 1001],
        [100, 3000],
      ]),
    ]),
  );
  assert.equal(frameRateFromIsoBmff(movie), 30);
  assert.deepEqual(probeIsoBmff(movie), { action: "use", frameRate: 30 });

  const film = box("moov", track("vide", 24000, [[48, 1001]]));
  assert.equal(frameRateFromIsoBmff(film), NTSC_FILM);
  const truncated = new Uint8Array(film);
  new DataView(truncated.buffer).setUint32(0, film.length + 64);
  assert.equal(frameRateFromIsoBmff(truncated), NTSC_FILM);

  const head = concat([
    box("ftyp", new Uint8Array(8)),
    u32(5_000_000),
    new TextEncoder().encode("mdat"),
    new Uint8Array(8),
  ]);
  assert.equal(locateFollowingMoov(head), 16 + 5_000_000);
  assert.deepEqual(probeIsoBmff(head), { action: "fetch", start: 16 + 5_000_000 });
  assert.equal(frameRateFromIsoBmff(box("moov", track("soun", 48000, [[10, 1024]]))), null);
  assert.equal(locateFollowingMoov(film), null);
});

test("progressive and playlist loaders stop once a frame rate is known", async () => {
  const signal = new AbortController().signal;
  const movie = box("moov", track("vide", 24, [[24, 1]]));
  const ranges: Array<[number, number]> = [];
  const rate = await loadProgressiveFrameRate("video.mp4", signal, async (_url, start, end) => {
    ranges.push([start, end]);
    return movie;
  });
  assert.equal(rate, 24);
  assert.deepEqual(ranges, [[0, 1024 * 1024 - 1]]);

  const head = concat([
    box("ftyp", new Uint8Array(8)),
    u32(8_000),
    new TextEncoder().encode("mdat"),
  ]);
  const fetched: number[] = [];
  const deferred = await loadProgressiveFrameRate("late.mp4", signal, async (_url, start) => {
    fetched.push(start);
    return start === 0 ? head : movie;
  });
  assert.equal(deferred, 24);
  assert.deepEqual(fetched, [0, 16 + 8_000]);

  assert.equal(
    await loadPlaylistFrameRate("playlist.m3u8", signal, async () => "FRAME-RATE=25\n"),
    25,
  );
  assert.equal(await loadPlaylistFrameRate("playlist.m3u8", signal, async () => null), null);
  assert.equal(await loadProgressiveFrameRate("missing.mp4", signal, async () => null), null);
});
