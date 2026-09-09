import { supabase } from "@/lib/supabase";
import type { NotePreview } from "@/types";
import { formatUpdatedLabel } from "./format";
import type { Note, Subject, SubjectWithNoteCount } from "./types";

interface SubjectRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface SubjectRowWithCount extends SubjectRow {
  notes: { count: number }[];
}

interface NoteRow {
  id: string;
  subject_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function mapSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubjectWithCount(row: SubjectRowWithCount): SubjectWithNoteCount {
  return {
    ...mapSubject(row),
    noteCount: row.notes?.[0]?.count ?? 0,
  };
}

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------

export async function listSubjects(userId: string): Promise<SubjectWithNoteCount[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, created_at, updated_at, notes(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as SubjectRowWithCount[]).map(mapSubjectWithCount);
}

export async function getSubject(subjectId: string): Promise<Subject> {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, created_at, updated_at")
    .eq("id", subjectId)
    .single();

  if (error) throw error;
  return mapSubject(data as SubjectRow);
}

export async function createSubject(userId: string, name: string): Promise<Subject> {
  const { data, error } = await supabase
    .from("subjects")
    .insert({ user_id: userId, name })
    .select("id, name, created_at, updated_at")
    .single();

  if (error) throw error;
  return mapSubject(data as SubjectRow);
}

export async function renameSubject(subjectId: string, name: string): Promise<Subject> {
  const { data, error } = await supabase
    .from("subjects")
    .update({ name })
    .eq("id", subjectId)
    .select("id, name, created_at, updated_at")
    .single();

  if (error) throw error;
  return mapSubject(data as SubjectRow);
}

/** Deletes a subject. Its notes are removed automatically (FK cascade). */
export async function deleteSubject(subjectId: string): Promise<void> {
  const { error } = await supabase.from("subjects").delete().eq("id", subjectId);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------

export async function listNotes(subjectId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, subject_id, title, content, created_at, updated_at")
    .eq("subject_id", subjectId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as NoteRow[]).map(mapNote);
}

export async function getNote(noteId: string): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, subject_id, title, content, created_at, updated_at")
    .eq("id", noteId)
    .single();

  if (error) throw error;
  return mapNote(data as NoteRow);
}

export async function createNote(
  userId: string,
  subjectId: string,
  title: string,
  content: string
): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: userId, subject_id: subjectId, title, content })
    .select("id, subject_id, title, content, created_at, updated_at")
    .single();

  if (error) throw error;
  return mapNote(data as NoteRow);
}

export async function updateNote(noteId: string, title: string, content: string): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .update({ title, content })
    .eq("id", noteId)
    .select("id, subject_id, title, content, created_at, updated_at")
    .single();

  if (error) throw error;
  return mapNote(data as NoteRow);
}

export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Home integration (not wired up yet — see project instructions for
// Notes Phase 1: Home stays on demo data for now). Once Home is ready to
// read real notes, this converts a real Note into the shape Home's
// "Recent notes" section already expects.
// ---------------------------------------------------------------------

export function toNotePreview(note: Note, subjectName: string): NotePreview {
  return {
    id: note.id,
    title: note.title || "Untitled note",
    subject: subjectName,
    updatedLabel: formatUpdatedLabel(note.updatedAt),
  };
}
