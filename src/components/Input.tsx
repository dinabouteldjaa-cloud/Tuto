import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, style, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xs)" }}>
        <label
          htmlFor={inputId}
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--color-text-secondary)",
          }}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-md)",
            padding: "13px 16px",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${error ? "var(--color-danger)" : "var(--color-border-strong)"}`,
            background: "var(--color-card)",
            color: "var(--color-text-primary)",
            outline: "none",
            minHeight: 48,
            ...style,
          }}
          {...props}
        />
        {error && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-danger)" }}>
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
