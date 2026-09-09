import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { LoadingState } from "@/components/LoadingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/features/auth/AuthContext";
import { createNote, deleteNote, getNote, updateNote } from "./api";
import { formatUpdatedLabel, isRichContent, plainTextToHtml } from "./format";
import { RichTextEditor } from "./RichTextEditor";
import type { Note } from "./types";

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
