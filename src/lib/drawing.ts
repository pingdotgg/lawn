/**
 * Lightweight freehand drawing payloads for on-frame comment annotations.
 * Points are normalized to [0, 1] relative to the video frame so overlays
 * scale with any player size.
 */

export type DrawingPoint = {
  x: number;
  y: number;
};

export type DrawingStroke = {
  points: DrawingPoint[];
};

export type DrawingData = {
  strokes: DrawingStroke[];
  /** Logical canvas size at capture time (for aspect / quality hints). */
  width: number;
  height: number;
};

/** Accent pen color for v1 (lawn forest green). */
export const DRAWING_STROKE_COLOR = "#2d5a2d";

export const MAX_DRAWING_STROKES = 40;
export const MAX_POINTS_PER_STROKE = 400;
export const MAX_TOTAL_DRAWING_POINTS = 4000;
/** Rough serialized size cap (~48KB) to keep comment docs small. */
export const MAX_DRAWING_SERIALIZED_LENGTH = 48_000;

export function emptyDrawing(width = 1, height = 1): DrawingData {
  return {
    strokes: [],
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

export function countDrawingPoints(drawing: DrawingData | null | undefined): number {
  if (!drawing?.strokes?.length) return 0;
  let total = 0;
  for (const stroke of drawing.strokes) {
    total += stroke.points?.length ?? 0;
  }
  return total;
}

export function hasDrawing(drawing: DrawingData | null | undefined): boolean {
  return countDrawingPoints(drawing) >= 2;
}

/**
 * Round and clamp a normalized point for compact storage.
 */
export function normalizePoint(x: number, y: number): DrawingPoint {
  return {
    x: clamp01(round4(x)),
    y: clamp01(round4(y)),
  };
}

/**
 * Drop near-duplicate points so long freehand strokes stay compact.
 * distance is in normalized units (default ~0.3% of frame).
 */
export function simplifyStroke(
  points: DrawingPoint[],
  minDistance = 0.003,
): DrawingPoint[] {
  if (points.length <= 2) return points.slice();

  const out: DrawingPoint[] = [points[0]!];
  let last = points[0]!;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!;
    const dx = p.x - last.x;
    const dy = p.y - last.y;
    if (dx * dx + dy * dy >= minDistance * minDistance) {
      out.push(p);
      last = p;
    }
  }
  const end = points[points.length - 1]!;
  const lastOut = out[out.length - 1]!;
  if (lastOut.x !== end.x || lastOut.y !== end.y) {
    out.push(end);
  }
  return out;
}

/**
 * Serialize drawing for transport. Returns null when empty.
 */
export function serializeDrawing(drawing: DrawingData | null | undefined): string | null {
  if (!hasDrawing(drawing) || !drawing) return null;
  const compact: DrawingData = {
    width: Math.round(drawing.width) || 1,
    height: Math.round(drawing.height) || 1,
    strokes: drawing.strokes
      .map((stroke) => ({
        points: simplifyStroke(stroke.points).map((p) => normalizePoint(p.x, p.y)),
      }))
      .filter((stroke) => stroke.points.length >= 2),
  };
  if (!hasDrawing(compact)) return null;
  return JSON.stringify(compact);
}

/**
 * Parse a drawing payload from JSON or a plain object.
 * Throws on invalid / oversized input.
 */
export function parseDrawing(input: unknown): DrawingData {
  if (input == null) {
    throw new Error("Drawing is required");
  }

  let value: unknown = input;
  if (typeof input === "string") {
    if (input.length > MAX_DRAWING_SERIALIZED_LENGTH) {
      throw new Error("Drawing is too large");
    }
    try {
      value = JSON.parse(input);
    } catch {
      throw new Error("Drawing payload is not valid JSON");
    }
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Drawing must be an object");
  }

  const record = value as Record<string, unknown>;
  const width = Number(record.width);
  const height = Number(record.height);
  if (!Number.isFinite(width) || width <= 0 || width > 10_000) {
    throw new Error("Drawing width is invalid");
  }
  if (!Number.isFinite(height) || height <= 0 || height > 10_000) {
    throw new Error("Drawing height is invalid");
  }

  if (!Array.isArray(record.strokes)) {
    throw new Error("Drawing strokes must be an array");
  }
  if (record.strokes.length > MAX_DRAWING_STROKES) {
    throw new Error(`Drawing can have at most ${MAX_DRAWING_STROKES} strokes`);
  }

  let totalPoints = 0;
  const strokes: DrawingStroke[] = [];

  for (const rawStroke of record.strokes) {
    if (typeof rawStroke !== "object" || rawStroke === null || Array.isArray(rawStroke)) {
      throw new Error("Each stroke must be an object");
    }
    const pointsRaw = (rawStroke as { points?: unknown }).points;
    if (!Array.isArray(pointsRaw)) {
      throw new Error("Stroke points must be an array");
    }
    if (pointsRaw.length > MAX_POINTS_PER_STROKE) {
      throw new Error(`Each stroke can have at most ${MAX_POINTS_PER_STROKE} points`);
    }

    const points: DrawingPoint[] = [];
    for (const rawPoint of pointsRaw) {
      if (typeof rawPoint !== "object" || rawPoint === null || Array.isArray(rawPoint)) {
        throw new Error("Each point must be an object with x and y");
      }
      const x = Number((rawPoint as { x?: unknown }).x);
      const y = Number((rawPoint as { y?: unknown }).y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error("Point coordinates must be finite numbers");
      }
      points.push(normalizePoint(x, y));
    }

    if (points.length < 2) continue;
    totalPoints += points.length;
    if (totalPoints > MAX_TOTAL_DRAWING_POINTS) {
      throw new Error(`Drawing can have at most ${MAX_TOTAL_DRAWING_POINTS} points`);
    }
    strokes.push({ points });
  }

  if (strokes.length === 0) {
    throw new Error("Drawing has no strokes");
  }

  const result: DrawingData = {
    width: Math.round(width),
    height: Math.round(height),
    strokes,
  };

  const serialized = JSON.stringify(result);
  if (serialized.length > MAX_DRAWING_SERIALIZED_LENGTH) {
    throw new Error("Drawing is too large");
  }

  return result;
}

/**
 * Soft-validate and return drawing or null (for optional client paths).
 */
export function coerceDrawing(input: unknown): DrawingData | null {
  if (input == null || input === undefined) return null;
  try {
    return parseDrawing(input);
  } catch {
    return null;
  }
}

/**
 * Build an SVG path string for a stroke (normalized points, viewBox 0 0 1 1).
 */
export function strokeToSvgPath(points: DrawingPoint[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${first!.x} ${first!.y}`;
  for (const p of rest) {
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
