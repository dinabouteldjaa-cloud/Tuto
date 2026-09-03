import type { ReactNode } from "react";

interface TopBarProps {
  title: string;
  action?: ReactNode;
}

export function TopBar({ title, action }: TopBarProps) {
  return (
    <header
      style={{
        height: "var(--top-bar-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--space-lg)",
        position: "sticky",
        top: 0,
        background: "var(--color-bg)",
        zIndex: 5,
      }}
    >
      <h2 style={{ fontSize: "var(--text-lg)" }}>{title}</h2>
      {action}
    </header>
  );
}
