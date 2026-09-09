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
