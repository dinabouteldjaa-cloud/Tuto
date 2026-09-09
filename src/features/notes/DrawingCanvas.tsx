import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { DrawingTool, Stroke, StrokePoint } from "./types";

const PEN_COLOR = "#241c15"; // --color-text-primary
const HIGHLIGHTER_COLOR = "#f3701b"; // --color-primary
const HIGHLIGHTER_ALPHA = 0.32;

/** Base line widths (normalized, fraction of canvas width) per tool + size step. */
const THICKNESS_STEPS: Record<Exclude<DrawingTool, "eraser">, [number, number, number]> = {
  pen: [0.0028, 0.0055, 0.01],
  highlighter: [0.012, 0.02, 0.032],
};
const ERASER_RADIUS_STEPS = [0.02, 0.032, 0.05];

export interface DrawingCanvasHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  getStrokes: () => Stroke[];
  loadStrokes: (strokes: Stroke[]) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

interface DrawingCanvasProps {
  tool: DrawingTool;
  /** 0, 1, or 2 — small/medium/large, per the thickness selector. */
  thicknessStep: 0 | 1 | 2;
  /**
   * Strokes to seed the canvas with, used only at construction time (like
   * an uncontrolled input's `defaultValue`). Pass this instead of calling
   * the `loadStrokes` ref method right after mount — a ref set in the same
   * effect that unmounts the loading state and mounts this canvas can race
   * and silently miss, since `ref.current` isn't guaranteed populated yet
   * when that effect runs. Only mount this component once the real
   * initial data is known, the same pattern used by RichTextEditor.
   */
  initialStrokes?: Stroke[];
  onChange?: (strokes: Stroke[]) => void;
  /** Fires once after the canvas has its real pixel size (post-mount/resize). */
  onReady?: () => void;
}

