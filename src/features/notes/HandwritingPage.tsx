import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { LoadingState } from "@/components/LoadingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/features/auth/AuthContext";
import { getAnnotation } from "./api";
import { DrawingCanvas, type DrawingCanvasHandle } from "./DrawingCanvas";
import { DrawingToolbar } from "./DrawingToolbar";
import { useAnnotationAutosave } from "./useAnnotationAutosave";
import type { DrawingTool, Stroke } from "./types";

export function HandwritingPage() {
  const { subjectId, noteId } = useParams<{ subjectId: string; noteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [tool, setTool] = useState<DrawingTool>("pen");
  const [thicknessStep, setThicknessStep] = useState<0 | 1 | 2>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  // Holds the loaded strokes until the canvas mounts. Fixed a real bug:
  // calling canvasRef.current?.loadStrokes(...) inside the same effect
  // that flips isLoading to false raced against the canvas actually
  // mounting — ref.current was still null at that point, so the loaded
  // strokes were silently dropped. The canvas now only ever mounts once
  // this is already populated, via the initialStrokes prop below.
  const [initialStrokes, setInitialStrokes] = useState<Stroke[]>([]);

  const { status, errorMessage, notifyChange } = useAnnotationAutosave({
    userId: user?.id ?? null,
    noteId: noteId ?? null,
    attachmentId: null,
    pageNumber: 1,
  });

  useEffect(() => {
    if (!noteId) return;
    let cancelled = false;
    (async () => {
      try {
        const annotation = await getAnnotation(noteId, null, 1);
        if (cancelled) return;
        if (annotation) setInitialStrokes(annotation.strokes);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Couldn't load your drawing.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  if (!subjectId || !noteId) return null;

  function handleChange() {
    notifyChange(canvasRef.current?.getStrokes() ?? []);
    setHistoryTick((t) => t + 1);
  }

  function handleClearConfirmed() {
    canvasRef.current?.clear();
    handleChange();
    setConfirmClear(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <TopBar
        title="Draw"
        onBack={() => navigate(`/notes/${subjectId}/${noteId}`)}
        action={
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
            {status === "saving" && "Saving…"}
            {status === "saved" && "Saved"}
            {status === "error" && <span style={{ color: "var(--color-danger)" }}>Save failed</span>}
          </span>
        }
      />

      <DrawingToolbar
        tool={tool}
        onToolChange={setTool}
        thicknessStep={thicknessStep}
        onThicknessStepChange={setThicknessStep}
        onUndo={() => {
          canvasRef.current?.undo();
          handleChange();
        }}
        onRedo={() => {
          canvasRef.current?.redo();
          handleChange();
        }}
        // historyTick has no meaning of its own — referencing it here just
        // forces this expression to re-evaluate canUndo()/canRedo() on every
        // render triggered by a stroke change, so the buttons' disabled
        // state updates immediately instead of waiting for the debounced
        // save's state change.
        canUndo={historyTick >= 0 && (canvasRef.current?.canUndo() ?? false)}
        canRedo={historyTick >= 0 && (canvasRef.current?.canRedo() ?? false)}
        onClear={() => setConfirmClear(true)}
      />

      {errorMessage && (
        <p
          style={{
            color: "var(--color-danger)",
            fontSize: "var(--text-xs)",
            padding: "var(--space-xs) var(--space-md) 0",
          }}
        >
          {errorMessage}
        </p>
      )}

      <div style={{ flex: 1, position: "relative", background: "var(--color-bg)" }}>
        {isLoading ? (
          <LoadingState label="Loading your drawing…" />
        ) : loadError ? (
          <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)", padding: "var(--space-lg)" }}>
            {loadError}
          </p>
        ) : (
          <DrawingCanvas
            ref={canvasRef}
            tool={tool}
            thicknessStep={thicknessStep}
            initialStrokes={initialStrokes}
            onChange={handleChange}
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear page?"
        message="Everything drawn on this page will be removed. This can't be undone."
        confirmLabel="Clear"
        danger
        onConfirm={handleClearConfirmed}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
