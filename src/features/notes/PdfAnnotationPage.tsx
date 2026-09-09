import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { TopBar } from "@/components/TopBar";
import { IconButton } from "@/components/IconButton";
import { LoadingState } from "@/components/LoadingState";
import { useAuth } from "@/features/auth/AuthContext";
import { getAnnotation, getAttachment } from "./api";
import { DrawingCanvas, type DrawingCanvasHandle } from "./DrawingCanvas";
import { DrawingToolbar } from "./DrawingToolbar";
import { useAnnotationAutosave } from "./useAnnotationAutosave";
import type { DrawingTool, NoteAttachment, Stroke } from "./types";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M21 21l-4.3-4.3M8 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function PdfAnnotationPage() {
  const { subjectId, noteId, attachmentId } = useParams<{
    subjectId: string;
    noteId: string;
    attachmentId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [attachment, setAttachment] = useState<NoteAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [tool, setTool] = useState<DrawingTool>("pen");
  const [thicknessStep, setThicknessStep] = useState<0 | 1 | 2>(1);
  const [isPageAnnotationLoading, setIsPageAnnotationLoading] = useState(true);
  const [historyTick, setHistoryTick] = useState(0);
  // See HandwritingPage for why this exists: calling
  // canvasRef.current?.loadStrokes(...) in the same effect that flips
  // isPageAnnotationLoading to false raced against the (conditionally
  // rendered) canvas actually mounting, silently dropping loaded strokes.
  const [initialStrokes, setInitialStrokes] = useState<Stroke[]>([]);

  const canvasRef = useRef<DrawingCanvasHandle>(null);

  const { status, errorMessage, notifyChange } = useAnnotationAutosave({
    userId: user?.id ?? null,
    noteId: noteId ?? null,
    attachmentId: attachmentId ?? null,
    pageNumber,
  });

  useEffect(() => {
    if (!attachmentId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getAttachment(attachmentId);
        if (!cancelled) setAttachment(data);
      } catch (err) {
        if (!cancelled) setAttachmentError(err instanceof Error ? err.message : "Couldn't load this PDF.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attachmentId]);

  // Load this specific page's saved annotation whenever the page changes.
  // The DrawingCanvas below is keyed by pageNumber, so it's a fresh mount
  // each time — loadStrokes only needs to run once that mount has happened.
  useEffect(() => {
    if (!noteId || !attachmentId) return;
    let cancelled = false;
    setIsPageAnnotationLoading(true);
    setInitialStrokes([]);
    (async () => {
      try {
        const annotation = await getAnnotation(noteId, attachmentId, pageNumber);
        if (cancelled) return;
        if (annotation) setInitialStrokes(annotation.strokes);
      } catch {
        // Non-fatal: worst case this page opens with a blank overlay and
        // any existing marks simply won't be visible until reload.
      } finally {
        if (!cancelled) setIsPageAnnotationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, attachmentId, pageNumber]);

  if (!subjectId || !noteId || !attachmentId) return null;

  function handleChange() {
    notifyChange(canvasRef.current?.getStrokes() ?? []);
    setHistoryTick((t) => t + 1);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <TopBar
        title={attachment?.fileName ?? "PDF"}
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
        // See HandwritingPage for why historyTick is referenced here.
        canUndo={historyTick >= 0 && (canvasRef.current?.canUndo() ?? false)}
        canRedo={historyTick >= 0 && (canvasRef.current?.canRedo() ?? false)}
        onClear={() => {
          canvasRef.current?.clear();
          handleChange();
        }}
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

      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "var(--space-md)",
          background: "var(--color-bg-alt)",
        }}
      >
        {attachmentError ? (
          <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)", padding: "var(--space-lg)" }}>
            {attachmentError}
          </p>
        ) : !attachment ? (
          <LoadingState label="Loading PDF…" />
        ) : (
          <div style={{ position: "relative", display: "inline-block" }}>
            <Document
              file={attachment.url}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={(err) => setPdfError(err.message || "Couldn't open this PDF.")}
              loading={<LoadingState label="Loading PDF…" />}
              error={
                <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)", padding: "var(--space-lg)" }}>
                  {pdfError ?? "Couldn't open this PDF."}
                </p>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
            {numPages !== null && !isPageAnnotationLoading && (
              <div style={{ position: "absolute", inset: 0 }}>
                <DrawingCanvas
                  key={pageNumber}
                  ref={canvasRef}
                  tool={tool}
                  thicknessStep={thicknessStep}
                  initialStrokes={initialStrokes}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-md)",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-card)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2xs)" }}>
          <IconButton
            icon={<ChevronLeftIcon />}
            aria-label="Previous page"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", minWidth: 64, textAlign: "center" }}>
            {numPages ? `${pageNumber} / ${numPages}` : "–"}
          </span>
          <IconButton
            icon={<ChevronRightIcon />}
            aria-label="Next page"
            onClick={() => setPageNumber((p) => Math.min(numPages ?? p, p + 1))}
            disabled={!numPages || pageNumber >= numPages}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2xs)" }}>
          <IconButton
            icon={<ZoomOutIcon />}
            aria-label="Zoom out"
            onClick={() => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))}
            disabled={scale <= MIN_SCALE}
          />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", minWidth: 44, textAlign: "center" }}>
            {Math.round(scale * 100)}%
          </span>
          <IconButton
            icon={<ZoomInIcon />}
            aria-label="Zoom in"
            onClick={() => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))}
            disabled={scale >= MAX_SCALE}
          />
        </div>

        {attachment && (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Open original
          </a>
        )}
      </div>
    </div>
  );
}
