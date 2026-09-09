import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignUpPage } from "@/features/auth/SignUpPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { HomePage } from "@/features/home/HomePage";
import { SubjectsPage } from "@/features/notes/SubjectsPage";
import { SubjectDetailPage } from "@/features/notes/SubjectDetailPage";
import { NoteEditorPage } from "@/features/notes/NoteEditorPage";
import { SchoolworkPage } from "@/features/schoolwork/SchoolworkPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "./ProtectedRoute";

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
                  <NoteEditorPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:subjectId/:noteId"
            element={
              <ProtectedRoute>
                <AppShell>
                  <NoteEditorPage />
                </AppShell>
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
