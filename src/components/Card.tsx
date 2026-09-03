import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  tinted?: boolean;
}

export function Card({ padded = true, tinted = false, style, ...props }: CardProps) {
  return (
    <div
      style={{
        background: tinted ? "var(--color-primary-surface)" : "var(--color-card)",
        borderRadius: "var(--radius-lg)",
        border: tinted ? "none" : "1px solid var(--color-border)",
        boxShadow: tinted ? "none" : "var(--shadow-card)",
        padding: padded ? "var(--space-md)" : 0,
        ...style,
      }}
      {...props}
    />
  );
}
