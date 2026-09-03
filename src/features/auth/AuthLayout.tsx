import type { ReactNode } from "react";
import { TutoCharacter, type TutoMood } from "@/components/TutoCharacter";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /** When provided, shows the real Tuto mascot instead of the small logo mark. */
  mascotMood?: TutoMood;
}

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  mascotMood,
}: AuthLayoutProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "var(--space-lg)",
        maxWidth: "var(--app-max-width)",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div style={{ marginBottom: "var(--space-lg)" }}>
        {mascotMood ? (
          <TutoCharacter mood={mascotMood} size={92} style={{ marginBottom: "var(--space-sm)" }} />
        ) : (
          <div
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-md)",
              background: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "var(--space-md)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                color: "var(--color-on-primary)",
                fontSize: 20,
              }}
            >
              T
            </span>
          </div>
        )}
        <p
          style={{
            color: "var(--color-primary)",
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            marginBottom: "var(--space-2xs)",
          }}
        >
          {eyebrow}
        </p>
        <h1 style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-xs)" }}>
          {title}
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-md)" }}>
          {subtitle}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {children}
      </div>

      {footer && (
        <div style={{ marginTop: "var(--space-xl)", textAlign: "center" }}>{footer}</div>
      )}
    </div>
  );
}
