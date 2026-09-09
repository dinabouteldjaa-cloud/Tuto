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
  getNote,
  listAttachments,
  updateNote,
  uploadAttachment,
} from "./api";
import { formatUpdatedLabel, isRichContent, plainTextToHtml } from "./format";
import { RichTextEditor } from "./RichTextEditor";
import { AttachmentList } from "./AttachmentList";
import type { Note, NoteAttachment } from "./types";

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

export function NoteEditorPage() {
  const { subjectId, noteId } = useParams<{ subjectId: string; noteId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !noteId;

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ensureNotePromiseRef = useRef<Promise<Note> | null>(null);

  useEffect(() => {
    if (isNew || !noteId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getNote(noteId);
        if (cancelled) return;
        setNote(data);
        setTitle(data.title);
        setContent(isRichContent(data.content) ? data.content : plainTextToHtml(data.content));

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

  async function handleSave() {
    if (!subjectId || !user) return;
    setIsSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await createNote(user.id, subjectId, title.trim(), content);
        setNote(created);
        navigate(`/notes/${subjectId}/${created.id}`, { replace: true });
      } else if (note) {
        const updated = await updateNote(note.id, title.trim(), content);
        setNote(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this note.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * A brand-new note has no id until it's first saved. Rather than let
   * users attach files to something that doesn't exist yet (orphaned
   * uploads), the first attachment silently creates the note immediately
   * — reusing the exact same create path as the normal Save button —
   * and the editor transparently switches into "existing note" mode.
   * Guarded against double-creation if two uploads start in quick
   * succession before the first create has resolved.
   */
  async function ensureNoteExists(): Promise<Note> {
    if (note) return note;
    if (ensureNotePromiseRef.current) return ensureNotePromiseRef.current;
    if (!subjectId || !user) throw new Error("Missing subject or user.");

    const promise = (async () => {
      const created = await createNote(user.id, subjectId, title.trim(), content);
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

  return (
    <div>
      <TopBar
        title={isNew ? "New note" : "Edit note"}
        onBack={() => navigate(`/notes/${subjectId}`)}
        action={
          !isNew ? (
            <IconButton icon={<TrashIcon />} aria-label="Delete note" onClick={() => setConfirmDelete(true)} />
          ) : undefined
        }
      />

      <div style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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

        <RichTextEditor content={content} onChange={setContent} placeholder="Start writing…" />

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

          <AttachmentList attachments={attachments} onDelete={handleDeleteAttachment} />
        </div>

        {error && <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>{error}</p>}

        {note && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
            Last edited {formatUpdatedLabel(note.updatedAt)}
          </p>
        )}

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : isNew ? "Save note" : "Update note"}
        </Button>
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
