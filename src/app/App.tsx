import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignUpPage } from "@/features/auth/SignUpPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { HomePage } from "@/features/home/HomePage";
import { SubjectsPage } from "@/features/notes/SubjectsPage";
import { SubjectDetailPage } from "@/features/notes/SubjectDetailPage";
import { SchoolworkPage } from "@/features/schoolwork/SchoolworkPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { AppShell } from "@/components/AppShell";
import { LoadingState } from "@/components/LoadingState";
import { ProtectedRoute } from "./ProtectedRoute";

// The note editor pulls in the rich text editor (Tiptap), which is
// sizeable — load it only when someone actually opens a note, rather
// than shipping it in the main bundle for every page.
const NoteEditorPage = lazy(() =>
  import("@/features/notes/NoteEditorPage").then((m) => ({ default: m.NoteEditorPage }))
);

// Handwriting (canvas) and the PDF viewer (pdf.js, sizeable) are each
// their own lazy chunk too — neither should load just for opening a
// plain text note, and the PDF viewer shouldn't load just to draw.
const HandwritingPage = lazy(() =>
  import("@/features/notes/HandwritingPage").then((m) => ({ default: m.HandwritingPage }))
);
const PdfAnnotationPage = lazy(() =>
  import("@/features/notes/PdfAnnotationPage").then((m) => ({ default: m.PdfAnnotationPage }))
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell>
                  <HomePage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SubjectsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:subjectId"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SubjectDetailPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:subjectId/new"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Suspense fallback={<LoadingState label="Loading editor…" />}>
                    <NoteEditorPage />
                  </Suspense>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:subjectId/:noteId"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Suspense fallback={<LoadingState label="Loading editor…" />}>
                    <NoteEditorPage />
                  </Suspense>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:subjectId/:noteId/draw"
            element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingState label="Loading drawing tools…" />}>
                  <HandwritingPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:subjectId/:noteId/attachments/:attachmentId"
            element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingState label="Loading PDF viewer…" />}>
                  <PdfAnnotationPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/schoolwork"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SchoolworkPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ProfilePage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
