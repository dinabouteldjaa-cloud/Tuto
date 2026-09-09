import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/features/auth/AuthContext";
import { SubjectFormModal } from "./SubjectFormModal";
import { createSubject, deleteSubject, listSubjects, renameSubject } from "./api";
import type { SubjectWithNoteCount } from "./types";

function NotesIcon() {
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

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="1.6"
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

type FormState = { mode: "create" } | { mode: "rename"; subject: SubjectWithNoteCount };

export function SubjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectWithNoteCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectWithNoteCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listSubjects(user.id);
      setSubjects(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your subjects.");
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate(name: string) {
    if (!user) return;
    await createSubject(user.id, name);
    await refresh();
  }

  async function handleRename(name: string) {
    if (!formState || formState.mode !== "rename") return;
    await renameSubject(formState.subject.id, name);
    await refresh();
  }

  async function handleDeleteConfirmed() {
    if (!subjectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSubject(subjectToDelete.id);
      setSubjectToDelete(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this subject.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <TopBar
        title="Notes"
        action={
          <IconButton icon={<PlusIcon />} aria-label="Add subject" onClick={() => setFormState({ mode: "create" })} />
        }
      />

      <div style={{ padding: "0 var(--space-lg) var(--space-lg)" }}>
        {subjects === null && !error && <LoadingState label="Loading your subjects…" />}

        {error && (
          <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)", padding: "var(--space-md) 0" }}>
            {error}
          </p>
        )}

        {subjects !== null && subjects.length === 0 && (
          <EmptyState
            icon={<NotesIcon />}
            title="No subjects yet"
            description="Create a subject like Mathematics or Biology to start taking notes."
            action={<Button onClick={() => setFormState({ mode: "create" })}>Add subject</Button>}
          />
        )}

        {subjects !== null && subjects.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-sm)",
              marginTop: "var(--space-md)",
            }}
          >
            {subjects.map((subject) => (
              <Card
                key={subject.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/notes/${subject.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/notes/${subject.id}`);
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
                  <p style={{ fontWeight: 600 }}>{subject.name}</p>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                    {subject.noteCount} {subject.noteCount === 1 ? "note" : "notes"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2xs)", flexShrink: 0 }}>
                  <IconButton
                    icon={<EditIcon />}
                    aria-label={`Rename ${subject.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormState({ mode: "rename", subject });
                    }}
                  />
                  <IconButton
                    icon={<TrashIcon />}
                    aria-label={`Delete ${subject.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubjectToDelete(subject);
                    }}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SubjectFormModal
        open={formState !== null}
        mode={formState?.mode ?? "create"}
        initialName={formState?.mode === "rename" ? formState.subject.name : ""}
        onClose={() => setFormState(null)}
        onSubmit={formState?.mode === "rename" ? handleRename : handleCreate}
      />

      <ConfirmDialog
        open={subjectToDelete !== null}
        title="Delete subject?"
        message={`This will permanently delete "${subjectToDelete?.name}" and all of its notes. This can't be undone.`}
        confirmLabel="Delete"
        danger
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setSubjectToDelete(null)}
      />
    </div>
  );
}
