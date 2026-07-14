"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DRAWING_STROKE_COLOR,
  type DrawingData,
  type DrawingPoint,
  type DrawingStroke,
  emptyDrawing,
  hasDrawing,
  normalizePoint,
} from "@/lib/drawing";
import { cn } from "@/lib/utils";

interface DrawingOverlayProps {
  /** Interactive draw mode captures pointer strokes. View mode is read-only. */
  mode: "draw" | "view";
  value: DrawingData | null;
  onChange?: (drawing: DrawingData | null) => void;
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

/**
 * Canvas overlay for freehand annotations. Mount only when drawing or viewing
 * a drawing — pointer moves are batched with rAF to avoid re-rendering the
 * parent player on every event.
 */
export function DrawingOverlay({
  mode,
  value,
  onChange,
  className,
  strokeColor = DRAWING_STROKE_COLOR,
  strokeWidth = 3,
}: DrawingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<DrawingStroke[]>(value?.strokes ?? []);
  const activeStrokeRef = useRef<DrawingPoint[] | null>(null);
  const sizeRef = useRef({ width: value?.width ?? 1, height: value?.height ?? 1 });
  const rafRef = useRef<number | null>(null);
  const needsDrawRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // After setTransform(dpr…), drawing uses CSS pixel space.
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor;
    // Keep stroke width readable across sizes: ~0.35% of the shorter side, min 2.
    const minDim = Math.min(width, height);
    ctx.lineWidth = Math.max(2, strokeWidth, minDim * 0.0035);

    const allStrokes = strokesRef.current.slice();
    if (activeStrokeRef.current && activeStrokeRef.current.length > 0) {
      allStrokes.push({ points: activeStrokeRef.current });
    }

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      const first = stroke.points[0]!;
      ctx.moveTo(first.x * width, first.y * height);
      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i]!;
        ctx.lineTo(p.x * width, p.y * height);
      }
      ctx.stroke();
    }
  }, [strokeColor, strokeWidth]);

  const schedulePaint = useCallback(() => {
    needsDrawRef.current = true;
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      if (!needsDrawRef.current) return;
      needsDrawRef.current = false;
      paint();
    });
  }, [paint]);

  // Sync external value when not mid-stroke (e.g. undo/clear/view seek).
  useEffect(() => {
    if (activeStrokeRef.current) return;
    strokesRef.current = value?.strokes ? value.strokes.map((s) => ({ points: [...s.points] })) : [];
    if (value?.width && value?.height) {
      sizeRef.current = { width: value.width, height: value.height };
    }
    schedulePaint();
  }, [value, schedulePaint]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = Math.max(1, Math.round(rect.width));
    const cssHeight = Math.max(1, Math.round(rect.height));

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Logical size tracks CSS pixels for storage aspect.
    sizeRef.current = { width: cssWidth, height: cssHeight };
    schedulePaint();
  }, [schedulePaint]);

  useEffect(() => {
    resizeCanvas();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }

    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const pointFromEvent = (clientX: number, clientY: number): DrawingPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return normalizePoint((clientX - rect.left) / rect.width, (clientY - rect.top) / rect.height);
  };

  const emitChange = (strokes: DrawingStroke[]) => {
    if (!onChange) return;
    if (strokes.length === 0) {
      onChange(null);
      return;
    }
    const next: DrawingData = {
      strokes,
      width: sizeRef.current.width,
      height: sizeRef.current.height,
    };
    onChange(hasDrawing(next) ? next : null);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return;
    e.preventDefault();
    e.stopPropagation();
    const point = pointFromEvent(e.clientX, e.clientY);
    if (!point) return;

    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    activeStrokeRef.current = [point];
    setIsDrawing(true);
    schedulePaint();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw" || !activeStrokeRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const point = pointFromEvent(e.clientX, e.clientY);
    if (!point) return;

    const stroke = activeStrokeRef.current;
    const last = stroke[stroke.length - 1];
    if (last && last.x === point.x && last.y === point.y) return;
    stroke.push(point);
    schedulePaint();
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw" || !activeStrokeRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }

    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setIsDrawing(false);

    if (finished.length >= 2) {
      const next = [...strokesRef.current, { points: finished }];
      strokesRef.current = next;
      emitChange(next);
    }
    schedulePaint();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 z-[15]",
        mode === "draw" ? "pointer-events-auto cursor-crosshair" : "pointer-events-none",
        className,
      )}
      data-drawing-mode={mode}
      data-drawing-active={isDrawing ? "true" : "false"}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        // Prevent click-to-play on the video underneath while drawing.
        onClick={(e) => {
          if (mode === "draw") {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        aria-label={mode === "draw" ? "Drawing canvas" : "Annotation overlay"}
      />
    </div>
  );
}

export function createEmptyDrawing(width = 1280, height = 720): DrawingData {
  return emptyDrawing(width, height);
}
