import test from "node:test";
import assert from "node:assert/strict";
import {
  countDrawingPoints,
  emptyDrawing,
  hasDrawing,
  MAX_DRAWING_STROKES,
  MAX_POINTS_PER_STROKE,
  normalizePoint,
  parseDrawing,
  serializeDrawing,
  simplifyStroke,
  strokeToSvgPath,
} from "./drawing";

test("normalizePoint clamps and rounds", () => {
  assert.deepEqual(normalizePoint(-0.5, 1.5), { x: 0, y: 1 });
  assert.deepEqual(normalizePoint(0.123456, 0.987654), { x: 0.1235, y: 0.9877 });
});

test("simplifyStroke drops near-duplicates but keeps endpoints", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 0.001, y: 0 },
    { x: 0.5, y: 0.5 },
    { x: 0.501, y: 0.5 },
    { x: 1, y: 1 },
  ];
  const simplified = simplifyStroke(points, 0.01);
  assert.equal(simplified[0]?.x, 0);
  assert.equal(simplified[simplified.length - 1]?.x, 1);
  assert.ok(simplified.length < points.length);
});

test("serializeDrawing returns null for empty drawings", () => {
  assert.equal(serializeDrawing(null), null);
  assert.equal(serializeDrawing(emptyDrawing()), null);
  assert.equal(
    serializeDrawing({
      width: 100,
      height: 100,
      strokes: [{ points: [{ x: 0.1, y: 0.1 }] }],
    }),
    null,
  );
});

test("serialize + parse round-trips a multi-stroke drawing", () => {
  const drawing = {
    width: 1280,
    height: 720,
    strokes: [
      {
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.3, y: 0.4 },
          { x: 0.5, y: 0.6 },
        ],
      },
      {
        points: [
          { x: 0.9, y: 0.1 },
          { x: 0.8, y: 0.2 },
        ],
      },
    ],
  };

  const serialized = serializeDrawing(drawing);
  assert.ok(serialized);
  const parsed = parseDrawing(serialized);
  assert.equal(parsed.width, 1280);
  assert.equal(parsed.height, 720);
  assert.equal(parsed.strokes.length, 2);
  assert.equal(countDrawingPoints(parsed), 5);
  assert.equal(hasDrawing(parsed), true);
});

test("parseDrawing rejects oversized stroke counts", () => {
  const strokes = Array.from({ length: MAX_DRAWING_STROKES + 1 }, () => ({
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  }));
  assert.throws(() => parseDrawing({ width: 10, height: 10, strokes }), /at most/);
});

test("parseDrawing rejects oversized point counts per stroke", () => {
  const points = Array.from({ length: MAX_POINTS_PER_STROKE + 1 }, (_, i) => ({
    x: i / (MAX_POINTS_PER_STROKE + 1),
    y: 0.5,
  }));
  assert.throws(
    () => parseDrawing({ width: 10, height: 10, strokes: [{ points }] }),
    /at most/,
  );
});

test("strokeToSvgPath builds an M/L path", () => {
  assert.equal(
    strokeToSvgPath([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ]),
    "M 0 0 L 0.5 0.5 L 1 1",
  );
});
