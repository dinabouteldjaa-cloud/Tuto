export interface Subject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectWithNoteCount extends Subject {
  noteCount: number;
}

export interface Note {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  /** Time-limited signed URL for viewing/downloading — not persisted. */
  url: string;
}

export type DrawingTool = "pen" | "highlighter" | "eraser";

export interface StrokePoint {
  /** Normalized 0..1 coordinates relative to the canvas's own current
   * rendered size, so strokes stay aligned across resize/zoom. */
  x: number;
  y: number;
}

export interface Stroke {
  tool: Exclude<DrawingTool, "eraser">;
  color: string;
  /** Line width in normalized units (fraction of canvas width). */
  width: number;
  points: StrokePoint[];
}

export interface NoteAnnotation {
  id: string;
  noteId: string;
  /** Null for a handwritten note page; set for a PDF page overlay. */
  attachmentId: string | null;
  pageNumber: number;
  strokes: Stroke[];
  updatedAt: string;
}
