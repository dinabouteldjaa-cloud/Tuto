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

// ---------------------------------------------------------------------
// Unified note workspace (Workspace Phase 1) — text + ink coexisting on
// one growing/scrolling document. Uses a different coordinate model than
// Stroke/StrokePoint above: since the document's *height* changes as the
// user types (unlike a fixed-aspect handwriting page or PDF page, which
// only changes via uniform zoom), points are stored as pixel coordinates
// at a fixed reference width rather than normalized 0..1 of current size.
// Rendering scales both x and y by (currentWidth / baseWidth). This means
// existing ink never shifts when new text pushes the document taller —
// only a genuine width change (rotation, different device) rescales it,
// uniformly and correctly.
// ---------------------------------------------------------------------

export interface WorkspaceStrokePoint {
  /** Pixels, measured at the ink layer's baseWidth. */
  x: number;
  y: number;
}

export interface WorkspaceStroke {
  tool: Exclude<DrawingTool, "eraser">;
  color: string;
  /** Line width in pixels, measured at the ink layer's baseWidth. */
  width: number;
  points: WorkspaceStrokePoint[];
}

export interface NoteDocumentInk {
  /** The container width these strokes' pixel coordinates were authored
   * at. Established once (from the first stroke drawn, or loaded from a
   * previously saved document) and reused thereafter. */
  baseWidth: number;
  strokes: WorkspaceStroke[];
}

// ---------------------------------------------------------------------
// Inline images (Workspace Phase 2). Same "px at a fixed reference
// width" coordinate model as ink, for the same reason — the document's
// height changes as text is added, so normalizing y against total height
// would make images drift. Images get their OWN baseWidth (not ink's) so
// the proven ink system never has to be touched for this feature; the
// two will match numerically in practice since both measure the same
// workspace container.
// ---------------------------------------------------------------------

export interface WorkspaceImageCrop {
  /** All fractions 0..1 of the attachment's natural (original) dimensions. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkspaceImage {
  id: string;
  /** Points at the existing note_attachments row — the actual file
   * lives only in Storage, never duplicated here. */
  attachmentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  /** Degrees, clockwise. Optional — absent/0 means unrotated. */
  rotation?: 0 | 90 | 180 | 270;
  /** Non-destructive crop rectangle. Optional — absent means the full
   * original image is shown. The original attachment is never modified
   * or re-uploaded; this is purely display metadata. */
  crop?: WorkspaceImageCrop;
}

export interface NoteDocumentImages {
  baseWidth: number;
  items: WorkspaceImage[];
}

export interface NoteDocumentData {
  version: 1;
  text: { html: string };
  ink: NoteDocumentInk;
  /** Optional — absent on documents saved before Workspace Phase 2. */
  images?: NoteDocumentImages;
}

export interface NoteDocument {
  id: string;
  noteId: string;
  data: NoteDocumentData;
  updatedAt: string;
}
