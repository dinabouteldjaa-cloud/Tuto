import { useRef, useState } from "react";
import { saveNoteDocument, updateNote } from "./api";
import type { NoteDocumentData } from "./types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1200;

interface DocumentTarget {
  userId: string | null;
  /** A function, not a plain value — always reads the truly-current note
   * id at the moment flush/flushNow actually runs, rather than whatever
   * value was captured when notifyChange was scheduled. This matters for
   * a brand-new note: ensureNoteExists() updates the underlying ref the
   * instant the note is created, synchronously, with no dependency on a
   * re-render having happened yet — a plain reactive noteId prop can't
   * make that guarantee if the user navigates away before React gets a
   * chance to re-render with the new URL param. */
  getNoteId: () => string | null;
  /** Read fresh at save time — keeps the legacy `notes` row's title and
   * content in sync too, so the Subjects note-list preview and "last
   * edited" sorting stay accurate without a separate save pipeline. */
  getTitleAndHtml: () => { title: string; html: string };
}

/**
 * Debounces saves of the whole unified document (text + ink together),
 * so editing text and drawing close together in time results in one
 * save carrying both, not two racing requests. Same proven shape as
 * useAnnotationAutosave: in-flight guard with re-flush if newer changes
 * arrive mid-save, and local state is never touched on error — only the
 * status changes, so nothing the user typed or drew is ever wiped.
 */
export function useNoteDocumentAutosave(target: DocumentTarget) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetRef = useRef(target);
  targetRef.current = target;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<NoteDocumentData | null>(null);
  const savingRef = useRef(false);

  async function flush() {
    if (savingRef.current) return;
    const documentData = pendingRef.current;
    if (documentData === null) return;
    const { userId, getNoteId, getTitleAndHtml } = targetRef.current;
    const noteId = getNoteId();
    if (!userId || !noteId) return;

    savingRef.current = true;
    setStatus("saving");
    setErrorMessage(null);
    try {
      await saveNoteDocument(userId, noteId, documentData);
      pendingRef.current = null;
      setStatus("saved");
      // Best-effort — keeps notes.content/title/updated_at fresh for the
      // Subjects list preview. Not part of the save/failure status above,
      // since the unified document is the actual source of truth now.
      const { title, html } = getTitleAndHtml();
      updateNote(noteId, title, html).catch(() => {});
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Couldn't save your note.");
    } finally {
      savingRef.current = false;
      if (pendingRef.current !== null) flush();
    }
  }

  function notifyChange(documentData: NoteDocumentData) {
    pendingRef.current = documentData;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, DEBOUNCE_MS);
  }

  /** Best-effort immediate save — call when navigating away. */
  function flushNow() {
    if (timerRef.current) clearTimeout(timerRef.current);
    const documentData = pendingRef.current;
    const { userId, getNoteId, getTitleAndHtml } = targetRef.current;
    const noteId = getNoteId();
    if (documentData !== null && userId && noteId && !savingRef.current) {
      saveNoteDocument(userId, noteId, documentData).catch(() => {});
      const { title, html } = getTitleAndHtml();
      updateNote(noteId, title, html).catch(() => {});
    }
  }

  return { status, errorMessage, notifyChange, flushNow };
}
