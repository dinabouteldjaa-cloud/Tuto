// Shared, lightweight app types for the foundation phase.
// These are placeholder shapes for demo content and will be replaced by
// generated Supabase types once the notes/schoolwork schema is built.

export type SchoolworkType =
  | "Homework"
  | "Assignment"
  | "Project"
  | "Exam"
  | "Quiz"
  | "Presentation"
  | "Reading";

export interface SchoolworkPreview {
  id: string;
  title: string;
  subject: string;
  type: SchoolworkType;
  dueLabel: string;
}

export interface NotePreview {
  id: string;
  title: string;
  subject: string;
  updatedLabel: string;
}
