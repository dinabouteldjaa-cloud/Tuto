import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteNote, getSubject, listNotes } from "./api";
import { formatUpdatedLabel, previewContent } from "./format";
import type { Note, Subject } from "./types";

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function NoteIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3.5h9L19 8v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refresh = useCallback(async () => {
    if (!subjectId) return;
    try {
      const [subjectData, notesData] = await Promise.all([getSubject(subjectId), listNotes(subjectId)]);
      setSubject(subjectData);
      setNotes(notesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this subject.");
    }
  }, [subjectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDeleteConfirmed() {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try {
      await deleteNote(noteToDelete.id);
      setNoteToDelete(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this note.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!subjectId) return null;

  return (
    <div>
      <TopBar
        title={subject?.name ?? "Subject"}
        onBack={() => navigate("/notes")}
        action={
          <IconButton
            icon={<PlusIcon />}
            aria-label="New note"
            onClick={() => navigate(`/notes/${subjectId}/new`)}
          />
        }
      />

      <div style={{ padding: "0 var(--space-lg) var(--space-lg)" }}>
        {notes === null && !error && <LoadingState label="Loading notes…" />}

        {error && (
          <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)", padding: "var(--space-md) 0" }}>
            {error}
          </p>
        )}

        {notes !== null && notes.length === 0 && (
          <EmptyState
            icon={<NoteIcon />}
            title="No notes yet"
            description="Start your first note for this subject."
            action={<Button onClick={() => navigate(`/notes/${subjectId}/new`)}>New note</Button>}
          />
        )}

        {notes !== null && notes.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-sm)",
              marginTop: "var(--space-md)",
            }}
          >
            {notes.map((note) => (
              <Card
                key={note.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/notes/${subjectId}/${note.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/notes/${subjectId}/${note.id}`);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-sm)",
                  cursor: "pointer",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600 }}>{note.title || "Untitled note"}</p>
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--color-text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {previewContent(note.content)}
                  </p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>
                    {formatUpdatedLabel(note.updatedAt)}
                  </p>
                </div>
                <IconButton
                  icon={<TrashIcon />}
                  aria-label={`Delete ${note.title || "this note"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteToDelete(note);
                  }}
                  style={{ flexShrink: 0 }}
                />
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={noteToDelete !== null}
        title="Delete note?"
        message="This note will be permanently deleted. This can't be undone."
        confirmLabel="Delete"
        danger
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setNoteToDelete(null)}
      />
    </div>
  );
}
