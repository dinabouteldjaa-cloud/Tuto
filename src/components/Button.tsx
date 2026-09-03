import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const baseStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "var(--text-md)",
  borderRadius: "var(--radius-md)",
  border: "none",
  cursor: "pointer",
  padding: "14px 20px",
  minHeight: 48,
  transition: "background-color 120ms ease, transform 80ms ease",
};

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "var(--color-primary)",
    color: "var(--color-on-primary)",
  },
  secondary: {
    background: "var(--color-primary-surface)",
    color: "var(--color-primary-pressed)",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-text-primary)",
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", fullWidth, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        style={{
          ...baseStyle,
          ...variantStyles[variant],
          width: fullWidth ? "100%" : undefined,
          opacity: props.disabled ? 0.6 : 1,
          ...style,
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = "scale(0.98)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
