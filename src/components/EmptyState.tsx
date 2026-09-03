import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "var(--space-2xl) var(--space-lg)",
        gap: "var(--space-xs)",
      }}
    >
      {icon && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "var(--radius-lg)",
            background: "var(--color-primary-surface)",
            color: "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "var(--space-xs)",
          }}
        >
          {icon}
        </div>
      )}
      <h3 style={{ fontSize: "var(--text-lg)" }}>{title}</h3>
      {description && (
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "var(--text-sm)",
            maxWidth: 280,
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "var(--space-sm)" }}>{action}</div>}
    </div>
  );
}
