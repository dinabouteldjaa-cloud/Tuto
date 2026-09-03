interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-sm)",
        padding: "var(--space-2xl) var(--space-lg)",
        color: "var(--color-text-secondary)",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "3px solid var(--color-primary-surface)",
          borderTopColor: "var(--color-primary)",
          animation: "tuto-spin 0.7s linear infinite",
        }}
      />
      <span style={{ fontSize: "var(--text-sm)" }}>{label}</span>
      <style>{`@keyframes tuto-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