function distanceToSegment(p: StrokePoint, a: StrokePoint, b: StrokePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function strokeNearPoint(stroke: Stroke, point: StrokePoint, radius: number): boolean {
  if (stroke.points.length === 1) {
    return Math.hypot(stroke.points[0].x - point.x, stroke.points[0].y - point.y) < radius;
  }
  for (let i = 0; i < stroke.points.length - 1; i++) {
    if (distanceToSegment(point, stroke.points[i], stroke.points[i + 1]) < radius) return true;
  }
  return false;
}

/**
 * Freehand drawing surface. Strokes are stored in normalized 0..1
 * coordinates relative to the canvas's own current rendered size, so the
 * exact same stroke data replays correctly after a resize or zoom change
 * — the caller never needs to track scale factors itself.
 *
 * The eraser removes whole strokes that its path touches (a simple,
 * predictable "object eraser"), rather than a raster destination-out
 * erase — this keeps the stored data fully structured/vector, which is
 * required for accurate replay and future editing.
 */
export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ tool, thicknessStep, initialStrokes, onChange, onReady }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes ?? []);
    const strokesRef = useRef<Stroke[]>(initialStrokes ?? []);
    const undoStackRef = useRef<Stroke[][]>([]);
    const redoStackRef = useRef<Stroke[][]>([]);
    const currentStrokeRef = useRef<Stroke | null>(null);
    const drawingPointerIdRef = useRef<number | null>(null);
    const sizeRef = useRef({ width: 0, height: 0 });

    function setStrokesAndNotify(next: Stroke[], pushHistory: Stroke[] | null) {
      if (pushHistory) {
        undoStackRef.current = [...undoStackRef.current, pushHistory];
        redoStackRef.current = [];
      }
      strokesRef.current = next;
      setStrokes(next);
      onChange?.(next);
    }

    useImperativeHandle(ref, () => ({
      undo: () => {
        if (undoStackRef.current.length === 0) return;
        const previous = undoStackRef.current[undoStackRef.current.length - 1];
        undoStackRef.current = undoStackRef.current.slice(0, -1);
        redoStackRef.current = [...redoStackRef.current, strokesRef.current];
        strokesRef.current = previous;
        setStrokes(previous);
        onChange?.(previous);
      },
      redo: () => {
        if (redoStackRef.current.length === 0) return;
        const next = redoStackRef.current[redoStackRef.current.length - 1];
        redoStackRef.current = redoStackRef.current.slice(0, -1);
        undoStackRef.current = [...undoStackRef.current, strokesRef.current];
        strokesRef.current = next;
        setStrokes(next);
        onChange?.(next);
      },
      clear: () => {
        setStrokesAndNotify([], strokesRef.current);
      },
      getStrokes: () => strokesRef.current,
      loadStrokes: (loaded) => {
        undoStackRef.current = [];
        redoStackRef.current = [];
        strokesRef.current = loaded;
        setStrokes(loaded);
      },
      canUndo: () => undoStackRef.current.length > 0,
      canRedo: () => redoStackRef.current.length > 0,
    }));

    // Keep the canvas's backing store matched to its displayed size
    // (accounting for device pixel ratio) so lines are crisp, and redraw
    // on every resize so normalized strokes re-align automatically.
    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const observer = new ResizeObserver(() => {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        sizeRef.current = { width: canvas.width, height: canvas.height };
        render();
        onReady?.();
      });
      observer.observe(container);
      return () => observer.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function render() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const { width, height } = sizeRef.current;
      ctx.clearRect(0, 0, width, height);

      for (const stroke of strokesRef.current) {
        drawStroke(ctx, stroke, width, height);
      }
      if (currentStrokeRef.current) {
        drawStroke(ctx, currentStrokeRef.current, width, height);
      }
    }

    function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) {
      if (stroke.points.length === 0) return;
      ctx.save();
      ctx.globalAlpha = stroke.tool === "highlighter" ? HIGHLIGHTER_ALPHA : 1;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1, stroke.width * width);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const [first, ...rest] = stroke.points;
      ctx.moveTo(first.x * width, first.y * height);
      if (rest.length === 0) {
        // A tap with no movement — draw a dot.
        ctx.lineTo(first.x * width + 0.01, first.y * height);
      }
      for (const p of rest) {
        ctx.lineTo(p.x * width, p.y * height);
      }
      ctx.stroke();
      ctx.restore();
    }

    useEffect(() => {
      render();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strokes]);

    function pointFromEvent(e: ReactPointerEvent<HTMLCanvasElement>): StrokePoint {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
    }

    function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
      if (drawingPointerIdRef.current !== null) return;
      canvasRef.current?.setPointerCapture(e.pointerId);
      drawingPointerIdRef.current = e.pointerId;
      const point = pointFromEvent(e);

      if (tool === "eraser") {
        const radius = ERASER_RADIUS_STEPS[thicknessStep];
        const remaining = strokesRef.current.filter((s) => !strokeNearPoint(s, point, radius));
        if (remaining.length !== strokesRef.current.length) {
          setStrokesAndNotify(remaining, strokesRef.current);
        }
        return;
      }

      currentStrokeRef.current = {
        tool,
        color: tool === "highlighter" ? HIGHLIGHTER_COLOR : PEN_COLOR,
        width: THICKNESS_STEPS[tool][thicknessStep],
        points: [point],
      };
      render();
    }

    function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
      if (drawingPointerIdRef.current !== e.pointerId) return;
      const point = pointFromEvent(e);

      if (tool === "eraser") {
        const radius = ERASER_RADIUS_STEPS[thicknessStep];
        const remaining = strokesRef.current.filter((s) => !strokeNearPoint(s, point, radius));
        if (remaining.length !== strokesRef.current.length) {
          setStrokesAndNotify(remaining, strokesRef.current);
        }
        return;
      }

      if (!currentStrokeRef.current) return;
      currentStrokeRef.current.points.push(point);
      render();
    }

    function handlePointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
      if (drawingPointerIdRef.current !== e.pointerId) return;
      drawingPointerIdRef.current = null;
      canvasRef.current?.releasePointerCapture(e.pointerId);

      const finished = currentStrokeRef.current;
      currentStrokeRef.current = null;
      if (finished && finished.points.length > 0) {
        setStrokesAndNotify([...strokesRef.current, finished], strokesRef.current);
      } else {
        render();
      }
    }

    return (
      <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            touchAction: "none",
            cursor: tool === "eraser" ? "cell" : "crosshair",
          }}
        />
      </div>
    );
  }
);
