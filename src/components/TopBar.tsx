import type { ReactNode } from "react";
import { IconButton } from "./IconButton";

interface TopBarProps {
  title: string;
  action?: ReactNode;
  /** When provided, shows a leading back button that calls this on tap. */
  onBack?: () => void;
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TopBar({ title, action, onBack }: TopBarProps) {
  return (
    <header
      style={{
        height: "var(--top-bar-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-xs)",
        padding: "0 var(--space-lg)",
        position: "sticky",
        top: 0,
        background: "var(--color-bg)",
        zIndex: 5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", minWidth: 0 }}>
        {onBack && (
          <IconButton
            icon={<BackIcon />}
            aria-label="Go back"
            onClick={onBack}
            style={{ marginLeft: "calc(-1 * var(--space-xs))", flexShrink: 0 }}
          />
        )}
        <h2
          style={{
            fontSize: "var(--text-lg)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </h2>
      </div>
      {action}
    </header>
  );
}
