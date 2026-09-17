import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { DrawingTool, WorkspaceStroke, WorkspaceStrokePoint } from "./types";

const PEN_COLOR = "#241c15"; // --color-text-primary
const HIGHLIGHTER_COLOR = "#f3701b"; // --color-primary
const HIGHLIGHTER_ALPHA = 0.32;

/** Base line widths in px at baseWidth, per tool + thickness step. */
const THICKNESS_STEPS: Record<Exclude<DrawingTool, "eraser">, [number, number, number]> = {
  pen: [1.5, 3, 5.5],
  highlighter: [7, 12, 18],
};
const ERASER_RADIUS_STEPS = [12, 18, 28];

export interface InkCanvasLayerHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  getStrokes: () => WorkspaceStroke[];
  getBaseWidth: () => number | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

interface InkCanvasLayerProps {
  tool: DrawingTool;
  thicknessStep: 0 | 1 | 2;
  /** Whether this layer should currently capture pointer input. When
   * false, pointer-events are disabled entirely so taps/scrolls pass
   * through to the text layer beneath. */
  active: boolean;
  /**
   * Default true: when a draw tool is selected, plain touch draws
   * immediately, same as a stylus — matching a Notability-style
   * interaction rather than requiring the user to discover a second
   * toggle before touch does anything. Real-device testing showed a
   * hidden, off-by-default toggle here made drawing on a touch-only
   * phone appear completely broken.
   *
   * When explicitly turned off, plain touch is ignored while a draw
   * tool is active (closer to "palm rejection" for stylus users who
   * want to rest a hand on the screen) — but note that touch-action is
   * "none" for the WHOLE canvas whenever a draw tool is active
   * regardless of this flag (see below), so turning this off does not
   * restore finger-scrolling while a draw tool is selected; switch to
   * Text mode to scroll. That trade-off is deliberate: reactively
   * toggling touch-action per-pointerType during pointerdown (the
   * previous approach) did not reliably stop Apple Pencil from
   * triggering a native scroll on real iPadOS hardware, since
   * touch-action must be correct BEFORE a contact begins, not changed
   * once it has. A static "none" while any draw tool is active is the
   * only way to make "the page must not pan/scroll during a stroke" an
   * actual guarantee rather than a best-effort reaction.
   */
  allowTouchDrawing?: boolean;
  /** Initial strokes + the width they were authored at — used only at
   * construction (like RichTextEditor's `content`), never via a
   * post-mount ref call, so loaded ink can never race a not-yet-mounted
   * canvas the way the Phase 4 bug did. */
  initialStrokes?: WorkspaceStroke[];
  initialBaseWidth?: number | null;
  onChange?: (strokes: WorkspaceStroke[], baseWidth: number) => void;
}

