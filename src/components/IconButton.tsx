import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  "aria-label": string;
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, active, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        style={{
          width: 44,
          height: 44,
          minWidth: 44,
          minHeight: 44,
          borderRadius: "var(--radius-pill)",
          border: "none",
          background: active ? "var(--color-primary-surface)" : "transparent",
          color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          ...style,
        }}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
