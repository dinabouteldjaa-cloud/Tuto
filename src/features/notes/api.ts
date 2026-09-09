import { supabase } from "@/lib/supabase";
import type { NotePreview } from "@/types";
import { formatUpdatedLabel } from "./format";
import type {
  Note,
  NoteAnnotation,
  NoteAttachment,
  Stroke,
  Subject,
  SubjectWithNoteCount,
} from "./types";

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

const ATTACHMENTS_BUCKET = "note-attachments";
// Signed URLs are generated on read (the bucket is private) and are only
// valid for this long — plenty for a single note-viewing session without
// staying valid indefinitely if a link were ever copied out of the app.
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;

export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const ACCEPTED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

interface NoteAttachmentRow {
  id: string;
  note_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
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

/**
 * Deletes any Storage objects belonging to the given notes' attachments.
 * Must run BEFORE the notes themselves are deleted — once a note is
 * deleted its note_attachments rows disappear too (FK cascade), and with
 * them the only record of which Storage paths need cleaning up. DB
 * cascade alone never touches Storage.
 */
async function deleteAttachmentFilesForNotes(noteIds: string[]): Promise<void> {
  if (noteIds.length === 0) return;

  const { data, error } = await supabase
    .from("note_attachments")
    .select("file_path")
    .in("note_id", noteIds);

  if (error) throw error;

  const paths = (data ?? []).map((row) => row.file_path as string);
  if (paths.length === 0) return;

  const { error: removeError } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove(paths);
  if (removeError) throw removeError;
}

/**
 * Deletes a subject. Its notes are removed automatically (FK cascade),
 * but any attachment files those notes had in Storage are cleaned up
 * explicitly first, so deleting a subject can't orphan files.
 */
export async function deleteSubject(subjectId: string): Promise<void> {
  const { data: notesData, error: notesError } = await supabase
    .from("notes")
    .select("id")
    .eq("subject_id", subjectId);
  if (notesError) throw notesError;

  const noteIds = (notesData ?? []).map((row) => row.id as string);
  await deleteAttachmentFilesForNotes(noteIds);

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

/**
 * Deletes a note. Its note_attachments rows are removed automatically
 * (FK cascade), but their Storage files are cleaned up explicitly first —
 * cascade never touches Storage on its own.
 */
export async function deleteNote(noteId: string): Promise<void> {
  await deleteAttachmentFilesForNotes([noteId]);
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Attachments (images + PDFs)
// ---------------------------------------------------------------------

async function withSignedUrl(row: NoteAttachmentRow): Promise<NoteAttachment> {
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(row.file_path, SIGNED_URL_EXPIRES_IN_SECONDS);

  if (error) throw error;

  return {
    id: row.id,
    noteId: row.note_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileType: row.file_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
    url: data.signedUrl,
  };
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function listAttachments(noteId: string): Promise<NoteAttachment[]> {
  const { data, error } = await supabase
    .from("note_attachments")
    .select("id, note_id, file_name, file_path, file_type, file_size, created_at")
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return Promise.all(((data ?? []) as NoteAttachmentRow[]).map(withSignedUrl));
}

export async function getAttachment(attachmentId: string): Promise<NoteAttachment> {
  const { data, error } = await supabase
    .from("note_attachments")
    .select("id, note_id, file_name, file_path, file_type, file_size, created_at")
    .eq("id", attachmentId)
    .single();

  if (error) throw error;
  return withSignedUrl(data as NoteAttachmentRow);
}

export async function uploadAttachment(
  userId: string,
  noteId: string,
  file: File
): Promise<NoteAttachment> {
  const uniqueName = `${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const path = `${userId}/${noteId}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("note_attachments")
    .insert({
      user_id: userId,
      note_id: noteId,
      file_name: file.name,
      file_path: path,
      file_type: file.type,
      file_size: file.size,
    })
    .select("id, note_id, file_name, file_path, file_type, file_size, created_at")
    .single();

  if (error) {
    // The file uploaded but the metadata row failed — remove the orphaned
    // Storage object rather than leaving an untracked file behind.
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
    throw error;
  }

  return withSignedUrl(data as NoteAttachmentRow);
}

export async function deleteAttachment(attachment: NoteAttachment): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .remove([attachment.filePath]);
  if (storageError) throw storageError;

  const { error } = await supabase.from("note_attachments").delete().eq("id", attachment.id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Annotations (handwriting + PDF page overlays)
// ---------------------------------------------------------------------

interface NoteAnnotationRow {
  id: string;
  note_id: string;
  attachment_id: string | null;
  page_number: number;
  data: { strokes: Stroke[] };
  updated_at: string;
}

function mapAnnotation(row: NoteAnnotationRow): NoteAnnotation {
  return {
    id: row.id,
    noteId: row.note_id,
    attachmentId: row.attachment_id,
    pageNumber: row.page_number,
    strokes: row.data?.strokes ?? [],
    updatedAt: row.updated_at,
  };
}

function annotationTargetQuery(
  noteId: string,
  attachmentId: string | null,
  pageNumber: number
) {
  let query = supabase
    .from("note_annotations")
    .select("id, note_id, attachment_id, page_number, data, updated_at")
    .eq("note_id", noteId)
    .eq("page_number", pageNumber);
  query = attachmentId ? query.eq("attachment_id", attachmentId) : query.is("attachment_id", null);
  return query;
}

/** Returns null if this page has never been drawn on yet — that's normal,
 * not an error. */
export async function getAnnotation(
  noteId: string,
  attachmentId: string | null,
  pageNumber: number
): Promise<NoteAnnotation | null> {
  const { data, error } = await annotationTargetQuery(noteId, attachmentId, pageNumber).maybeSingle();
  if (error) throw error;
  return data ? mapAnnotation(data as NoteAnnotationRow) : null;
}

/**
 * Saves the full current stroke set for one drawable page (a handwriting
 * page, or one page of a PDF). Explicit select-then-insert-or-update
 * rather than a DB-level upsert, since the "one row per target" rule
 * involves a NULLable attachment_id that plain unique constraints (and
 * PostgREST's upsert conflict target) don't handle cleanly. A unique
 * index still exists as a safety net (see the migration).
 */
export async function saveAnnotation(
  userId: string,
  noteId: string,
  attachmentId: string | null,
  pageNumber: number,
  strokes: Stroke[]
): Promise<NoteAnnotation> {
  const { data: existing, error: findError } = await annotationTargetQuery(
    noteId,
    attachmentId,
    pageNumber
  ).maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { data, error } = await supabase
      .from("note_annotations")
      .update({ data: { strokes } })
      .eq("id", (existing as NoteAnnotationRow).id)
      .select("id, note_id, attachment_id, page_number, data, updated_at")
      .single();
    if (error) throw error;
    return mapAnnotation(data as NoteAnnotationRow);
  }

  const { data, error } = await supabase
    .from("note_annotations")
    .insert({
      user_id: userId,
      note_id: noteId,
      attachment_id: attachmentId,
      page_number: pageNumber,
      data: { strokes },
    })
    .select("id, note_id, attachment_id, page_number, data, updated_at")
    .single();
  if (error) throw error;
  return mapAnnotation(data as NoteAnnotationRow);
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