function distanceToSegment(p: WorkspaceStrokePoint, a: WorkspaceStrokePoint, b: WorkspaceStrokePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function strokeNearPoint(stroke: WorkspaceStroke, point: WorkspaceStrokePoint, radius: number): boolean {
  if (stroke.points.length === 1) {
    return Math.hypot(stroke.points[0].x - point.x, stroke.points[0].y - point.y) < radius;
  }
  for (let i = 0; i < stroke.points.length - 1; i++) {
    if (distanceToSegment(point, stroke.points[i], stroke.points[i + 1]) < radius) return true;
  }
  return false;
}

/**
 * Transparent ink layer meant to sit absolutely-positioned (inset: 0)
 * over the rich-text layer within a shared, naturally-growing wrapper.
 * Fills whatever height that wrapper ends up at (driven by the text
 * content), so drawing isn't confined to a small fixed box.
 *
 * Coordinates are pixels at a fixed `baseWidth` (see types.ts for the
 * full reasoning) rather than 0..1 of current size — this is the key
 * difference from the Phase 4 DrawingCanvas, needed because this
 * document's height genuinely changes over time, not just its zoom.
 */
export const InkCanvasLayer = forwardRef<InkCanvasLayerHandle, InkCanvasLayerProps>(
  function InkCanvasLayer(
    { tool, thicknessStep, active, allowTouchDrawing = true, initialStrokes, initialBaseWidth, onChange },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [strokes, setStrokes] = useState<WorkspaceStroke[]>(initialStrokes ?? []);
    const strokesRef = useRef<WorkspaceStroke[]>(initialStrokes ?? []);
    const undoStackRef = useRef<WorkspaceStroke[][]>([]);
    const redoStackRef = useRef<WorkspaceStroke[][]>([]);
    const currentStrokeRef = useRef<WorkspaceStroke | null>(null);
    const drawingPointerIdRef = useRef<number | null>(null);
    const sizeRef = useRef({ width: 0, height: 0 });
    const baseWidthRef = useRef<number | null>(initialBaseWidth ?? null);

    function notify() {
      if (baseWidthRef.current) onChange?.(strokesRef.current, baseWidthRef.current);
    }

    function setStrokesAndNotify(next: WorkspaceStroke[], pushHistory: WorkspaceStroke[] | null) {
      if (pushHistory) {
        undoStackRef.current = [...undoStackRef.current, pushHistory];
        redoStackRef.current = [];
      }
      strokesRef.current = next;
      setStrokes(next);
      notify();
    }

    useImperativeHandle(ref, () => ({
      undo: () => {
        if (undoStackRef.current.length === 0) return;
        const previous = undoStackRef.current[undoStackRef.current.length - 1];
        undoStackRef.current = undoStackRef.current.slice(0, -1);
        redoStackRef.current = [...redoStackRef.current, strokesRef.current];
        strokesRef.current = previous;
        setStrokes(previous);
        notify();
      },
      redo: () => {
        if (redoStackRef.current.length === 0) return;
        const next = redoStackRef.current[redoStackRef.current.length - 1];
        redoStackRef.current = redoStackRef.current.slice(0, -1);
        undoStackRef.current = [...undoStackRef.current, strokesRef.current];
        strokesRef.current = next;
        setStrokes(next);
        notify();
      },
      clear: () => setStrokesAndNotify([], strokesRef.current),
      getStrokes: () => strokesRef.current,
      getBaseWidth: () => baseWidthRef.current,
      canUndo: () => undoStackRef.current.length > 0,
      canRedo: () => redoStackRef.current.length > 0,
    }));

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
        // Establish baseWidth from the first real layout if nothing was
        // loaded from a saved document.
        if (baseWidthRef.current === null && rect.width > 0) {
          baseWidthRef.current = canvas.width; // backing-store px, dpr-inclusive
        }
        render();
      });
      observer.observe(container);
      return () => observer.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function scale(): number {
      const dpr = window.devicePixelRatio || 1;
      if (!baseWidthRef.current) return dpr;
      return sizeRef.current.width / baseWidthRef.current;
    }

    function render() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const { width, height } = sizeRef.current;
      ctx.clearRect(0, 0, width, height);
      const s = scale();
      for (const stroke of strokesRef.current) drawStroke(ctx, stroke, s);
      if (currentStrokeRef.current) drawStroke(ctx, currentStrokeRef.current, s);
    }

    function drawStroke(ctx: CanvasRenderingContext2D, stroke: WorkspaceStroke, s: number) {
      if (stroke.points.length === 0) return;
      ctx.save();
      ctx.globalAlpha = stroke.tool === "highlighter" ? HIGHLIGHTER_ALPHA : 1;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1, stroke.width * s);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const [first, ...rest] = stroke.points;
      ctx.moveTo(first.x * s, first.y * s);
      if (rest.length === 0) ctx.lineTo(first.x * s + 0.5, first.y * s);
      for (const p of rest) ctx.lineTo(p.x * s, p.y * s);
      ctx.stroke();
      ctx.restore();
    }

    useEffect(() => {
      render();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strokes]);

    function pointFromEvent(e: ReactPointerEvent<HTMLCanvasElement>): WorkspaceStrokePoint {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const s = scale() || dpr;
      const px = (e.clientX - rect.left) * dpr;
      const py = (e.clientY - rect.top) * dpr;
      return { x: px / s, y: py / s };
    }

    function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
      if (!active || drawingPointerIdRef.current !== null) return;
      if (e.pointerType === "touch" && !allowTouchDrawing) return; // ignored, e.g. palm rejection

      e.preventDefault();

      try {
        canvasRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Capture can fail in rare edge cases (e.g. the pointer was
        // already released). Drawing can still proceed without it —
        // worse case a fast stroke loses events if the pointer leaves
        // the canvas mid-gesture, which is a much better failure mode
        // than aborting the whole stroke.
      }
      drawingPointerIdRef.current = e.pointerId;
      const point = pointFromEvent(e);

      if (tool === "eraser") {
        const radius = ERASER_RADIUS_STEPS[thicknessStep];
        const remaining = strokesRef.current.filter((s) => !strokeNearPoint(s, point, radius));
        if (remaining.length !== strokesRef.current.length) setStrokesAndNotify(remaining, strokesRef.current);
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
      e.preventDefault();
      const point = pointFromEvent(e);

      if (tool === "eraser") {
        const radius = ERASER_RADIUS_STEPS[thicknessStep];
        const remaining = strokesRef.current.filter((s) => !strokeNearPoint(s, point, radius));
        if (remaining.length !== strokesRef.current.length) setStrokesAndNotify(remaining, strokesRef.current);
        return;
      }

      if (!currentStrokeRef.current) return;
      currentStrokeRef.current.points.push(point);
      render();
    }

    function handlePointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
      if (drawingPointerIdRef.current !== e.pointerId) return;
      drawingPointerIdRef.current = null;
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // Fine if it was never actually captured.
      }

      const finished = currentStrokeRef.current;
      currentStrokeRef.current = null;
      if (finished && finished.points.length > 0) {
        setStrokesAndNotify([...strokesRef.current, finished], strokesRef.current);
      } else {
        render();
      }
    }

    return (
      <div ref={containerRef} style={{ width: "100%", height: "100%", pointerEvents: active ? "auto" : "none" }}>
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
            pointerEvents: active ? "auto" : "none",
            touchAction: active ? "none" : "auto",
            cursor: !active ? "default" : tool === "eraser" ? "cell" : "crosshair",
          }}
        />
      </div>
    );
  }
);
