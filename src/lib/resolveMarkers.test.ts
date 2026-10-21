import test from "node:test";
import assert from "node:assert/strict";
import {
  buildResolveMarkerEdl,
  buildResolveMarkerFilename,
  formatResolveTimecode,
} from "@/lib/resolveMarkers";

const NTSC_24 = 24000 / 1001;
const NTSC_30 = 30000 / 1001;

test("formats timecode from media seconds at the given frame rate", () => {
  assert.equal(formatResolveTimecode(0, 24), "01:00:00:00");
  assert.equal(formatResolveTimecode(65, 24), "01:01:05:00");
  assert.equal(formatResolveTimecode(1.5, 24), "01:00:01:12");
  assert.equal(formatResolveTimecode(60, 25), "01:01:00:00");
  assert.equal(formatResolveTimecode(60, 30), "01:01:00:00");
});

test("counts 23.976 as 24-frame non-drop timecode without treating it as 24 fps", () => {
  assert.equal(formatResolveTimecode(0, NTSC_24), "01:00:00:00");
  assert.equal(formatResolveTimecode(60, 24), "01:01:00:00");
  assert.equal(formatResolveTimecode(60, NTSC_24), "01:00:59:23");
  assert.equal(formatResolveTimecode(3600, NTSC_24), "01:59:56:10");
});

test("uses drop-frame timecode at 29.97 and 59.94", () => {
  assert.equal(formatResolveTimecode(0, NTSC_30), "01:00:00;00");
  assert.equal(formatResolveTimecode(60, 30), "01:01:00:00");
  assert.equal(formatResolveTimecode(60, NTSC_30), "01:00:59;28");
  assert.equal(formatResolveTimecode(60.06, NTSC_30), "01:01:00;02");
  assert.equal(formatResolveTimecode(0, 60000 / 1001), "01:00:00;00");
  assert.equal(formatResolveTimecode(1, 60000 / 1001), "01:00:01;00");
});

test("falls back to 30 fps non-drop when the frame rate is missing or unusable", () => {
  for (const frameRate of [null, undefined, Number.NaN, 0, -1, Number.POSITIVE_INFINITY]) {
    assert.equal(formatResolveTimecode(0, frameRate), "01:00:00:00");
    assert.equal(formatResolveTimecode(0.5, frameRate), "01:00:00:15");
  }
  assert.equal(formatResolveTimecode(-4, 24), "01:00:00:00");
  assert.equal(formatResolveTimecode(Number.NaN, 24), "01:00:00:00");
});

test("writes a Resolve marker EDL with one-frame events", () => {
  const edl = buildResolveMarkerEdl(
    [
      {
        userName: "Ada",
        text: "Fix the lower third",
        timestampSeconds: 65,
        resolved: false,
        replies: [
          {
            userName: "Ben",
            text: "On it",
            timestampSeconds: 65,
            resolved: true,
          },
        ],
      },
      {
        userName: "Ada",
        text: "Ship it",
        timestampSeconds: 10,
        resolved: true,
        replies: [],
      },
    ],
    { frameRate: 24, title: "Launch review" },
  );

  assert.equal(
    edl,
    [
      "TITLE: Launch review",
      "FCM: NON-DROP FRAME",
      "",
      "001  001      V     C        01:00:10:00 01:00:10:01 01:00:10:00 01:00:10:01  ",
      " |C:ResolveColorGreen |M:Ada: Ship it (resolved) |D:1",
      "",
      "002  001      V     C        01:01:05:00 01:01:05:01 01:01:05:00 01:01:05:01  ",
      " |C:ResolveColorBlue |M:Ada: Fix the lower third / Ben (reply): On it (resolved) |D:1",
      "",
    ].join("\n"),
  );

  const event = edl.split("\n").find((line) => line.startsWith("001"));
  assert.ok(event);
  assert.equal(event[14], "V");
  assert.equal(event[20], "C");
  assert.equal(event.slice(29, 40), "01:00:10:00");
  assert.equal(event.slice(41, 52), "01:00:10:01");
  assert.equal(event.length, 78);
});

test("uses drop-frame mode and keeps each reply's own timecode", () => {
  const edl = buildResolveMarkerEdl(
    [
      {
        userName: "Ada",
        text: "Parent",
        timestampSeconds: 0,
        resolved: false,
        replies: [
          {
            userName: "Ben",
            text: "Later",
            timestampSeconds: 60,
            resolved: false,
          },
        ],
      },
    ],
    { frameRate: NTSC_30, title: "Cut" },
  );

  assert.match(edl, /^TITLE: Cut\nFCM: DROP FRAME\n/);
  assert.match(edl, /01:00:00;00 01:00:00;01 01:00:00;00 01:00:00;01/);
  assert.match(edl, /\|M:Ada: Parent \|D:1/);
  assert.match(edl, /01:00:59;28 01:00:59;29 01:00:59;28 01:00:59;29/);
  assert.match(edl, /\|M:Ben \(reply\): Later \|D:1/);
});

test("sanitizes marker text and combines notes that share a frame", () => {
  const edl = buildResolveMarkerEdl(
    [
      {
        userName: "Ada",
        text: "Line one\nline | two",
        timestampSeconds: 0,
        resolved: true,
        replies: [],
      },
      {
        userName: "Ben",
        text: "Same frame",
        timestampSeconds: 0.01,
        resolved: false,
        replies: [],
      },
    ],
    { frameRate: 24, title: "Notes\r\nnext" },
  );

  assert.match(edl, /^TITLE: Notes next\n/);
  assert.equal(edl.split("\n").filter((line) => line.startsWith("00")).length, 1);
  assert.match(
    edl,
    /\|C:ResolveColorBlue \|M:Ada: Line one line \/ two \(resolved\) \/ Ben: Same frame \|D:1/,
  );
  assert.equal(edl.includes("\nline"), false);
});

test("caps a very long marker name on one line", () => {
  const edl = buildResolveMarkerEdl(
    [
      {
        userName: "Ada",
        text: "x".repeat(1200),
        timestampSeconds: 1,
        replies: [],
      },
    ],
    { frameRate: 30, title: "Long" },
  );
  const marker = edl.split("\n").find((line) => line.includes("|M:"));
  assert.ok(marker);
  assert.equal(marker.includes("\n"), false);
  const name = marker.split("|M:")[1]?.replace(/ \|D:1$/, "");
  assert.equal(name?.length, 1000);
  assert.equal(name?.endsWith("..."), true);
});

test("builds a stable edl filename", () => {
  assert.equal(
    buildResolveMarkerFilename('  Launch / Review: "Final"  '),
    "launch-review-final-comments.edl",
  );
  assert.equal(buildResolveMarkerFilename("你好"), "video-comments.edl");
});
