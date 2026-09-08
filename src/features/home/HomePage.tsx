import { Card } from "@/components/Card";
import { TutoCharacter } from "@/components/TutoCharacter";
import { useAuth } from "@/features/auth/AuthContext";
import { getFirstName } from "@/lib/user";
import type { NotePreview, SchoolworkPreview } from "@/types";

const upcomingSchoolwork: SchoolworkPreview[] = [
  { id: "1", title: "Problem Set 4", subject: "Calculus", type: "Homework", dueLabel: "Due tomorrow" },
  { id: "2", title: "Cell Biology Quiz", subject: "Biology", type: "Quiz", dueLabel: "Due Friday" },
  { id: "3", title: "Essay draft", subject: "English Lit", type: "Assignment", dueLabel: "Due in 5 days" },
];

const recentNotes: NotePreview[] = [
  { id: "1", title: "Chapter 6 — Integrals", subject: "Calculus", updatedLabel: "Edited 2h ago" },
  { id: "2", title: "Photosynthesis diagram", subject: "Biology", updatedLabel: "Edited yesterday" },
  { id: "3", title: "Essay outline", subject: "English Lit", updatedLabel: "Edited 2 days ago" },
];

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomePage() {
  const { user } = useAuth();
  const firstName = getFirstName(user);

  return (
    <div style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
      {/* Tuto hero — one character handles both the greeting and the insight */}
      <Card
        tinted
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
        }}
      >
        <TutoCharacter mood="greeting" size={140} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <div>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
              {greetingForNow()},
            </p>
            <h1 style={{ fontSize: "var(--text-2xl)", textTransform: "capitalize" }}>{firstName}</h1>
          </div>
          <div>
            <p
              style={{
                color: "var(--color-primary-pressed)",
                fontWeight: 700,
                fontSize: "var(--text-sm)",
                marginBottom: 2,
              }}
            >
              Tuto says
            </p>
            <p style={{ fontSize: "var(--text-md)", lineHeight: 1.4 }}>
              Your Cell Biology quiz is Friday — want to review your notes tonight?
            </p>
          </div>
        </div>
      </Card>

      {/* Continue Studying */}
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <SectionHeading title="Continue studying" />
        <Card style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-sm)",
              background: "var(--color-primary-surface)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600 }}>Chapter 6 — Integrals</p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              Calculus · 68% through
            </p>
          </div>
        </Card>
      </section>

      {/* Upcoming Schoolwork */}
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <SectionHeading title="Upcoming schoolwork" actionLabel="See all" />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {upcomingSchoolwork.map((item) => (
            <Card key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontWeight: 600 }}>{item.title}</p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  {item.subject} · {item.type}
                </p>
              </div>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: 700,
                  color: "var(--color-primary-pressed)",
                  background: "var(--color-primary-surface)",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-pill)",
                  whiteSpace: "nowrap",
                }}
              >
                {item.dueLabel}
              </span>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Notes */}
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <SectionHeading title="Recent notes" actionLabel="See all" />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {recentNotes.map((note) => (
            <Card key={note.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontWeight: 600 }}>{note.title}</p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  {note.subject}
                </p>
              </div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                {note.updatedLabel}
              </span>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ title, actionLabel }: { title: string; actionLabel?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <h2 style={{ fontSize: "var(--text-lg)" }}>{title}</h2>
      {actionLabel && (
        <button
          style={{
            background: "none",
            border: "none",
            color: "var(--color-primary)",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
