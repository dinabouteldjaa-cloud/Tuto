import { useEffect, useRef, useState } from "react";
import { saveAnnotation } from "./api";
import type { Stroke } from "./types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1200;

interface AnnotationTarget {
  userId: string | null;
  noteId: string | null;
  attachmentId: string | null;
  pageNumber: number;
}

/**
 * Debounces annotation saves so a Supabase request isn't sent on every
 * pointer movement — only ~1.2s after drawing stops. If a save is still
 * in flight when new strokes arrive, the newer strokes are saved right
 * after the current save finishes rather than being dropped. On error,
 * the caller's local strokes are left completely untouched (this hook
 * never clears them) — nothing is lost, the user can just keep drawing
 * or retry.
 */
export function useAnnotationAutosave(target: AnnotationTarget) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetRef = useRef(target);
  targetRef.current = target;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Stroke[] | null>(null);
  const savingRef = useRef(false);

  async function flush() {
    if (savingRef.current) return;
    const strokes = pendingRef.current;
    if (strokes === null) return;
    const { userId, noteId, attachmentId, pageNumber } = targetRef.current;
    if (!userId || !noteId) return;

    savingRef.current = true;
    setStatus("saving");
    setErrorMessage(null);
    try {
      await saveAnnotation(userId, noteId, attachmentId, pageNumber, strokes);
      pendingRef.current = null;
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Couldn't save your drawing.");
    } finally {
      savingRef.current = false;
      if (pendingRef.current !== null) flush();
    }
  }

  function notifyChange(strokes: Stroke[]) {
    pendingRef.current = strokes;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Best-effort flush so a quick "draw then immediately navigate away"
      // isn't silently lost.
      const strokes = pendingRef.current;
      const { userId, noteId, attachmentId, pageNumber } = targetRef.current;
      if (strokes !== null && userId && noteId && !savingRef.current) {
        saveAnnotation(userId, noteId, attachmentId, pageNumber, strokes).catch(() => {
          // Nothing meaningful to do — the page is already unmounting.
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, errorMessage, notifyChange };
}
