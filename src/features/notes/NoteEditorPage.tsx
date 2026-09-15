import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { LoadingState } from "@/components/LoadingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/features/auth/AuthContext";
import {
  ACCEPTED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  createNote,
  deleteAttachment,
  deleteNote,
  getAnnotation,
  getNote,
  getNoteDocument,
  listAttachments,
  uploadAttachment,
} from "./api";
import { isRichContent, plainTextToHtml } from "./format";
import { RichTextEditor } from "./RichTextEditor";
import { AttachmentList } from "./AttachmentList";
import { InkCanvasLayer, type InkCanvasLayerHandle } from "./InkCanvasLayer";
import { useNoteDocumentAutosave } from "./useNoteDocumentAutosave";
import type {
  DrawingTool,
  Note,
  NoteAttachment,
  NoteDocumentData,
  Stroke,
  WorkspaceStroke,
} from "./types";

type WorkspaceMode = "text" | DrawingTool;

// Phase 4's DrawingCanvas normalized x by canvas WIDTH and y by canvas
// HEIGHT separately (see pointFromEvent/drawStroke there) — NOT a single
// uniform basis. Line width was normalized by WIDTH specifically
// (`ctx.lineWidth = stroke.width * width`). So converting x and
// stroke.width both scale correctly by the same reference width; but
// converting y with that same width-based reference would squash/stretch
// legacy strokes vertically whenever the original canvas wasn't square —
// and it wasn't: HandwritingPage is a `100dvh` column with a ~56px
// TopBar and ~56px toolbar, leaving a canvas noticeably taller than it is
// wide. We don't have the exact historical width/height on record (Phase
// 4 never persisted them), so this uses a reasoned approximate aspect
// ratio (height ≈ 1.7x width) based on that layout at typical mobile
// viewport sizes, rather than assuming 1:1 the way width would suggest.
const LEGACY_CONVERSION_BASE = 1000;
const LEGACY_ASSUMED_HEIGHT_ASPECT = 1.7;

function convertLegacyStrokes(strokes: Stroke[]): WorkspaceStroke[] {
  return strokes.map((s) => ({
    tool: s.tool,
    color: s.color,
    // Width was normalized by canvas WIDTH in Phase 4, so scaling by the
    // same width-based reference here is dimensionally correct as-is.
    width: s.width * LEGACY_CONVERSION_BASE,
    points: s.points.map((p) => ({
      x: p.x * LEGACY_CONVERSION_BASE,
      y: p.y * LEGACY_CONVERSION_BASE * LEGACY_ASSUMED_HEIGHT_ASPECT,
    })),
  }));
}

function FingerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 12V5.5a1.5 1.5 0 0 1 3 0V11m0 0V4a1.5 1.5 0 0 1 3 0v7m0 0V6a1.5 1.5 0 0 1 3 0v8a5 5 0 0 1-5 5h-1c-2.5 0-3.5-1-5-3l-2-3a1.4 1.4 0 0 1 2.2-1.7L9 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7h10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M16.5 6.5 9 14a2.5 2.5 0 0 0 3.5 3.5l7-7a4.5 4.5 0 1 0-6.5-6.5l-7 7A2.5 2.5 0 0 0 9.5 14.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TextModeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <text x="4" y="18" fontSize="16" fontWeight="800" fill="currentColor" fontFamily="sans-serif">
        T
      </text>
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HighlighterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 16.5 4.5 20M9.5 12.5l4.8-6.2a1.6 1.6 0 0 1 2.4-.2l1.2 1.2a1.6 1.6 0 0 1-.2 2.4l-6.2 4.8-2.9-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 20.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 13.5 9.5 5a1.7 1.7 0 0 0-2.4 0L3.4 8.7a1.7 1.7 0 0 0 0 2.4l6.4 6.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.8 17.5H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M7 8H4V5M4 8a8 8 0 1 1-1.5 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M17 8h3V5m0 3a8 8 0 1 0 1.5 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NoteEditorPage() {
  const { subjectId, noteId } = useParams<{ subjectId: string; noteId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !noteId;

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ensureNotePromiseRef = useRef<Promise<Note> | null>(null);

  // Workspace: text + ink together.
  const [mode, setMode] = useState<WorkspaceMode>("text");
  const [thicknessStep, setThicknessStep] = useState<0 | 1 | 2>(1);
  const [allowTouchDrawing, setAllowTouchDrawing] = useState(false);
  const [initialTextHtml, setInitialTextHtml] = useState("");
  const [initialInkStrokes, setInitialInkStrokes] = useState<WorkspaceStroke[]>([]);
  const [initialInkBaseWidth, setInitialInkBaseWidth] = useState<number | null>(null);
  const [historyTick, setHistoryTick] = useState(0);

  const inkRef = useRef<InkCanvasLayerHandle>(null);
  const latestTextHtmlRef = useRef("");
  const latestInkRef = useRef<{ strokes: WorkspaceStroke[]; baseWidth: number | null }>({
    strokes: [],
    baseWidth: null,
  });
  // The autosave target reads this directly rather than the reactive
  // `noteId` route param — see useNoteDocumentAutosave's getNoteId doc
  // comment for why that distinction matters for a brand-new note.
  const noteIdRef = useRef<string | null>(noteId ?? null);

  useEffect(() => {
    if (noteId) noteIdRef.current = noteId;
  }, [noteId]);

  const { status, errorMessage, notifyChange, flushNow } = useNoteDocumentAutosave({
    userId: user?.id ?? null,
    getNoteId: () => noteIdRef.current,
    getTitleAndHtml: () => ({ title: title.trim(), html: latestTextHtmlRef.current }),
  });

  async function triggerSave() {
    try {
      await ensureNoteExists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create this note.");
      return;
    }
    const baseWidth = latestInkRef.current.baseWidth;
    const documentData: NoteDocumentData = {
      version: 1,
      text: { html: latestTextHtmlRef.current },
      ink: { baseWidth: baseWidth ?? 0, strokes: latestInkRef.current.strokes },
    };
    notifyChange(documentData);
  }

  function handleTextChange(html: string) {
    latestTextHtmlRef.current = html;
    triggerSave();
  }

  function handleInkChange(strokes: WorkspaceStroke[], baseWidth: number) {
    latestInkRef.current = { strokes, baseWidth };
    triggerSave();
    setHistoryTick((t) => t + 1);
  }

  // Flush any pending save when leaving the note.
  useEffect(() => {
    return () => flushNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isNew || !noteId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getNote(noteId);
        if (cancelled) return;
        setNote(data);
        setTitle(data.title);

        const document = await getNoteDocument(noteId);
        if (cancelled) return;

        if (document) {
          latestTextHtmlRef.current = document.data.text.html;
          setInitialTextHtml(document.data.text.html);
          latestInkRef.current = {
            strokes: document.data.ink.strokes,
            baseWidth: document.data.ink.baseWidth || null,
          };
          setInitialInkStrokes(document.data.ink.strokes);
          setInitialInkBaseWidth(document.data.ink.baseWidth || null);
        } else {
          // No unified document saved yet — synthesize one from legacy
          // Phase 1-4 data so nothing is lost or hidden.
          const html = isRichContent(data.content) ? data.content : plainTextToHtml(data.content);
          latestTextHtmlRef.current = html;
          setInitialTextHtml(html);

          try {
            const legacyAnnotation = await getAnnotation(noteId, null, 1);
            if (!cancelled && legacyAnnotation && legacyAnnotation.strokes.length > 0) {
              const converted = convertLegacyStrokes(legacyAnnotation.strokes);
              latestInkRef.current = { strokes: converted, baseWidth: LEGACY_CONVERSION_BASE };
              setInitialInkStrokes(converted);
              setInitialInkBaseWidth(LEGACY_CONVERSION_BASE);
            }
          } catch {
            // No legacy handwriting to migrate — fine, proceed with text only.
          }
        }

        const attachmentsData = await listAttachments(data.id);
        if (!cancelled) setAttachments(attachmentsData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load this note.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, noteId]);

  /**
   * A brand-new note has no id until it's first saved. The first real
   * edit (text, ink, or an attachment) silently creates the note so
   * nothing is ever attached/drawn against a note that doesn't exist yet.
   * Guarded against double-creation if two triggers race.
   */
  async function ensureNoteExists(): Promise<Note> {
    if (note) return note;
    if (ensureNotePromiseRef.current) return ensureNotePromiseRef.current;
    if (!subjectId || !user) throw new Error("Missing subject or user.");

    const promise = (async () => {
      const created = await createNote(user.id, subjectId, title.trim(), "");
      // Set this first and synchronously — the autosave hook reads it
      // directly via getNoteId(), independent of whether setNote/navigate
      // below have actually triggered a re-render yet.
      noteIdRef.current = created.id;
      setNote(created);
      navigate(`/notes/${subjectId}/${created.id}`, { replace: true });
      return created;
    })();

    ensureNotePromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      ensureNotePromiseRef.current = null;
    }
  }

  async function handleTitleBlur() {
    if (!title.trim() && isNew) return; // don't create an empty note just from blurring an empty title
    await ensureNoteExists();
    triggerSave();
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (!(ACCEPTED_ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
      setAttachmentError("Only JPG, PNG, WebP, and PDF files are supported.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setAttachmentError(`"${file.name}" is larger than 15 MB.`);
      return;
    }

    setAttachmentError(null);
    setIsUploading(true);
    try {
      const targetNote = await ensureNoteExists();
      const uploaded = await uploadAttachment(user.id, targetNote.id, file);
      setAttachments((prev) => [...prev, uploaded]);
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : "Couldn't upload this file.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteAttachment(attachment: NoteAttachment) {
    await deleteAttachment(attachment);
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
  }

  function handleOpenPdf(attachment: NoteAttachment) {
    if (!note) return;
    navigate(`/notes/${subjectId}/${note.id}/attachments/${attachment.id}`);
  }

  async function handleDeleteConfirmed() {
    if (!note) return;
    setIsDeleting(true);
    try {
      await deleteNote(note.id);
      navigate(`/notes/${subjectId}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this note.");
      setIsDeleting(false);
    }
  }

  if (!subjectId) return null;

  if (isLoading) {
    return (
      <div>
        <TopBar title="Note" onBack={() => navigate(`/notes/${subjectId}`)} />
        <LoadingState label="Loading note…" />
      </div>
    );
  }

  const isDrawMode = mode !== "text";

  return (
    <div>
      <TopBar
        title={isNew ? "New note" : "Edit note"}
        onBack={() => {
          flushNow();
          navigate(`/notes/${subjectId}`);
        }}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
              {status === "saving" && "Saving…"}
              {status === "saved" && "Saved"}
              {status === "error" && <span style={{ color: "var(--color-danger)" }}>Save failed</span>}
            </span>
            {!isNew && (
              <IconButton icon={<TrashIcon />} aria-label="Delete note" onClick={() => setConfirmDelete(true)} />
            )}
          </div>
        }
      />

      {/* Compact mode toolbar: Text | Pen | Highlighter | Eraser | Undo | Redo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2xs)",
          overflowX: "auto",
          padding: "var(--space-xs) var(--space-lg)",
          borderBottom: "1px solid var(--color-border)",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <IconButton icon={<TextModeIcon />} aria-label="Text" active={mode === "text"} onClick={() => setMode("text")} style={{ flexShrink: 0 }} />
        <IconButton icon={<PenIcon />} aria-label="Pen" active={mode === "pen"} onClick={() => setMode("pen")} style={{ flexShrink: 0 }} />
        <IconButton
          icon={<HighlighterIcon />}
          aria-label="Highlighter"
          active={mode === "highlighter"}
          onClick={() => setMode("highlighter")}
          style={{ flexShrink: 0 }}
        />
        <IconButton icon={<EraserIcon />} aria-label="Eraser" active={mode === "eraser"} onClick={() => setMode("eraser")} style={{ flexShrink: 0 }} />

        {isDrawMode && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "0 var(--space-2xs)",
              borderLeft: "1px solid var(--color-border)",
              marginLeft: "var(--space-2xs)",
              flexShrink: 0,
            }}
          >
            {([0, 1, 2] as const).map((step) => (
              <button
                key={step}
                aria-label={`Thickness ${step + 1}`}
                onClick={() => setThicknessStep(step)}
                style={{
                  width: 32,
                  height: 44,
                  border: "none",
                  background: thicknessStep === step ? "var(--color-primary-surface)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: [6, 9, 13][step],
                    height: [6, 9, 13][step],
                    borderRadius: "50%",
                    background: thicknessStep === step ? "var(--color-primary)" : "var(--color-text-tertiary)",
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {isDrawMode && (
          <IconButton
            icon={<FingerIcon />}
            aria-label={allowTouchDrawing ? "Finger draws (on) — tap to let finger scroll instead" : "Finger draws (off) — tap to draw with finger too"}
            active={allowTouchDrawing}
            onClick={() => setAllowTouchDrawing((v) => !v)}
            style={{ flexShrink: 0 }}
          />
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2xs)", flexShrink: 0 }}>
          <IconButton
            icon={<UndoIcon />}
            aria-label="Undo"
            onClick={() => {
              inkRef.current?.undo();
              handleInkChange(inkRef.current?.getStrokes() ?? [], inkRef.current?.getBaseWidth() ?? 0);
            }}
            disabled={historyTick >= 0 && !(inkRef.current?.canUndo() ?? false)}
          />
          <IconButton
            icon={<RedoIcon />}
            aria-label="Redo"
            onClick={() => {
              inkRef.current?.redo();
              handleInkChange(inkRef.current?.getStrokes() ?? [], inkRef.current?.getBaseWidth() ?? 0);
            }}
            disabled={historyTick >= 0 && !(inkRef.current?.canRedo() ?? false)}
          />
        </div>
      </div>

      <div style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Note title"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            fontWeight: 700,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--color-text-primary)",
            padding: 0,
          }}
        />

        {/* Unified workspace: text layer in normal flow (determines height)
            with the ink layer absolutely filling the same growing area. */}
        <div style={{ position: "relative", minHeight: "60vh" }}>
          <RichTextEditor content={initialTextHtml} onChange={handleTextChange} placeholder="Start writing…" />
          <div style={{ position: "absolute", inset: 0, pointerEvents: isDrawMode ? "auto" : "none" }}>
            <InkCanvasLayer
              ref={inkRef}
              tool={isDrawMode ? (mode as DrawingTool) : "pen"}
              thicknessStep={thicknessStep}
              active={isDrawMode}
              allowTouchDrawing={allowTouchDrawing}
              initialStrokes={initialInkStrokes}
              initialBaseWidth={initialInkBaseWidth}
              onChange={handleInkChange}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2xs)",
                width: "auto",
                whiteSpace: "nowrap",
              }}
            >
              <AttachIcon />
              {isUploading ? "Uploading…" : "Add attachment"}
            </Button>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)", marginTop: "var(--space-2xs)" }}>
              JPG, PNG, WebP, or PDF · up to 15 MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_ATTACHMENT_TYPES.join(",")}
            onChange={handleFileSelected}
            style={{ display: "none" }}
          />

          {attachmentError && (
            <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>{attachmentError}</p>
          )}

          <AttachmentList attachments={attachments} onDelete={handleDeleteAttachment} onOpenPdf={handleOpenPdf} />
        </div>

        {(error || errorMessage) && (
          <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>{error ?? errorMessage}</p>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete note?"
        message="This note will be permanently deleted. This can't be undone."
        confirmLabel="Delete"
        danger
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
