import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RESOLVE_FPS,
  buildResolveMarkersCsv,
  buildResolveMarkersFilename,
  secondsToTimecode,
} from "@/lib/commentResolveExport";

test("secondsToTimecode formats HH:MM:SS:FF at 24fps", () => {
  assert.equal(secondsToTimecode(0, 24), "00:00:00:00");
  assert.equal(secondsToTimecode(1, 24), "00:00:01:00");
  assert.equal(secondsToTimecode(65, 24), "00:01:05:00");
  // 1 frame at 24fps ≈ 0.04166s
  assert.equal(secondsToTimecode(1 / 24, 24), "00:00:00:01");
  // 2 hours + 3 min + 4 sec + 5 frames
  assert.equal(secondsToTimecode(2 * 3600 + 3 * 60 + 4 + 5 / 24, 24), "02:03:04:05");
});

test("secondsToTimecode respects alternate fps", () => {
  assert.equal(secondsToTimecode(1, 30), "00:00:01:00");
  assert.equal(secondsToTimecode(1 / 30, 30), "00:00:00:01");
  assert.equal(secondsToTimecode(10 + 15 / 25, 25), "00:00:10:15");
});

test("secondsToTimecode clamps invalid inputs", () => {
  assert.equal(secondsToTimecode(-5, 24), "00:00:00:00");
  assert.equal(secondsToTimecode(Number.NaN, 24), "00:00:00:00");
  assert.equal(secondsToTimecode(1, 0), secondsToTimecode(1, DEFAULT_RESOLVE_FPS));
});

test("exports Resolve markers with author, text, resolved state, and replies", () => {
  const csv = buildResolveMarkersCsv(
    [
      {
        text: "Fix the pop",
        timestampSeconds: 65,
        userName: "Alice",
        resolved: false,
        replies: [
          {
            text: "On it",
            timestampSeconds: 65,
            userName: "Bob",
            resolved: false,
          },
        ],
      },
      {
        text: "Color grade looks good",
        timestampSeconds: 125,
        userName: "Carol",
        resolved: true,
        replies: [],
      },
    ],
    { fps: 24 },
  );

  const lines = csv.split("\r\n");
  assert.equal(lines[0], "No.,Name,Start,End,Duration,Color,Notes");
  assert.equal(lines.length, 4);

  // Row 1: top-level open comment at 00:01:05:00
  assert.match(lines[1]!, /^1,"Alice: Fix the pop","00:01:05:00","00:01:05:01","00:00:00:01","Blue",/);
  assert.match(lines[1]!, /\[Comment\] Alice · Open/);
  assert.match(lines[1]!, /Fix the pop/);

  // Row 2: reply, indented name
  assert.match(lines[2]!, /^2,"↳ Bob: On it","00:01:05:00"/);
  assert.match(lines[2]!, /\[Reply\] Bob · Open/);

  // Row 3: resolved → green
  assert.match(
    lines[3]!,
    /^3,"✓ Carol: Color grade looks good","00:02:05:00","00:02:05:01","00:00:00:01","Green",/,
  );
  assert.match(lines[3]!, /\[Comment\] Carol · Resolved/);
});

test("escapes CSV quotes/newlines; formula text is nested under safe prefixes", () => {
  const csv = buildResolveMarkersCsv([
    {
      text: 'Comma, quote "and"\nnewline',
      timestampSeconds: 0,
      userName: "Ed",
      resolved: false,
      replies: [],
    },
    {
      text: '=HYPERLINK("https://example.com")',
      timestampSeconds: 1,
      userName: "Evil",
      resolved: false,
      replies: [],
    },
  ]);

  // Quotes doubled inside cells
  assert.match(csv, /""and""/);
  // Name is author-prefixed so the cell value does not start with =
  assert.match(csv, /"Evil: =HYPERLINK/);
  // Notes open with [Comment]/[Reply], not a spreadsheet formula
  assert.match(csv, /"\[Comment\] Evil · Open\n=HYPERLINK/);
});

test("defaults to 24fps when fps omitted", () => {
  const csv = buildResolveMarkersCsv([
    {
      text: "Beat",
      timestampSeconds: 1,
      userName: "A",
      resolved: false,
      replies: [],
    },
  ]);
  assert.match(csv, /"00:00:01:00"/);
});

test("builds a stable filesystem-safe Resolve markers filename", () => {
  assert.equal(
    buildResolveMarkersFilename('  Launch / Review: "Final"  '),
    "launch-review-final-resolve-markers.csv",
  );
  assert.equal(buildResolveMarkersFilename("你好"), "video-resolve-markers.csv");
});
