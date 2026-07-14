import test from "node:test";
import assert from "node:assert/strict";
import { buildCommentsCsv, buildCommentsCsvFilename } from "@/lib/commentCsv";

test("exports comments and replies in thread order", () => {
  const csv = buildCommentsCsv([
    {
      text: "First comment",
      timestampSeconds: 65,
      replies: [
        {
          text: "First reply",
          timestampSeconds: 65,
          replies: [
            {
              text: "Nested reply",
              timestampSeconds: 66,
              replies: [],
            },
          ],
        },
        {
          text: "Second reply",
          timestampSeconds: 65,
          replies: [],
        },
      ],
    },
    {
      text: "Later comment",
      timestampSeconds: 125,
      replies: [],
    },
  ]);

  assert.equal(
    csv,
    [
      "Timestamp,Comment",
      '"1:05","First comment"',
      '"1:05","Reply: First reply"',
      '"1:06","Reply: Nested reply"',
      '"1:05","Reply: Second reply"',
      '"2:05","Later comment"',
    ].join("\r\n"),
  );
});

test("escapes CSV content and neutralizes spreadsheet formulas", () => {
  const csv = buildCommentsCsv([
    {
      text: 'Comma, quote "and"\nnewline',
      timestampSeconds: 0,
      replies: [
        {
          text: "Reply with a comma, too",
          timestampSeconds: 0,
          replies: [],
        },
      ],
    },
    {
      text: '=HYPERLINK("https://example.com")',
      timestampSeconds: 1,
      replies: [],
    },
  ]);

  assert.equal(
    csv,
    [
      "Timestamp,Comment",
      '"0:00","Comma, quote ""and""\nnewline"',
      '"0:00","Reply: Reply with a comma, too"',
      '"0:01","\'=HYPERLINK(""https://example.com"")"',
    ].join("\r\n"),
  );
});

test("builds a stable filesystem-safe filename", () => {
  assert.equal(
    buildCommentsCsvFilename('  Launch / Review: "Final"  '),
    "launch-review-final-comments.csv",
  );
  assert.equal(buildCommentsCsvFilename("你好"), "video-comments.csv");
});
